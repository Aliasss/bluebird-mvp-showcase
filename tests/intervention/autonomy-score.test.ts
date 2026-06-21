import { describe, it, expect } from 'vitest';
import {
  AUTONOMY_NOTE_BONUS,
  AUTONOMY_ANSWER_UNIT,
  AUTONOMY_ANSWER_CAP,
  AUTONOMY_MAX,
  calcAutonomyScore,
} from '@/lib/intervention/autonomy-score';

describe('calcAutonomyScore (v2 — SDT autonomy)', () => {
  it('answer 0개일 때 0점을 반환한다', () => {
    expect(calcAutonomyScore({ answerCount: 0 })).toBe(0);
  });

  it('answer 1개당 5점이며, 3개까지만 가산된다 (cap 15)', () => {
    expect(calcAutonomyScore({ answerCount: 1 })).toBe(AUTONOMY_ANSWER_UNIT);
    expect(calcAutonomyScore({ answerCount: 2 })).toBe(AUTONOMY_ANSWER_UNIT * 2);
    expect(calcAutonomyScore({ answerCount: 3 })).toBe(AUTONOMY_ANSWER_CAP);
    expect(calcAutonomyScore({ answerCount: 10 })).toBe(AUTONOMY_ANSWER_CAP);
  });

  it('음수 입력은 0으로 클램프된다', () => {
    expect(calcAutonomyScore({ answerCount: -3 })).toBe(0);
  });

  it('정답+노트 시나리오: AUTONOMY_ANSWER_CAP + AUTONOMY_NOTE_BONUS = AUTONOMY_MAX', () => {
    const score = calcAutonomyScore({ answerCount: 3 }) + AUTONOMY_NOTE_BONUS;
    expect(score).toBe(AUTONOMY_MAX);
    expect(AUTONOMY_MAX).toBe(30);
  });

  it('노트만 작성 시 (answer 0): noteBonus만 부여 = 15점', () => {
    const score = calcAutonomyScore({ answerCount: 0 }) + AUTONOMY_NOTE_BONUS;
    expect(score).toBe(AUTONOMY_NOTE_BONUS);
  });
});
