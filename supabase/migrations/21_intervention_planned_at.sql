-- 행동 계획 실행 예정 일시(구조화). 자유 텍스트 when을 best-effort 파싱한 결과.
-- 파싱 실패 시 NULL → journal 타임라인 "날짜 미지정" 그룹에 표시.
-- ⚠️ 알림·리마인더 용도 아님(안전 가드). 읽기 전용 정렬·그룹화 전용.
ALTER TABLE intervention ADD COLUMN IF NOT EXISTS planned_at TIMESTAMPTZ;
COMMENT ON COLUMN intervention.planned_at IS '행동 계획 실행 예정 일시(KST 파싱). 정렬·그룹화 전용, 알림 미사용.';
