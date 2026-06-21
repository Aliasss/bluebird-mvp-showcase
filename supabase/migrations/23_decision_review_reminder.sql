-- 23_decision_review_reminder.sql
-- 의사결정 도구 — 결정별 1회성 복기 푸시 알림(Task 8b) 데이터 마커 — 2026-06-06.
--
-- ⚠️ 가산(additive)-only / 롤백 안전(rollback-safe):
--   - 이 마이그레이션은 logs 테이블에 NULL 허용 컬럼만 ADD 한다 (ADD COLUMN IF NOT EXISTS).
--   - 기존 컬럼 DROP·ALTER(타입 변경) 없음. 기존 데이터·코드 100% 보존.
--   - 언제든 v1으로 롤백 가능 — 신규 컬럼은 NULL 허용이라 무시하면 됨.
--   - 선행 repo 마이그레이션이 prod 에 적용되지 않았어도 안전하게 재실행 가능
--     (IF NOT EXISTS 패턴 — ledger drift 방어. cf. 12_schema_drift_fixes 미적용 사례).
--
-- 배경:
--   - review_at(Migration 22) 도래 시 해당 결정의 복기를 권하는 푸시를 결정당 정확히 1회만 발송한다.
--   - 이 컬럼은 "1회성 리마인더를 이미 발송(처리)했다"는 마커.
--     NULL = 아직 미처리, 값 존재 = 이미 처리(발송 또는 구독 없음으로 skip 확정).
--   - cron 쿼리가 review_notified_at IS NULL 로 미처리 결정만 조회하고,
--     처리 후 NOW() 로 마킹 → 정확히 1회(exactly-once) 보장. 재귀·반복 발송 없음.
--
-- 어휘 게이트: decision_* / record·observe 어휘만 사용.
--   탐지/진단/교정 같은 의료기기 함의 용어는 컬럼명·주석에서 사용하지 않음.

-- ============================================================
-- 1. logs.review_notified_at — 1회성 복기 리마인더 발송 마커(NULL 허용)
-- ============================================================
-- 기존 row 는 전부 NULL → 기존 화면·쿼리 영향 없음. v1 은 이 컬럼을 무시하면 됨.
ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS review_notified_at TIMESTAMPTZ;

COMMENT ON COLUMN logs.review_notified_at IS
  '결정별 1회성 복기 리마인더 푸시 발송(처리) 시각. NULL=미처리, 값=이미 1회 처리(발송 또는 구독 없음 skip 확정). cron 의 exactly-once 마커.';

-- ============================================================
-- 2. RLS
-- ============================================================
-- 신규 컬럼은 logs 테이블의 같은 row 에 추가되므로
-- 기존 logs row-level 정책(본인 row 만 select/insert/update/delete — 01_initial_schema.sql)이
-- 그대로 적용됨. 신규 정책 불필요 → 추가하지 않음.
-- (cron 은 service_role 로 RLS 우회하여 교차 사용자 조회·마킹.)

-- 끝.
