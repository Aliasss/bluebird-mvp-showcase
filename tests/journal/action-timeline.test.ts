import { describe, it, expect } from 'vitest';
import { bucketForPlannedAt, groupActionsByPlannedAt } from '@/lib/journal/action-timeline';

const NOW = new Date('2026-05-30T01:00:00.000Z'); // 2026-05-30 10:00 KST

// KST 정오(12:00) ISO 생성 헬퍼
function kstNoon(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0) - 9 * 3600 * 1000).toISOString();
}

describe('bucketForPlannedAt', () => {
  it('null은 undated', () => {
    expect(bucketForPlannedAt(null, NOW)).toBe('undated');
  });
  it('오늘/내일/이번주/이후/지난 분류', () => {
    expect(bucketForPlannedAt(kstNoon('2026-05-30'), NOW)).toBe('today');
    expect(bucketForPlannedAt(kstNoon('2026-05-31'), NOW)).toBe('tomorrow');
    expect(bucketForPlannedAt(kstNoon('2026-06-04'), NOW)).toBe('thisWeek'); // +5일
    expect(bucketForPlannedAt(kstNoon('2026-06-10'), NOW)).toBe('later');    // +11일
    expect(bucketForPlannedAt(kstNoon('2026-05-28'), NOW)).toBe('past');     // -2일
  });
  it('잘못된 ISO는 undated', () => {
    expect(bucketForPlannedAt('not-a-date', NOW)).toBe('undated');
  });
});

describe('groupActionsByPlannedAt', () => {
  it('표시 순서대로 그룹 반환, 빈 그룹 생략', () => {
    const items = [
      { id: 'a', planned_at: kstNoon('2026-05-31') }, // 내일
      { id: 'b', planned_at: null },                  // 날짜 미지정
      { id: 'c', planned_at: kstNoon('2026-05-30') }, // 오늘
    ];
    const groups = groupActionsByPlannedAt(items, NOW);
    expect(groups.map((g) => g.bucket)).toEqual(['today', 'tomorrow', 'undated']);
    expect(groups[0].label).toBe('오늘');
    expect(groups[0].items[0].id).toBe('c');
  });

  it('버킷 내 planned_at 오름차순 정렬', () => {
    const items = [
      { id: 'late', planned_at: kstNoon('2026-06-06') }, // +7일 (thisWeek 경계)
      { id: 'early', planned_at: kstNoon('2026-06-03') }, // +4일
    ];
    const groups = groupActionsByPlannedAt(items, NOW);
    expect(groups[0].bucket).toBe('thisWeek');
    expect(groups[0].items.map((i) => i.id)).toEqual(['early', 'late']);
  });
});
