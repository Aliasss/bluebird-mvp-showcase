// 5대 인지 왜곡 유형
export enum DistortionType {
  CATASTROPHIZING = 'catastrophizing',
  ALL_OR_NOTHING = 'all_or_nothing',
  EMOTIONAL_REASONING = 'emotional_reasoning',
  PERSONALIZATION = 'personalization',
  ARBITRARY_INFERENCE = 'arbitrary_inference',
}

export type FrameType = 'loss' | 'gain' | 'mixed';

// 트리거 카테고리 — 사용자 트리거의 도메인 분류 (Phase 1.1)
// 2026-05-16 확장 — sleep_rumination·decision_paralysis·social_comparison·avoidance_accumulation 추가 (Migration 16).
export type TriggerCategory =
  | 'work'
  | 'relationship'
  | 'family'
  | 'health'
  | 'self'
  | 'finance'
  | 'study'
  | 'other'
  | 'sleep_rumination'
  | 'decision_paralysis'
  | 'social_comparison'
  | 'avoidance_accumulation';

export const TRIGGER_CATEGORIES: readonly TriggerCategory[] = [
  'work',
  'relationship',
  'family',
  'health',
  'self',
  'finance',
  'study',
  'other',
  'sleep_rumination',
  'decision_paralysis',
  'social_comparison',
  'avoidance_accumulation',
] as const;

export const TriggerCategoryKorean: Record<TriggerCategory, string> = {
  work: '직장/일',
  relationship: '관계/사람',
  family: '가족',
  health: '건강/몸',
  self: '자기/존재',
  finance: '금전/미래',
  study: '학업/시험',
  other: '기타',
  sleep_rumination: '잠/반추',
  decision_paralysis: '결정 마비',
  social_comparison: '사회적 비교',
  avoidance_accumulation: '회피 누적',
};

export interface CasSignal {
  rumination: number; // 0~1
  worry: number; // 0~1
}

// 왜곡 유형 한국어 매핑
export const DistortionTypeKorean: Record<DistortionType, string> = {
  [DistortionType.CATASTROPHIZING]: '파국화',
  [DistortionType.ALL_OR_NOTHING]: '흑백논리',
  [DistortionType.EMOTIONAL_REASONING]: '감정적 추론',
  [DistortionType.PERSONALIZATION]: '개인화',
  [DistortionType.ARBITRARY_INFERENCE]: '임의적 추론',
};

// 왜곡 유형 → 매뉴얼 앵커 매핑
export const DistortionManualAnchor: Record<DistortionType, string> = {
  [DistortionType.CATASTROPHIZING]: 'dbug-03-s2',
  [DistortionType.ALL_OR_NOTHING]: 'dbug-03-s3',
  [DistortionType.EMOTIONAL_REASONING]: 'dbug-03-s4',
  [DistortionType.PERSONALIZATION]: 'dbug-03-s5',
  [DistortionType.ARBITRARY_INFERENCE]: 'dbug-03-s1',
};

// 데이터베이스 테이블 타입
export interface Log {
  id: string;
  user_id: string;
  trigger: string;
  thought: string;
  pain_score?: number | null;
  log_type?: 'normal' | 'success' | 'distortion' | 'decision';
  trigger_category?: TriggerCategory | null;
  created_at: string;
  // 의사결정 도구 피벗 — Migration 22 가산 컬럼(모두 NULL 허용). 기존 필드 변경 없음.
  decision_options?: string | null;
  expected_outcome?: string | null;
  confidence?: number | null;
  review_at?: string | null;
  actual_outcome?: string | null;
  // TODO(Task 4): replace with CalibrationResult from lib/decision/types
  calibration?: Record<string, unknown> | null;
  // Migration 23 가산 컬럼 — 결정별 1회성 복기 리마인더 발송(처리) 마커. NULL=미처리.
  review_notified_at?: string | null;
  // Migration 24 가산 컬럼 — 결정 로직 v2 Tame/Wild 분기. NULL=레거시(tame 호환).
  problem_type?: 'tame' | 'wild' | null;
  // 트랙별 구조화 캡처(JSON). 모든 하위 필드 선택. wild "복기 완료" 마커는 wild.review 존재 여부.
  decision_frame?: Record<string, unknown> | null;
}

export interface Analysis {
  id: string;
  log_id: string;
  distortion_type: DistortionType;
  intensity: number;
  logic_error_segment: string;
  rationale?: string | null;
  frame_type?: FrameType | null;
  reference_point?: string | null;
  probability_estimate?: number | null;
  loss_aversion_signal?: number | null;
  cas_rumination?: number | null;
  cas_worry?: number | null;
  system2_question_seed?: string | null;
  decentering_prompt?: string | null;
  created_at: string;
}

export interface Intervention {
  id: string;
  log_id: string;
  socratic_questions: string[];
  user_answers: Record<string, string>;
  theory_context?: Record<string, unknown>;
  final_action: string | null;
  is_completed: boolean;
  autonomy_score: number | null;
  created_at: string;
  completed_at?: string | null;
  reevaluated_pain_score?: number | null;
  reevaluated_at?: string | null;
  review_dismissed_at?: string | null;
}

// AI 분석 결과 타입
export interface DistortionAnalysis {
  type: DistortionType;
  intensity: number;
  segment: string;
  rationale?: string;
}

export interface AIAnalysisResult {
  distortions: DistortionAnalysis[];
  questions: string[];
  frame_type?: FrameType;
  reference_point?: string;
  probability_estimate?: number | null;
  loss_aversion_signal?: number;
  cas_signal?: CasSignal;
  system2_question_seed?: string;
  decentering_prompt?: string;
  trigger_category?: TriggerCategory;
}

// 전망이론 시각화 데이터 타입
export interface ProspectTheoryDataPoint {
  x: number; // 객관적 확률
  y: number; // 주관적 가치
  label?: string;
}
