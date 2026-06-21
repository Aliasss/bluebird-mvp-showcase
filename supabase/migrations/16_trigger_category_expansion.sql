-- 16_trigger_category_expansion.sql
-- 트리거 카테고리 4개 신규 추가 — 인지 왜곡 자주 겪는 사용자의 공통 특성 영역
-- 학술 근거가 단단한 4개 후보로 확정. 베타 테스트 전 MVP 반영.
--
-- 신규 4개 카테고리:
--   - sleep_rumination — 잠 안 옴 / 자정 후 반추 (Wells 2009 CAS)
--   - decision_paralysis — 결정 마비 / overthinking (Charpentier 2017)
--   - social_comparison — SNS·동료 비교로 인한 자기 평가 (Vogel 2014)
--   - avoidance_accumulation — 회피 누적 — 발표·관계·승진 회피 (Struijs 2017 9년 종단)
--
-- CHECK 제약 변경 — 기존 8개 + 신규 4개 = 총 12개 허용.
-- IF NOT EXISTS 멱등 가드 + DO 블록으로 기존 제약 제거 후 재생성 (06과 동일 패턴).

-- 기존 CHECK 제약 제거 (이름이 자동 생성됐을 수 있어 컬럼 단위 일괄 제거)
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
      AND att.attname = 'trigger_category'
      AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE logs DROP CONSTRAINT IF EXISTS %I', c);
  END LOOP;
END $$;

-- 신규 CHECK 제약 — 12개 카테고리 허용
ALTER TABLE logs
  ADD CONSTRAINT logs_trigger_category_v2
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
      'other',
      -- 2026-05-16 확장 4개
      'sleep_rumination',
      'decision_paralysis',
      'social_comparison',
      'avoidance_accumulation'
    )
  );

-- idx_logs_user_category 인덱스는 06번에서 이미 생성됨 (그대로 활용).

-- 끝.
