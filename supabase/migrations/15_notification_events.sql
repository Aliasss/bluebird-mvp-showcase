-- 15_notification_events.sql
-- 알림 인프라 측정 이벤트 — KPI 산출 (권한 동의율·전환율·거부율).
--
--
-- 정책:
--   - per-row owner only — 사용자가 자신의 이벤트는 조회 가능 (투명성)
--   - INSERT는 본인 또는 service_role
--   - 서버 측 이벤트(push_sent/failed)는 service_role로 기록
--   - 클라이언트 이벤트(p2/p3/granted/denied)는 인증된 사용자가 자기 row 작성

CREATE TABLE IF NOT EXISTS notification_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    -- P2 카드 (체크인 직후)
    'p2_shown', 'p2_clicked_enable', 'p2_clicked_later',
    -- P3 배너 (대시보드)
    'p3_shown', 'p3_clicked_enable', 'p3_dismissed',
    -- 권한 결과
    'permission_granted', 'permission_denied',
    -- 구독 동기화
    'subscribed', 'unsubscribed',
    -- 서버 발송
    'push_sent', 'push_failed', 'push_gone',
    -- 사용자 도달
    'push_clicked'
  )),
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_user_type_time
  ON notification_events(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_type_time
  ON notification_events(event_type, created_at DESC);

ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_events_select_own ON notification_events;
CREATE POLICY notification_events_select_own ON notification_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notification_events_insert_own ON notification_events;
CREATE POLICY notification_events_insert_own ON notification_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE/DELETE 정책 없음 — append-only.
-- service_role은 RLS 우회 (서버 발송 이벤트 기록).

-- ============================================================
-- KPI 집계 view — D7·D14 측정 단순화.
-- ============================================================

CREATE OR REPLACE VIEW v_push_funnel AS
WITH base AS (
  SELECT user_id, event_type, created_at FROM notification_events
)
SELECT
  COUNT(DISTINCT CASE WHEN event_type = 'p2_shown' THEN user_id END) AS p2_unique_shown,
  COUNT(DISTINCT CASE WHEN event_type = 'permission_granted' THEN user_id END) AS unique_granted,
  COUNT(DISTINCT CASE WHEN event_type = 'permission_denied' THEN user_id END) AS unique_denied,
  COUNT(DISTINCT CASE WHEN event_type = 'subscribed' THEN user_id END) AS unique_subscribed,
  COUNT(*) FILTER (WHERE event_type = 'push_sent') AS total_sent,
  COUNT(*) FILTER (WHERE event_type = 'push_clicked') AS total_clicked
FROM base;

-- view는 RLS 우회용 — service_role만 조회 (운영자가 KPI 산출 시).
REVOKE ALL ON v_push_funnel FROM PUBLIC, anon, authenticated;
GRANT SELECT ON v_push_funnel TO service_role;

-- 끝.
