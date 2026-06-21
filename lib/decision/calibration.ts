// 핵심 로직 비공개 — 공개 코드에서는 시그니처·구조만 노출(구현 제외).
import type { CalibrationResult } from './types';
type Input = { confidence: number; outcome: 'better' | 'as_expected' | 'worse'; avgDistortionIntensity: number };
export function computeCalibration({ confidence, outcome, avgDistortionIntensity }: Input): CalibrationResult {
  throw new Error('핵심 로직 비공개');
}

export function inflationBand(distortionInflation: number): string {
  throw new Error('핵심 로직 비공개');
}
