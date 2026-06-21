/**
 * lib/decision/schemas.ts
 *
 * 결정 도구 API 입력 zod 스키마.
 * Next.js App Router 의 route.ts 는 HTTP 핸들러(GET/POST 등)만 export 할 수 있으므로,
 * 단위 테스트·핸들러가 공유하는 스키마는 route 밖(이 모듈)에 둔다.
 */
import { z } from 'zod';

// ── 결정 로직 v2 — 트리아지·프레임 가산 스키마 (spec §2.4 / §6.1 / §7.1) ──────
//   기존 결정 입력에 problemType·decisionFrame 을 **선택 필드로 가산**한다.
//   둘 다 NULL 허용(레거시·v1 row 무영향). 어휘 게이트: 사용자 비노출 키만.

const triageAnswer = z.enum(['yes', 'no', 'unsure']);

/** 트리아지 답(Q1 reversible 필수 / Q2 identityShift 선택). */
export const triageSchema = z.object({
  reversible: triageAnswer,
  identityShift: triageAnswer.optional(),
});

export const problemTypeSchema = z.enum(['tame', 'wild']);

/**
 * decision_frame — 트랙별 구조화 캡처. 모든 하위 필드 선택(부분 저장 §6.1).
 * tame·wild 둘 다 클라이언트가 채운다(트랙별 키만). lens 는 서버 후면 렌즈용(선택).
 * passthrough 금지 — 알려진 키만 받아 임의 JSON 주입을 막는다.
 */
export const tameFrameSchema = z
  .object({
    worstCase: z.string().trim().max(1000).optional(),
    preventOrRecover: z.string().trim().max(1000).optional(),
    costOfInaction: z.string().trim().max(1000).optional(),
    thirdPerson: z.string().trim().max(1000).optional(),
    oneYearHorizon: z.string().trim().max(1000).optional(),
    baseRateOutOf10: z.number().int().min(0).max(10).optional(),
    premortem: z.string().trim().max(1000).optional(),
    ifThen: z.string().trim().max(1000).optional(),
  })
  .strict();

/**
 * wild 프레임 — 비점수 캡처(§4 / §0.1). 확신도·위협확률·base-rate·예측 점수 **없음**
 * (false-precision 안전장치 — 쐐기 보존). 자유텍스트 + 수용/후회 enum(점수 아님).
 *   acceptUnknown: 불가지 수용 체크(점수 아님) · anticipatedRegret: 후회 방향(정보로만).
 * ⚠️ `review` 키는 여기서 받지 않는다 — 기록 시점엔 부재여야 isDecisionReviewed=false(§6.4).
 *   wild 복기 데이터(review)는 review route 에서만 채운다(Task 4).
 */
export const wildFrameSchema = z
  .object({
    identity: z.string().trim().max(1000).optional(),
    valuesToProtect: z.string().trim().max(1000).optional(),
    // 가짜 양자택일 깨기 — '선택지가 전부인가?' 재구성(2026-06-21 Wild 적극 구조화, 4단계).
    falseDichotomy: z.string().trim().max(1000).optional(),
    thirdPerson: z.string().trim().max(1000).optional(),
    acceptUnknown: z.enum(['yes', 'partly', 'no']).optional(),
    // 불안(불확실) vs 진짜 후회 자기분류 — anticipatedRegret 와 한 쌍(2026-06-21 Wild 적극 구조화, 1단계).
    uncertaintyWorry: z.string().trim().max(1000).optional(),
    anticipatedRegret: z.string().trim().max(1000).optional(),
    reversibleStep: z.string().trim().max(1000).optional(),
    revelation: z.string().trim().max(1000).optional(),
  })
  .strict();

export const decisionFrameSchema = z
  .object({
    version: z.literal(1),
    track: problemTypeSchema,
    triage: triageSchema.optional(),
    tame: tameFrameSchema.optional(),
    wild: wildFrameSchema.optional(),
  })
  .strict();

// 결정 생성 입력 — app/api/decision/route.ts
export const decisionBodySchema = z.object({
  /** 직면한 결정 내용 (5~500자) */
  decision: z.string().trim().min(5).max(500),
  /** 고려 중인 선택지 (선택 입력) */
  options: z.string().trim().max(500).optional(),
  /** 봉인할 예상 결과 (선택 입력) */
  expectedOutcome: z.string().trim().max(500).optional(),
  /**
   * 예상 결과에 대한 확신도 0~100.
   * tame 만 사용. **wild 는 null** — 확신도 점수화 없음(false-precision 안전장치, §0.1·§6.3).
   * null 이면 logs.confidence 가 NULL 로 유지돼 캘리브레이션 자산에 0 기여(쐐기 보존).
   */
  confidence: z.number().int().min(0).max(100).nullable(),
  /** 결과 검토(복기) 예정 시점 — ISO 8601 datetime. 양 트랙 공통(검토 기한). */
  reviewAt: z.string().datetime(),
  /** 결정 트랙(트리아지 결과) — 선택(레거시 무영향). */
  problemType: problemTypeSchema.optional(),
  /** 트랙별 구조화 캡처 — 선택(부분 저장). */
  decisionFrame: decisionFrameSchema.optional(),
});

// 결정 복기 입력(TAME/레거시) — app/api/decision/review/route.ts
//   캘리브레이션 경로 — 3택 결과로 actual_outcome·calibration 산출(현행 동작 불변).
export const reviewBodySchema = z.object({
  /** 복기할 결정 로그 id */
  logId: z.string(),
  /** 관찰한 실제 결과 — 예측 대비 3택 */
  outcome: z.enum(['better', 'as_expected', 'worse']),
});

/**
 * 결정 복기 입력(WILD) — app/api/decision/review/route.ts (wild 분기).
 *
 * ⚠️ 비점수 자기보고(§4 복기). 점수·방향·inflation·3택 결과 enum이 **없다**
 *   (false-precision 안전장치 — 쐐기 보존 §0.1). 캘리브레이션·actual_outcome 미산출.
 *   - lookingBack / whatDiscovered: 자유 서술(선택).
 *   - valueAlignment: ①에서 적은 '되고 싶은 나·지키고 싶은 것'과의 정합 자기보고
 *     (enum aligned|mixed|not — 정오 채점이 아니라 수용·정합 보고, §4).
 * 모든 필드 선택이지만, 빈 제출로 "복기 완료" 마커만 찍히는 걸 막기 위해
 *   라우트가 최소 1개 비어있지 않은 답을 요구한다(스키마는 형태만 검증).
 */
export const wildReviewBodySchema = z.object({
  /** 복기할 결정 로그 id */
  logId: z.string(),
  /** wild 복기임을 명시(라우트 분기 보강 — 클라이언트가 트랙을 선언). */
  track: z.literal('wild'),
  /** 지금 돌아보면 이 결정이 어떻게 느껴지는지(자유 서술, 선택). */
  lookingBack: z.string().trim().max(2000).optional(),
  /** 겪기 전엔 몰랐던, 이 길에서 발견한 것(자유 서술, 선택). */
  whatDiscovered: z.string().trim().max(2000).optional(),
  /** '되고 싶은 나·지키고 싶은 것'과의 정합 자기보고(점수 아님, 선택). */
  valueAlignment: z.enum(['aligned', 'mixed', 'not']).optional(),
});
