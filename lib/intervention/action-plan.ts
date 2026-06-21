// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).

export interface ActionPlan {
  when: string;
  what: string;
  howLong: string;
}

export function parseActionPlan(raw: string | null | undefined): ActionPlan | null {
  throw new Error('핵심 로직 비공개');
}

export function serializeActionPlan(plan: ActionPlan): string {
  throw new Error('핵심 로직 비공개');
}

export function formatActionPlanForDisplay(raw: string | null | undefined): string {
  throw new Error('핵심 로직 비공개');
}

export function validateActionPlan(plan: ActionPlan): string | null {
  throw new Error('핵심 로직 비공개');
}
