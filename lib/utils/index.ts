import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind CSS 클래스 병합 유틸리티
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 날짜 포맷팅
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 전망이론 가치 함수 계산
// v(x) = x^α for gains, -λ(-x)^β for losses
export function calculateProspectValue(
  x: number,
  alpha: number = 0.88,
  beta: number = 0.88,
  lambda: number = 2.25
): number {
  if (x >= 0) {
    // 이득 영역
    return Math.pow(x, alpha);
  } else {
    // 손실 영역
    return -lambda * Math.pow(-x, beta);
  }
}

// S자 곡선 데이터 포인트 생성
export function generateProspectTheoryCurve(points: number = 50) {
  const data = [];
  for (let i = 0; i <= points; i++) {
    const x = -1 + (2 * i) / points; // -1부터 1까지
    const y = calculateProspectValue(x);
    data.push({ x, y });
  }
  return data;
}
