export type CrisisLevel = 'none' | 'caution' | 'critical';

export type KeywordVerdict = 'none' | 'suspected' | 'critical';

export type LlmVerdict = 'none' | 'caution' | 'critical';

export type DetectionSource = 'keyword' | 'llm' | 'llm_fallback';

export interface CrisisDetectionResult {
  level: CrisisLevel;
  detectedBy: DetectionSource | null; // null when level === 'none' and skipped via keyword
  matchedPattern?: string; // regex label for keyword hits (debugging)
  llmReason?: string; // short rationale from llm when used
}

export interface SafetyResource {
  id: string;
  name: string;
  phone?: string;
  sms?: string;
  webUrl?: string;
  description: string;
  availability: string; // '24시간' 등
  tags: Array<'suicide' | 'youth' | 'women' | 'general' | 'sms'>;
}
