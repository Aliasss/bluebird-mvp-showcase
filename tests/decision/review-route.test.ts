import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── server Supabase 클라이언트 mock ──────────────────────────────────────
//   auth.getUser() → 인증 사용자
//   from('logs').select().eq().eq().single() → 결정 로그(actual_outcome 포함)
//   from('analysis').select().eq()            → 강도 행
//   from('logs').update().eq().eq()           → 복기 저장
//   복기 중복 가드(actual_outcome IS NOT NULL → 409) 회귀를 검증한다.
type LogRow = {
  id: string;
  confidence: number | null;
  actual_outcome: string | null;
  problem_type?: 'tame' | 'wild' | null;
  decision_frame?: Record<string, unknown> | null;
};
let logRow: LogRow | null = null;
const updateCalls: Record<string, unknown>[] = [];

function makeClient() {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: 'u1' } }, error: null }),
    },
    from(table: string) {
      if (table === 'logs') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: logRow, error: null }),
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => {
            updateCalls.push(payload);
            return {
              eq: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            };
          },
        };
      }
      // analysis
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [{ intensity: 0.4 }], error: null }),
        }),
      };
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => makeClient(),
}));

const mockTrack = vi.fn();
vi.mock('@/lib/analytics/server', () => ({
  trackCognitiveFunnel: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock('@/lib/logging/server-logger', () => ({
  logServerError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  logRow = null;
  updateCalls.length = 0;
});

function req(body: unknown) {
  return new Request('http://localhost/api/decision/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/decision/review — 중복 복기 가드', () => {
  it('이미 복기한 결정(actual_outcome != null)이면 409 + 갱신·이벤트 없음', async () => {
    logRow = { id: 'd1', confidence: 70, actual_outcome: '예상대로였음' };
    const { POST } = await import('@/app/api/decision/review/route');
    const res = await POST(req({ logId: 'd1', outcome: 'better' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'already_reviewed' });
    // 핵심: 덮어쓰기 없음 + decision_review_completed 중복 발신 없음.
    expect(updateCalls).toHaveLength(0);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('아직 복기 안 한 결정(actual_outcome == null)이면 정상 저장 + 200', async () => {
    logRow = { id: 'd2', confidence: 70, actual_outcome: null };
    const { POST } = await import('@/app/api/decision/review/route');
    const res = await POST(req({ logId: 'd2', outcome: 'better' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.calibration).toBeDefined();
    // 정상 경로는 기존 동작 유지 — 저장 1회 + 이벤트 1회.
    expect(updateCalls).toHaveLength(1);
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/decision/review — WILD 비점수 자기보고 분기', () => {
  it('wild 복기는 decision_frame.wild.review 만 쓰고 calibration·actual_outcome 을 건드리지 않는다', async () => {
    // wild 결정 — confidence/actual_outcome 은 null(쐐기 보존), 기록 시점 wild 필드 존재.
    logRow = {
      id: 'w1',
      confidence: null,
      actual_outcome: null,
      problem_type: 'wild',
      decision_frame: {
        version: 1,
        track: 'wild',
        wild: { identity: '용기 있는 사람', revelation: '직접 겪어보고 싶어요' },
      },
    };
    const { POST } = await import('@/app/api/decision/review/route');
    const res = await POST(
      req({
        logId: 'w1',
        track: 'wild',
        lookingBack: '생각보다 담담해요',
        whatDiscovered: '내가 변화를 더 잘 견딘다는 걸 알았어요',
        valueAlignment: 'aligned',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // 응답은 저장된 자기보고(점수·방향·inflation 없음).
    expect(body.review).toBeDefined();
    expect(body.calibration).toBeUndefined();
    expect(body.review.lookingBack).toBe('생각보다 담담해요');
    expect(body.review.valueAlignment).toBe('aligned');

    // 저장은 1회 — decision_frame 만 업데이트.
    expect(updateCalls).toHaveLength(1);
    const payload = updateCalls[0];
    // ⚠️ 비점수 계약: calibration·actual_outcome 을 페이로드에 절대 포함하지 않는다(AC-7·§6.3).
    expect(payload).not.toHaveProperty('calibration');
    expect(payload).not.toHaveProperty('actual_outcome');
    expect(payload).toHaveProperty('decision_frame');

    // review 마커가 채워지고(isDecisionReviewed=true), 기록 필드는 클로버되지 않는다.
    const frame = payload.decision_frame as {
      wild: { identity?: string; revelation?: string; review?: Record<string, unknown> };
    };
    expect(frame.wild.review).toBeDefined();
    expect(frame.wild.review?.lookingBack).toBe('생각보다 담담해요');
    expect(frame.wild.review?.whatDiscovered).toBe('내가 변화를 더 잘 견딘다는 걸 알았어요');
    expect(frame.wild.review?.valueAlignment).toBe('aligned');
    // 기존 wild 기록 필드(identity·revelation) 보존(클로버 방지).
    expect(frame.wild.identity).toBe('용기 있는 사람');
    expect(frame.wild.revelation).toBe('직접 겪어보고 싶어요');

    // 비점수 계측(방향/inflation 없음, track=wild).
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      'decision_review_completed',
      expect.objectContaining({ track: 'wild', value_alignment: 'aligned' }),
    );
  });

  it('이미 복기한 wild 결정(decision_frame.wild.review 존재)이면 409 + 갱신·이벤트 없음', async () => {
    logRow = {
      id: 'w2',
      confidence: null,
      actual_outcome: null,
      problem_type: 'wild',
      decision_frame: {
        version: 1,
        track: 'wild',
        wild: { identity: '용기', review: { lookingBack: '이미 적었음' } },
      },
    };
    const { POST } = await import('@/app/api/decision/review/route');
    const res = await POST(req({ logId: 'w2', track: 'wild', lookingBack: '다시 적기' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'already_reviewed' });
    expect(updateCalls).toHaveLength(0);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('wild 복기에 답이 하나도 없으면 400(빈 제출로 마커만 찍히는 것 방지)', async () => {
    logRow = {
      id: 'w3',
      confidence: null,
      actual_outcome: null,
      problem_type: 'wild',
      decision_frame: { version: 1, track: 'wild', wild: { identity: '용기' } },
    };
    const { POST } = await import('@/app/api/decision/review/route');
    const res = await POST(req({ logId: 'w3', track: 'wild' }));
    expect(res.status).toBe(400);
    expect(updateCalls).toHaveLength(0);
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
