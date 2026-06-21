// lib/openai/gemini.ts
//
// ⚠️ 비공개(redacted): Google Gemini 연동 — 인지 왜곡 분석 및 소크라테스 질문 생성.
//    시스템 프롬프트 본문(few-shot · 지시 · 출력 스키마)을 포함하므로 IP 보호를 위해
//    공개 코드에서는 구현을 제외했습니다. (export 시그니처만 유지)

export function getGeminiClient(): never {
  throw new Error('핵심 로직 비공개');
}

export async function analyzeDistortionsWithGemini(
  _input: Record<string, unknown>,
): Promise<unknown> {
  throw new Error('핵심 로직 비공개');
}

export async function generateSocraticQuestionsWithGemini(
  _input: Record<string, unknown>,
): Promise<unknown> {
  throw new Error('핵심 로직 비공개');
}
