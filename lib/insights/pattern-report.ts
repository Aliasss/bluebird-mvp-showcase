// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).

import type { DistortionType, TriggerCategory } from '@/types';

export interface PatternRow {
  category: TriggerCategory;
  distortion: DistortionType;
  deltaPain: number | null;
}

export interface PatternCell {
  category: TriggerCategory;
  distortion: DistortionType;
  count: number;
  avgDelta: number | null;
}

export function aggregatePatterns(rows: readonly PatternRow[]): PatternCell[] {
  throw new Error('핵심 로직 비공개');
}

export function topByCount(cells: readonly PatternCell[], k: number): PatternCell[] {
  throw new Error('핵심 로직 비공개');
}

export function topByDelta(
  cells: readonly PatternCell[],
  k: number,
  minSamples: number
): PatternCell[] {
  throw new Error('핵심 로직 비공개');
}

export function countByCategory(
  cells: readonly PatternCell[]
): Array<{ category: TriggerCategory; count: number }> {
  throw new Error('핵심 로직 비공개');
}
