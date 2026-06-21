import { describe, it, expect, vi } from 'vitest';
import { findPendingReview, type PendingReviewClient } from '@/lib/review/pending-review';

function makeClient(rows: unknown[]): PendingReviewClient {
  return {
    queryPendingInterventions: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
}

describe('findPendingReview', () => {
  it('대기 건 없으면 null 반환', async () => {
    const client = makeClient([]);
    const result = await findPendingReview({ userId: 'u1', now: new Date(), client });
    expect(result).toBeNull();
  });

  it('대기 1건 있으면 그 건 반환', async () => {
    const now = new Date('2026-04-25T10:00:00Z');
    const ten_hours_ago = new Date('2026-04-25T00:00:00Z').toISOString();
    const client = makeClient([
      {
        id: 'i1',
        log_id: 'log1',
        completed_at: ten_hours_ago,
        logs: { id: 'log1', trigger: '회의 직전 긴장', pain_score: 4 },
      },
    ]);
    const result = await findPendingReview({ userId: 'u1', now, client });
    expect(result).not.toBeNull();
    expect(result?.logId).toBe('log1');
    expect(result?.triggerSnippet).toContain('회의');
    expect(result?.initialPainScore).toBe(4);
  });

  it('여러 건 중 가장 오래된(FIFO) 1건 반환', async () => {
    const now = new Date('2026-04-25T10:00:00Z');
    const client = makeClient([
      {
        id: 'i-old',
        log_id: 'log-old',
        completed_at: '2026-04-24T20:00:00Z',
        logs: { id: 'log-old', trigger: '오래된 것', pain_score: 3 },
      },
      {
        id: 'i-new',
        log_id: 'log-new',
        completed_at: '2026-04-25T01:00:00Z',
        logs: { id: 'log-new', trigger: '새 것', pain_score: 2 },
      },
    ]);
    const result = await findPendingReview({ userId: 'u1', now, client });
    expect(result?.logId).toBe('log-old');
  });
});

describe('findPendingReview - 초기 pain_score null 제외', () => {
  it('pain_score null인 log는 건너뜀', async () => {
    const now = new Date('2026-04-25T10:00:00Z');
    const client = makeClient([
      {
        id: 'i1',
        log_id: 'log-null',
        completed_at: '2026-04-24T20:00:00Z',
        logs: { id: 'log-null', trigger: '점수 없음', pain_score: null },
      },
    ]);
    const result = await findPendingReview({ userId: 'u1', now, client });
    expect(result).toBeNull();
  });

  it('pain_score 없는 건은 건너뛰고 다음 건 반환', async () => {
    const now = new Date('2026-04-25T10:00:00Z');
    const client = makeClient([
      {
        id: 'i1',
        log_id: 'log-null',
        completed_at: '2026-04-24T18:00:00Z',
        logs: { id: 'log-null', trigger: '점수 없음', pain_score: null },
      },
      {
        id: 'i2',
        log_id: 'log-ok',
        completed_at: '2026-04-24T20:00:00Z',
        logs: { id: 'log-ok', trigger: '점수 있음', pain_score: 3 },
      },
    ]);
    const result = await findPendingReview({ userId: 'u1', now, client });
    expect(result?.logId).toBe('log-ok');
  });
});

describe('findPendingReview - 에러 처리', () => {
  it('client가 error 반환 시 null', async () => {
    const client: PendingReviewClient = {
      queryPendingInterventions: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('db down'),
      }),
    };
    const result = await findPendingReview({
      userId: 'u1',
      now: new Date(),
      client,
    });
    expect(result).toBeNull();
  });
});
