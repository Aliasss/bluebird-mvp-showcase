import { describe, it, expect } from 'vitest';
import { DistortionType } from '@/types';
import {
  getArchetypeResult,
  getArchetypeResultFromRows,
} from '@/lib/utils/archetype';

describe('getArchetypeResult', () => {
  it('returns null when totalCount is 0', () => {
    expect(getArchetypeResult({}, 0)).toBeNull();
  });

  it('selects the highest-count distortion as topType', () => {
    const result = getArchetypeResult(
      {
        [DistortionType.CATASTROPHIZING]: 3,
        [DistortionType.PERSONALIZATION]: 1,
      },
      4
    );
    expect(result?.archetype).toBeDefined();
    expect(result?.totalCount).toBe(4);
  });

  it('cycle math: progressInCycle = totalCount % 5', () => {
    const cases = [
      { total: 1, expectProgress: 1, expectUntilNext: 4, justUpdated: false },
      { total: 4, expectProgress: 4, expectUntilNext: 1, justUpdated: false },
      { total: 5, expectProgress: 0, expectUntilNext: 0, justUpdated: true },
      { total: 7, expectProgress: 2, expectUntilNext: 3, justUpdated: false },
      { total: 10, expectProgress: 0, expectUntilNext: 0, justUpdated: true },
    ];
    for (const c of cases) {
      const r = getArchetypeResult(
        { [DistortionType.CATASTROPHIZING]: c.total },
        c.total
      );
      expect(r?.progressInCycle).toBe(c.expectProgress);
      expect(r?.untilNextUpdate).toBe(c.expectUntilNext);
      expect(r?.isJustUpdated).toBe(c.justUpdated);
    }
  });
});

describe('getArchetypeResultFromRows', () => {
  it('returns null when there are no rows', () => {
    expect(getArchetypeResultFromRows([])).toBeNull();
  });

  it('returns null when all rows are null placeholders', () => {
    const rows = [
      { distortion_type: null },
      { distortion_type: null },
      { distortion_type: null },
    ];
    expect(getArchetypeResultFromRows(rows)).toBeNull();
  });

  it('excludes distortion_type=null placeholder rows from count', () => {
    // 3 real distortions + 2 null placeholders → totalCount = 3
    const rows = [
      { distortion_type: DistortionType.CATASTROPHIZING },
      { distortion_type: DistortionType.CATASTROPHIZING },
      { distortion_type: null },
      { distortion_type: DistortionType.PERSONALIZATION },
      { distortion_type: null },
    ];
    const r = getArchetypeResultFromRows(rows);
    expect(r?.totalCount).toBe(3);
    expect(r?.progressInCycle).toBe(3);
    expect(r?.untilNextUpdate).toBe(2);
  });

  it('regression: dashboard·insights inputs produce the same result', () => {
    // 같은 raw row 배열을 두 페이지가 함께 사용했을 때 결과가 일치해야 한다.
    const rawRows = [
      { distortion_type: DistortionType.CATASTROPHIZING },
      { distortion_type: null },
      { distortion_type: DistortionType.ALL_OR_NOTHING },
      { distortion_type: DistortionType.CATASTROPHIZING },
      { distortion_type: null },
      { distortion_type: DistortionType.CATASTROPHIZING },
    ];

    const dashboardResult = getArchetypeResultFromRows(rawRows);
    const insightsResult = getArchetypeResultFromRows(rawRows);

    expect(dashboardResult).toEqual(insightsResult);
    expect(dashboardResult?.totalCount).toBe(4);
    expect(dashboardResult?.progressInCycle).toBe(4);
    expect(dashboardResult?.untilNextUpdate).toBe(1);
  });

  it('selects dominant distortion across mixed rows', () => {
    const rows = [
      { distortion_type: DistortionType.CATASTROPHIZING },
      { distortion_type: DistortionType.CATASTROPHIZING },
      { distortion_type: DistortionType.CATASTROPHIZING },
      { distortion_type: DistortionType.PERSONALIZATION },
    ];
    const r = getArchetypeResultFromRows(rows);
    expect(r?.totalCount).toBe(4);
  });
});
