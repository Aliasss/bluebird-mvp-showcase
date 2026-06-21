import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: () => ({
    rpc: mockRpc,
    from: () => ({ insert: mockInsert }),
  }),
}));

const mockSend = vi.fn();
vi.mock('@/lib/notifications/send', () => ({
  sendCheckinReminder: (...args: unknown[]) => mockSend(...args),
}));

vi.mock('@/lib/logging/server-logger', () => ({
  logServerError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'test-secret';
});

describe('POST /api/cron/checkin-reminder', () => {
  it('Authorization 헤더 누락 시 401', async () => {
    const { POST } = await import('@/app/api/cron/checkin-reminder/route');
    const req = new Request('http://localhost/api/cron/checkin-reminder', {
      method: 'POST',
    });
    expect((await POST(req)).status).toBe(401);
  });

  it('Authorization 불일치 시 401', async () => {
    const { POST } = await import('@/app/api/cron/checkin-reminder/route');
    const req = new Request('http://localhost/api/cron/checkin-reminder', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
    });
    expect((await POST(req)).status).toBe(401);
  });

  it('targets 0건이면 200 + sent=0', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const { POST } = await import('@/app/api/cron/checkin-reminder/route');
    const req = new Request('http://localhost/api/cron/checkin-reminder', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(
      expect.objectContaining({ sent: 0, total: 0 }),
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('각 target마다 sendCheckinReminder 호출, subscription shape 변환', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { user_id: 'u1', endpoint: 'https://x/1', p256dh: 'p1', auth: 'a1' },
        { user_id: 'u2', endpoint: 'https://x/2', p256dh: 'p2', auth: 'a2' },
      ],
      error: null,
    });
    mockSend.mockResolvedValue({ status: 'sent' });

    const { POST } = await import('@/app/api/cron/checkin-reminder/route');
    const req = new Request('http://localhost/api/cron/checkin-reminder', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledWith(
      { endpoint: 'https://x/1', keys: { p256dh: 'p1', auth: 'a1' } },
      'u1',
    );
  });

  it('일부 발송 실패해도 전체 응답은 200, sent 카운트는 성공만', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { user_id: 'u1', endpoint: 'https://x/1', p256dh: 'p1', auth: 'a1' },
        { user_id: 'u2', endpoint: 'https://x/2', p256dh: 'p2', auth: 'a2' },
      ],
      error: null,
    });
    mockSend
      .mockResolvedValueOnce({ status: 'sent' })
      .mockRejectedValueOnce(new Error('500 transient'));

    const { POST } = await import('@/app/api/cron/checkin-reminder/route');
    const req = new Request('http://localhost/api/cron/checkin-reminder', {
      method: 'POST',
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.total).toBe(2);
    expect(body.failed).toBe(1);
  });
});

// Vercel Cron이 GET을 보내는데 POST만 export하면 405가 반사돼 핸들러가
// 호출조차 안 됨 (2026-05-12 production 사고). 회귀 가드.
describe('GET /api/cron/checkin-reminder (Vercel Cron 실제 호출 메서드)', () => {
  it('GET 핸들러가 export되어 있어야 한다', async () => {
    const mod = await import('@/app/api/cron/checkin-reminder/route');
    expect(typeof mod.GET).toBe('function');
  });

  it('GET + 유효 Bearer 시 200 + funnel 응답', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const { GET } = await import('@/app/api/cron/checkin-reminder/route');
    const req = new Request('http://localhost/api/cron/checkin-reminder', {
      method: 'GET',
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(
      expect.objectContaining({ sent: 0, total: 0 }),
    );
  });

  it('GET + Bearer 누락 시 401', async () => {
    const { GET } = await import('@/app/api/cron/checkin-reminder/route');
    const req = new Request('http://localhost/api/cron/checkin-reminder', {
      method: 'GET',
    });
    expect((await GET(req)).status).toBe(401);
  });
});
