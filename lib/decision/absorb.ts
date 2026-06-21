// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).
import type { AbsorbAnswer, AbsorbBranch } from './types';
export function resolveAbsorbBranch(answer: AbsorbAnswer): AbsorbBranch {
  throw new Error('핵심 로직 비공개');
}
