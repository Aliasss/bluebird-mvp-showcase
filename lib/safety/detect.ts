import { screenKeywords } from './keyword-screener';
import { classifyWithLlm, type LlmClient } from './llm-classifier';
import type { CrisisDetectionResult } from './types';

export interface DetectInput {
  trigger: string;
  thought: string;
  client: LlmClient;
}

export async function detect(input: DetectInput): Promise<CrisisDetectionResult> {
  const combined = `${input.trigger}\n${input.thought}`.trim();

  const keyword = screenKeywords(combined);

  if (keyword.verdict === 'critical') {
    return {
      level: 'critical',
      detectedBy: 'keyword',
      matchedPattern: keyword.matchedPattern,
    };
  }

  if (keyword.verdict === 'none') {
    return { level: 'none', detectedBy: null };
  }

  // suspected → LLM 재분류
  const llm = await classifyWithLlm({ text: combined, client: input.client });

  const isFallback = llm.reason.includes('fallback');

  return {
    level: llm.verdict,
    detectedBy: isFallback ? 'llm_fallback' : 'llm',
    matchedPattern: keyword.matchedPattern,
    llmReason: llm.reason,
  };
}
