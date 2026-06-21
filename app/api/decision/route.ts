/**
 * app/api/decision/route.ts
 *
 * 결정(decision) 생성 API — logs 테이블에 log_type='decision' 행을 INSERT.
 *
 * DATA MAPPING 메모:
 *   logs.trigger   → decision 텍스트(직면한 결정 내용). NOT NULL 이므로 필수 populate.
 *   logs.thought   → logs.thought 는 NOT NULL. expectedOutcome 이 있으면 해당 값으로,
 *                    없으면 decision 텍스트를 그대로 채운다(후속 AI 분석의 원문 소재).
 *   나머지 의사결정 컬럼(decision_options, expected_outcome, confidence, review_at)은
 *   모두 NULL 허용이므로 absent 시 null 전달.
 *
 * 어휘 게이트(spec §4): decision_* / record·observe 어휘만 사용.
 *   탐지/진단/교정 용어 없음.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logging/server-logger';
import { trackCognitiveFunnel } from '@/lib/analytics/server';
import { decisionBodySchema } from '@/lib/decision/schemas';
import { detect } from '@/lib/safety/detect';
import { createSafetyLlmClient } from '@/lib/safety/gemini-adapter';

// Phase 0 디커플: 결정 기록은 더 이상 왜곡 분석(/api/analyze)으로 이어지지 않는다.
// 단, 과거 analyze 단계에서 결정 텍스트에 대해 수행하던 위기 감지(detect)는
// 안전 보존을 위해 이 기록 시점으로 그대로 이전한다(legal gate ②-B / AC-4).
// keyword 1차 스크린 후 suspected 일 때만 LLM 재분류가 일어나므로,
// 무위기 일반 케이스에서는 키워드 스크린만 수행 — 기록 응답 지연 거의 없음.
// detect 실패는 fail-safe: 기록 자체는 절대 막지 않고 로그만 남긴다.
export const maxDuration = 60;

// ── POST handler ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = decisionBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '입력 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const { decision, options, expectedOutcome, confidence, reviewAt, problemType, decisionFrame } =
      parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // logs.thought 는 NOT NULL — expectedOutcome 이 있으면 그 값으로,
    // 없으면 decision 텍스트를 그대로 채운다. (위기 감지 detect 의 thought 입력으로도 쓰인다.)
    const thoughtValue = expectedOutcome ?? decision;

    const { data: insertedRow, error: insertError } = await supabase
      .from('logs')
      .insert({
        user_id: user.id,
        log_type: 'decision',
        trigger: decision,
        thought: thoughtValue,
        decision_options: options ?? null,
        expected_outcome: expectedOutcome ?? null,
        confidence,
        review_at: reviewAt,
        // 결정 로직 v2 가산 컬럼 — 트리아지 트랙 + 트랙별 구조화 프레임(둘 다 NULL 허용).
        //   미제공(레거시 입력)이면 NULL 로 두어 v1 경로와 바이트 동일하게 동작한다.
        problem_type: problemType ?? null,
        decision_frame: decisionFrame ?? null,
      })
      .select('id')
      .single();

    if (insertError || !insertedRow) {
      logServerError('api/decision', insertError ?? new Error('insert returned no row'));
      return NextResponse.json({ error: '결정 기록에 실패했습니다.' }, { status: 500 });
    }

    // ── 위기 감지 훅 (Phase 0 안전 보존 — 과거 /api/analyze 단계에서 수행) ──
    //   결정 텍스트(trigger=decision, thought=expectedOutcome??decision)에 대해
    //   /api/analyze 와 동일한 detect() 를 동일 입력 형태로 수행한다.
    //   non-none 이면 safety_events 에 기록하고(향후 override 가 이 row 를 갱신),
    //   응답에 { safety: { level, detectedBy } } 를 동봉한다(analyze 와 동일 shape).
    //   detect 실패는 fail-safe: 기록은 이미 성공했으므로 막지 않고 로그만 남긴다.
    let safety: { level: 'critical' | 'caution'; detectedBy: string | null } | null = null;
    try {
      const safetyResult = await detect({
        trigger: decision,
        thought: thoughtValue,
        client: createSafetyLlmClient(),
      });

      if (safetyResult.level !== 'none') {
        const { error: safetyLogError } = await supabase.from('safety_events').insert({
          user_id: user.id,
          log_id: insertedRow.id,
          level: safetyResult.level,
          detected_by: safetyResult.detectedBy ?? 'keyword',
          matched_pattern: safetyResult.matchedPattern ?? null,
          llm_reason: safetyResult.llmReason ?? null,
          user_override: false,
        });
        if (safetyLogError) {
          // P0 안전 가드 — INSERT 실패해도 사용자엔 안전 응답을 그대로 반환.
          logServerError('api/decision:safety-events-insert', safetyLogError, {
            userId: user.id,
            logId: insertedRow.id,
          });
        }
        safety = { level: safetyResult.level, detectedBy: safetyResult.detectedBy };
      }
    } catch (safetyError) {
      // fail-safe: 위기 감지 실패가 결정 기록을 깨지 않는다. 안전 표지는 생략(로그만).
      logServerError('api/decision:safety-detect', safetyError, {
        userId: user.id,
        logId: insertedRow.id,
      });
    }
    // ── /위기 감지 훅 ──

    // ── 검증 계측 (spec ⑤ §D.2) — best-effort, 발신 실패가 결정 기록을 깨지 않음(void).
    //   PII 금지: 결정 텍스트(trigger/thought/options/expectedOutcome) 미포함.
    //   비식별 메타만 — log_id·hasOptions·confidence 버킷·기한 봉인 여부.
    //   wild 는 confidence=null(점수화 없음) → 버킷 'none' 으로 표기(원값 미산출).
    const confidenceBucket =
      confidence == null
        ? 'none'
        : confidence >= 80
        ? 'high'
        : confidence >= 40
        ? 'mid'
        : 'low';
    //   problem_type(트랙) 동봉 — 잔존·차별화를 트랙별로 귀속(§11.1). NULL(레거시 입력)=미지정.
    //   비식별 enum('tame'|'wild'|null)만 — 결정 원문 미포함.
    void trackCognitiveFunnel('decision_record_saved', {
      log_id: insertedRow.id,
      has_options: options != null,
      confidence_bucket: confidenceBucket, // 'none'(wild) | 'low' | 'mid' | 'high'
      problem_type: problemType ?? null, // 'tame' | 'wild' | null(레거시) — 트랙 귀속(§11.1)
    });
    // ③ 예측 봉인 — confidence + review_at 가 확정된 결정만(D 신선도 분모).
    //   wild 는 confidence 점수화가 없으므로 예측 봉인 이벤트 대상 아님.
    if (reviewAt != null && confidence != null) {
      void trackCognitiveFunnel('decision_prediction_sealed', {
        log_id: insertedRow.id,
        confidence_bucket: confidenceBucket,
      });
    }

    return NextResponse.json({ id: insertedRow.id, safety }, { status: 201 });
  } catch (error) {
    logServerError('api/decision', error);
    return NextResponse.json({ error: '결정 기록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
