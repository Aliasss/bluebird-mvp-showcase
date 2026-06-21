// lib/ai/bluebird-protocol.ts
//
// ⚠️ 비공개(redacted): BlueBird 인지 왜곡 분석 프로토콜 — 운영 원칙 · 이론 요약 ·
//    왜곡 분류 체계 · few-shot 케이스 · 분석 출력 스키마.
//    AI 프롬프트 본문 및 연구 기반 데이터이므로 공개 코드에서는
//    제외했습니다. (export 시그니처만 유지 — 구조 참고용)

export type BluebirdFrameType = 'loss' | 'gain' | 'mixed';
export type BluebirdFewShotCase = { input: unknown; output: unknown };

export const BLUEBIRD_OPERATING_PRINCIPLES: string[] = [];
export const BLUEBIRD_THEORY_SUMMARY: Record<string, unknown> = {};
export const BLUEBIRD_DISTORTION_TAXONOMY: Record<string, unknown> = {};
export const BLUEBIRD_FEW_SHOT_CASES: BluebirdFewShotCase[] = [];
export const BLUEBIRD_ANALYSIS_JSON_SCHEMA: Record<string, unknown> = {};
