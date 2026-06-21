import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { sendDecisionReviewReminder } from '@/lib/notifications/send';
import { recordServerEvent } from '@/lib/notifications/events';
import { logServerError } from '@/lib/logging/server-logger';
import { isDecisionReviewed } from '@/lib/decision/review-status';

/**
 * 결정별 1회성 복기 리마인더 cron 진입점 (Task 8b).
 *
 * review_at 이 도래한 결정마다, 그 결정의 복기를 권하는 푸시를 **결정당 정확히 1회** 발송한다.
 * url = `/decision/<id>/review`. 반복·재귀 발송 없음.
 *
 * **Vercel Cron 은 GET 요청을 보낸다** — POST 만 export 하면 405 가 반사되어
 * 핸들러 코드가 한 번도 실행되지 않는다 (2026-05-12 production 사고 원인 — checkin-reminder 와 동일).
 * GET·POST 모두 동일 로직으로 분기 (POST 는 수동 curl 검증용 보존).
 *
 * Bearer 인증: Vercel cron 은 Authorization: Bearer $CRON_SECRET 자동 첨부.
 * 수동 호출도 동일 헤더 필요.
 *
 * ── exactly-once 보장 (GUARD #4) ──────────────────────────────────────────
 *   ① 조회 필터 `review_notified_at IS NULL` → 아직 처리하지 않은 결정만 대상.
 *   ② 처리(발송 시도 또는 구독 없음 확정) 직후 `review_notified_at = now()` 마킹.
 *   ③ 다음 cron tick 은 마킹된 결정을 다시 조회하지 않음 → 결정당 정확히 1회.
 *
 * ── 구독 없음(opt-out / 미구독) 처리 ──────────────────────────────────────
 *   푸시 구독이 없는 사용자는 발송을 SKIP 하되 review_notified_at 은 **그대로 마킹**한다.
 *   이유: 마킹하지 않으면 그 결정이 매 tick 마다 영구 재조회 대상이 되어
 *   (review_at 은 과거로 고정) cron 부하가 단조 증가한다. "1회성 처리 완료" 시맨틱을 위해
 *   '발송 못 했지만 처리는 끝났다'로 확정한다. (지연 재발송·구독 복구 시 재시도는 v1 범위 밖.)
 */

interface DueDecision {
  id: string;
  user_id: string;
  trigger: string | null;
  problem_type: 'tame' | 'wild' | null;
  actual_outcome: string | null;
  decision_frame: Record<string, unknown> | null;
}

