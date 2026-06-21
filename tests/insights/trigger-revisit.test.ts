import { describe, expect, it } from 'vitest';
import {
  findTriggerRevisit,
  getDominantDistortion,
  type RevisitLogRow,
} from '@/lib/insights/trigger-revisit';
import { DistortionType } from '@/types';

const NOW = new Date('2026-04-26T10:00:00Z');

function isoDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function row(overrides: Partial<RevisitLogRow> & { id: string }): RevisitLogRow {
  return {
    id: overrides.id,
    trigger: overrides.trigger ?? '발표 준비',
    trigger_category: overrides.trigger_category ?? 'work',
    created_at: overrides.created_at ?? isoDaysAgo(7),
    distortions: overrides.distortions ?? [
      { type: DistortionType.CATASTROPHIZING, intensity: 0.7 },
    ],
  };
}

describe('getDominantDistortion', () => {
  it('returns null on empty array', () => {
    expect(getDominantDistortion([])).toBeNull();
  });

  it('returns the type with highest intensity', () => {
    expect(
      getDominantDistortion([
        { type: DistortionType.CATASTROPHIZING, intensity: 0.4 },
        { type: DistortionType.PERSONALIZATION, intensity: 0.8 },
        { type: DistortionType.ALL_OR_NOTHING, intensity: 0.6 },
      ])
    ).toBe(DistortionType.PERSONALIZATION);
  });

  it('returns first on intensity tie', () => {
    expect(
      getDominantDistortion([
        { type: DistortionType.CATASTROPHIZING, intensity: 0.5 },
        { type: DistortionType.PERSONALIZATION, intensity: 0.5 },
      ])
    ).toBe(DistortionType.CATASTROPHIZING);
  });
});

describe('findTriggerRevisit', () => {
  const baseInput = {
    currentLogId: 'current',
    currentCategory: 'work' as const,
    currentDominantDistortion: DistortionType.CATASTROPHIZING,
    now: NOW,
  };

  it('returns null if currentCategory is null', () => {
    expect(
      findTriggerRevisit({
        ...baseInput,
        currentCategory: null,
        history: [row({ id: 'h1' })],
      })
    ).toBeNull();
  });

  it('returns null if currentDominantDistortion is null', () => {
    expect(
      findTriggerRevisit({
        ...baseInput,
        currentDominantDistortion: null,
        history: [row({ id: 'h1' })],
      })
    ).toBeNull();
  });

  it('returns null on empty history', () => {
    expect(findTriggerRevisit({ ...baseInput, history: [] })).toBeNull();
  });

  it('matches same category + same dominant distortion within window', () => {
    const result = findTriggerRevisit({
      ...baseInput,
      history: [row({ id: 'h1', created_at: isoDaysAgo(7) })],
    });
    expect(result).not.toBeNull();
    expect(result?.logId).toBe('h1');
    expect(result?.daysAgo).toBe(7);
    expect(result?.category).toBe('work');
    expect(result?.distortionType).toBe(DistortionType.CATASTROPHIZING);
  });

  it('excludes the current log itself even if it matches', () => {
    expect(
      findTriggerRevisit({
        ...baseInput,
        history: [row({ id: 'current' })],
      })
    ).toBeNull();
  });

  it('excludes rows outside the window (default 60d)', () => {
    expect(
      findTriggerRevisit({
        ...baseInput,
        history: [row({ id: 'h1', created_at: isoDaysAgo(61) })],
      })
    ).toBeNull();
  });

  it('respects custom windowDays', () => {
    const result = findTriggerRevisit({
      ...baseInput,
      windowDays: 7,
      history: [row({ id: 'h1', created_at: isoDaysAgo(8) })],
    });
    expect(result).toBeNull();
  });

  it('excludes different category', () => {
    expect(
      findTriggerRevisit({
        ...baseInput,
        history: [row({ id: 'h1', trigger_category: 'family' })],
      })
    ).toBeNull();
  });

  it('excludes different dominant distortion', () => {
    expect(
      findTriggerRevisit({
        ...baseInput,
        history: [
          row({
            id: 'h1',
            distortions: [{ type: DistortionType.PERSONALIZATION, intensity: 0.9 }],
          }),
        ],
      })
    ).toBeNull();
  });

  it('returns most recent when multiple match', () => {
    const result = findTriggerRevisit({
      ...baseInput,
      history: [
        row({ id: 'old', created_at: isoDaysAgo(50) }),
        row({ id: 'recent', created_at: isoDaysAgo(3) }),
        row({ id: 'mid', created_at: isoDaysAgo(20) }),
      ],
    });
    expect(result?.logId).toBe('recent');
    expect(result?.daysAgo).toBe(3);
  });

  it('truncates long trigger to snippet', () => {
    const longTrigger = '가'.repeat(80);
    const result = findTriggerRevisit({
      ...baseInput,
      history: [row({ id: 'h1', trigger: longTrigger })],
    });
    expect(result?.triggerSnippet).toMatch(/^가{40}…$/);
  });

  it('respects category-only match without dominant — should not match', () => {
    // 같은 카테고리지만 다른 dominant → 매칭되면 안됨 (스팸 방지)
    expect(
      findTriggerRevisit({
        ...baseInput,
        history: [
          row({
            id: 'h1',
            trigger_category: 'work',
            distortions: [
              { type: DistortionType.CATASTROPHIZING, intensity: 0.3 },
              { type: DistortionType.EMOTIONAL_REASONING, intensity: 0.8 },
            ],
          }),
        ],
      })
    ).toBeNull();
  });

  it('matches when dominant distortion shares type even if other distortions exist', () => {
    const result = findTriggerRevisit({
      ...baseInput,
      history: [
        row({
          id: 'h1',
          distortions: [
            { type: DistortionType.CATASTROPHIZING, intensity: 0.9 },
            { type: DistortionType.PERSONALIZATION, intensity: 0.3 },
          ],
        }),
      ],
    });
    expect(result?.logId).toBe('h1');
  });
});
