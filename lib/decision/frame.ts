/**
 * lib/decision/frame.ts
 *
 * decision_frame 빌드·미러백 선택 **순수 로직** (spec §3 / §6.1 / AC-13).
 *
 *   - buildTameFrame(): tame 입력 + triage 답 → decision_frame JSONB 형태.
 *     빈 자유텍스트는 키를 만들지 않는다(부분 저장 허용 §6.1). 숫자 0 은 유효값으로 보존.
 *   - selectMirrorBack(): 기록-완료 화면이 되비출 **사용자 원문 1~2개**를 우선순위로 고른다.
 *     순수 반영 — 인용은 원문 그대로, 평가·요약·추천·접두어 0(AC-13). 모두 비면 빈 배열
 *     (호출부가 확신도·검토기한 사실 진술로 폴백).
 *
 * 화면·DB 의존 없음. tame·wild 둘 다 빌더를 제공(트랙별 키만 채운다).
 * selectMirrorBack 은 양 트랙(미러백 자체는 양 트랙 동형).
 */

import type { ProblemType } from './triage';
import type { TriageAnswers } from './triage';

/** tame 자유텍스트·수치 입력(모두 선택). 화면 상태 → frame 직전 형태. */
export type TameFrameInput = {
  worstCase?: string;
  preventOrRecover?: string;
  costOfInaction?: string;
  thirdPerson?: string;
  oneYearHorizon?: string;
  baseRateOutOf10?: number;
  premortem?: string;
  ifThen?: string;
};

/** wild 불가지 수용 체크(점수 아님). */
export type WildAcceptUnknown = 'yes' | 'partly' | 'no';

/**
 * wild 자유텍스트 + 수용/후회 enum 입력(모두 선택). 화면 상태 → frame 직전 형태.
 * ⚠️ 확신도·위협확률·base-rate·예측 점수 **없음**(false-precision 안전장치 §0.1).
 * ⚠️ `review` 키 없음 — 기록 시점엔 부재여야 isDecisionReviewed=false(§6.4, Task 4 에서만 채움).
 */
export type WildFrameInput = {
  identity?: string;
  valuesToProtect?: string;
  // 가짜 양자택일 깨기 — '이게 정말 둘 중 하나인가?' 선택지 재구성(자유텍스트·선택).
  // ⚠️ 시스템이 답·대안을 제시하지 않는다 — 사용자가 적은 칸 그대로 저장. (Wild 적극 구조화 4단계)
  falseDichotomy?: string;
  thirdPerson?: string;
  acceptUnknown?: WildAcceptUnknown;
  // 사용자 자기분류 — '결과를 몰라서 드는 불안'. anticipatedRegret('진짜 후회')와 한 쌍.
  // ⚠️ 시스템이 둘을 분류·판정하지 않는다 — 사용자가 적은 칸 그대로 저장(자유텍스트·선택).
  uncertaintyWorry?: string;
  anticipatedRegret?: string;
  reversibleStep?: string;
  revelation?: string;
};

export type DecisionFrame = {
  version: 1;
  track: ProblemType;
  triage?: TriageAnswers;
  tame?: Record<string, string | number>;
  wild?: Record<string, string>;
};

/** 비지 않은(trim 후 길이>0) 문자열만 반환, 아니면 undefined. */
function nonEmpty(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * tame 입력 → decision_frame. 빈 자유텍스트 키는 생략(부분 저장).
 * 숫자 필드(baseRateOutOf10)는 0 포함 유효값을 보존하고 undefined 만 생략.
 */
export function buildTameFrame(input: TameFrameInput, triage?: TriageAnswers): DecisionFrame {
  const tame: Record<string, string | number> = {};

  const textFields: Array<keyof TameFrameInput> = [
    'worstCase',
    'preventOrRecover',
    'costOfInaction',
    'thirdPerson',
    'oneYearHorizon',
    'premortem',
    'ifThen',
  ];
  for (const key of textFields) {
    const v = nonEmpty(input[key] as string | undefined);
    if (v !== undefined) tame[key] = v;
  }
  if (typeof input.baseRateOutOf10 === 'number' && Number.isFinite(input.baseRateOutOf10)) {
    tame.baseRateOutOf10 = input.baseRateOutOf10;
  }

  const frame: DecisionFrame = { version: 1, track: 'tame' };
  if (triage) frame.triage = triage;
  if (Object.keys(tame).length > 0) frame.tame = tame;
  return frame;
}

/**
 * wild 입력 → decision_frame. 빈 자유텍스트 키는 생략(부분 저장).
 * acceptUnknown enum 은 점수가 아니라 수용 체크 — 있으면 그대로 보존.
 * ⚠️ confidence·base-rate·예측 점수를 **만들지 않는다**(쐐기 보존 §0.1).
 * ⚠️ `wild.review` 키를 **만들지 않는다** — 기록 시점엔 부재(§6.4·Task 4 review 시점에만 채움).
 */
export function buildWildFrame(input: WildFrameInput, triage?: TriageAnswers): DecisionFrame {
  const wild: Record<string, string> = {};

  const textFields: Array<keyof WildFrameInput> = [
    'identity',
    'valuesToProtect',
    'falseDichotomy',
    'thirdPerson',
    'uncertaintyWorry',
    'anticipatedRegret',
    'reversibleStep',
    'revelation',
  ];
  for (const key of textFields) {
    const v = nonEmpty(input[key] as string | undefined);
    if (v !== undefined) wild[key] = v;
  }
  if (input.acceptUnknown !== undefined) {
    wild.acceptUnknown = input.acceptUnknown;
  }

  const frame: DecisionFrame = { version: 1, track: 'wild' };
  if (triage) frame.triage = triage;
  if (Object.keys(wild).length > 0) frame.wild = wild;
  return frame;
}

// 미러백 우선순위 — 트랙별 핵심 자유텍스트 키 순서(§3 / §4).
const MIRROR_PRIORITY: Record<ProblemType, string[]> = {
  tame: ['worstCase', 'oneYearHorizon'],
  wild: ['identity', 'revelation'],
};

/**
 * 기록-완료 미러백 — 사용자 원문 1~2개를 우선순위로 선택해 **원문 그대로** 반환.
 * 우선순위 키를 먼저 채우고, 2개에 못 미치면 나머지 자유텍스트 중 *가장 긴 것*으로 보충.
 * 평가·요약·추천 0. 모두 비면 빈 배열(호출부 폴백).
 */
export function selectMirrorBack(
  track: ProblemType,
  fields: Record<string, unknown>,
): string[] {
  const picked: string[] = [];
  const usedKeys = new Set<string>();

  // 1) 우선순위 키 순서대로.
  for (const key of MIRROR_PRIORITY[track]) {
    const v = nonEmpty(fields[key] as string | undefined);
    if (v !== undefined && picked.length < 2) {
      picked.push(v);
      usedKeys.add(key);
    }
  }

  // 2) 2개 미만이면 나머지 문자열 필드 중 가장 긴 것으로 보충.
  if (picked.length < 2) {
    const remaining = Object.entries(fields)
      .filter(([k]) => !usedKeys.has(k))
      .map(([, val]) => nonEmpty(val as string | undefined))
      .filter((v): v is string => v !== undefined)
      .sort((a, b) => b.length - a.length);
    for (const v of remaining) {
      if (picked.length >= 2) break;
      picked.push(v);
    }
  }

  return picked;
}
