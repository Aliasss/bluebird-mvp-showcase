import { describe, it, expect, beforeEach } from 'vitest';
import { getVapidConfig, urlBase64ToUint8Array } from '@/lib/notifications/vapid';

describe('notifications/vapid', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BPub_test';
    process.env.VAPID_PRIVATE_KEY = 'priv_test';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  });

  it('env 모두 존재 시 config 반환', () => {
    const cfg = getVapidConfig();
    expect(cfg.publicKey).toBe('BPub_test');
    expect(cfg.privateKey).toBe('priv_test');
    expect(cfg.subject).toBe('mailto:test@example.com');
  });

  it('VAPID_PRIVATE_KEY 미설정 시 throw', () => {
    delete process.env.VAPID_PRIVATE_KEY;
    expect(() => getVapidConfig()).toThrowError(/VAPID_PRIVATE_KEY/);
  });

  it('urlBase64ToUint8Array는 표준 base64url을 디코드', () => {
    // 'Hello' → base64url: SGVsbG8 (no padding)
    const arr = urlBase64ToUint8Array('SGVsbG8');
    expect(Array.from(arr)).toEqual([72, 101, 108, 108, 111]);
  });

  it('urlBase64ToUint8Array는 -, _ 치환을 처리', () => {
    // '???' = 0x3F 0x3F 0x3F → base64 'Pz8/' → base64url 'Pz8_'
    const arr = urlBase64ToUint8Array('Pz8_');
    expect(Array.from(arr)).toEqual([0x3f, 0x3f, 0x3f]);
  });
});
