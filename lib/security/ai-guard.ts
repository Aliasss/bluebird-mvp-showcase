export const MAX_AI_TEXT_LENGTH = 1200;

export function isAiInputTooLong(input: { trigger: string; thought: string }): boolean {
  return input.trigger.length > MAX_AI_TEXT_LENGTH || input.thought.length > MAX_AI_TEXT_LENGTH;
}
