import { describe, it, expect, vi, beforeEach } from 'vitest';

// web-push mock
const mockSendNotification = vi.fn();
const mockSetVapidDetails = vi.fn();
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

// supabase service-role client mock — delete().eq().eq() 체이닝 추적
const mockEq2 = vi.fn().mockResolvedValue({ error: null });
const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
const mockDelete = vi.fn(() => ({ eq: mockEq1 }));
const mockFrom = vi.fn(() => ({ delete: mockDelete }));
vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: () => ({ from: mockFrom }),
}));

// logServerError mock — 호출 카운트만 추적
vi.mock('@/lib/logging/server-logger', () => ({
  logServerError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BPub_test';
  process.env.VAPID_PRIVATE_KEY = 'priv_test';
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  // module cache 초기화 — vapidConfigured 플래그 리셋
  vi.resetModules();
});

const SUB = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p256dh_test', auth: 'auth_test' },
};

describe('notifications/send', () => {
  it('200 응답 시 status=sent', async () => {
    mockSendNotification.mockResolvedValue({ statusCode: 200 });
    const { sendCheckinReminder } = await import('@/lib/notifications/send');
    const result = await sendCheckinReminder(SUB, 'user-1');
    expect(result).toEqual({ endpoint: SUB.endpoint, status: 'sent' });
    expect(mockSendNotification).toHaveBeenCalledWith(
      SUB,
      expect.stringContaining('"title"'),
      { urgency: 'high' },
    );
  });

  it('410 Gone → push_subscriptions delete + status=gone', async () => {
    const err: Error & { statusCode?: number } = new Error('Gone');
    err.statusCode = 410;
    mockSendNotification.mockRejectedValue(err);

    const { sendCheckinReminder } = await import('@/lib/notifications/send');
    const result = await sendCheckinReminder(SUB, 'user-1');

    expect(result.status).toBe('gone');
    expect(mockFrom).toHaveBeenCalledWith('push_subscriptions');
    expect(mockEq1).toHaveBeenCalledWith('endpoint', SUB.endpoint);
    expect(mockEq2).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('404 Not Found도 410과 동일하게 정리', async () => {
    const err: Error & { statusCode?: number } = new Error('Not Found');
    err.statusCode = 404;
    mockSendNotification.mockRejectedValue(err);

    const { sendCheckinReminder } = await import('@/lib/notifications/send');
    const result = await sendCheckinReminder(SUB, 'user-1');

    expect(result.status).toBe('gone');
    expect(mockEq1).toHaveBeenCalled();
  });

  it('500 일시 오류는 정리하지 않고 throw', async () => {
    const err: Error & { statusCode?: number } = new Error('Server error');
    err.statusCode = 500;
    mockSendNotification.mockRejectedValue(err);

    const { sendCheckinReminder } = await import('@/lib/notifications/send');
    await expect(sendCheckinReminder(SUB, 'user-1')).rejects.toThrow();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('VAPID 설정은 한 번만 호출 (캐시)', async () => {
    mockSendNotification.mockResolvedValue({ statusCode: 200 });
    const { sendCheckinReminder } = await import('@/lib/notifications/send');
    await sendCheckinReminder(SUB, 'user-1');
    await sendCheckinReminder(SUB, 'user-2');
    expect(mockSetVapidDetails).toHaveBeenCalledTimes(1);
  });
});

describe('notifications/send — sendDecisionReviewReminder', () => {
  const URL = '/decision/d1/review';

  it('200 응답 시 status=sent + payload 에 결정별 url 포함', async () => {
    mockSendNotification.mockResolvedValue({ statusCode: 200 });
    const { sendDecisionReviewReminder } = await import(
      '@/lib/notifications/send'
    );
    const result = await sendDecisionReviewReminder(SUB, 'user-1', URL);
    expect(result).toEqual({ endpoint: SUB.endpoint, status: 'sent' });
    expect(mockSendNotification).toHaveBeenCalledWith(
      SUB,
      expect.stringContaining(`"url":"${URL}"`),
      { urgency: 'high' },
    );
  });

  it('410 Gone → push_subscriptions delete + status=gone', async () => {
    const err: Error & { statusCode?: number } = new Error('Gone');
    err.statusCode = 410;
    mockSendNotification.mockRejectedValue(err);

    const { sendDecisionReviewReminder } = await import(
      '@/lib/notifications/send'
    );
    const result = await sendDecisionReviewReminder(SUB, 'user-1', URL);

    expect(result.status).toBe('gone');
    expect(mockFrom).toHaveBeenCalledWith('push_subscriptions');
    expect(mockEq1).toHaveBeenCalledWith('endpoint', SUB.endpoint);
    expect(mockEq2).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('500 일시 오류는 정리하지 않고 throw', async () => {
    const err: Error & { statusCode?: number } = new Error('Server error');
    err.statusCode = 500;
    mockSendNotification.mockRejectedValue(err);

    const { sendDecisionReviewReminder } = await import(
      '@/lib/notifications/send'
    );
    await expect(
      sendDecisionReviewReminder(SUB, 'user-1', URL),
    ).rejects.toThrow();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
