-- 14_push_subscriptions.sql
-- Web Push 구독 테이블 — 데일리 체크인 리마인더용.
--
--
-- 정책:
--   - per-row owner only (RLS) — `checkins`, `logs` 와 동일 패턴
--   - UPDATE 정책 없음 — subscription은 append/delete만 (브라우저가 endpoint 변경 시 새 row)
--   - DELETE 정책: 자기 row만. service_role(cron)은 RLS bypass로 410/404 정리
--   - unique(user_id, endpoint) — 동일 디바이스 중복 구독 방지

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON push_subscriptions;
CREATE POLICY push_subscriptions_select_own ON push_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_insert_own ON push_subscriptions;
CREATE POLICY push_subscriptions_insert_own ON push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_delete_own ON push_subscriptions;
CREATE POLICY push_subscriptions_delete_own ON push_subscriptions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 의도적으로 UPDATE 정책 없음 — subscription은 endpoint 변경 시 새 row.

-- ============================================================
-- RPC: cron handler가 단일 round-trip으로 발송 대상 조회.
-- "오늘 KST evening 체크인이 없는 사용자의 활성 subscription".
-- security definer로 service_role 호출에서 RLS 우회 후 일관 동작.
-- ============================================================

CREATE OR REPLACE FUNCTION users_without_today_evening_checkin_with_push()
RETURNS TABLE(user_id UUID, endpoint TEXT, p256dh TEXT, auth TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.user_id, ps.endpoint, ps.p256dh, ps.auth
  FROM push_subscriptions ps
  WHERE NOT EXISTS (
    SELECT 1 FROM checkins c
    WHERE c.user_id = ps.user_id
      AND c.type = 'evening'
      AND c.created_at >= ((NOW() AT TIME ZONE 'Asia/Seoul')::date)::timestamp AT TIME ZONE 'Asia/Seoul'
  );
$$;

-- service_role만 호출 가능하도록 EXECUTE 권한 제한.
REVOKE ALL ON FUNCTION users_without_today_evening_checkin_with_push() FROM PUBLIC;
REVOKE ALL ON FUNCTION users_without_today_evening_checkin_with_push() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION users_without_today_evening_checkin_with_push() TO service_role;

-- 끝.
