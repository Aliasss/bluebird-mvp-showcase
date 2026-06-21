-- 25_fix_checkins_fk_cascade.sql — 탈퇴(영구 삭제) 버그 수정 — 2026-06-07.
--
-- 증상: /me/delete-account 에서 '지금 즉시 영구 삭제' 클릭 시 에러.
-- 원인: delete_my_account() 는 `DELETE FROM auth.users` 만 수행하고 나머지는 FK CASCADE 에 의존한다.
--   auth.users 를 참조하는 모든 public 테이블이 ON DELETE CASCADE 인데
--   **checkins.checkins_user_id_fkey 만 ON DELETE NO ACTION** 이라,
--   체크인 기록이 있는 사용자는 auth.users 삭제가 FK 위반으로 차단되어 탈퇴가 실패한다.
-- 수정: 다른 사용자 테이블과 동일하게 ON DELETE CASCADE 로 정정(사용자 삭제 시 체크인도 함께 삭제 — PIPA 파기 정합).
--
-- 안전: FK 삭제 동작만 변경(데이터 변경 없음). 기존 row 영향 없음.

ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_user_id_fkey;
ALTER TABLE public.checkins
  ADD CONSTRAINT checkins_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 끝.
