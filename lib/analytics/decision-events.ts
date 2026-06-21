import type { CognitiveFunnelEvent } from '@/lib/analytics/server';

/**
 * 결정 루프 *클라이언트* 검증 이벤트의 allowlist · PII 가드 (decision-pivot ⑤ · spec §D.2,
 * decision-logic-v2 §11/§11.1 트랙 귀속 가산).
 *
 * route.ts 는 HTTP 핸들러만 export 할 수 있어(Next.js 규약), 순수 정규화 로직을 여기로 분리해
 * `/api/analytics/decision-event` 라우트와 테스트가 함께 import 한다.
 *
 * ⚠️ 이 allowlist/sanitizer 가 권위 소스다(authoritative). 클라이언트가 보내는 이벤트명·properties 는
 *    반드시 여기를 통과해야 적재된다. 허용 밖 이벤트·키·값은 전부 드롭(서버 전용 이벤트 위조·PII 차단).
 *    properties 로 통과하는 값은 enum·정수뿐 — 결정/복기 *원문* 은 입력 스키마상 자리가 없다.
 */

// 클라이언트가 발신 가능한 결정 이벤트 (서버 전용 이벤트는 거부).
export const CLIENT_DECISION_EVENTS = [
  'decision_record_started', // 결정 폼 진입
  'decision_triage_completed', // 트리아지 해소(트랙 확정) — AC-17 트랙 분기 유효성
  'decision_analyze_shown', // 왜곡 점검 임베드 노출(결정 맥락)
  'decision_report_viewed', // 캘리브레이션 리포트 열람
  // ── 복기 미리보기 A/B 계측 (preview-activation) — 클라만 아는 세션 진입·노출 시점 ──
  'session_started', // 세션 진입(세션당 1회) — 코호트 귀속 분모
  'decision_preview_shown', // 봉인 직후 미리보기 노출(노출군만) — A/B 처치 도달 분자
] as const satisfies readonly CognitiveFunnelEvent[];

// 허용 코호트 값 — 복기 미리보기 A/B 군. 비식별 enum(2값). cohortForUser 산출과 동치.
export const ALLOWED_COHORT = ['preview', 'control'] as const;

export type ClientDecisionEvent = (typeof CLIENT_DECISION_EVENTS)[number];

function isClientDecisionEvent(value: unknown): value is ClientDecisionEvent {
  return (
    typeof value === 'string' &&
    (CLIENT_DECISION_EVENTS as readonly string[]).includes(value)
  );
}

// 허용 source 값 — 결정 진입점 식별용(리포트 선순환 + FAB·대시보드·온보딩 도달성). 자유 텍스트 금지.
export const ALLOWED_FROM = ['report', 'dashboard', 'fab', 'onboarding', 'direct'] as const;

// 허용 트랙 값 — 트리아지 분기 유효성(AC-17) 계측용. 결정 *원문* 아님(enum 2값).
export const ALLOWED_PROBLEM_TYPE = ['tame', 'wild'] as const;

/** 클라이언트가 보내는 properties 묶음(정규화 전). 허용 키만 추출하고 나머지는 드롭. */
type RawDecisionEventInput = {
  from?: unknown;
  problemType?: unknown;
  qCount?: unknown;
  cohort?: unknown; // 복기 미리보기 A/B 군('preview'|'control') — enum 만 통과
  track?: unknown; // 미리보기 노출 트랙('tame'|'wild') — enum 만 통과. preview 는 tame 전용
};

/** sanitize 결과 properties — enum/정수만(비식별). 자유텍스트 키는 구조상 진입 불가. */
type SanitizedProperties = Record<string, string | number>;

/**
 * 클라이언트 입력을 allowlist 로 정규화하는 PII 가드(순수 함수).
 * 허용 이벤트가 아니면 null(적재 안 함). 허용 이벤트면 비식별 properties 만 동봉.
 * 결정/결과 *원문* 은 입력 스키마상 들어올 자리가 없고, 통과 키는 enum/정수 뿐이다.
 *
 * @param rawInput - 두 번째 인자는 후방호환을 위해 `from` 문자열을 직접 받거나
 *   properties 객체(`{ from, problemType, qCount }`)를 받을 수 있다. 어느 쪽이든
 *   허용 키만 추출한다.
 */
export function sanitizeDecisionEvent(
  rawEvent: unknown,
  rawInput?: unknown,
): { event: ClientDecisionEvent; properties: SanitizedProperties } | null {
  if (!isClientDecisionEvent(rawEvent)) return null;

  // 후방호환: 두 번째 인자가 문자열이면 from 으로 해석(기존 호출부·테스트 보존).
  const input: RawDecisionEventInput =
    typeof rawInput === 'string'
      ? { from: rawInput }
      : rawInput != null && typeof rawInput === 'object'
      ? (rawInput as RawDecisionEventInput)
      : {};

  const properties: SanitizedProperties = {};

  if (
    rawEvent === 'decision_record_started' &&
    typeof input.from === 'string' &&
    (ALLOWED_FROM as readonly string[]).includes(input.from)
  ) {
    properties.from = input.from; // 'report' = 리포트→새 결정 재진입(선순환 신호)
  }

  if (rawEvent === 'decision_triage_completed') {
    // problem_type(트랙) — AC-17 분기 유효성. enum 2값만 통과(자유텍스트·임의 문자열 드롭).
    if (
      typeof input.problemType === 'string' &&
      (ALLOWED_PROBLEM_TYPE as readonly string[]).includes(input.problemType)
    ) {
      properties.problem_type = input.problemType;
    }
    // q_count — 트리아지 문항 수(1=Q1 종결, 2=Q2 진행). 작은 양의 정수만 통과.
    if (
      typeof input.qCount === 'number' &&
      Number.isInteger(input.qCount) &&
      input.qCount >= 1 &&
      input.qCount <= 2
    ) {
      properties.q_count = input.qCount;
    }
  }

  // ── 복기 미리보기 A/B (session_started · decision_preview_shown) ──
  //   cohort — 두 이벤트 공통. 'preview'|'control' enum 만 통과(임의 문자열·자유텍스트 드롭).
  if (rawEvent === 'session_started' || rawEvent === 'decision_preview_shown') {
    if (
      typeof input.cohort === 'string' &&
      (ALLOWED_COHORT as readonly string[]).includes(input.cohort)
    ) {
      properties.cohort = input.cohort;
    }
  }

  // track — decision_preview_shown 전용. 'tame'|'wild' enum 만 통과(미리보기는 tame 만 노출하나,
  //   값 자체는 ALLOWED_PROBLEM_TYPE 으로만 게이트한다 — 위조 enum·자유텍스트 드롭).
  if (
    rawEvent === 'decision_preview_shown' &&
    typeof input.track === 'string' &&
    (ALLOWED_PROBLEM_TYPE as readonly string[]).includes(input.track)
  ) {
    properties.track = input.track;
  }

  return { event: rawEvent, properties };
}
