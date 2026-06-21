// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).

export interface PendingReviewRow {
  id: string;
  log_id: string;
  completed_at: string;
  logs: { id: string; trigger: string; pain_score: number | null };
}

export interface PendingReviewClient {
  queryPendingInterventions(args: {
    userId: string;
    completedAtGte: string;
    completedAtLte: string;
  }): Promise<{ data: PendingReviewRow[] | null; error: unknown }>;
}

export interface PendingReview {
  logId: string;
  interventionId: string;
  triggerSnippet: string;
  initialPainScore: number;
  completedAt: string;
  daysAgo: number;
}

export interface FindPendingReviewInput {
  userId: string;
  now: Date;
  client: PendingReviewClient;
}

export async function findPendingReview(
  input: FindPendingReviewInput
): Promise<PendingReview | null> {
  throw new Error('핵심 로직 비공개');
}
