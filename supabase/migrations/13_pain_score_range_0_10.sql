-- 통증 점수 척도 변경: 1~5 → 0~10 NRS-11 (Hawker et al., 2011, Arthritis Care Res)
-- 근거: NRS-11(Numeric Rating Scale, 0=전혀 없음 / 10=참을 수 없는 통증)은 임상·심리측정에서
--      0~10 정수 척도로 자기보고 통증 강도를 측정하는 표준이다. 5점 척도(1~5)는
--      해상도가 낮고(2.5씩 점프), Δpain(전·후 차이) 계산에서 유의한 변화를 잡아내기 어렵다.
--      `app/onboarding/visuals/DeltaPain.tsx` 및 onboarding act3 슬라이드는 이미 0~10으로
--      서술돼 있어 코드·문서 정합 차원에서도 통일이 필요했다.
--
-- 마이그레이션 안전성:
--   - 기존 1~5 데이터는 0~10 범위에 그대로 들어맞으므로 데이터 변환·재계산 불필요.
--   - CHECK 제약을 DROP 후 재생성. 제약 이름이 자동 생성되었을 가능성이 있으므로
--     컬럼 단위로 모든 CHECK를 제거 후 새 제약을 부여한다.
--   - logs.pain_score / intervention.reevaluated_pain_score 두 컬럼 모두 갱신.
--   - IF EXISTS / IF NOT EXISTS 사용해 idempotent 보장.
--
-- 영향 범위:
--   - `app/api/review/pain-score/route.ts` Zod 스키마 갱신 (별도 PR 동반)
--   - `app/log/page.tsx`, `app/review/[id]/review-form.tsx` UI 척도 갱신

-- 1. logs.pain_score CHECK 1~5 제거 → 0~10 부여
DO $$
DECLARE
  c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'logs'
      AND att.attname = 'pain_score'
      AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE logs DROP CONSTRAINT IF EXISTS %I', c);
  END LOOP;
END $$;

ALTER TABLE logs
  ADD CONSTRAINT logs_pain_score_range_0_10
  CHECK (pain_score IS NULL OR (pain_score BETWEEN 0 AND 10));

-- 2. intervention.reevaluated_pain_score CHECK 갱신
DO $$
DECLARE
  c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'intervention'
      AND att.attname = 'reevaluated_pain_score'
      AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE intervention DROP CONSTRAINT IF EXISTS %I', c);
  END LOOP;
END $$;

ALTER TABLE intervention
  ADD CONSTRAINT intervention_reevaluated_pain_score_range_0_10
  CHECK (reevaluated_pain_score IS NULL OR (reevaluated_pain_score BETWEEN 0 AND 10));
