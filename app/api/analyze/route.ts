import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { analyzeDistortionsWithGemini } from '@/lib/openai/gemini';
import { isAiInputTooLong, MAX_AI_TEXT_LENGTH } from '@/lib/security/ai-guard';
import { logServerError } from '@/lib/logging/server-logger';
import type { AIAnalysisResult, DistortionAnalysis } from '@/types';
import { z } from 'zod';
import { detect } from '@/lib/safety/detect';
import { createSafetyLlmClient } from '@/lib/safety/gemini-adapter';
import { trackCognitiveFunnel } from '@/lib/analytics/server';

// Vercel Pro: 본 라우트는 safety detect + main analyze 두 번의 Gemini 호출을 직렬로 수행.
// 모델 변동·네트워크 지연 시 5~15초 변동, 기본 ~15s 타임아웃 초과 가능. 60s로 명시.
export const maxDuration = 60;

const analyzeRequestSchema = z.object({
  logId: z.string().uuid(),
});

const distortionSchema = z.object({
  type: z.enum([
    'catastrophizing',
    'all_or_nothing',
    'emotional_reasoning',
    'personalization',
    'arbitrary_inference',
  ]),
  intensity: z.number().min(0).max(1),
  segment: z.string().min(1),
  rationale: z.string().optional(),
});

const analysisPayloadSchema = z.object({
  distortions: z.array(distortionSchema),
  frame_type: z.enum(['loss', 'gain', 'mixed']).optional(),
  reference_point: z.string().optional(),
  probability_estimate: z.number().min(0).max(100).nullable().optional(),
  loss_aversion_signal: z.number().min(0).max(1).optional(),
  cas_signal: z
    .object({
      rumination: z.number().min(0).max(1),
      worry: z.number().min(0).max(1),
    })
    .optional(),
  system2_question_seed: z.string().optional(),
  decentering_prompt: z.string().optional(),
  trigger_category: z
    .enum([
      'work',
      'relationship',
      'family',
      'health',
      'self',
      'finance',
      'study',
      'other',
      // 2026-05-16 확장 — 인지 왜곡 자주 겪는 사용자 공통 특성
      'sleep_rumination',
      'decision_paralysis',
      'social_comparison',
      'avoidance_accumulation',
    ])
    .optional(),
});

