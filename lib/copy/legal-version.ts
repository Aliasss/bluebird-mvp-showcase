// 약관·개인정보 처리방침 버전 SSOT(단일 출처).
//
// 시행일 = 버전 문자열(YYYY-MM-DD). app/terms·app/privacy 의 시행일과 일치해야 한다.
// 2026-06-06 개정: 결정 기록(예상 결과·확신도·복기) 수집 항목 추가 + 분석 텍스트의
// 국외이전(Google Gemini, 미국) 범위 확대 = PIPA "중요 변경".
//
// - 신규 가입(app/auth/signup)은 가입 시점에 아래 상수를 동의 버전으로 기록한다.
// - 기존 로그인 사용자는 저장된 동의 버전이 아래보다 구버전이면 재동의가 필요하다
//   (components/legal/ReconsentGate).
//
// 두 값은 의도적으로 분리해 둔다(약관·처리방침이 따로 개정될 수 있음). 현재는 동일 날짜.

export const CURRENT_TERMS_VERSION = '2026-06-06';
export const CURRENT_PRIVACY_VERSION = '2026-06-06';

/** 사용자가 저장해 둔 동의 버전 (auth.users.user_metadata 기준). */
export interface StoredConsentVersions {
  terms?: string | null;
  privacy?: string | null;
}

/**
 * 재동의가 필요한지 판정하는 순수 함수.
 *
 * true 를 반환하는 경우:
 *   - 약관 또는 처리방침 버전이 비어 있음(미저장 = 구버전 가입자)
 *   - 저장된 버전이 현재 버전보다 과거(날짜 비교)
 *
 * 버전 문자열은 YYYY-MM-DD 형식이므로 사전식(lexicographic) 비교가 곧 날짜 비교다.
 * 같거나 더 최신이면 false(재동의 불필요).
 */
export function needsReconsent(stored: StoredConsentVersions): boolean {
  return (
    isOlder(stored.terms, CURRENT_TERMS_VERSION) ||
    isOlder(stored.privacy, CURRENT_PRIVACY_VERSION)
  );
}

/** 저장값이 비었거나 기준 버전보다 과거이면 true. */
function isOlder(storedVersion: string | null | undefined, current: string): boolean {
  if (!storedVersion) return true; // 미저장 = 구버전 가입자 → 재동의 필요
  return storedVersion < current; // YYYY-MM-DD 사전식 = 날짜 비교
}
