const KST_OFFSET = 9 * 60 * 60 * 1000;

function toKSTDateString(utcMs: number): string {
  return new Date(utcMs + KST_OFFSET).toISOString().slice(0, 10);
}

export type StreakResult = {
  current: number;
  best: number;
  doneToday: boolean;
};

/**
 * KST 기준 "YYYY-MM-DD" 형식 날짜 문자열 배열을 받아 스트릭을 계산한다.
 * 예: ["2026-04-15", "2026-04-16", "2026-04-17"]
 */
export function calculateStreak(analysisDateStrings: string[]): StreakResult {
  if (analysisDateStrings.length === 0) {
    return { current: 0, best: 0, doneToday: false };
  }

  const dateSet = new Set(analysisDateStrings);
  const nowMs = Date.now();
  const todayStr = toKSTDateString(nowMs);
  const doneToday = dateSet.has(todayStr);

  // 현재 스트릭: 오늘 완료했으면 오늘부터, 아니면 어제부터 소급
  let current = 0;
  let checkMs = doneToday ? nowMs : nowMs - 86400000;

  while (true) {
    const checkStr = toKSTDateString(checkMs);
    if (dateSet.has(checkStr)) {
      current++;
      checkMs -= 86400000;
    } else {
      break;
    }
  }

  // 역대 최고 기록: 전체 날짜에서 가장 긴 연속 구간
  const sortedDates = Array.from(dateSet).sort();
  let best = 0;
  let tempStreak = 0;

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevMs = new Date(sortedDates[i - 1]).getTime();
      const currMs = new Date(sortedDates[i]).getTime();
      const diffDays = Math.round((currMs - prevMs) / 86400000);
      tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
    }
    if (tempStreak > best) best = tempStreak;
  }

  return { current, best, doneToday };
}
