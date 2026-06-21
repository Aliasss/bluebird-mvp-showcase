-- Δpain 측정을 위한 재평가 컬럼 추가.
-- reevaluated_pain_score: 사용자가 완료 후 6-48h 시점에 다시 매긴 pain score (1-5)
-- reevaluated_at: 재평가 시점
-- review_dismissed_at: 사용자가 카드 X로 영구 해제한 시점 (이후 카드 안 뜸)

ALTER TABLE intervention
  ADD COLUMN IF NOT EXISTS reevaluated_pain_score INT
    CHECK (reevaluated_pain_score IS NULL OR (reevaluated_pain_score BETWEEN 1 AND 5)),
  ADD COLUMN IF NOT EXISTS reevaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_dismissed_at TIMESTAMPTZ;

-- 대시보드 쿼리 성능용 인덱스. completed_at 범위 + NULL 필터 조합이 잦음.
CREATE INDEX IF NOT EXISTS idx_intervention_pending_review
  ON intervention(completed_at DESC)
  WHERE is_completed = TRUE
    AND reevaluated_pain_score IS NULL
    AND review_dismissed_at IS NULL;
