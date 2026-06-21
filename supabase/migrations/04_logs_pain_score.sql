-- RLS 감사(2026-04-25) C2 이슈 해소:
-- app/log/page.tsx, app/api/success-log/route.ts에서 pain_score를 사용하지만
-- 01_initial_schema.sql에 컬럼이 정의돼 있지 않음. 프로덕션 DB에는 대시보드에서
-- 수동 추가돼 있을 것으로 추정. 저장소와 동기화 목적.
-- IF NOT EXISTS 덕분에 이미 컬럼이 있으면 no-op.

ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS pain_score INT
    CHECK (pain_score IS NULL OR (pain_score BETWEEN 1 AND 5));
