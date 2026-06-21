// lib/content/sample-cases.ts
//
// ⚠️ 비공개(redacted): 비회원 데모(/sample) 샘플 케이스 데이터 — 크래프팅된 데모 백데이터
//    (결정 프레이밍 · 검토 기한 · 가상 실제 결과 · 엔진 출력 예시).
//    공개 코드에서는 제외했습니다. (인터페이스·접근 함수만 유지)

export interface SampleCase {
  id: string;
  [key: string]: unknown;
}

export const SAMPLE_CASES: SampleCase[] = [];

export function getSampleCase(id: string): SampleCase | null {
  return SAMPLE_CASES.find((c) => c.id === id) ?? null;
}
