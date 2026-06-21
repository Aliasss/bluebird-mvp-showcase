// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).
import { DistortionType } from '@/types';
import { ARCHETYPES, type Archetype } from '@/lib/content/archetypes';

export type ArchetypeResult = {
  archetype: Archetype;
  totalCount: number;
  progressInCycle: number;
  untilNextUpdate: number;
  isJustUpdated: boolean;
};

export function getArchetypeResultFromRows(
  rows: ReadonlyArray<{ distortion_type: string | null }>
): ArchetypeResult | null {
  throw new Error('핵심 로직 비공개');
}

export function getArchetypeResult(
  distortionCounts: Partial<Record<DistortionType, number>>,
  totalCount: number
): ArchetypeResult | null {
  throw new Error('핵심 로직 비공개');
}
