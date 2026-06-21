-- 분석 스키마 확장
-- 실행 위치: Supabase SQL Editor

-- analysis 테이블 확장: 이론 기반 메타데이터 저장
ALTER TABLE analysis
  ADD COLUMN IF NOT EXISTS rationale TEXT,
  ADD COLUMN IF NOT EXISTS frame_type TEXT CHECK (frame_type IN ('loss', 'gain', 'mixed')),
  ADD COLUMN IF NOT EXISTS reference_point TEXT,
  ADD COLUMN IF NOT EXISTS probability_estimate FLOAT,
  ADD COLUMN IF NOT EXISTS loss_aversion_signal FLOAT CHECK (
    loss_aversion_signal IS NULL OR (loss_aversion_signal >= 0 AND loss_aversion_signal <= 1)
  ),
  ADD COLUMN IF NOT EXISTS cas_rumination FLOAT CHECK (
    cas_rumination IS NULL OR (cas_rumination >= 0 AND cas_rumination <= 1)
  ),
  ADD COLUMN IF NOT EXISTS cas_worry FLOAT CHECK (
    cas_worry IS NULL OR (cas_worry >= 0 AND cas_worry <= 1)
  ),
  ADD COLUMN IF NOT EXISTS system2_question_seed TEXT,
  ADD COLUMN IF NOT EXISTS decentering_prompt TEXT;

CREATE INDEX IF NOT EXISTS idx_analysis_frame_type ON analysis(frame_type);

-- intervention 테이블 확장: 이론 컨텍스트/실험 메타 저장
ALTER TABLE intervention
  ADD COLUMN IF NOT EXISTS theory_context JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 완료
