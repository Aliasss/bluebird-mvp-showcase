/**
 * Server-side error logger with PII masking.
 *
 * 배경:
 *   - app/api/**\/route.ts 다수에서 console.error에 user 입력(text·thought·trigger),
 *     userId, email 같은 민감 정보가 그대로 흘러갈 수 있다.
 *   - 운영 환경의 로그 수집기(Vercel Logs 등)는 평문 보관 → PII 유출 위험.
 *   - 이 wrapper로 호출처에서 의도적으로 context를 넘기게 하고, 위험 키는 자동 마스킹.
 *
 * 사용 원칙:
 *   - 시스템 경계(API route, lib의 외부 호출 모듈)에서만 사용. 내부 함수는 throw.
 *   - 마스킹 필수: userId·email·text·thought·trigger·자동사고 본문
 *   - 안전: 에러 코드·HTTP status·route name (그대로 통과)
 *   - context에 PII 의심 키가 있다면 반드시 이 함수를 거친다.
 *
 * 마스킹 규칙:
 *   - email: a***@b.com 형태
 *   - userId / user_id: SHA256 short hash 8자
 *   - text / thought / trigger / content / message (사용자 입력 본문):
 *     length only ({length: N})
 *
 * 비PII 키는 그대로 직렬화. unknown 타입은 안전하게 toString.
 */

import { createHash } from 'node:crypto';

type Context = Record<string, unknown>;

const PII_LENGTH_ONLY_KEYS = new Set([
  'text',
  'thought',
  'trigger',
  'content',
  'message',
  'moodWord',
  'mood_word',
  'system2Moment',
  'system2_moment',
  'situation',
  'system2Action',
  'note',
  'completionNote',
  'completion_note',
]);

const HASH_KEYS = new Set(['userId', 'user_id', 'logId', 'log_id']);
const EMAIL_KEYS = new Set(['email']);

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 8);
}

function maskEmail(value: string): string {
  // a***@b.com — local의 첫 글자만 노출, 도메인은 그대로 (집계 가치)
  const at = value.indexOf('@');
  if (at <= 0) return '***';
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const lead = local.slice(0, 1) || '*';
  return `${lead}***@${domain}`;
}

function maskValue(key: string, value: unknown): unknown {
  if (value == null) return value;

  if (HASH_KEYS.has(key)) {
    return typeof value === 'string' ? `sha:${shortHash(value)}` : '<non-string id>';
  }
  if (EMAIL_KEYS.has(key)) {
    return typeof value === 'string' ? maskEmail(value) : '<non-string email>';
  }
  if (PII_LENGTH_ONLY_KEYS.has(key)) {
    if (typeof value === 'string') return { length: value.length };
    return { length: 0, note: 'non-string' };
  }
  // 비PII: 원형 유지 (단 객체는 한 단계 더 마스킹)
  if (typeof value === 'object' && !Array.isArray(value)) {
    return maskContext(value as Context);
  }
  return value;
}

function maskContext(ctx: Context | undefined): Context {
  if (!ctx) return {};
  const out: Context = {};
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = maskValue(k, v);
  }
  return out;
}

function serializeError(err: unknown): Context {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // stack은 production에서 잘라낸다 (full stack은 노이즈)
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    };
  }
  if (typeof err === 'object' && err !== null) {
    // Supabase PostgrestError 등
    try {
      return JSON.parse(JSON.stringify(err)) as Context;
    } catch {
      return { repr: String(err) };
    }
  }
  return { value: String(err) };
}

/**
 * 서버 사이드 에러 로깅. PII 자동 마스킹.
 *
 * @param scope  호출처 식별자. 예: 'api/analyze', 'api/checkin', 'lib/auth/account-deletion'
 * @param err    원시 에러 (Error, PostgrestError, unknown 모두 허용)
 * @param context 추가 메타데이터. PII 의심 키는 자동 마스킹.
 */
export function logServerError(
  scope: string,
  err: unknown,
  context?: Context
): void {
  const payload = {
    level: 'error',
    scope,
    error: serializeError(err),
    context: maskContext(context),
    ts: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'production') {
    // 단일 라인 JSON — Vercel/CloudWatch 등에서 파싱 친화적
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(payload));
  } else {
    // dev: 가독성 우선
    // eslint-disable-next-line no-console
    console.error(`[${scope}]`, payload.error, payload.context);
  }
}
