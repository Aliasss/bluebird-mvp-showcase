-- 26_decision_perf_indexes.sql — 결정/cron 쿼리 + FK 커버 인덱스 — 2026-06-07.
--
-- DB 정합 점검의 비차단 성능 권장 중 안전한 2건만 적용한다.
-- 가산(additive)-only: 인덱스 추가만, 데이터·제약·정책 무변경. 롤백 = DROP INDEX.
-- (RLS auth_rls_initplan 재작성·checkins 중복 정책 정리는 접근-권한 직결이라 별도 하드닝 패스로 보류.)
--
-- ① logs.review_at — '복기 대기' 카드 + 결정 복기 알림 cron 이
--    `review_at <= now()` 로 조회. review_at 은 결정(tame/wild)만 채우므로
--    부분 인덱스(WHERE review_at IS NOT NULL)로 결정 행만 인덱싱.
-- ② safety_events.log_id — FK(safety_events_log_id_fkey) 커버 인덱스 부재(advisor INFO).

CREATE INDEX IF NOT EXISTS idx_logs_review_at
  ON public.logs (review_at)
  WHERE review_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_safety_events_log_id
  ON public.safety_events (log_id);

-- 끝.
