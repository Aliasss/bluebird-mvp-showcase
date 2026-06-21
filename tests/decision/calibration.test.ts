import { describe, it, expect } from 'vitest';
import { computeCalibration } from '@/lib/decision/calibration';

describe('computeCalibration', () => {
  // 위협 과대예측: 나쁠 거라 확신했으나 실제가 더 좋았음 → 불안이 위협을 부풀림.
  it('나쁠 거라 확신했는데 실제 더 좋음 → 위협 과대예측(overconfident)', () => {
    expect(
      computeCalibration({ confidence: 85, outcome: 'better', avgDistortionIntensity: 0.7 }).direction,
    ).toBe('overconfident');
  });
  // 위협 과소예측: 나쁠 거란 확신이 낮았는데 실제는 더 나빴음.
  it('나쁠 거란 확신 낮았는데 실제 더 나쁨 → 위협 과소예측(underconfident)', () => {
    expect(
      computeCalibration({ confidence: 30, outcome: 'worse', avgDistortionIntensity: 0.6 }).direction,
    ).toBe('underconfident');
  });
  it('예상대로면 calibrated', () => {
    expect(
      computeCalibration({ confidence: 60, outcome: 'as_expected', avgDistortionIntensity: 0.3 }).direction,
    ).toBe('calibrated');
  });
  // 반전 잠금: 위협을 확신했고 실제도 나빴으면 부풀린 게 아니다(과대예측 아님).
  it('나쁠 거라 확신했고 실제도 나쁨 → calibrated (부풀린 게 아님)', () => {
    expect(
      computeCalibration({ confidence: 85, outcome: 'worse', avgDistortionIntensity: 0.7 }).direction,
    ).toBe('calibrated');
  });
  // inflation 양수는 overconfident(better+고확신)에서만 + 왜곡강도 높을수록↑.
  it('왜곡 강도 높을수록 inflation↑ (overconfident에서만)', () => {
    const hi = computeCalibration({ confidence: 85, outcome: 'better', avgDistortionIntensity: 0.8 });
    const lo = computeCalibration({ confidence: 85, outcome: 'better', avgDistortionIntensity: 0.2 });
    expect(hi.distortionInflation).toBeGreaterThan(lo.distortionInflation);
    expect(hi.distortionInflation).toBeGreaterThan(0);
  });
  it('underconfident 의 distortionInflation === 0', () => {
    expect(
      computeCalibration({ confidence: 30, outcome: 'worse', avgDistortionIntensity: 0.9 }).distortionInflation,
    ).toBe(0);
  });
  it('calibrated 의 distortionInflation === 0', () => {
    expect(
      computeCalibration({ confidence: 50, outcome: 'as_expected', avgDistortionIntensity: 0.9 }).distortionInflation,
    ).toBe(0);
  });
  it('결과 0~1 범위·필수 필드 보장', () => {
    const r = computeCalibration({ confidence: 50, outcome: 'as_expected', avgDistortionIntensity: 0.5 });
    expect(r.distortionInflation).toBeGreaterThanOrEqual(0);
    expect(r.distortionInflation).toBeLessThanOrEqual(1);
    expect(['overconfident', 'underconfident', 'calibrated']).toContain(r.direction);
  });
});
