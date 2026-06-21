export type DecisionDraft = {
  decision: string;          // 무슨 결정 (필수)
  options?: string;          // 선택지 (선택)
  expectedOutcome?: string;  // 예상 결과 (선택)
  confidence: number;        // 0~100 (필수)
  reviewAt: string | null;   // ISO, 검토 기한 (필수)
};
export type DraftError = 'decision_too_short' | 'confidence_out_of_range' | 'review_date_missing' | 'review_date_past';
export type AbsorbAnswer = 'yes' | 'no' | 'unsure';
export type AbsorbBranch =
  | { next: 'decision_loop' }
  | { next: 'light_check'; allowPromote: true };
export type CalibrationResult = {
  direction: 'overconfident' | 'underconfident' | 'calibrated';
  distortionInflation: number; // 0~1
};
