import { NextResponse } from 'next/server';
import { trackCognitiveFunnel } from '@/lib/analytics/server';
import { sanitizeDecisionEvent } from '@/lib/analytics/decision-events';

/**
 * POST /api/analytics/decision-event
 *
 * 결정 루프의 *클라이언트* 측 검증 이벤트 브리지 (decision-pivot ⑤ · spec 2026-06-06 §D.2).
 * `/api/analytics/log-view` 와 동일한 best-effort 패턴 — 발신 실패가 사용자 흐름을 방해하지 않는다.
 *
 * 서버 라우트(결정 기록·복기)는 trackCognitiveFunnel 을 직접 호출하지만, 진입/노출/열람 시점은
 * 클라이언트만 알 수 있어 이 얇은 브리지를 둔다. trackCognitiveFunnel 내부에서 auth 검사 +
 * 비인증 silent skip + analytics_events INSERT 까지 처리.
 *
 * PII 가드(§D.2): 클라이언트 임의 properties 를 막기 위해 sanitizeDecisionEvent 로 allowlist 만 통과.
 *   결정/결과 *원문* 은 애초에 받지 않으며, 허용 키(from)도 비식별 enum 뿐.
 */
export async function POST(request: Request) {
  let body: {
    event?: unknown;
    from?: unknown;
    problemType?: unknown;
    qCount?: unknown;
    cohort?: unknown;
    track?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    // 파싱 실패도 사용자 흐름과 무관 — 조용히 무시.
    return NextResponse.json({ ok: true });
  }

  // properties 묶음을 sanitizer 에 넘긴다 — 허용 키(from·problemType·qCount)만 통과,
  //   나머지는 sanitizer 가 드롭(권위 allowlist). 결정 원문은 애초에 받지 않는다.
  const sanitized = sanitizeDecisionEvent(body?.event, {
    from: body?.from,
    problemType: body?.problemType,
    qCount: body?.qCount,
    cohort: body?.cohort, // 복기 미리보기 A/B 군 — sanitizer 가 enum('preview'|'control')만 통과
    track: body?.track, // 미리보기 노출 트랙 — sanitizer 가 enum('tame'|'wild')만 통과
  });
  if (!sanitized) {
    // 허용 목록 밖 이벤트는 적재하지 않는다(서버 전용 이벤트 위조 차단).
    return NextResponse.json({ ok: true });
  }

  await trackCognitiveFunnel(sanitized.event, sanitized.properties);
  return NextResponse.json({ ok: true });
}
