import { describe, it, expect } from 'vitest';
import {
  calcDeltaPain,
  sumPositiveDeltaPain,
  type PainPair,
} from '@/lib/review/delta-pain';

describe('calcDeltaPain', () => {
  it('양수 Δpain (고통 감소)', () => {
    expect(calcDeltaPain(5, 2)).toBe(3);
  });

  it('음수 Δpain (고통 증가)', () => {
    expect(calcDeltaPain(2, 4)).toBe(-2);
  });

  it('변화 없음', () => {
    expect(calcDeltaPain(3, 3)).toBe(0);
  });

  it('재평가 null이면 null', () => {
    expect(calcDeltaPain(5, null)).toBeNull();
  });

  it('초기 null이면 null', () => {
    expect(calcDeltaPain(null, 3)).toBeNull();
  });
});

describe('sumPositiveDeltaPain', () => {
  it('양수만 합산, 음수·0·null 제외', () => {
    const pairs: PainPair[] = [
      { initial: 5, reevaluated: 2 }, // +3
      { initial: 4, reevaluated: 4 }, // 0 (제외)
      { initial: 2, reevaluated: 5 }, // -3 (제외)
      { initial: 5, reevaluated: null }, // null (제외)
      { initial: 3, reevaluated: 1 }, // +2
    ];
    expect(sumPositiveDeltaPain(pairs)).toBe(5);
  });

  it('빈 배열 0', () => {
    expect(sumPositiveDeltaPain([])).toBe(0);
  });
});
