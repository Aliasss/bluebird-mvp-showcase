import { SchemaType, type Schema } from '@google/generative-ai';
import { getGeminiClient } from '@/lib/openai/gemini';
import type { LlmClient } from './llm-classifier';

const SAFETY_RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    level: { type: SchemaType.STRING },
    reason: { type: SchemaType.STRING },
  },
  required: ['level', 'reason'],
};

export function createSafetyLlmClient(): LlmClient {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.0,
      topP: 0.9,
      maxOutputTokens: 256,
      responseMimeType: 'application/json',
      responseSchema: SAFETY_RESPONSE_SCHEMA,
    },
  });

  return {
    async generate(prompt: string) {
      const result = await model.generateContent(prompt);
      return result.response.text();
    },
  };
}
