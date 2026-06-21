// 일지 페이지 날짜 필터 — 클라이언트 사이드 필터링.
// 검토(2026-05-16): "전체기간 / 7일 / 30일" 3 옵션 단순 형태.
// 성능 리뷰: 서버 추가 쿼리 0, useMemo로 재계산 최소화.

export const DATE_FILTERS = ['all', '7d', '30d'] as const;
export type DateFilter = (typeof DATE_FILTERS)[number];

export const DATE_FILTER_LABEL: Record<DateFilter, string> = {
  all: '전체기간',
  '7d': '7일',
  '30d': '30일',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** 날짜 필터를 ms 단위 cutoff로 변환. 'all'은 null (필터 미적용 의미). */
export function dateFilterToCutoffMs(filter: DateFilter, now: Date): number | null {
  if (filter === 'all') return null;
  if (filter === '7d') return now.getTime() - 7 * DAY_MS;
  if (filter === '30d') return now.getTime() - 30 * DAY_MS;
  return null;
}

/**
 * created_at(ISO string)이 cutoff 이후인지 검사.
 * cutoff가 null이면 모두 통과 (전체기간).
 */
export function isWithinDateFilter(createdAt: string, cutoffMs: number | null): boolean {
  if (cutoffMs === null) return true;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= cutoffMs;
}
