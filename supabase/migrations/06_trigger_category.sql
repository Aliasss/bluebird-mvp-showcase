-- Phase 1.1: 트리거 카테고리 자동 분류
-- LLM 분석이 trigger를 8개 카테고리(work/relationship/family/health/self/finance/study/other)
-- 중 하나로 라벨링하면 logs row에 저장한다.
-- 패턴 리포트(Phase 1.3)와 트리거 재방문 감지(Phase 1.2)의 토대.
--
-- IF NOT EXISTS 덕분에 이미 컬럼이 있으면 no-op.

ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS trigger_category TEXT
    CHECK (
      trigger_category IS NULL
      OR trigger_category IN (
        'work',
        'relationship',
        'family',
        'health',
        'self',
        'finance',
        'study',
        'other'
      )
    );

-- 카테고리별 조회 가속 (개인화 패턴 리포트에서 user_id × trigger_category 집계)
CREATE INDEX IF NOT EXISTS idx_logs_user_category
  ON logs (user_id, trigger_category)
  WHERE trigger_category IS NOT NULL;
