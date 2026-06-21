/**
 * 알림 이벤트 기록 helpers.
 */

export type NotificationEventType =
  | 'p2_shown'
  | 'p2_clicked_enable'
  | 'p2_clicked_later'
  | 'p3_shown'
  | 'p3_clicked_enable'
  | 'p3_dismissed'
  | 'permission_granted'
  | 'permission_denied'
  | 'subscribed'
  | 'unsubscribed'
  | 'push_sent'
  | 'push_failed'
  | 'push_gone'
  | 'push_clicked';

/**
 * 클라이언트 사이드에서 호출. 실패는 silently swallow — 측정 누락이 사용자 경험을 저해해선 안 됨.
 */
export async function recordClientEvent(
  type: NotificationEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch('/api/notifications/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, metadata }),
      // 페이지 unload 직전에도 안전하게 전송
      keepalive: true,
    });
  } catch {
    // ignore — 측정 실패는 silent
  }
}

/**
 * 서버(cron)에서 호출. service-role client(SupabaseClient 인스턴스)를 인자로 받음.
 * 실패는 silently swallow — cron 발송 자체를 막아선 안 됨.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServerSupabaseLike = { from: (t: string) => any };

export async function recordServerEvent(
  supabase: ServerSupabaseLike,
  userId: string,
  type: NotificationEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase
      .from('notification_events')
      .insert({ user_id: userId, event_type: type, metadata: metadata ?? null });
  } catch {
    // ignore
  }
}
