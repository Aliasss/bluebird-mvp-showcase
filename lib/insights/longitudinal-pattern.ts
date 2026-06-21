// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).

import type { DistortionType, TriggerCategory } from '@/types';
import type { RevisitLogRow } from './trigger-revisit';

export interface LongitudinalPattern {
  /** 같은 트리거 카테고리 + 같은 우세 왜곡 등장 횟수 (현재 분석 포함) */
  occurrenceCount: number;
  /** 같은 트리거 카테고리 전체 등장 횟수 (왜곡 무관, 현재 분석 포함) */
  totalCategoryCount: number;
  /** 같은 묶음 평균 강도 (0~1, 현재 분석 제외) */
  averageIntensity: number | null;
  /** 가장 최근 같은 묶음 발생일까지 일수 (현재 분석 제외, 가까울수록 작음) */
  lastOccurrenceDaysAgo: number | null;
  /** 어제 ~ 30일 전 사이 같은 묶음 빈도 (현재 분석 제외) */
  recentMonthCount: number;
}

export interface ComputeLongitudinalInput {
  currentCategory: TriggerCategory | null;
  currentDominantDistortion: DistortionType | null;
  history: readonly RevisitLogRow[];
  now: Date;
}

export function computeLongitudinalPattern(
  input: ComputeLongitudinalInput,
): LongitudinalPattern | null {
  throw new Error('핵심 로직 비공개');
}
