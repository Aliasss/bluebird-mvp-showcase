// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).

export type TriageAnswer = 'yes' | 'no' | 'unsure';

export type TriageAnswers = {
  /** Q1 — 되돌릴 수 있는 결정인가? (항상) */
  reversible: TriageAnswer;
  /** Q2 — 나를 바꾸는 결정인가? (Q1 != 'yes' 일 때만) */
  identityShift?: TriageAnswer;
};

export type ProblemType = 'tame' | 'wild';

/** 라우팅 결과: 확정 트랙 또는 'incomplete'(Q2 답이 더 필요). */
export type TrackResolution = ProblemType | 'incomplete';

export function needsIdentityQuestion(reversible: TriageAnswer): boolean {
  throw new Error('핵심 로직 비공개');
}

export function resolveTrack(answers: TriageAnswers): TrackResolution {
  throw new Error('핵심 로직 비공개');
}
