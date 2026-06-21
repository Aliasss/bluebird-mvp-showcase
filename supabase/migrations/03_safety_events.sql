-- 위기 감지 이벤트 로그.
-- 운영 검증, 오탐률 분석, 사용자가 "계속할래요"로 우회한 케이스 추적용.

CREATE TABLE IF NOT EXISTS safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_id UUID REFERENCES logs(id) ON DELETE SET NULL,
  level TEXT NOT NULL CHECK (level IN ('caution', 'critical')),
  detected_by TEXT NOT NULL CHECK (detected_by IN ('keyword', 'llm', 'llm_fallback')),
  matched_pattern TEXT,
  llm_reason TEXT,
  user_override BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_events_user_id ON safety_events(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_events_created_at ON safety_events(created_at DESC);

ALTER TABLE safety_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "safety_events_select_own" ON safety_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "safety_events_insert_own" ON safety_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE는 user_override 필드에 한정. 단순화를 위해 row 전체 UPDATE 허용하되 RLS로 user_id 고정.
CREATE POLICY "safety_events_update_own" ON safety_events
  FOR UPDATE USING (auth.uid() = user_id);
