-- 08_analytics_events.sql
-- 분석 품질 메트릭을 위한 자체 이벤트 테이블.
-- Vercel Analytics Custom Events 의존도 제거. 운영자가 SQL로 직접 쿼리.
--
-- 이벤트 종류 (lib/analytics/server.ts 와 동기):
--   - analyze_parse_failed
--   - analyze_retry_fired
--   - analyze_distortion_zero
--   - questions_fallback

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created
  ON analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events (user_id, created_at DESC);

-- RLS: 사용자는 본인 이벤트만 INSERT, 본인 이벤트도 SELECT 불가.
-- 운영자(파운더)는 service_role 또는 Supabase SQL editor를 통해 전체 조회.
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own analytics events" ON analytics_events;
CREATE POLICY "Users can insert own analytics events" ON analytics_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 의도적으로 SELECT 정책 없음 — authenticated 사용자도 본인 이벤트 조회 불가.
-- 운영자는 SQL editor에서 service_role로 자유롭게 조회.

-- ============================================================
-- 운영자용 집계 view (월 1회 또는 주 1회 점검)
-- ============================================================
-- Supabase SQL editor에서:
--   SELECT * FROM analytics_quality_summary;
-- 형태로 빠르게 확인.
--
-- security_invoker=true로 설정해 underlying 테이블 RLS를 강제.
-- analytics_events 에 SELECT 정책이 없으므로 authenticated·anon은 빈 결과,
-- service_role만 RLS bypass로 전체 조회 가능.
CREATE OR REPLACE VIEW analytics_quality_summary
WITH (security_invoker = true)
AS
SELECT
  event_name,
  date_trunc('day', created_at) AS day,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY 2 DESC, 1;
