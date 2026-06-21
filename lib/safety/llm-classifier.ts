import type { LlmVerdict } from './types';
import { sanitizeForPrompt } from './prompt-sanitize';

export interface LlmClient {
  generate(prompt: string): Promise<string>;
}

export interface LlmClassifyInput {
  text: string;
  client: LlmClient;
}

export interface LlmClassifyResult {
  verdict: LlmVerdict;
  reason: string;
}

// ⚠️ 비공개(redacted): 위기 신호 분류 시스템 프롬프트 본문은 IP·안전상 공개 저장소에서 제외했습니다.
//    (분류 로직·인터페이스·폴백은 그대로 — 프롬프트 텍스트만 가림.)
const SYSTEM_PROMPT = '[위기 신호 분류 프롬프트 본문 — 비공개 (공개 코드에서는 제외)]';

export async function classifyWithLlm(input: LlmClassifyInput): Promise<LlmClassifyResult> {
  const safeText = sanitizeForPrompt(input.text);
  const prompt = `${SYSTEM_PROMPT}\n\n<사용자 입력>\n${safeText}\n</사용자 입력>`;

  let raw: string;
  try {
    raw = await input.client.generate(prompt);
  } catch (error) {
    return { verdict: 'caution', reason: `llm_error fallback: ${(error as Error).message ?? 'unknown'}` };
  }

  try {
    const parsed = JSON.parse(stripCodeFence(raw)) as { level?: string; reason?: string };
    if (parsed.level === 'critical' || parsed.level === 'caution' || parsed.level === 'none') {
      return { verdict: parsed.level, reason: parsed.reason ?? '' };
    }
    return { verdict: 'caution', reason: `unknown_level fallback: ${String(parsed.level)}` };
  } catch {
    return { verdict: 'caution', reason: 'parse_error fallback' };
  }
}

function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}
