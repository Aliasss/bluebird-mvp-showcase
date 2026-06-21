import webpush from 'web-push';
import { getVapidConfig } from './vapid';
import { CHECKIN_REMINDER_PUSH, DECISION_REVIEW_REMINDER_PUSH } from './copy';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { logServerError } from '@/lib/logging/server-logger';

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const cfg = getVapidConfig();
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  vapidConfigured = true;
}

export interface CheckinReminderResult {
  endpoint: string;
  status: 'sent' | 'gone';
}

/**
 * 체크인 리마인더 1건 발송.
 * - 200/201 → status 'sent' resolve
 * - 410 / 404 → push_subscriptions row 삭제 후 status 'gone' resolve
 * - 그 외 (500 등 일시 오류) → throw (cron의 Promise.allSettled가 reject로 분류)
 */
export async function sendCheckinReminder(
  sub: PushSubscription,
  userId: string,
): Promise<CheckinReminderResult> {
  ensureVapid();

  const payload = JSON.stringify({
    title: CHECKIN_REMINDER_PUSH.title,
    body: CHECKIN_REMINDER_PUSH.body,
    url: CHECKIN_REMINDER_PUSH.url,
  });

  // urgency 'high' — FCM/Android 가 IMPORTANCE_HIGH 로 매핑, 잠금화면 노출·소리·진동 강화.
  // 2026-05-20 사용자 결정 (옵션 B): 푸시 자체는 정상 발화하나 자연 dismiss 로 인지 누락 문제 → 디바이스 노출 강도만 상향.
  // 자율성 본질 정합 유지 — 발화 빈도·재전송은 변경 X.
  const options = { urgency: 'high' as const };

  try {
    await webpush.sendNotification(sub, payload, options);
    return { endpoint: sub.endpoint, status: 'sent' };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 410 || statusCode === 404) {
      // 만료/유효하지 않은 subscription — DB에서 회수
      try {
        const supabase = createServiceRoleClient();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
          .eq('user_id', userId);
      } catch (cleanupErr) {
        logServerError('lib/notifications/send.cleanup', cleanupErr);
      }
      return { endpoint: sub.endpoint, status: 'gone' };
    }
    throw err;
  }
}

export interface DecisionReviewReminderResult {
  endpoint: string;
  status: 'sent' | 'gone';
}

/**
 * 결정별 1회성 복기 리마인더 1건 발송 (Task 8b).
 * sendCheckinReminder 와 동일한 발송·정리 규약 — 차이는 결정마다 url 이 다르다는 점뿐.
 * - 200/201 → status 'sent' resolve
 * - 410 / 404 → push_subscriptions row 삭제 후 status 'gone' resolve
 * - 그 외 (500 등 일시 오류) → throw (cron 의 Promise.allSettled 가 reject 로 분류)
 *
 * @param url 해당 결정의 복기 경로 — `/decision/<id>/review`
 */
export async function sendDecisionReviewReminder(
  sub: PushSubscription,
  userId: string,
  url: string,
): Promise<DecisionReviewReminderResult> {
  ensureVapid();

  const payload = JSON.stringify({
    title: DECISION_REVIEW_REMINDER_PUSH.title,
    body: DECISION_REVIEW_REMINDER_PUSH.body,
    url,
    tag: DECISION_REVIEW_REMINDER_PUSH.tag,
  });

  // checkin 리마인더와 동일 urgency 정책 — 디바이스 노출 강도만 상향, 빈도·재전송은 변경 X.
  const options = { urgency: 'high' as const };

  try {
    await webpush.sendNotification(sub, payload, options);
    return { endpoint: sub.endpoint, status: 'sent' };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 410 || statusCode === 404) {
      // 만료/유효하지 않은 subscription — DB에서 회수
      try {
        const supabase = createServiceRoleClient();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
          .eq('user_id', userId);
      } catch (cleanupErr) {
        logServerError('lib/notifications/send.cleanup', cleanupErr);
      }
      return { endpoint: sub.endpoint, status: 'gone' };
    }
    throw err;
  }
}
