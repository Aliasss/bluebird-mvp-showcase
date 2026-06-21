// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).

export interface AutonomyScoreInput {
  answerCount: number;
}

export const AUTONOMY_NOTE_BONUS = 0;
export const AUTONOMY_ANSWER_UNIT = 0;
export const AUTONOMY_ANSWER_CAP = 0;
export const AUTONOMY_MAX = AUTONOMY_ANSWER_CAP + AUTONOMY_NOTE_BONUS;

export function calcAutonomyScore(params: AutonomyScoreInput): number {
  throw new Error('핵심 로직 비공개');
}
