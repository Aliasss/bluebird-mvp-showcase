import { describe, expect, it } from 'vitest';
import {
  aggregatePatterns,
  countByCategory,
  topByCount,
  topByDelta,
  type PatternRow,
} from '@/lib/insights/pattern-report';
import { DistortionType } from '@/types';

const C = DistortionType.CATASTROPHIZING;
const P = DistortionType.PERSONALIZATION;
const E = DistortionType.EMOTIONAL_REASONING;

function row(
  category: PatternRow['category'],
  distortion: PatternRow['distortion'],
  deltaPain: number | null = null
): PatternRow {
  return { category, distortion, deltaPain };
}

describe('aggregatePatterns', () => {
  it('returns empty array on empty input', () => {
    expect(aggregatePatterns([])).toEqual([]);
  });

  it('groups by (category, distortion) and counts', () => {
    const cells = aggregatePatterns([
      row('work', C),
      row('work', C),
      row('work', P),
      row('family', C),
    ]);
    const workC = cells.find((c) => c.category === 'work' && c.distortion === C);
    const workP = cells.find((c) => c.category === 'work' && c.distortion === P);
    const familyC = cells.find((c) => c.category === 'family' && c.distortion === C);

    expect(workC?.count).toBe(2);
    expect(workP?.count).toBe(1);
    expect(familyC?.count).toBe(1);
  });

  it('avgDelta averages only non-null deltas', () => {
    const cells = aggregatePatterns([
      row('work', C, 2),
      row('work', C, null),
      row('work', C, 4),
    ]);
    const cell = cells[0];
    expect(cell.count).toBe(3);
    expect(cell.avgDelta).toBe(3); // (2+4)/2
  });

  it('avgDelta is null when no rows have delta', () => {
    const cells = aggregatePatterns([row('work', C, null), row('work', C, null)]);
    expect(cells[0].avgDelta).toBeNull();
    expect(cells[0].count).toBe(2);
  });

  it('handles negative delta (pain increased)', () => {
    const cells = aggregatePatterns([row('work', C, -1), row('work', C, -3)]);
    expect(cells[0].avgDelta).toBe(-2);
  });

  it('rejects NaN/Infinity from delta calc', () => {
    const cells = aggregatePatterns([
      row('work', C, Number.NaN),
      row('work', C, 2),
    ]);
    expect(cells[0].avgDelta).toBe(2);
  });
});

describe('topByCount', () => {
  it('returns top K by count desc', () => {
    const cells = aggregatePatterns([
      row('work', C),
      row('work', C),
      row('work', C),
      row('work', P),
      row('work', P),
      row('family', E),
    ]);
    const top = topByCount(cells, 2);
    expect(top).toHaveLength(2);
    expect(top[0].count).toBe(3);
    expect(top[1].count).toBe(2);
  });

  it('breaks ties by higher avgDelta', () => {
    const cells = aggregatePatterns([
      row('work', C, 1),
      row('work', P, 3),
    ]);
    const top = topByCount(cells, 2);
    expect(top[0].distortion).toBe(P); // higher avgDelta wins tie
    expect(top[1].distortion).toBe(C);
  });

  it('K larger than data returns all', () => {
    const cells = aggregatePatterns([row('work', C)]);
    expect(topByCount(cells, 10)).toHaveLength(1);
  });
});

describe('topByDelta', () => {
  it('filters out cells below minSamples', () => {
    const cells = aggregatePatterns([
      row('work', C, 5), // count 1, delta 5
      row('family', C, 1), // count 1
      row('family', C, 1), // bring family to count 2
    ]);
    const top = topByDelta(cells, 5, 2);
    expect(top).toHaveLength(1);
    expect(top[0].category).toBe('family');
  });

  it('filters out cells with null avgDelta even if samples pass', () => {
    const cells = aggregatePatterns([
      row('work', C, null),
      row('work', C, null),
      row('work', C, null),
    ]);
    expect(topByDelta(cells, 5, 2)).toEqual([]);
  });

  it('sorts by avgDelta desc', () => {
    const cells = aggregatePatterns([
      row('work', C, 1),
      row('work', C, 1),
      row('family', P, 4),
      row('family', P, 4),
    ]);
    const top = topByDelta(cells, 5, 2);
    expect(top[0].category).toBe('family');
    expect(top[1].category).toBe('work');
  });

  it('returns empty when no cells qualify', () => {
    expect(topByDelta([], 3, 2)).toEqual([]);
  });
});

describe('countByCategory', () => {
  it('sums all distortion counts per category and sorts desc', () => {
    const cells = aggregatePatterns([
      row('work', C),
      row('work', P),
      row('work', E),
      row('family', C),
      row('relationship', C),
      row('relationship', P),
    ]);
    const totals = countByCategory(cells);
    expect(totals[0]).toEqual({ category: 'work', count: 3 });
    expect(totals[1]).toEqual({ category: 'relationship', count: 2 });
    expect(totals[2]).toEqual({ category: 'family', count: 1 });
  });

  it('returns empty array on empty input', () => {
    expect(countByCategory([])).toEqual([]);
  });
});
