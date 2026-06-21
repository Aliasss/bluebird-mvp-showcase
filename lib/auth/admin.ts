// 운영자(어드민) 식별 SSOT — 2026-05-18.
//
// 보안 결정:
//   - 환경변수 ADMIN_EMAILS (콤마 구분) 만으로 인식. hardcode fallback 없음.
//   - env 미설정 → 빈 집합 → 모든 어드민 경로 차단 (fail-safe).
//   - 코드에 운영자 계정 commit 회피 → public repo 안전.
//
// 사용처:
//   - proxy.ts: /admin 경로 진입 시 추가 게이트
//   - app/admin/**/page.tsx: server-side cross-check
//   - app/api/admin/**/route.ts: API 호출자 cross-check (service_role 사용 전 검증)

/**
 * env 변수 ADMIN_EMAILS 에서 운영자 이메일 집합 추출.
 * 빈 문자열·미설정 → 빈 Set (fail-safe).
 *
 * 형식 예: ADMIN_EMAILS=founder@example.com,coadmin@example.com
 */
function loadAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = loadAdminEmails();
  return admins.has(email.toLowerCase());
}

/** 디버깅·테스트용 — 운영 코드 의존 금지. */
export function getAdminEmailsForDebug(): string[] {
  return Array.from(loadAdminEmails());
}
