// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).

import type { Log } from '@/types';

export function isDecisionReviewed(log: Pick<Log, 'problem_type' | 'actual_outcome' | 'decision_frame'>): boolean {
  throw new Error('핵심 로직 비공개');
}

export function isAwaitingReview(
  log: Pick<Log, 'problem_type' | 'actual_outcome' | 'decision_frame' | 'review_at'>,
  now: Date,
): boolean {
  throw new Error('핵심 로직 비공개');
}
