import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsert = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ insert: mockInsert }),
  }),
}));

vi.mock('@/lib/logging/server-logger', () => ({
  logServerError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
});

describe('POST /api/notifications/event', () => {
  it('알 수 없는 event_type은 400', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { POST } = await import('@/app/api/notifications/event/route');
    const req = new Request('http://localhost/api/notifications/event', {
      method: 'POST',
      body: JSON.stringify({ type: 'unknown_event' }),
    });
    expect((await POST(req)).status).toBe(400);
  });

  it('인증 없으면 silent drop (200, insert 없음)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { POST } = await import('@/app/api/notifications/event/route');
    const req = new Request('http://localhost/api/notifications/event', {
      method: 'POST',
      body: JSON.stringify({ type: 'p2_shown' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('정상 이벤트 적재 + metadata 전달', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { POST } = await import('@/app/api/notifications/event/route');
    const req = new Request('http://localhost/api/notifications/event', {
      method: 'POST',
      body: JSON.stringify({
        type: 'permission_granted',
        metadata: { device: 'iOS' },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        event_type: 'permission_granted',
        metadata: { device: 'iOS' },
      }),
    );
  });

  it('metadata 누락도 정상 (null로 적재)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { POST } = await import('@/app/api/notifications/event/route');
    const req = new Request('http://localhost/api/notifications/event', {
      method: 'POST',
      body: JSON.stringify({ type: 'p3_dismissed' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: null }),
    );
  });
});
