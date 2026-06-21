import { describe, it, expect } from 'vitest';
import { isDecisionReviewed, isAwaitingReview } from '@/lib/decision/review-status';
import type { Log } from '@/types';

// 최소 결정 row 헬퍼 — 테스트 가독성용. 필요한 필드만 덮어쓴다.
function decisionLog(overrides: Partial<Log> = {}): Log {
  return {
    id: 'log-1',
    user_id: 'user-1',
    trigger: '결정 텍스트',
    thought: '결정 텍스트',
    log_type: 'decision',
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

const NOW = new Date('2026-06-06T00:00:00.000Z');
const PAST = '2026-06-05T00:00:00.000Z'; // review_at <= now
const FUTURE = '2026-06-07T00:00:00.000Z'; // review_at > now

describe('isDecisionReviewed — TAME / 레거시 (actual_outcome 기준)', () => {
  it('레거시(problem_type=null) + actual_outcome 있음 → 복기 완료', () => {
    expect(isDecisionReviewed(decisionLog({ problem_type: null, actual_outcome: '예상대로였음' }))).toBe(true);
  });

  it('레거시(problem_type=null) + actual_outcome 없음 → 미복기', () => {
    expect(isDecisionReviewed(decisionLog({ problem_type: null, actual_outcome: null }))).toBe(false);
  });

  it('tame + actual_outcome 있음 → 복기 완료', () => {
    expect(isDecisionReviewed(decisionLog({ problem_type: 'tame', actual_outcome: '예상보다 좋았음' }))).toBe(true);
  });

  it('tame + actual_outcome 없음 → 미복기 (decision_frame.wild 가 있어도 tame 은 무시)', () => {
    expect(
      isDecisionReviewed(
        decisionLog({ problem_type: 'tame', actual_outcome: null, decision_frame: { wild: { review: { lookingBack: 'x' } } } }),
      ),
    ).toBe(false);
  });
});

describe('isDecisionReviewed — WILD (decision_frame.wild.review 기준)', () => {
  it('wild + decision_frame.wild.review 존재 → 복기 완료 (actual_outcome 은 null 유지)', () => {
    expect(
      isDecisionReviewed(
        decisionLog({
          problem_type: 'wild',
          actual_outcome: null,
          decision_frame: { wild: { review: { lookingBack: '지금 돌아보면...' } } },
        }),
      ),
    ).toBe(true);
  });

  it('wild + decision_frame.wild.review 없음 → 미복기', () => {
    expect(
      isDecisionReviewed(
        decisionLog({ problem_type: 'wild', actual_outcome: null, decision_frame: { wild: { identity: '...' } } }),
      ),
    ).toBe(false);
  });

  it('wild + decision_frame 자체가 null → 미복기', () => {
    expect(isDecisionReviewed(decisionLog({ problem_type: 'wild', actual_outcome: null, decision_frame: null }))).toBe(false);
  });

  it('wild 는 actual_outcome 이 있어도 review 마커가 없으면 미복기 (캘리브레이션 컬럼 무시)', () => {
    expect(
      isDecisionReviewed(decisionLog({ problem_type: 'wild', actual_outcome: '예상대로였음', decision_frame: { wild: {} } })),
    ).toBe(false);
  });

  it('wild + wild.review = null → 미복기 (존재하되 null 마커)', () => {
    expect(
      isDecisionReviewed(decisionLog({ problem_type: 'wild', decision_frame: { wild: { review: null } } })),
    ).toBe(false);
  });
});

describe('isDecisionReviewed — malformed decision_frame 안전 처리', () => {
  it('wild + decision_frame 가 배열 → 미복기(throw 없음)', () => {
    expect(
      isDecisionReviewed(decisionLog({ problem_type: 'wild', decision_frame: [1, 2, 3] as unknown as Record<string, unknown> })),
    ).toBe(false);
  });

  it('wild + decision_frame.wild 가 문자열 → 미복기(throw 없음)', () => {
    expect(
      isDecisionReviewed(decisionLog({ problem_type: 'wild', decision_frame: { wild: 'oops' } })),
    ).toBe(false);
  });

  it('wild + decision_frame.wild.review 가 원시값(숫자) → 복기 완료(non-null 마커 존재)', () => {
    // 마커는 "존재·non-null" 만 본다 — 형태는 따지지 않음(부분 저장 허용 §6.1).
    expect(
      isDecisionReviewed(decisionLog({ problem_type: 'wild', decision_frame: { wild: { review: 1 } } })),
    ).toBe(true);
  });
});

describe('isAwaitingReview — 트랙 무관 대기 판정', () => {
  it('tame + review_at 도래 + 미복기 → 대기', () => {
    expect(isAwaitingReview(decisionLog({ problem_type: 'tame', review_at: PAST, actual_outcome: null }), NOW)).toBe(true);
  });

  it('tame + review_at 도래 + 복기 완료 → 대기 아님', () => {
    expect(
      isAwaitingReview(decisionLog({ problem_type: 'tame', review_at: PAST, actual_outcome: '예상대로였음' }), NOW),
    ).toBe(false);
  });

  it('wild + review_at 도래 + review 마커 없음 → 대기 (actual_outcome null 이어도 노출돼야 함)', () => {
    expect(
      isAwaitingReview(decisionLog({ problem_type: 'wild', review_at: PAST, actual_outcome: null, decision_frame: { wild: {} } }), NOW),
    ).toBe(true);
  });

  it('wild + review_at 도래 + review 마커 존재 → 대기 아님 (복기됐으면 사라져야 함)', () => {
    expect(
      isAwaitingReview(
        decisionLog({ problem_type: 'wild', review_at: PAST, actual_outcome: null, decision_frame: { wild: { review: { lookingBack: 'x' } } } }),
        NOW,
      ),
    ).toBe(false);
  });

  it('review_at 미래 → 미복기여도 대기 아님 (경계: review_at > now)', () => {
    expect(isAwaitingReview(decisionLog({ problem_type: 'tame', review_at: FUTURE, actual_outcome: null }), NOW)).toBe(false);
  });

  it('review_at == now (경계 포함) + 미복기 → 대기', () => {
    expect(
      isAwaitingReview(decisionLog({ problem_type: 'tame', review_at: NOW.toISOString(), actual_outcome: null }), NOW),
    ).toBe(true);
  });

  it('review_at == null → 대기 아님 (검토기한 미설정)', () => {
    expect(isAwaitingReview(decisionLog({ problem_type: 'tame', review_at: null, actual_outcome: null }), NOW)).toBe(false);
  });

  it('레거시(problem_type=null) + review_at 도래 + actual_outcome 없음 → 대기 (현행 동작 보존)', () => {
    expect(isAwaitingReview(decisionLog({ problem_type: null, review_at: PAST, actual_outcome: null }), NOW)).toBe(true);
  });

  // 2026-06-13 회귀 가드 — 시각 비교 → KST 날짜 비교 전환.
  //   review_at 이 검토 당일 23:59(KST)로 저장돼도, 그날 아침(시각은 review_at 이전)에 이미 대기여야 한다.
  it('검토 당일 23:59(KST) 저장 + now=같은 KST 날 아침 → 대기 (시각은 미래여도 날짜 동일)', () => {
    // NOW=2026-06-06T00:00Z=KST 06-06 09:00. review_at=KST 06-06 23:59:59=UTC 06-06T14:59:59Z.
    const sameKstDayLater = '2026-06-06T14:59:59.000Z';
    expect(
      isAwaitingReview(decisionLog({ problem_type: 'tame', review_at: sameKstDayLater, actual_outcome: null }), NOW),
    ).toBe(true);
  });

  it('검토일이 KST 다음 날 0시면 대기 아님 (UTC 동일 날짜라도 KST 날짜로 판정)', () => {
    // KST 06-07 00:00 = UTC 06-06T15:00Z. NOW 의 KST 날짜=06-06 → 아직 검토일 전.
    const nextKstDay = '2026-06-06T15:00:00.000Z';
    expect(
      isAwaitingReview(decisionLog({ problem_type: 'tame', review_at: nextKstDay, actual_outcome: null }), NOW),
    ).toBe(false);
  });
});
