import { describe, it, expect } from 'vitest';
import { computeLongitudinalPattern } from '@/lib/insights/longitudinal-pattern';
import { DistortionType } from '@/types';
import type { RevisitLogRow } from '@/lib/insights/trigger-revisit';

const C = DistortionType.CATASTROPHIZING;
const P = DistortionType.PERSONALIZATION;
const NOW = new Date('2026-05-16T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function row(
  id: string,
  category: 'work' | 'relationship' | null,
  daysAgo: number,
  distortions: Array<{ type: DistortionType; intensity: number }>,
): RevisitLogRow {
  return {
    id,
    trigger: `t-${id}`,
    trigger_category: category,
    created_at: new Date(NOW.getTime() - daysAgo * DAY_MS).toISOString(),
    distortions,
  };
}

describe('computeLongitudinalPattern', () => {
  it('카테고리 또는 우세 왜곡이 null이면 null 반환', () => {
    expect(
      computeLongitudinalPattern({
        currentCategory: null,
        currentDominantDistortion: C,
        history: [],
        now: NOW,
      }),
    ).toBeNull();

    expect(
      computeLongitudinalPattern({
        currentCategory: 'work',
        currentDominantDistortion: null,
        history: [],
        now: NOW,
      }),
    ).toBeNull();
  });

  it('history 0건이면 현재 분석 1건만 카운트', () => {
    const result = computeLongitudinalPattern({
      currentCategory: 'work',
      currentDominantDistortion: C,
      history: [],
      now: NOW,
    });
    expect(result).toEqual({
      occurrenceCount: 1,
      totalCategoryCount: 1,
      averageIntensity: null,
      lastOccurrenceDaysAgo: null,
      recentMonthCount: 0,
    });
  });

  it('같은 카테고리 + 같은 우세 왜곡 누적 카운트 (현재 포함)', () => {
    const history = [
      row('a', 'work', 5, [{ type: C, intensity: 0.8 }]),
      row('b', 'work', 12, [{ type: C, intensity: 0.7 }]),
      row('c', 'work', 20, [{ type: P, intensity: 0.9 }]), // 다른 dominant
      row('d', 'relationship', 3, [{ type: C, intensity: 0.9 }]), // 다른 카테고리
    ];
    const result = computeLongitudinalPattern({
      currentCategory: 'work',
      currentDominantDistortion: C,
      history,
      now: NOW,
    })!;

    expect(result.occurrenceCount).toBe(3); // 현재 + a + b (둘 다 work × C)
    expect(result.totalCategoryCount).toBe(4); // 현재 + a + b + c (work 카테고리 전체)
    expect(result.averageIntensity).toBeCloseTo(0.75); // (0.8 + 0.7) / 2
    expect(result.lastOccurrenceDaysAgo).toBe(5); // a가 가장 최근
    expect(result.recentMonthCount).toBe(2); // 5일·12일 모두 30일 안
  });

  it('60일 history 중 30일 초과 항목은 recentMonthCount에서 제외', () => {
    const history = [
      row('a', 'work', 10, [{ type: C, intensity: 0.6 }]),
      row('b', 'work', 45, [{ type: C, intensity: 0.7 }]), // 30일 초과
    ];
    const result = computeLongitudinalPattern({
      currentCategory: 'work',
      currentDominantDistortion: C,
      history,
      now: NOW,
    })!;

    expect(result.occurrenceCount).toBe(3); // 현재 + a + b
    expect(result.recentMonthCount).toBe(1); // a만
  });

  it('역대 last 발생일은 가장 최근(작은 daysAgo)', () => {
    const history = [
      row('a', 'work', 30, [{ type: C, intensity: 0.5 }]),
      row('b', 'work', 7, [{ type: C, intensity: 0.6 }]), // 가장 최근
      row('c', 'work', 14, [{ type: C, intensity: 0.8 }]),
    ];
    const result = computeLongitudinalPattern({
      currentCategory: 'work',
      currentDominantDistortion: C,
      history,
      now: NOW,
    })!;
    expect(result.lastOccurrenceDaysAgo).toBe(7);
  });

  it('다른 카테고리는 totalCategoryCount에 포함되지 않음', () => {
    const history = [
      row('a', 'work', 5, [{ type: C, intensity: 0.7 }]),
      row('b', 'relationship', 10, [{ type: C, intensity: 0.8 }]),
      row('c', 'relationship', 15, [{ type: C, intensity: 0.9 }]),
    ];
    const result = computeLongitudinalPattern({
      currentCategory: 'work',
      currentDominantDistortion: C,
      history,
      now: NOW,
    })!;
    expect(result.totalCategoryCount).toBe(2); // 현재 + a (work만)
    expect(result.occurrenceCount).toBe(2); // 현재 + a
  });
});