interface PushSubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function handleCron(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    // review_at 도래 + 미처리(review_notified_at IS NULL) 후보를 조회한다.
    // ⚠️ "미복기" 판정은 SQL 의 actual_outcome IS NULL 에 더는 의존하지 않는다(Phase 4 #1-risk):
    //   wild 트랙은 actual_outcome 을 null 로 유지하고 "복기 완료"를 decision_frame.wild.review 로 표시하므로,
    //   actual_outcome IS NULL 로 SQL 프리필터하면 *이미 복기된 wild 결정*이 영원히 리마인드된다.
    //   → SQL 은 review_at·review_notified_at 만 거르고(인덱스 가능), 복기 여부는 아래에서
    //     isDecisionReviewed(트랙별 단일 진실 공급원)로 post-filter 한다.
    //   tame/레거시 동작은 동일: actual_outcome 있으면 isDecisionReviewed=true → skip(아래에서 마킹).
    // service-role 클라이언트로 교차 사용자 조회 (RLS 우회).
    const { data, error } = await supabase
      .from('logs')
      .select('id, user_id, trigger, problem_type, actual_outcome, decision_frame')
      .eq('log_type', 'decision')
      .lte('review_at', new Date().toISOString())
      .is('review_notified_at', null);

    if (error) {
      logServerError('api/cron/decision-review-reminder.query', error);
      return NextResponse.json({ error: '조회 실패' }, { status: 500 });
    }

    const targets: DueDecision[] = data ?? [];

    let sent = 0;
    let skipped = 0;
    let alreadyReviewed = 0;

    // 결정 단위 순차 처리 — 결정마다 (복기 여부 post-filter → 구독 조회 → 발송/skip → review_notified_at 마킹).
    for (const decision of targets) {
      let didSend = false;

      // 이미 복기된 결정(tame=actual_outcome 있음 / wild=decision_frame.wild.review 존재)은
      //   리마인드하지 않는다. 단 마킹은 *건너뛰지 않는다*: 발송 로직만 skip 하고 아래 review_notified_at
      //   마킹까지 흘러가게 한다 — 그래야 review_at 이 과거로 고정된 이 row 가 매 tick 영구 재조회되지
      //   않는다(exactly-once / 단조 부하 증가 방지, 구독 없음 skip 과 동일한 "처리 완료" 시맨틱).
      const reviewedAlready = isDecisionReviewed(decision);

      try {
        if (reviewedAlready) {
          // 이미 복기됨 → 발송 없이 처리 완료로 집계. (아래 마킹으로 재조회 차단.)
          alreadyReviewed += 1;
        } else {
        // 해당 사용자의 활성 push 구독 조회 — checkin 인프라(push_subscriptions)와 동일 소스.
        const { data: subs, error: subErr } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', decision.user_id);

        if (subErr) {
          logServerError('api/cron/decision-review-reminder.subs', subErr);
        }

        const subRows: PushSubRow[] = subs ?? [];
        const url = `/decision/${decision.id}/review`;

        if (subRows.length === 0) {
          // 구독 없음(opt-out / 미구독) → 발송 SKIP. review_notified_at 은 아래에서 마킹.
          skipped += 1;
        } else {
          // 동일 사용자의 모든 디바이스로 발송. 일부 실패해도 다른 디바이스 발송은 진행.
          const results = await Promise.allSettled(
            subRows.map((s) =>
              sendDecisionReviewReminder(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                decision.user_id,
                url,
              ),
            ),
          );

          const anySent = results.some((r) => r.status === 'fulfilled');
          if (anySent) {
            sent += 1;
            didSend = true;
          } else {
            // 모든 디바이스 발송 실패(일시 오류 등) → 발송 못 함으로 집계.
            skipped += 1;
          }

          // 측정 이벤트 — 발송 결과별 분기. 실패해도 cron 응답엔 영향 없음.
          await Promise.allSettled(
            results.map((r) => {
              if (r.status === 'fulfilled') {
                const eventType =
                  r.value.status === 'gone' ? 'push_gone' : 'push_sent';
                return recordServerEvent(supabase, decision.user_id, eventType);
              }
              return recordServerEvent(
                supabase,
                decision.user_id,
                'push_failed',
                { error: String(r.reason) },
              );
            }),
          );

          const sample = results
            .filter((r) => r.status === 'rejected')
            .slice(0, 3);
          sample.forEach((r) => {
            if (r.status === 'rejected')
              logServerError(
                'api/cron/decision-review-reminder.send',
                r.reason,
              );
          });
        }
        } // end else (미복기 — 발송 분기)
      } catch (perDecisionErr) {
        // 단일 결정 처리 중 예기치 못한 오류 — 전체 cron 을 중단시키지 않음.
        // 단, 아래 마킹은 그대로 진행한다(GUARD #4: 영구 재조회 방지 = exactly-once).
        logServerError(
          'api/cron/decision-review-reminder.decision',
          perDecisionErr,
        );
      }

      // 처리 완료 마킹 — 발송 여부와 무관하게 review_notified_at = now().
      // 이것이 exactly-once 의 핵심: 다음 tick 에서 이 결정은 IS NULL 필터에 걸리지 않는다.
      const { error: markErr } = await supabase
        .from('logs')
        .update({ review_notified_at: new Date().toISOString() })
        .eq('id', decision.id);

      if (markErr) {
        // 마킹 실패 시 다음 tick 에 재처리될 수 있음(중복 발송 위험) → 반드시 로깅.
        logServerError('api/cron/decision-review-reminder.mark', markErr);
      }

      void didSend; // 발송 여부는 sent/skipped 카운트로 이미 반영됨.
    }

    console.log(
      `[cron/decision-review-reminder] method=${request.method} processed=${targets.length} sent=${sent} skipped=${skipped} alreadyReviewed=${alreadyReviewed}`,
    );

    return NextResponse.json(
      { processed: targets.length, sent, skipped, alreadyReviewed },
      { status: 200 },
    );
  } catch (error) {
    logServerError('api/cron/decision-review-reminder', error);
    return NextResponse.json({ error: 'Cron 처리 실패' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
