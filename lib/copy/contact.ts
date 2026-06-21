// 서비스 공식 연락처 단일 출처 (SSOT) — 2026-05-17 결정.
// 모든 페이지·문서에서 본 파일 import. 향후 변경 시 1곳만 수정.

export const SERVICE_CONTACT_EMAIL = 'mvp.bluebird@gmail.com';

// 메일 클라이언트로 바로 열기 — 페이지별 제목 prefix 권장 (운영자 분류 편의).
export function buildMailto(subject?: string): string {
  if (!subject) return `mailto:${SERVICE_CONTACT_EMAIL}`;
  return `mailto:${SERVICE_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
