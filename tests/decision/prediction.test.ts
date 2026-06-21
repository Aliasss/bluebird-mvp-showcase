import { describe, it, expect } from 'vitest';
import { validateDecisionDraft } from '@/lib/decision/prediction';

const base = { decision: '이직 제안을 수락할까', confidence: 70, reviewAt: '2026-07-01T00:00:00Z' };
const now = new Date('2026-06-03T00:00:00Z');

describe('validateDecisionDraft', () => {
  it('정상 입력은 에러 없음', () => { expect(validateDecisionDraft(base, now)).toEqual([]); });
  it('결정 5자 미만이면 too_short', () => { expect(validateDecisionDraft({ ...base, decision: '음' }, now)).toContain('decision_too_short'); });
  it('확신도 범위 밖이면 out_of_range', () => { expect(validateDecisionDraft({ ...base, confidence: 120 }, now)).toContain('confidence_out_of_range'); });
  it('검토 기한 없으면 missing', () => { expect(validateDecisionDraft({ ...base, reviewAt: null }, now)).toContain('review_date_missing'); });
  it('검토 기한 과거면 past', () => { expect(validateDecisionDraft({ ...base, reviewAt: '2026-06-01T00:00:00Z' }, now)).toContain('review_date_past'); });
  it('선택지·예상결과는 선택 입력 — 없어도 통과', () => { expect(validateDecisionDraft({ ...base, options: undefined, expectedOutcome: undefined }, now)).toEqual([]); });
});
