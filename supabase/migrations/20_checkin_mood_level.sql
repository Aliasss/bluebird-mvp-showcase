-- 20_checkin_mood_level.sql
-- 모닝 체크인 mood 5단계 점수 추가 — 2026-05-26.
--
-- 배경:
--   - 모닝 체크인의 mood_word (텍스트 카테고리) 만으로는 객관적 추이 시각화 불가.
--   - 자기 평가 5단계 이모지(😞😕😐🙂😄 = 1~5) 추가 → /checkin/history 모닝 탭 line chart.
--   - 기존 mood_word 는 유지 (자기 표현 영역 보존).
--
-- 결정잠금 (2026-05-16 deep-dive) 평가:
--   - "신규 데이터 입력 화면 추가 금지" 약한 충돌 — 새 화면 X, 기존 화면 1 row 추가.
--   - 입력 부담 추가 ≈ 1탭/일 (1초). 액션 ① 입력 마찰 측정에 미미.
--   - 사용자 명시 결정 — 결정잠금 약한 갱신.
--
-- 데이터 보존:
--   - 기존 row mood_level=NULL 그대로. 차트에서 NULL 무시.
--   - 신규 모닝 체크인은 API 단에서 moodLevel 필수 (NOT NULL 강제는 application-side).

ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS mood_level INT;

-- 5단계 점수: 1(매우 부정) ~ 5(매우 긍정). NULL 허용 (기존 데이터 호환).
ALTER TABLE checkins
  DROP CONSTRAINT IF EXISTS checkins_mood_level_range;
ALTER TABLE checkins
  ADD CONSTRAINT checkins_mood_level_range
  CHECK (mood_level IS NULL OR (mood_level BETWEEN 1 AND 5));

-- 끝.
