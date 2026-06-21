import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEq2 = vi.fn();
const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
const mockDelete = vi.fn(() => ({ eq: mockEq1 }));
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ delete: mockDelete }),
  }),
}));

vi.mock('@/lib/logging/server-logger', () => ({
  logServerError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockEq2.mockResolvedValue({ error: null });
});

describe('POST /api/push/unsubscribe', () => {
  it('인증 없으면 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { POST } = await import('@/app/api/push/unsubscribe/route');
    const req = new Request('http://localhost/api/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://x' }),
    });
    expect((await POST(req)).status).toBe(401);
  });

  it('endpoint 누락 시 400', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { POST } = await import('@/app/api/push/unsubscribe/route');
    const req = new Request('http://localhost/api/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect((await POST(req)).status).toBe(400);
  });

  it('정상 요청 시 delete().eq(endpoint).eq(user_id) 체이닝', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { POST } = await import('@/app/api/push/unsubscribe/route');
    const req = new Request('http://localhost/api/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/x' }),
    });
    expect((await POST(req)).status).toBe(200);
    expect(mockEq1).toHaveBeenCalledWith(
      'endpoint',
      'https://fcm.googleapis.com/fcm/send/x',
    );
    expect(mockEq2).toHaveBeenCalledWith('user_id', 'u1');
  });
});