type AnalyzeRequestBody = {
  logId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    const parsedBody = analyzeRequestSchema.safeParse({
      logId: body.logId?.trim(),
    });
    if (!parsedBody.success) {
      return NextResponse.json({ error: '유효한 logId가 필요합니다.' }, { status: 400 });
    }
    const logId = parsedBody.data.logId;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 분당 요청 한도 (Supabase 기반, cross-instance 안전)
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recentAnalyses } = await supabase
      .from('analysis')
      .select('id, logs!inner(user_id)')
      .eq('logs.user_id', user.id)
      .gte('created_at', oneMinuteAgo);
    if ((recentAnalyses?.length ?? 0) >= 5) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', retryAfterSec: 60 },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }


    const { data: logData, error: logError } = await supabase
      .from('logs')
      .select('id, trigger, thought, pain_score, user_id')
      .eq('id', logId)
      .eq('user_id', user.id)
      .single();

    if (logError || !logData) {
      return NextResponse.json({ error: '로그를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (isAiInputTooLong({ trigger: logData.trigger, thought: logData.thought })) {
      return NextResponse.json(
        { error: `입력 길이가 너무 깁니다. 트리거/자동사고를 ${MAX_AI_TEXT_LENGTH}자 이하로 줄여주세요.` },
        { status: 400 }
      );
    }

    // ── 위기 감지 훅 ──
    const { data: priorOverride } = await supabase
      .from('safety_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('log_id', logId)
      .eq('user_override', true)
      .maybeSingle();

    if (!priorOverride) {
      const safetyResult = await detect({
        trigger: logData.trigger,
        thought: logData.thought,
        client: createSafetyLlmClient(),
      });

      if (safetyResult.level !== 'none') {
        const { error: safetyLogError } = await supabase.from('safety_events').insert({
          user_id: user.id,
          log_id: logId,
          level: safetyResult.level,
          detected_by: safetyResult.detectedBy ?? 'keyword',
          matched_pattern: safetyResult.matchedPattern ?? null,
          llm_reason: safetyResult.llmReason ?? null,
          user_override: false,
        });
        if (safetyLogError) {
          // P0 안전 가드 — INSERT 실패해도 사용자엔 안전 응답을 그대로 반환.
          logServerError('api/analyze:safety-events-insert', safetyLogError, {
            userId: user.id,
            logId,
          });
        }

        return NextResponse.json(
          {
            safety: {
              level: safetyResult.level,
              detectedBy: safetyResult.detectedBy,
            },
          },
          { status: 200 }
        );
      }
    }
    // ── /위기 감지 훅 ──

    const { data: existingRows, error: existingError } = await supabase
      .from('analysis')
      .select(
        'distortion_type, intensity, logic_error_segment, rationale, frame_type, reference_point, probability_estimate, loss_aversion_signal, cas_rumination, cas_worry, system2_question_seed, decentering_prompt'
      )
      .eq('log_id', logId);

    if (!existingError && (existingRows?.length ?? 0) > 0) {
      const rows = existingRows as Array<Record<string, unknown>>;
      const realRows = rows.filter((row) => row.distortion_type !== null);

      // null-only = 스트릭 플레이스홀더. 실제 분석 결과가 아니므로 재분석으로 fall through
      if (realRows.length > 0) {
        const first = realRows[0] ?? {};
        const cachedDistortions: DistortionAnalysis[] = realRows.map((row) => ({
          type: row.distortion_type as DistortionAnalysis['type'],
          intensity: Number(row.intensity ?? 0),
          segment: String(row.logic_error_segment ?? ''),
          rationale: row.rationale ? String(row.rationale) : undefined,
        }));

        if (cachedDistortions.length > 0) {
          void trackCognitiveFunnel('distortion_identified', {
            log_id: logId,
            distortion_count: cachedDistortions.length,
            cached: true,
          });
        }

        return NextResponse.json(
          {
            distortions: cachedDistortions,
            frame_type: (first.frame_type as AIAnalysisResult['frame_type']) ?? 'mixed',
            reference_point: String(first.reference_point ?? '사용자 준거점 정보 없음'),
            probability_estimate:
              typeof first.probability_estimate === 'number' ? first.probability_estimate : null,
            loss_aversion_signal:
              typeof first.loss_aversion_signal === 'number' ? first.loss_aversion_signal : 0.3,
            cas_signal: {
              rumination: typeof first.cas_rumination === 'number' ? first.cas_rumination : 0.3,
              worry: typeof first.cas_worry === 'number' ? first.cas_worry : 0.3,
            },
            system2_question_seed:
              String(first.system2_question_seed ?? '') ||
              '이 판단을 지지/반박하는 근거 비율은 각각 몇 %인가요?',
            decentering_prompt:
              String(first.decentering_prompt ?? '') ||
              '생각을 사실이 아닌 가설로 두고 증거를 분리하세요.',
            warning: null,
          },
          { status: 200 }
        );
      }
    }

    // 일별 분석 한도 체크. CBT 임상 권장(3~5회/일) + 반추 증폭 회피 + 비용 통제.
    // KST 자정 기준 리셋. 같은 log를 재분석하는 경우는 1회로 카운트(log_id Set 중복 제거).
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kstDate = new Date(Date.now() + KST_OFFSET);
    const todayStart = new Date(
      Date.UTC(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate()) - KST_OFFSET
    );

    const { data: todayAnalyses } = await supabase
      .from('analysis')
      .select('log_id, logs!inner(user_id)')
      .eq('logs.user_id', user.id)
      .gte('created_at', todayStart.toISOString());

    const analyzedTodayCount = new Set(
      (todayAnalyses ?? []).map((r) => (r as { log_id: string }).log_id)
    ).size;
    // 현재 분석하려는 log가 이미 오늘 분석된 경우엔 카운트에 들어있으므로 그대로 통과.
    const isReanalysis = (todayAnalyses ?? []).some(
      (r) => (r as { log_id: string }).log_id === logId
    );
    if (!isReanalysis && analyzedTodayCount >= 5) {
      return NextResponse.json(
        {
          error: 'daily_limit_reached',
          title: '오늘은 충분히 기록하셨어요',
          message:
            '하루 5번까지 기록할 수 있어요. 너무 자주 분석하면 오히려 반추가 깊어질 수 있어 한도를 두고 있어요. 내일 다시 만나요.',
          safetyResourceUrl: '/safety/resources',
        },
        { status: 429 }
      );
    }

    let analysisResult: AIAnalysisResult = {
      distortions: [] as DistortionAnalysis[],
      questions: [],
      frame_type: 'mixed',
      reference_point: '분석 결과 없음',
      probability_estimate: null as number | null,
      loss_aversion_signal: 0.3,
      cas_signal: { rumination: 0.3, worry: 0.3 },
      system2_question_seed: '이 판단을 지지/반박하는 근거 비율은 각각 몇 %인가요?',
      decentering_prompt: '이 생각을 사실이 아닌 가설로 놓고 증거를 분리하세요.',
    };
    try {
      analysisResult = await analyzeDistortionsWithGemini({
        trigger: logData.trigger,
        thought: logData.thought,
        pain_score: logData.pain_score ?? null,
      });
    } catch (aiError) {
      logServerError('api/analyze:gemini', aiError, { userId: user.id, logId });
      return NextResponse.json(
        { error: 'AI 분석에 실패했어요. 잠시 후 다시 시도해주세요.', retryable: true },
        { status: 503 }
      );
    }

    const normalized = analysisPayloadSchema.parse(analysisResult);
    const distortions = normalized.distortions;

    const { error: deleteError } = await supabase.from('analysis').delete().eq('log_id', logId);
    if (deleteError) {
      return NextResponse.json({ error: '기존 분석 데이터 삭제에 실패했습니다.' }, { status: 500 });
    }

    if (distortions.length === 0) {
      // 왜곡이 없어도 스트릭 적립을 위해 분석 완료 마커 삽입
      await supabase.from('analysis').insert({
        log_id: logId,
        distortion_type: null,
        intensity: 0,
        logic_error_segment: '',
      });
    }

    if (distortions.length > 0) {
      const rowsWithProtocolFields = distortions.map((item) => ({
        log_id: logId,
        distortion_type: item.type,
        intensity: item.intensity,
        logic_error_segment: item.segment,
        rationale: item.rationale || null,
        frame_type: normalized.frame_type ?? 'mixed',
        reference_point: normalized.reference_point ?? '사용자 준거점 정보 없음',
        probability_estimate: normalized.probability_estimate ?? null,
        loss_aversion_signal: normalized.loss_aversion_signal ?? 0.3,
        cas_rumination: normalized.cas_signal?.rumination ?? 0.3,
        cas_worry: normalized.cas_signal?.worry ?? 0.3,
        system2_question_seed:
          normalized.system2_question_seed ??
          '이 판단을 지지/반박하는 근거 비율은 각각 몇 %인가요?',
        decentering_prompt:
          normalized.decentering_prompt ??
          '생각을 사실이 아닌 가설로 두고 증거를 분리하세요.',
      }));

      const { error: insertError } = await supabase.from('analysis').insert(rowsWithProtocolFields);

      if (insertError) {
        // 프로토콜 컬럼 미존재 시 기본 필드로 폴백
        const rowsBasic = distortions.map((item) => ({
          log_id: logId,
          distortion_type: item.type,
          intensity: item.intensity,
          logic_error_segment: item.segment,
        }));
        const { error: fallbackError } = await supabase.from('analysis').insert(rowsBasic);
        if (fallbackError) {
          return NextResponse.json(
            { error: '분석 결과 저장에 실패했습니다.' },
            { status: 500 }
          );
        }
      }
    }

    // Phase 1.1: trigger_category 라벨링 결과를 logs row에 저장.
    // 마이그레이션 06이 적용 안 된 환경에서도 분석 자체는 통과하도록 에러는 로그만.
    if (analysisResult.trigger_category) {
      const { error: categoryError } = await supabase
        .from('logs')
        .update({ trigger_category: analysisResult.trigger_category })
        .eq('id', logId)
        .eq('user_id', user.id);
      if (categoryError) {
        logServerError('api/analyze:trigger-category-update', categoryError, {
          userId: user.id,
          logId,
        });
      }
    }

    // 통계 데이터 수집(미노출):
    // user_patterns 테이블에 distortion 1건당 1 row INSERT.
    //   - logs/analysis 트랜잭션과 *분리*. best-effort. 실패 시 분석 응답엔 영향 X.
    //   - 마이그레이션 09가 미적용된 환경에서도 분석이 정상 동작해야 한다 (logs 우선 정책).
    //   - 사용자 노출 X — 본 INSERT 결과는 UI에서 읽지 않는다.
    //   - RLS: auth.uid() = user_id 정책에 따라 본인 row만 INSERT 가능 (정책 약화 0).
    if (distortions.length > 0) {
      const patternRows = distortions.map((item) => ({
        user_id: user.id,
        log_id: logId,
        distortion_type: item.type,
        trigger_category: analysisResult.trigger_category ?? null,
        // pain_score_delta는 follow-up checkin 시점에서 산출. 분석 시점엔 NULL.
        pain_score_delta: null as number | null,
      }));
      const { error: patternsError } = await supabase
        .from('user_patterns')
        .insert(patternRows);
      if (patternsError) {
        // 마이그레이션 미적용·일시 장애 등 — 분석 결과 자체는 그대로 반환.
        console.warn('user_patterns insert best-effort 실패:', patternsError.message);
      }
    }

    if (distortions.length > 0) {
      void trackCognitiveFunnel('distortion_identified', {
        log_id: logId,
        distortion_count: distortions.length,
        cached: false,
      });
    }

    return NextResponse.json({ ...normalized }, { status: 200 });
  } catch (error) {
    logServerError('api/analyze', error);
    return NextResponse.json({ error: '분석 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
