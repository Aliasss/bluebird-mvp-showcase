import { describe, it, expect } from 'vitest';
import { parseWhenToPlannedAt } from '@/lib/intervention/when-parser';

// 기준 시각: 2026-05-30 10:00 KST = 2026-05-30T01:00:00.000Z
const NOW = new Date('2026-05-30T01:00:00.000Z');

// 헬퍼: 결과 ISO를 KST 날짜 문자열(YYYY-MM-DD)로 환산
function kstDate(iso: string | null): string | null {
  if (!iso) return null;
  const k = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, '0')}-${String(k.getUTCDate()).padStart(2, '0')}`;
}

describe('parseWhenToPlannedAt', () => {
  it('null/빈 입력은 null', () => {
    expect(parseWhenToPlannedAt(null, NOW)).toBeNull();
    expect(parseWhenToPlannedAt('', NOW)).toBeNull();
    expect(parseWhenToPlannedAt('   ', NOW)).toBeNull();
  });

  it('"오늘"은 오늘 KST 날짜', () => {
    expect(kstDate(parseWhenToPlannedAt('오늘 21:00', NOW))).toBe('2026-05-30');
  });

  it('"내일"은 +1일', () => {
    expect(kstDate(parseWhenToPlannedAt('내일', NOW))).toBe('2026-05-31');
  });

  it('"모레"는 +2일', () => {
    expect(kstDate(parseWhenToPlannedAt('모레 9시', NOW))).toBe('2026-06-01');
  });

  it('"M/D" 절대일', () => {
    expect(kstDate(parseWhenToPlannedAt('6/3', NOW))).toBe('2026-06-03');
    expect(kstDate(parseWhenToPlannedAt('6/3 21:00', NOW))).toBe('2026-06-03');
  });

  it('"M월 D일" 절대일', () => {
    expect(kstDate(parseWhenToPlannedAt('6월 5일', NOW))).toBe('2026-06-05');
  });

  it('콤마 나열은 첫 토큰', () => {
    expect(kstDate(parseWhenToPlannedAt('5/30, 5/31', NOW))).toBe('2026-05-30');
  });

  it('파싱 불가는 null (누락보다 안전)', () => {
    expect(parseWhenToPlannedAt('다음 주 화요일', NOW)).toBeNull();
    expect(parseWhenToPlannedAt('나중에', NOW)).toBeNull();
  });

  it('시각 보존 — "오늘 21:00"은 KST 21시', () => {
    const iso = parseWhenToPlannedAt('오늘 21:00', NOW)!;
    const k = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
    expect(k.getUTCHours()).toBe(21);
  });
});
