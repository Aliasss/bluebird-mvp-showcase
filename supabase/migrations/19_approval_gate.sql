-- 19_approval_gate.sql
-- 폐쇄 베타 모델 전환 — 2026-05-18.
-- 결정: 가입+이메일 인증은 허용 + 서비스 진입 시점에서 게이트.
--
-- 변경 사항 vs Migration 18:
--   - auth.users BEFORE INSERT 트리거 제거 (가입 자체는 누구나 가능)
--   - selected_emails 테이블은 그대로 유지 (역할 전환: 가입 차단 → 서비스 접근 화이트리스트)
--   - is_current_user_approved() RPC 신설 — 현재 세션 이메일의 승인 여부 검사
--   - 기존 4명 사용자 사전 등록 (락아웃 방지)
--
-- 게이트는 app 레이어 (Next.js root middleware) 에서 처리.
-- 미승인자는 /waitlist 로 리다이렉트 — "현재 테스트 기간, 승인자만 접근 가능".

-- ============================================================================
-- (1) Migration 18 트리거·함수 제거
-- ============================================================================

DROP TRIGGER IF EXISTS trg_enforce_closed_beta_whitelist ON auth.users;
DROP FUNCTION IF EXISTS public.enforce_closed_beta_whitelist();

-- ============================================================================
-- (2) 현재 세션 사용자의 승인 여부 검사 RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_current_user_approved()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_email TEXT;
  v_approved BOOLEAN;
BEGIN
  -- auth.email() 또는 auth.jwt() 에서 현재 세션 이메일 추출
  v_email := auth.email();

  -- 비로그인 → 미승인
  IF v_email IS NULL OR v_email = '' THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.selected_emails
    WHERE LOWER(email) = LOWER(v_email)
  ) INTO v_approved;

  RETURN v_approved;
END;
$$;

-- anon/authenticated 모두 호출 가능 (자기 자신의 승인 상태 확인)
GRANT EXECUTE ON FUNCTION public.is_current_user_approved() TO anon, authenticated;

-- ============================================================================
-- (3) 기존 4명 사용자 사전 등록 (락아웃 방지)
--    파운더 본인 + 기존 테스트 사용자. 운영자가 사후에 정리 가능.
-- ============================================================================

INSERT INTO public.selected_emails (email, notes, added_by)
SELECT LOWER(u.email), 'pre-existing user (migrated from open access)', 'migration_19'
FROM auth.users u
WHERE u.email IS NOT NULL
  AND u.email != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.selected_emails s WHERE LOWER(s.email) = LOWER(u.email)
  );

-- 끝.
