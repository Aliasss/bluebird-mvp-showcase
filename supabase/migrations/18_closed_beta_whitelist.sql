-- 18_closed_beta_whitelist.sql
-- 폐쇄 베타(closed beta) 시스템 — 2026-05-17.
-- 사용자 결정: 에반젤리스트 비선정자는 BlueBird 서비스 자체에 진입 불가.
--   → 응모는 anon 가능(가입 X) + 가입은 selected_emails 화이트리스트만 허용.
--
-- 변경 사항 vs Migration 17:
--   - evangelist_applications.user_id: NOT NULL → NULLABLE (anon 응모 허용)
--   - anon INSERT 정책 추가
--   - selected_emails 화이트리스트 테이블 신설
--   - auth.users BEFORE INSERT 트리거: 화이트리스트 외 가입 차단
--
-- 정합:
--   - 응모 흐름: 비회원 → /apply 폼 → evangelist_applications INSERT (user_id=NULL)
--   - 선발 흐름: 운영자 → selected_emails INSERT → 응모자에게 메일 안내 → /auth/signup
--   - 가입 흐름: signup → trigger 검사 → email IN selected_emails 면 통과, 아니면 RAISE
--   - 가입 후: 별도 후속 작업으로 evangelist_applications.user_id 연결 (운영자 SQL)

-- ============================================================================
-- (1) evangelist_applications: user_id NULLABLE 전환 + anon INSERT 정책
-- ============================================================================

ALTER TABLE evangelist_applications
  ALTER COLUMN user_id DROP NOT NULL;

-- 본인 INSERT 정책은 그대로 유지 (로그인 응모도 허용 — 향후 확장 여지)
-- 추가: 비회원(anon) INSERT 허용. user_id 는 반드시 NULL 이어야 함 (도용 방지).
DROP POLICY IF EXISTS evangelist_applications_insert_anon ON evangelist_applications;
CREATE POLICY evangelist_applications_insert_anon ON evangelist_applications
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- 본인 응모 유일 제약 인덱스: user_id NULL 인 경우는 제외 (anon 응모는 다중 가능 — 운영자 후처리)
DROP INDEX IF EXISTS idx_evangelist_applications_user_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_evangelist_applications_user_unique
  ON evangelist_applications(user_id)
  WHERE status != 'withdrawn' AND user_id IS NOT NULL;

-- anon 응모 중복 방지: contact_email + status='pending' 유일성
-- (운영자가 status 변경하면 재응모 가능. anon 은 본인 row 조회 불가하므로 application-side 점검 X)
CREATE UNIQUE INDEX IF NOT EXISTS idx_evangelist_applications_email_pending_unique
  ON evangelist_applications(contact_email)
  WHERE status = 'pending';

-- ============================================================================
-- (2) selected_emails 화이트리스트 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS selected_emails (
  email           TEXT PRIMARY KEY,
  application_id  UUID REFERENCES evangelist_applications(id) ON DELETE SET NULL,
  notes           TEXT,                                          -- 운영자 메모 (선발 사유 등)
  added_by        TEXT,                                          -- 운영자 식별자 (이메일/이름)
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at         TIMESTAMPTZ                                    -- 실제 가입 완료 시각
);

CREATE INDEX IF NOT EXISTS idx_selected_emails_added_at
  ON selected_emails(added_at DESC);

-- RLS: anon/authenticated 모두 SELECT/INSERT/UPDATE/DELETE 불가. service_role 만 접근.
ALTER TABLE selected_emails ENABLE ROW LEVEL SECURITY;
-- 정책 정의 없음 → 기본 거부. service_role 은 RLS 우회.

-- ============================================================================
-- (3) auth.users BEFORE INSERT 트리거 — 화이트리스트 외 가입 차단
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_closed_beta_whitelist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_allowed BOOLEAN;
BEGIN
  -- email 누락 시 (소셜 로그인 일부 케이스) 일단 통과 — application-side 후처리
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  -- 대소문자 무시 매칭
  SELECT EXISTS (
    SELECT 1 FROM public.selected_emails
    WHERE LOWER(email) = LOWER(NEW.email)
  ) INTO is_allowed;

  IF NOT is_allowed THEN
    RAISE EXCEPTION 'closed_beta: 현재 BlueBird MVP는 폐쇄 베타 운영 중입니다. /apply 에서 응모해주세요.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 화이트리스트 통과 → used_at 기록
  UPDATE public.selected_emails
     SET used_at = NOW()
   WHERE LOWER(email) = LOWER(NEW.email)
     AND used_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_closed_beta_whitelist ON auth.users;
CREATE TRIGGER trg_enforce_closed_beta_whitelist
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_closed_beta_whitelist();

-- 끝.
