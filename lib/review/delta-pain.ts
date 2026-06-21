// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).

export interface PainPair {
  initial: number | null;
  reevaluated: number | null;
}

export function calcDeltaPain(
  initial: number | null,
  reevaluated: number | null
): number | null {
  throw new Error('핵심 로직 비공개');
}

export function sumPositiveDeltaPain(pairs: PainPair[]): number {
  throw new Error('핵심 로직 비공개');
}
