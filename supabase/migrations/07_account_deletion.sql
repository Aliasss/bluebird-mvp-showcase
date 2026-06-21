-- 07_account_deletion.sql
-- 회원 탈퇴: 30일 유예 예약 + 즉시 영구 삭제 + 복구
--
-- 정책 (privacy policy 2026-04-26 기준):
--   - 기본: 30일 유예 후 영구 삭제 (사용자 실수 복구 목적)
--   - 옵션: 즉시 영구 삭제
--   - 30일 경과 후 영구 삭제는 lazy delete (다음 로그인 시도 시) + 월 1회 정기 cleanup
--
-- 모든 함수는 SECURITY DEFINER로 auth.users에 접근. auth.uid() 기반 self-only.

-- ============================================================
-- 1. 즉시 영구 삭제
-- ============================================================
-- auth.users 삭제 시 logs.user_id ON DELETE CASCADE로 모든 데이터 연쇄 삭제됨.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ============================================================
-- 2. 30일 유예 예약
-- ============================================================
-- raw_user_meta_data에 deletion_scheduled_at = NOW() + 30일 박음.
-- 클라이언트는 이 함수 호출 후 supabase.auth.signOut() 으로 마무리.
CREATE OR REPLACE FUNCTION public.schedule_account_deletion()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_scheduled_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_scheduled_at := NOW() + INTERVAL '30 days';

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'deletion_scheduled_at', v_scheduled_at,
      'deletion_requested_at', NOW()
    )
  WHERE id = v_user_id;

  RETURN v_scheduled_at;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_account_deletion() TO authenticated;

-- ============================================================
-- 3. 삭제 예약 취소 (복구)
-- ============================================================
-- 30일 유예 기간 내 재로그인 시 사용자가 명시적으로 호출.
CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = (
    COALESCE(raw_user_meta_data, '{}'::jsonb)
      - 'deletion_scheduled_at'
      - 'deletion_requested_at'
  )
  WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

-- ============================================================
-- 4. 월 1회 정기 cleanup (운영자 수동 실행)
-- ============================================================
-- deletion_scheduled_at <= NOW() 인 모든 계정 삭제.
-- 베타 단계: 파운더가 Supabase SQL editor에서 SELECT public.cleanup_expired_deletions() 실행.
-- 향후 cron/edge function으로 자동화.
--
-- 주의: SECURITY DEFINER + GRANT는 service_role에만 부여. 일반 사용자 호출 차단.
CREATE OR REPLACE FUNCTION public.cleanup_expired_deletions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH expired AS (
    DELETE FROM auth.users
    WHERE (raw_user_meta_data ->> 'deletion_scheduled_at')::TIMESTAMPTZ <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM expired;

  RETURN v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_deletions() FROM PUBLIC;
-- service_role만 실행 가능 (anon, authenticated 차단)
GRANT EXECUTE ON FUNCTION public.cleanup_expired_deletions() TO service_role;
