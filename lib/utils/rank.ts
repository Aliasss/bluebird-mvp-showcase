export type Rank = {
  title: string;
  description: string;
  min: number;
  max: number | null; // null = 상한 없음
};

// 설계 방침 — 진척 지표는 분석가 어휘로 *대체* (폐기 아님).
// 등급은 누적 자율성 점수 구간을 *기능 단위*로 라벨링한다.
// 검토(2026-05-16): description 어휘를 "...구간" → "...할 수 있는 상태"로 격상.
// 자기상 = "측정 대상" → "운영자" 강화 (차별화 축 #2 정합).
export const RANKS: Rank[] = [
  { title: '관찰 단계',     description: '자동 사고를 기록할 수 있는 상태',                min: 0,   max: 49  },
  { title: '분류 단계',     description: '왜곡 패턴을 식별·분류할 수 있는 상태',           min: 50,  max: 149 },
  { title: '재구성 단계',   description: '대안 사고를 직접 작성할 수 있는 상태',           min: 150, max: 299 },
  { title: '검증 단계',     description: '고통 변화량·완료율 데이터로 패턴을 검증할 수 있는 상태', min: 300, max: 499 },
  { title: '운영 단계',     description: '자기 인지 시스템을 일관되게 운영할 수 있는 상태',  min: 500, max: null },
];

export type RankResult = {
  rank: Rank;
  progressPct: number;   // 현재 등급 내 진행률 (0~100)
  pointsToNext: number | null; // 다음 등급까지 남은 점수 (null = 최고 등급)
};

export function getRankResult(score: number): RankResult {
  const rank = RANKS.find((r) => score >= r.min && (r.max === null || score <= r.max))!;

  if (rank.max === null) {
    return { rank, progressPct: 100, pointsToNext: null };
  }

  const rangeSize = rank.max - rank.min + 1;
  const progressPct = Math.min(((score - rank.min) / rangeSize) * 100, 100);
  const pointsToNext = rank.max - score + 1;

  return { rank, progressPct, pointsToNext };
}
