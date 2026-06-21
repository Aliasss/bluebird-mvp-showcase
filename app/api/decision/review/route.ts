/**
 * app/api/decision/review/route.ts
 *
 * 결정(decision) 복기 API — review_at 도래 후 사용자가 관찰한 실제 결과를 기록하고
 * 확신도 대비 캘리브레이션을 산출해 logs 행에 저장한다.
 *
 * DATA / TIMESTAMP 메모:
 *   - logs 테이블에는 reevaluated_at 같은 복기 시점 컬럼이 없다(05_intervention_reevaluation.sql
 *     의 reevaluated_at 은 intervention 테이블 전용). 22_decision_log.sql 이 logs 에 추가한
 *     복기 관련 컬럼은 actual_outcome·calibration 뿐이다.
 *   - "복기 완료" 마커는 트랙별로 다르다(Migration 24, isDecisionReviewed 캡슐화):
 *     tame/레거시 = `actual_outcome IS NOT NULL`(현행 그대로), wild = `decision_frame.wild.review` 존재.
 *     대시보드 '복기 대기'·복기 리마인더 cron 도 같은 헬퍼(단일 진실 공급원)로 판정한다.
 *
 * 트랙 분기(spec §3 / §4 / §7.1):
 *   - TAME / 레거시(problem_type !== 'wild'): 캘리브레이션 경로(현행 그대로).
 *       confidence + outcome(3택) + analysis 평균 강도 → computeCalibration
 *       → { direction, distortionInflation } 을 actual_outcome·calibration 에 저장.
 *   - WILD(problem_type === 'wild'): **비점수 자기보고**. 캘리브레이션 미산출,
 *       actual_outcome·calibration 을 **건드리지 않는다**(null 유지, 쐐기 보존 §0.1).
 *       decision_frame.wild.review 에만 자기보고를 read-modify-write 로 병합 저장
 *       → 이 마커가 isDecisionReviewed 를 true 로 뒤집는다(§6.4).
 *
 * 어휘 게이트(spec §4): decision_* / record·observe 어휘만. 탐지/진단/교정 용어 없음.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logging/server-logger';
import { trackCognitiveFunnel } from '@/lib/analytics/server';
import { computeCalibration } from '@/lib/decision/calibration';
import { reviewBodySchema, wildReviewBodySchema } from '@/lib/decision/schemas';
import { isDecisionReviewed } from '@/lib/decision/review-status';

// 실제 결과 라벨 — actual_outcome(TEXT) 에 사람이 읽을 수 있는 한국어로 저장.
const OUTCOME_LABEL: Record<'better' | 'as_expected' | 'worse', string> = {
  better: '예상보다 좋았음',
  as_expected: '예상대로였음',
  worse: '예상보다 나빴음',
};

// analysis 강도 부재 시 사용할 기본값(중립 가정).
const DEFAULT_DISTORTION_INTENSITY = 0.3;

/** plain object 여부 — 배열·null·원시값 배제(decision_frame 병합 방어). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // logId 는 두 트랙 입력에 공통 — 먼저 안전 추출(트랙 판정·로드를 위해).
    const logId =
      isPlainObject(body) && typeof body.logId === 'string' ? body.logId : null;
    if (!logId) {
      return NextResponse.json({ error: '입력 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    // 결정 로그 로드 (user-scoped) — confidence 확보. problem_type·decision_frame 은
    //   트랙 분기·"복기 완료" 판정(isDecisionReviewed)·wild 병합 저장을 위해 함께 로드한다.
    const { data: logRow, error: logError } = await supabase
      .from('logs')
      .select('id, confidence, actual_outcome, problem_type, decision_frame')
      .eq('id', logId)
      .eq('user_id', user.id)
      .single();

    if (logError || !logRow) {
      return NextResponse.json({ error: '결정을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 중복 복기 가드(데이터 무결성) — "복기 완료" 마커는 트랙별 단일 진실 공급원(isDecisionReviewed).
    //   tame/레거시는 actual_outcome IS NOT NULL(현행과 동일), wild 는 decision_frame.wild.review 존재.
    //   stale push / 브라우저 뒤로가기 / 직접 URL 로 이미 복기한 결정을 재제출하면
    //   actual_outcome·calibration(또는 wild review)을 덮어쓰고 이벤트가 중복 발신된다.
    //   → 이미 복기됐으면 갱신·이벤트 없이 409 로 조기 종료(idempotent · 양 트랙 공통).
    if (isDecisionReviewed(logRow)) {
      return NextResponse.json({ error: 'already_reviewed' }, { status: 409 });
    }

    // ── WILD 분기 — 비점수 자기보고(캘리브레이션 OFF, §4). ────────────────────
    //   actual_outcome·calibration 을 절대 쓰지 않고 decision_frame.wild.review 에만 병합.
    if (logRow.problem_type === 'wild') {
      return handleWildReview({ supabase, body, logRow, userId: user.id, logId });
    }

    // ── TAME / 레거시 분기 — 캘리브레이션 경로(현행 동작 불변). ───────────────
    const parsed = reviewBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '입력 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    const { outcome } = parsed.data;

    // 해당 결정의 analysis 강도 평균 — 없으면 기본값(중립).
    const { data: analysisRows } = await supabase
      .from('analysis')
      .select('intensity')
      .eq('log_id', logId);

    const intensities = (analysisRows ?? [])
      .map((row) => (row as { intensity: number | null }).intensity)
      .filter((value): value is number => typeof value === 'number');

    const avgDistortionIntensity =
      intensities.length > 0
        ? intensities.reduce((sum, value) => sum + value, 0) / intensities.length
        : DEFAULT_DISTORTION_INTENSITY;

    const calibration = computeCalibration({
      confidence: logRow.confidence ?? 50,
      outcome,
      avgDistortionIntensity,
    });

    // 복기 결과 저장. "복기 완료" 마커는 actual_outcome IS NOT NULL (별도 timestamp 없음).
    const { error: updateError } = await supabase
      .from('logs')
      .update({
        actual_outcome: OUTCOME_LABEL[outcome],
        calibration,
      })
      .eq('id', logId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: '복기 저장에 실패했습니다.' }, { status: 500 });
    }

    // ── 검증 계측 (spec ⑤ §D.2) — 복기 완료 *시점* 확보(B.2 메모 해소).
    //   logs 에 reevaluated_at 같은 timestamp 컬럼이 없어, actual_outcome IS NOT NULL 만으로는
    //   "언제 완료됐는지" 윈도(D29~30) 판정 불가. → 이 이벤트 행의 created_at 이 완료 시점이 된다
    //   (새 DB 컬럼 추가 없이). best-effort(void) — 발신 실패가 복기 저장을 깨지 않음.
    //   PII 금지: 결정/결과 원문 미포함. 비식별 캘리브레이션 메타만(방향 enum·inflation 0~1).
    //   track 동봉 — 복기 완료를 트랙별로 귀속(§11.1 잔존·완료율). tame/레거시 = 'tame'.
    //   wild 분기는 handleWildReview 에서 track:'wild' 로 별도 발신(대칭).
    void trackCognitiveFunnel('decision_review_completed', {
      log_id: logId,
      track: 'tame', // 'tame'(캘리브레이션 경로 — 레거시 problem_type=NULL 포함)
      direction: calibration.direction, // 'overconfident' | 'underconfident' | 'calibrated'
      distortion_inflation: calibration.distortionInflation, // 0~1 수치(자유텍스트 아님)
    });

    return NextResponse.json({ calibration }, { status: 200 });
  } catch (error) {
    logServerError('api/decision/review', error);
    return NextResponse.json({ error: '복기 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * WILD 복기 처리 — 비점수 자기보고(§4). 캘리브레이션을 산출하지 않고
 * `actual_outcome`·`calibration` 을 **건드리지 않는다**(null 유지, 쐐기 보존 §0.1).
 *
 * 저장 방식 = **read-modify-write(JS)**:
 *   - 로드된 decision_frame 을 복제하고 `frame.wild.review` 만 새 자기보고로 덮는다.
 *   - jsonb_set 대신 JS 병합을 쓰는 이유: 기존 Supabase JS update 경로와 일관, raw SQL 불필요.
 *   - ⚠️ 기존 `decision_frame.wild.*` 기록 필드(identity·revelation·anticipatedRegret 등)는
 *     `...existingWild` 스프레드로 그대로 보존 — review 키만 추가/갱신한다(클로버 방지).
 *   - decision_frame 이 비정형(null/배열/원시값)이어도 안전하게 wild 컨테이너를 새로 만든다.
 */
