-- 24_decision_frame.sql
-- 결정 로직 v2 — Tame/Wild 분기 데이터 레이어 (Phase 4 Task 1) — 2026-06-06.
--
-- ⚠️ 가산(additive)-only / 롤백 안전(rollback-safe):
--   - 이 마이그레이션은 logs 테이블에 NULL 허용 컬럼만 ADD 한다 (ADD COLUMN IF NOT EXISTS).
--   - 기존 컬럼 DROP·ALTER(타입 변경) 없음. 기존 데이터·코드 100% 보존.
--   - 언제든 v1으로 롤백 가능 — 신규 컬럼은 모두 NULL 허용이라 무시하면 됨.
--   - 선행 repo 마이그레이션이 prod 에 적용되지 않았어도 안전하게 재실행 가능
--     (IF NOT EXISTS / DROP-IF-EXISTS 패턴 — ledger drift 방어. cf. 12_schema_drift_fixes 미적용 사례).
--
-- 배경:
--   - 결정 로직 v2 는 결정의 성격에 따라 Tame(되돌릴 수 있음·가늠 가능) / Wild(비가역·정체성 변형)
--     두 갈래로 분기한다. 트랙별 구조화 데이터는 컬럼 폭증 없이 단일 JSONB 한 칸에 트랙 키로 담는다.
--   - 캘리브레이션 컬럼(confidence/actual_outcome/calibration, Migration 22)은 **Tame 전용**이다.
--     Wild 는 이들을 NULL 로 유지하고 "복기 완료" 마커를 decision_frame.wild.review 존재 여부로 둔다.
--   - 기존(v1) 결정 row 는 problem_type/decision_frame 가 NULL → 레거시(tame 호환) 경로로 동작.
--
-- 어휘 게이트(spec §1.3): 사용자 비노출 컬럼명. 탐지/진단/교정 같은 의료기기 함의 용어 미사용.

-- ============================================================
-- 1. logs 분기 컬럼 추가 (모두 NULL 허용)
-- ============================================================
-- 기존 row 는 전부 NULL → 기존 화면·쿼리 영향 없음. v1 은 이 컬럼을 무시하면 됨.
ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS problem_type   TEXT,   -- 'tame' | 'wild' | NULL(레거시)
  ADD COLUMN IF NOT EXISTS decision_frame JSONB;  -- 트랙별 구조화 캡처(선택)

COMMENT ON COLUMN logs.problem_type   IS '결정 트랙: tame(되돌릴 수 있음·가늠 가능) | wild(비가역·정체성 변형). NULL=레거시(tame 호환).';
COMMENT ON COLUMN logs.decision_frame IS '트랙별 결정 프레임 구조화 데이터(JSON). 모든 하위 필드 선택. wild "복기 완료" 마커는 wild.review 존재 여부.';

-- ============================================================
-- 2. problem_type 값 제약 (NULL 허용 — 레거시 row 통과)
-- ============================================================
-- 22_decision_log.sql 의 DROP-IF-EXISTS → ADD 패턴 동일. NULL 은 전방호환(레거시 = tame 처럼 동작).
ALTER TABLE logs
  DROP CONSTRAINT IF EXISTS logs_problem_type_check;
ALTER TABLE logs
  ADD CONSTRAINT logs_problem_type_check
  CHECK (problem_type IS NULL OR problem_type IN ('tame', 'wild'));

-- ============================================================
-- 3. RLS
-- ============================================================
-- 신규 컬럼은 logs 테이블의 같은 row 에 추가되므로
-- 기존 logs row-level 정책(본인 row 만 select/insert/update/delete — 01_initial_schema.sql)이
-- 그대로 적용됨. 신규 정책 불필요 → 추가하지 않음.

-- 끝.
