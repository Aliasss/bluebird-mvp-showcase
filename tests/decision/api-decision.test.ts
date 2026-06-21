/**
 * Pure Zod schema tests for the decision creation API.
 * No network / DB calls — import the exported schema only.
 */
import { describe, it, expect } from 'vitest';
import { decisionBodySchema } from '@/lib/decision/schemas';

const validBody = {
  decision: '이직 제안을 수락할지 결정해야 한다',
  confidence: 70,
  reviewAt: '2026-07-01T00:00:00.000Z',
};

describe('decisionBodySchema', () => {
  it('유효한 본문은 통과', () => {
    const result = decisionBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it('decision 5자 미만이면 실패', () => {
    const result = decisionBodySchema.safeParse({ ...validBody, decision: '짧음' });
    expect(result.success).toBe(false);
  });

  it('confidence 120이면 실패 (0~100 초과)', () => {
    const result = decisionBodySchema.safeParse({ ...validBody, confidence: 120 });
    expect(result.success).toBe(false);
  });

  it('reviewAt 이 ISO datetime 이 아니면 실패', () => {
    const result = decisionBodySchema.safeParse({ ...validBody, reviewAt: '2026-07-01' });
    expect(result.success).toBe(false);
  });

  it('options 없어도 통과 (선택 입력)', () => {
    const { options: _o, ...withoutOptions } = { ...validBody, options: undefined };
    void _o;
    const result = decisionBodySchema.safeParse(withoutOptions);
    expect(result.success).toBe(true);
  });

  it('expectedOutcome 없어도 통과 (선택 입력)', () => {
    const result = decisionBodySchema.safeParse({ ...validBody, expectedOutcome: undefined });
    expect(result.success).toBe(true);
  });

  it('options 와 expectedOutcome 둘 다 없어도 통과', () => {
    const result = decisionBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  // ── 결정 로직 v2 가산 필드 (problemType · decisionFrame) ──────────────────
  it('problemType·decisionFrame 없어도 통과 (레거시·v1 무영향)', () => {
    const result = decisionBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it('problemType=tame + tame frame 통과', () => {
    const result = decisionBodySchema.safeParse({
      ...validBody,
      problemType: 'tame',
      decisionFrame: {
        version: 1,
        track: 'tame',
        triage: { reversible: 'no', identityShift: 'no' },
        tame: { worstCase: '최악의 시나리오', baseRateOutOf10: 3 },
      },
    });
    expect(result.success).toBe(true);
  });

  it('problemType 이 tame/wild 외 값이면 실패', () => {
    const result = decisionBodySchema.safeParse({ ...validBody, problemType: 'foo' });
    expect(result.success).toBe(false);
  });

  it('decisionFrame.tame 에 알 수 없는 키가 있으면 실패 (strict — 임의 JSON 주입 차단)', () => {
    const result = decisionBodySchema.safeParse({
      ...validBody,
      decisionFrame: { version: 1, track: 'tame', tame: { hacked: 'x' } },
    });
    expect(result.success).toBe(false);
  });

  it('baseRateOutOf10 이 0~10 범위를 벗어나면 실패', () => {
    const result = decisionBodySchema.safeParse({
      ...validBody,
      decisionFrame: { version: 1, track: 'tame', tame: { baseRateOutOf10: 11 } },
    });
    expect(result.success).toBe(false);
  });

  it('decisionFrame.version 이 1 이 아니면 실패', () => {
    const result = decisionBodySchema.safeParse({
      ...validBody,
      decisionFrame: { version: 2, track: 'tame' },
    });
    expect(result.success).toBe(false);
  });

  // ── wild 트랙 — 비점수 계약 (§0.1 쐐기 / §4 / AC-8) ───────────────────────
  it('problemType=wild + confidence=null + wild frame 통과 (확신도 점수화 없음)', () => {
    const result = decisionBodySchema.safeParse({
      ...validBody,
      confidence: null, // wild 는 확신도 점수화 없음 — null 로 유지(쐐기 보존).
      problemType: 'wild',
      decisionFrame: {
        version: 1,
        track: 'wild',
        triage: { reversible: 'no', identityShift: 'yes' },
        wild: {
          identity: '용기 있는 사람이 되고 싶다',
          acceptUnknown: 'partly',
          anticipatedRegret: '안 했을 때 더 후회할 듯',
          reversibleStep: '짧게 살아보기',
          revelation: '직접 겪어 알고 싶다',
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('problemType=wild + 자기분류(uncertaintyWorry)·가짜양자택일(falseDichotomy) 포함 통과 (1·4단계 신규 키)', () => {
    const result = decisionBodySchema.safeParse({
      ...validBody,
      confidence: null,
      problemType: 'wild',
      decisionFrame: {
        version: 1,
        track: 'wild',
        wild: {
          identity: '성장과 안정 사이',
          falseDichotomy: '등록 vs 포기 말고 휴학 후 재지원도 있다',
          uncertaintyWorry: '결과를 몰라서 드는 막연한 불안',
          anticipatedRegret: '안 하면 후회할 것 같다',
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('wild review 의 검토 기한(reviewAt)은 여전히 필수 (검토 기한은 양 트랙 공통)', () => {
    const { reviewAt: _r, ...withoutReview } = { ...validBody, confidence: null };
    void _r;
    const result = decisionBodySchema.safeParse({ ...withoutReview, problemType: 'wild' });
    expect(result.success).toBe(false);
  });

  it('decisionFrame.wild 에 알 수 없는 키가 있으면 실패 (strict — 임의 JSON 주입 차단)', () => {
    const result = decisionBodySchema.safeParse({
      ...validBody,
      confidence: null,
      decisionFrame: { version: 1, track: 'wild', wild: { hacked: 'x' } },
    });
    expect(result.success).toBe(false);
  });

  it('decisionFrame.wild 에 review 키를 기록 시점에 보내면 실패 (복기 마커는 Task 4 — §6.4)', () => {
    const result = decisionBodySchema.safeParse({
      ...validBody,
      confidence: null,
      decisionFrame: {
        version: 1,
        track: 'wild',
        wild: { identity: 'x', review: { lookingBack: '...' } },
      },
    });
    expect(result.success).toBe(false);
  });

  it('wild acceptUnknown 이 yes/partly/no 외 값이면 실패', () => {
    const result = decisionBodySchema.safeParse({
      ...validBody,
      confidence: null,
      decisionFrame: { version: 1, track: 'wild', wild: { acceptUnknown: 'maybe' } },
    });
    expect(result.success).toBe(false);
  });
});
