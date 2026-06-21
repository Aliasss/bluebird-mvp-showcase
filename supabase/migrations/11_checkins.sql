-- 11_checkins.sql
-- 체크인(아침/저녁) 기록 테이블.
--
-- 배경:
--   - app/api/checkin/route.ts, app/checkin/page.tsx, app/checkin/history/page.tsx,
--     app/dashboard/page.tsx 가 'checkins' 테이블을 참조하지만
--     supabase/migrations/ 에 정의 파일이 없음. 프로덕션 DB엔 수동 생성된
--     상태로 추정 (04_logs_pain_score.sql 과 동일 패턴의 schema drift).
--   - IF NOT EXISTS / DROP POLICY IF EXISTS 로 idempotent. 이미 존재해도 no-op.
--
-- 컬럼은 코드 참조에서 역추적:
--   - type: 'morning' | 'evening' (Zod enum, app/api/checkin/route.ts)
--   - mood_word: 아침 체크인 — 1~20자 (Zod), nullable (저녁엔 없음)
--   - system2_moment: 저녁 체크인 — 1~500자 (Zod), nullable (아침엔 없음)

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('morning', 'evening')),
  mood_word TEXT,
  system2_moment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KST 일자별 중복 체크용 (user_id × type × created_at 범위 조회) + history 정렬용
CREATE INDEX IF NOT EXISTS idx_checkins_user_type_created
  ON checkins(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_user_created
  ON checkins(user_id, created_at DESC);

-- ============================================================
-- RLS — logs / user_patterns 와 동일 패턴 (자기 row만 접근).
-- ============================================================
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checkins_select_own ON checkins;
CREATE POLICY checkins_select_own ON checkins
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS checkins_insert_own ON checkins;
CREATE POLICY checkins_insert_own ON checkins
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 의도적으로 UPDATE 정책 없음 — checkin은 append-only (수정 0건).
-- 의도적으로 DELETE 정책 없음 — ON DELETE CASCADE (auth.users)로만 정리.
--   service_role(RLS bypass)은 운영 정리 가능.

-- 끝.
