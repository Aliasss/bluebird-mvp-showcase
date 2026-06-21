import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── service-role 클라이언트 mock ─────────────────────────────────────────
// logs 조회/마킹 + push_subscriptions 조회 + notification_events insert 를 추적.
//   from('logs').select().eq().lte().is()       → due decisions
//     (Migration 24: actual_outcome IS NULL SQL 프리필터 제거 → .is() 1개[review_notified_at]만.
//      "복기 완료" 판정은 라우트가 isDecisionReviewed 로 JS post-filter.)
//   from('logs').update().eq()                  → review_notified_at 마킹
//   from('push_subscriptions').select().eq()    → 사용자 구독
//   from('notification_events').insert()        → 측정 이벤트
type DueRow = {
  id: string;
  user_id: string;
  trigger: string | null;
  problem_type?: 'tame' | 'wild' | null;
  actual_outcome?: string | null;
  decision_frame?: Record<string, unknown> | null;
};
let dueDecisions: Array<DueRow> = [];
let subsByUser: Record<
  string,
  Array<{ endpoint: string; p256dh: string; auth: string }>
> = {};
const markUpdates: string[] = [];

function makeClient() {
  return {
    from(table: string) {
      if (table === 'logs') {
        return {
          // select 체인 — due decision 조회. .is(review_notified_at) 가 데이터 resolve.
          select: () => ({
            eq: () => ({
              lte: () => ({
                is: () =>
                  Promise.resolve({ data: dueDecisions, error: null }),
              }),
            }),
          }),
          // update 체인 — review_notified_at 마킹.
          update: () => ({
            eq: (_col: string, id: string) => {
              markUpdates.push(id);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === 'push_subscriptions') {
        return {
          select: () => ({
            eq: (_col: string, userId: string) =>
              Promise.resolve({ data: subsByUser[userId] ?? [], error: null }),
          }),
        };
      }
      // notification_events
      return { insert: () => Promise.resolve({ error: null }) };
    },
  };
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: () => makeClient(),
}));

const mockSend = vi.fn();
vi.mock('@/lib/notifications/send', () => ({
  sendDecisionReviewReminder: (...args: unknown[]) => mockSend(...args),
}));

vi.mock('@/lib/logging/server-logger', () => ({
  logServerError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'test-secret';
  dueDecisions = [];
  subsByUser = {};
  markUpdates.length = 0;
});

function req(method: string, auth?: string) {
  return new Request('http://localhost/api/cron/decision-review-reminder', {
    method,
    headers: auth ? { authorization: auth } : undefined,
  });
}

describe('POST /api/cron/decision-review-reminder', () => {
  it('Authorization 누락 시 401', async () => {
    const { POST } = await import(
      '@/app/api/cron/decision-review-reminder/route'
    );
    expect((await POST(req('POST'))).status).toBe(401);
  });

  it('Authorization 불일치 시 401', async () => {
    const { POST } = await import(
      '@/app/api/cron/decision-review-reminder/route'
    );
    expect((await POST(req('POST', 'Bearer wrong'))).status).toBe(401);
  });

  it('due 0건이면 processed=0, sent=0, skipped=0', async () => {
    dueDecisions = [];
    const { POST } = await import(
      '@/app/api/cron/decision-review-reminder/route'
    );
    const res = await POST(req('POST', 'Bearer test-secret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 0, sent: 0, skipped: 0, alreadyReviewed: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('구독 있는 사용자 → 발송 + url=/decision/<id>/review + review_notified_at 마킹', async () => {
    dueDecisions = [{ id: 'd1', user_id: 'u1', trigger: 't' }];
    subsByUser = { u1: [{ endpoint: 'https://x/1', p256dh: 'p', auth: 'a' }] };
    mockSend.mockResolvedValue({ status: 'sent' });

    const { POST } = await import(
      '@/app/api/cron/decision-review-reminder/route'
    );
    const res = await POST(req('POST', 'Bearer test-secret'));
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 1, skipped: 0, alreadyReviewed: 0 });
    expect(mockSend).toHaveBeenCalledWith(
      { endpoint: 'https://x/1', keys: { p256dh: 'p', auth: 'a' } },
      'u1',
      '/decision/d1/review',
    );
    // 발송했어도 마킹은 반드시 1회.
    expect(markUpdates).toEqual(['d1']);
  });

  it('구독 없는 사용자(opt-out/미구독) → 발송 SKIP 하되 review_notified_at 은 마킹', async () => {
    dueDecisions = [{ id: 'd2', user_id: 'u2', trigger: null }];
    subsByUser = {}; // u2 구독 없음

    const { POST } = await import(
      '@/app/api/cron/decision-review-reminder/route'
    );
    const res = await POST(req('POST', 'Bearer test-secret'));
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 0, skipped: 1, alreadyReviewed: 0 });
    expect(mockSend).not.toHaveBeenCalled();
    // 핵심: 발송 못 했어도 마킹 → 영구 재조회 방지(exactly-once).
    expect(markUpdates).toEqual(['d2']);
  });

  it('여러 결정 혼합: 발송 1 + skip 1, 둘 다 마킹', async () => {
    dueDecisions = [
      { id: 'd1', user_id: 'u1', trigger: 't' },
      { id: 'd2', user_id: 'u2', trigger: null },
    ];
    subsByUser = { u1: [{ endpoint: 'https://x/1', p256dh: 'p', auth: 'a' }] };
    mockSend.mockResolvedValue({ status: 'sent' });

    const { POST } = await import(
      '@/app/api/cron/decision-review-reminder/route'
    );
    const res = await POST(req('POST', 'Bearer test-secret'));
    expect(await res.json()).toEqual({ processed: 2, sent: 1, skipped: 1, alreadyReviewed: 0 });
    expect(markUpdates.sort()).toEqual(['d1', 'd2']);
  });

  // Migration 24 #1-risk: 이미 복기된 wild 결정(actual_outcome 은 null 이지만
  //   decision_frame.wild.review 존재)은 *리마인드하지 않되*, review_notified_at 은 마킹해야 한다
  //   (영구 재조회·영원한 리마인드 방지). 구독이 있어도 발송 0.
  it('이미 복기된 wild 결정(decision_frame.wild.review) → 발송 안 함, 그래도 마킹', async () => {
    dueDecisions = [
      {
        id: 'dw',
        user_id: 'uw',
        trigger: 'wild 결정',
        problem_type: 'wild',
        actual_outcome: null,
        decision_frame: { wild: { review: { lookingBack: '돌아보면...' } } },
      },
    ];
    subsByUser = { uw: [{ endpoint: 'https://x/9', p256dh: 'p', auth: 'a' }] };
    mockSend.mockResolvedValue({ status: 'sent' });

    const { POST } = await import(
      '@/app/api/cron/decision-review-reminder/route'
    );
    const res = await POST(req('POST', 'Bearer test-secret'));
    expect(await res.json()).toEqual({ processed: 1, sent: 0, skipped: 0, alreadyReviewed: 1 });
    expect(mockSend).not.toHaveBeenCalled();
    // 핵심: 복기됐어도 마킹 → 다음 tick 재조회 안 됨.
    expect(markUpdates).toEqual(['dw']);
  });

  // 미복기 wild 결정은 정상 리마인드 대상이어야 한다(트랙 무관 발송).
  it('미복기 wild 결정(review 마커 없음) → 정상 발송 + 마킹', async () => {
    dueDecisions = [
      {
        id: 'dw2',
        user_id: 'uw2',
        trigger: 'wild 미복기',
        problem_type: 'wild',
        actual_outcome: null,
        decision_frame: { wild: { identity: '...' } },
      },
    ];
    subsByUser = { uw2: [{ endpoint: 'https://x/8', p256dh: 'p', auth: 'a' }] };
    mockSend.mockResolvedValue({ status: 'sent' });

    const { POST } = await import(
      '@/app/api/cron/decision-review-reminder/route'
    );
    const res = await POST(req('POST', 'Bearer test-secret'));
    expect(await res.json()).toEqual({ processed: 1, sent: 1, skipped: 0, alreadyReviewed: 0 });
    expect(mockSend).toHaveBeenCalledWith(
      { endpoint: 'https://x/8', keys: { p256dh: 'p', auth: 'a' } },
      'uw2',
      '/decision/dw2/review',
    );
    expect(markUpdates).toEqual(['dw2']);
  });
});

// Vercel Cron 이 GET 을 보내는데 POST 만 export 하면 405 반사 → 핸들러 미실행
// (2026-05-12 production 사고). 회귀 가드 — checkin-reminder 와 동일.
describe('GET /api/cron/decision-review-reminder (Vercel Cron 실제 호출 메서드)', () => {
  it('GET 핸들러가 export되어 있어야 한다', async () => {
    const mod = await import('@/app/api/cron/decision-review-reminder/route');
    expect(typeof mod.GET).toBe('function');
  });

  it('GET + 유효 Bearer 시 200', async () => {
    dueDecisions = [];
    const { GET } = await import(
      '@/app/api/cron/decision-review-reminder/route'
    );
    const res = await GET(req('GET', 'Bearer test-secret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 0, sent: 0, skipped: 0, alreadyReviewed: 0 });
  });

  it('GET + Bearer 누락 시 401', async () => {
    const { GET } = await import(
      '@/app/api/cron/decision-review-reminder/route'
    );
    expect((await GET(req('GET'))).status).toBe(401);
  });
});
