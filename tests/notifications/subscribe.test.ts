import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpsert = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ upsert: mockUpsert }),
  }),
}));

vi.mock('@/lib/logging/server-logger', () => ({
  logServerError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockResolvedValue({ error: null });
});

describe('POST /api/push/subscribe', () => {
  it('body 형식 위반 시 400', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { POST } = await import('@/app/api/push/subscribe/route');
    const req = new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ wrong: 'shape' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('인증 없으면 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { POST } = await import('@/app/api/push/subscribe/route');
    const req = new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://fcm.googleapis.com/fcm/send/x',
        keys: { p256dh: 'p', auth: 'a' },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('정상 요청 시 upsert 호출 + 200', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { POST } = await import('@/app/api/push/subscribe/route');
    const req = new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'user-agent': 'TestUA/1.0' },
      body: JSON.stringify({
        endpoint: 'https://fcm.googleapis.com/fcm/send/x',
        keys: { p256dh: 'p', auth: 'a' },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/x',
        p256dh: 'p',
        auth: 'a',
        user_agent: 'TestUA/1.0',
      }),
      expect.objectContaining({ onConflict: 'user_id,endpoint' }),
    );
  });
});
