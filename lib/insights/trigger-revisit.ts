// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).

import type { DistortionType, TriggerCategory } from '@/types';

export interface RevisitDistortion {
  type: DistortionType;
  intensity: number;
}

export interface RevisitLogRow {
  id: string;
  trigger: string;
  trigger_category: TriggerCategory | null;
  created_at: string;
  distortions: RevisitDistortion[];
}

export interface RevisitCandidate {
  logId: string;
  triggerSnippet: string;
  daysAgo: number;
  distortionType: DistortionType;
  category: TriggerCategory;
}

export interface FindRevisitInput {
  currentLogId: string;
  currentCategory: TriggerCategory | null;
  currentDominantDistortion: DistortionType | null;
  history: RevisitLogRow[];
  now: Date;
  windowDays?: number;
}

export function getDominantDistortion(
  distortions: readonly RevisitDistortion[]
): DistortionType | null {
  throw new Error('핵심 로직 비공개');
}

export function findTriggerRevisit(input: FindRevisitInput): RevisitCandidate | null {
  throw new Error('핵심 로직 비공개');
}