async function handleWildReview(args: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  body: unknown;
  logRow: { decision_frame?: Record<string, unknown> | null };
  userId: string;
  logId: string;
}): Promise<NextResponse> {
  const { supabase, body, logRow, userId, logId } = args;

  const parsed = wildReviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '입력 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  // 비점수 자기보고 — 채워진 필드만 모은다(빈 키 생략, 부분 저장 §6.1).
  const review: Record<string, string> = {};
  if (parsed.data.lookingBack) review.lookingBack = parsed.data.lookingBack;
  if (parsed.data.whatDiscovered) review.whatDiscovered = parsed.data.whatDiscovered;
  if (parsed.data.valueAlignment) review.valueAlignment = parsed.data.valueAlignment;

  // 빈 제출로 "복기 완료" 마커만 찍히는 걸 막는다 — 최소 1개 비어있지 않은 답 요구.
  if (Object.keys(review).length === 0) {
    return NextResponse.json({ error: '돌아본 내용을 한 가지는 적어주세요.' }, { status: 400 });
  }
  review.reviewedAt = new Date().toISOString();

  // read-modify-write — 기존 decision_frame·wild 기록 필드를 보존하고 review 키만 병합.
  const existingFrame = isPlainObject(logRow.decision_frame) ? logRow.decision_frame : {};
  const existingWild = isPlainObject(existingFrame.wild) ? existingFrame.wild : {};
  const nextFrame: Record<string, unknown> = {
    ...existingFrame,
    wild: {
      ...existingWild, // identity·revelation 등 기록 필드 보존(클로버 방지).
      review, // ← 이 키가 isDecisionReviewed 를 true 로 뒤집는 마커(§6.4).
    },
  };

  // ⚠️ actual_outcome·calibration 은 update 페이로드에 **포함하지 않는다**(null 유지, §6.3·AC-7).
  const { error: updateError } = await supabase
    .from('logs')
    .update({ decision_frame: nextFrame })
    .eq('id', logId)
    .eq('user_id', userId);

  if (updateError) {
    return NextResponse.json({ error: '복기 저장에 실패했습니다.' }, { status: 500 });
  }

  // 검증 계측(비점수) — PII 금지: 자유텍스트 원문 미포함. 정합 자기보고 enum 만(있으면).
  void trackCognitiveFunnel('decision_review_completed', {
    log_id: logId,
    track: 'wild',
    value_alignment: parsed.data.valueAlignment ?? null, // 'aligned'|'mixed'|'not'|null
  });

  return NextResponse.json({ review }, { status: 200 });
}
