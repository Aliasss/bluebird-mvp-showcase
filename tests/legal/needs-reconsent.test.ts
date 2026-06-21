import { describe, it, expect } from 'vitest';
import {
  needsReconsent,
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from '@/lib/copy/legal-version';

// 배포게이트 ②-AC7 — 기존 사용자 재동의 판정 순수 함수.
// 신규 가입자(현재 버전 보유)는 false, 구버전·미저장 사용자는 true.

describe('needsReconsent', () => {
  const CUR_T = CURRENT_TERMS_VERSION;
  const CUR_P = CURRENT_PRIVACY_VERSION;

  it('현재 버전과 동일하면 재동의 불필요 (신규 가입자)', () => {
    expect(needsReconsent({ terms: CUR_T, privacy: CUR_P })).toBe(false);
  });

  it('두 버전 모두 미저장이면 재동의 필요 (버전 도입 이전 가입자)', () => {
    expect(needsReconsent({})).toBe(true);
    expect(needsReconsent({ terms: null, privacy: null })).toBe(true);
    expect(needsReconsent({ terms: undefined, privacy: undefined })).toBe(true);
  });

  it('약관만 구버전이어도 재동의 필요', () => {
    expect(needsReconsent({ terms: '2026-01-01', privacy: CUR_P })).toBe(true);
  });

  it('처리방침만 구버전이어도 재동의 필요', () => {
    expect(needsReconsent({ terms: CUR_T, privacy: '2025-12-31' })).toBe(true);
  });

  it('한 버전만 저장돼 있고 나머지가 비어도 재동의 필요', () => {
    expect(needsReconsent({ terms: CUR_T })).toBe(true);
    expect(needsReconsent({ privacy: CUR_P })).toBe(true);
  });

  it('YYYY-MM-DD 사전식 비교가 날짜 비교와 일치한다', () => {
    // 같은 달 다른 일
    expect(needsReconsent({ terms: '2026-06-05', privacy: CUR_P })).toBe(true);
    // 다른 달
    expect(needsReconsent({ terms: '2026-05-31', privacy: CUR_P })).toBe(true);
    // 다른 해
    expect(needsReconsent({ terms: '2025-12-31', privacy: CUR_P })).toBe(true);
  });

  it('저장 버전이 현재보다 더 최신이면 재동의 불필요 (미래 개정 미리 동의한 경우)', () => {
    expect(needsReconsent({ terms: '2099-01-01', privacy: '2099-01-01' })).toBe(false);
  });
});
