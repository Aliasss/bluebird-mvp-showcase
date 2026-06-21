import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * 서버사이드 분석 품질 이벤트.
 * Vercel Analytics Custom Events 대신 Supabase analytics_events 테이블에 기록.
 *
 * 운영자는 Supabase SQL editor에서 다음 쿼리로 점검:
 *   SELECT * FROM analytics_quality_summary;
 *   SELECT properties->>'reason' AS reason, COUNT(*)
 *     FROM analytics_events
 *     WHERE event_name = 'analyze_distortion_zero'
 *       AND created_at > NOW() - INTERVAL '7 days'
 *     GROUP BY 1;
 *
 * 모든 이벤트는 best-effort. 텔레메트리 실패가 사용자 요청을 깨면 안 된다.
 */

export type AnalysisQualityEvent =
  | 'analyze_distortion_zero'
  | 'analyze_retry_fired'
  | 'analyze_parse_failed'
  | 'questions_fallback';

/**
 * 인지 단계 깔때기(funnel) 이벤트.
 * "분석 시도 vs 실제 행동 변화" 격차 추적용. founder 자기분석 review 2026-05-10 §4.3 도출.
 */
export type CognitiveFunnelEvent =
  | 'log_view' // /log 페이지 진입 = 입력 비용 측정 시작점 (2026-05-19 deep-dive 액션 ①)
  | 'distortion_identified' // 분석 결과가 사용자에게 노출 가능 시점
  | 'reframe_attempted' // 소크라테스 질문 생성 = 리프레임 기회 진입
  | 'reframe_completed' // 답변 3건 저장 완료
  | 'action_completed' // Tiny Habit 완료(is_completed=true)
  // ── 결정 루프 검증 계측 (decision-pivot ⑤ · spec 2026-06-06 §D.2, additive only) ──
  // 측정 목적은 spec §B(잔존)·§C(이탈 가설) 매핑. PII(결정 원문) 미포함 — §D.2 가드.
  | 'decision_record_started' // ① 결정 기록 시작(클라 폼 진입) — A 입력마찰 분모
  | 'decision_triage_completed' // ① 트리아지 해소(트랙 확정) — AC-17 트랙 분기 유효성(problem_type 분포)
  | 'decision_record_saved' // ① 결정 저장 완료(INSERT 성공) — C 빈도·A 분자·B.2 잔존(a)
  | 'decision_prediction_sealed' // ③ 예측 봉인(confidence+review_at 확정, 저장과 동시) — D 신선도 분모
  | 'decision_analyze_shown' // ② 왜곡 점검 임베드 노출(결정 맥락) — 축 ii 도달률
  | 'decision_review_completed' // ④ 복기 완료(UPDATE 성공) — D 완료율·B.2 잔존(b) 완료 *시점* 확보
  | 'decision_report_viewed' // ⑤ 캘리브레이션 리포트 열람 — B 결과효용 재방문율
  // ── 복기 미리보기 A/B 계측 (preview-activation, additive only · 마이그레이션 0) ──
  //   가설: 봉인 직후 "검토일에 무엇을 보게 되는지" 미리보기 → 재방문 동기를 첫 세션에 형성.
  //   효과를 *반증 가능*하게 재기 위해 노출군(preview) vs 미노출군(control) 코호트로 분리 측정.
  //   PII 금지: properties 는 cohort/track enum 라벨만(결정 원문 미포함). event_name TEXT +
  //   properties JSONB 라 스키마 무변경(타입에만 추가).
  | 'session_started' // 세션 진입(클라·세션당 1회) — 코호트 귀속 분모(노출 여부 무관 전체)
  | 'decision_preview_shown'; // 봉인 직후 미리보기 노출(노출군만) — A/B 처치 도달 분자

type AllowedValue = string | number | boolean | null;
type AnalyticsEvent = AnalysisQualityEvent | CognitiveFunnelEvent;

async function insertAnalyticsEvent(
  event: AnalyticsEvent,
  properties?: Record<string, AllowedValue>,
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // 비인증 호출은 무시. RLS가 어차피 거부하므로 명시적으로 짧게 종료.
      return;
    }

    const { error } = await supabase.from('analytics_events').insert({
      user_id: user.id,
      event_name: event,
      properties: properties ?? {},
    });

    if (error) {
      console.warn(`[analytics] ${event} insert 실패:`, error.message);
    }
  } catch (err) {
    // request scope 밖 호출(eval 스크립트 등)은 cookies()가 throw — 의도된 silent skip.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('cookies') && message.includes('request scope')) {
      return;
    }
    console.warn(`[analytics] ${event} 처리 실패:`, err);
  }
}

export async function trackAnalysisQuality(
  event: AnalysisQualityEvent,
  properties?: Record<string, AllowedValue>,
): Promise<void> {
  return insertAnalyticsEvent(event, properties);
}

/**
 * 인지 단계 funnel 이벤트 적재. 모든 이벤트는 best-effort — 실패가 사용자 요청을 깨선 안 됨.
 *
 * 운영 분석 예시 (Supabase SQL editor):
 *   -- 분석 → 행동 격차
 *   SELECT user_id,
 *          COUNT(*) FILTER (WHERE event_name='distortion_identified') AS analyzed,
 *          COUNT(*) FILTER (WHERE event_name='action_completed')      AS acted
 *   FROM analytics_events
 *   WHERE created_at > NOW() - INTERVAL '14 days'
 *   GROUP BY user_id;
 */
export async function trackCognitiveFunnel(
  event: CognitiveFunnelEvent,
  properties?: Record<string, AllowedValue>,
): Promise<void> {
  return insertAnalyticsEvent(event, properties);
}
