/**
 * VAPID 키 로딩 + base64url → Uint8Array 변환.
 * server: getVapidConfig() — web-push.setVapidDetails 입력
 * client: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY) — pushManager.subscribe 입력
 */

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function getVapidConfig(): VapidConfig {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey) throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY 미설정');
  if (!privateKey) throw new Error('VAPID_PRIVATE_KEY 미설정');
  if (!subject) throw new Error('VAPID_SUBJECT 미설정');

  return { publicKey, privateKey, subject };
}

/**
 * 표준 base64url → Uint8Array.
 * pushManager.subscribe의 applicationServerKey는 Uint8Array 또는 BufferSource를 요구.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw =
    typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
