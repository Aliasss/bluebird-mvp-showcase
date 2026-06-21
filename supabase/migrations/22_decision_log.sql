-- 22_decision_log.sql
-- 의사결정 도구 피벗(예측 봉인 → 결과 캘리브레이션) 데이터 레이어 1단계 — 2026-06-06.
--
-- ⚠️ 가산(additive)-only / 롤백 안전(rollback-safe):
--   - 이 마이그레이션은 logs 테이블에 NULL 허용 컬럼만 ADD 한다.
--   - 기존 컬럼 DROP·ALTER(타입 변경) 없음. 기존 데이터·코드 100% 보존.
--   - 언제든 v1으로 롤백 가능 — 신규 컬럼은 모두 NULL 허용이라 무시하면 됨.
--
-- 배경:
--   - BlueBird가 "인지 왜곡 디버깅" 앱 → "의사결정 도구"로 피벗.
--   - 한 번의 의사결정 루프 안에서 사용자가 ① 선택지·예상 결과·확신도를 기록(record)하고
--     ② 예정 시점에 실제 결과를 관찰(observe)·복기하여 캘리브레이션 산출.
--   - 인지 왜곡 분석은 이 루프 안의 한 단계로 임베드됨.
--
-- 어휘 게이트: decision_* / record·observe 어휘만 사용.
--   탐지/진단/교정 같은 의료기기 함의 용어는 컬럼명·주석에서 사용하지 않음.

-- ============================================================
-- 1. logs.log_type — 'decision' 값 허용(가산적 확대)
-- ============================================================
-- ⚠️ 프로덕션 실측: logs.log_type 실제 값은 'distortion'(인지왜곡 로그)·'success'.
--   repo 의 12_schema_drift_fixes.sql CHECK IN ('normal','success') 는 prod 에 적용된 적 없음
--   (마이그레이션 ledger drift — 일부 수기 적용). 따라서 허용 집합은 prod 실값을 모두 포함해야 함.
-- 'decision' INSERT 를 위해 CHECK 를 확대하되 기존 실값('distortion','success')을 반드시 포함 →
--   기존 row 전부 통과(미포함 시 23개 'distortion' row 에서 ADD CONSTRAINT 실패). 'normal' 은 전방호환.
--   순수 가산적 확대(값 제거 없음). 롤백 시 CHECK 만 원복.
ALTER TABLE logs
  DROP CONSTRAINT IF EXISTS logs_log_type_check;
ALTER TABLE logs
  ADD CONSTRAINT logs_log_type_check
  CHECK (log_type IS NULL OR log_type IN ('normal', 'success', 'distortion', 'decision'));

-- ============================================================
-- 2. logs 의사결정 컬럼 추가 (모두 NULL 허용)
-- ============================================================
-- 기존 row 는 전부 NULL → 기존 화면·쿼리 영향 없음.
ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS decision_options TEXT,    -- 선택지(선택 입력)
  ADD COLUMN IF NOT EXISTS expected_outcome TEXT,    -- 예상 결과(선택 입력)
  ADD COLUMN IF NOT EXISTS confidence INT,           -- 확신도 0~100
  ADD COLUMN IF NOT EXISTS review_at TIMESTAMPTZ,    -- 결과 검토(복기) 예정 시점
  ADD COLUMN IF NOT EXISTS actual_outcome TEXT,      -- 복기 시 기록한 실제 결과
  ADD COLUMN IF NOT EXISTS calibration JSONB;        -- 캘리브레이션 산출 결과

COMMENT ON COLUMN logs.decision_options IS '의사결정 시 고려한 선택지(선택 입력).';
COMMENT ON COLUMN logs.expected_outcome IS '봉인한 예상 결과(선택 입력).';
COMMENT ON COLUMN logs.confidence IS '예상 결과에 대한 확신도 0~100.';
COMMENT ON COLUMN logs.review_at IS '결과 검토(복기) 예정 시점. 정렬·그룹화 전용, 알림 미사용.';
COMMENT ON COLUMN logs.actual_outcome IS '복기 시 사용자가 관찰·기록한 실제 결과.';
COMMENT ON COLUMN logs.calibration IS '확신도 대비 실제 결과 캘리브레이션 산출 결과(JSON).';

-- ============================================================
-- 3. confidence 범위 CHECK (0~100, NULL 허용)
-- ============================================================
-- 20_checkin_mood_level.sql 의 DROP-IF-EXISTS → ADD 패턴 동일.
ALTER TABLE logs
  DROP CONSTRAINT IF EXISTS logs_confidence_range;
ALTER TABLE logs
  ADD CONSTRAINT logs_confidence_range
  CHECK (confidence IS NULL OR (confidence BETWEEN 0 AND 100));

-- ============================================================
-- 4. RLS
-- ============================================================
-- 신규 컬럼은 logs 테이블의 같은 row 에 추가되므로
-- 기존 logs row-level 정책(본인 row 만 select/insert/update/delete — 01_initial_schema.sql)이
-- 그대로 적용됨. 신규 정책 불필요 → 추가하지 않음.

-- 끝.
