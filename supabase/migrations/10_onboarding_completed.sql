-- 10_onboarding_completed.sql
-- 온보딩 완료 시점 기록 (스킵·완주 둘 다 갱신).
-- 도입: 2026-05-01.
--
-- 결정:
--   - public.user_profiles 테이블이 마이그레이션·스키마에 부재. ALTER TABLE 경로 불가.
--   - auth.users.user_metadata 사용 불가 (수정 권한 까다로움 + RLS 호환 X).
--   - 신규 user_onboarding 테이블 채택. logs/user_patterns 와 동일 RLS 패턴.
--
-- 동작:
--   - 첫 가입 시 row 부재 → /dashboard 진입 시 /onboarding/1 redirect.
--   - Act 1·2 X 버튼(스킵), Act 3 끝 「지금 첫 디버깅 시작하기」(완주) 모두 row 작성.
--   - reached_act 는 사용자가 본 가장 깊은 Act (1·2·3) — 스킵 분석 시 시그널.
--   - /me에서 "다시 보기" 클릭은 row를 삭제하지 않음 (?replay=1 query param 사용).

-- ============================================================
-- user_onboarding 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reached_act INT NOT NULL DEFAULT 1
);

-- reached_act CHECK 제약 — 1·2·3 외 값 차단.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_onboarding_reached_act_chk'
  ) THEN
    ALTER TABLE user_onboarding
      ADD CONSTRAINT user_onboarding_reached_act_chk
      CHECK (reached_act IN (1, 2, 3));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_onboarding_completed_at
  ON user_onboarding(completed_at DESC);

-- ============================================================
-- RLS — logs / user_patterns 와 동일 패턴 (자기 row만 SELECT/INSERT/UPDATE).
-- DELETE 정책 없음 → ON DELETE CASCADE (auth.users)로만 정리.
-- ============================================================
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_onboarding_select_own ON user_onboarding;
CREATE POLICY user_onboarding_select_own ON user_onboarding
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_onboarding_insert_own ON user_onboarding;
CREATE POLICY user_onboarding_insert_own ON user_onboarding
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_onboarding_update_own ON user_onboarding;
CREATE POLICY user_onboarding_update_own ON user_onboarding
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 끝.
