import { describe, it, expect } from 'vitest';
import {
  DATE_FILTERS,
  DATE_FILTER_LABEL,
  dateFilterToCutoffMs,
  isWithinDateFilter,
} from '@/lib/journal/date-filter';

const NOW = new Date('2026-05-16T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('일지 날짜 필터', () => {
  it('3개 옵션만 노출 (전체기간·7일·30일)', () => {
    expect(DATE_FILTERS).toEqual(['all', '7d', '30d']);
    expect(DATE_FILTER_LABEL.all).toBe('전체기간');
    expect(DATE_FILTER_LABEL['7d']).toBe('7일');
    expect(DATE_FILTER_LABEL['30d']).toBe('30일');
  });

  it('"전체기간" cutoff는 null (필터 미적용 의미)', () => {
    expect(dateFilterToCutoffMs('all', NOW)).toBeNull();
  });

  it('"7일" cutoff는 정확히 7일 전 ms', () => {
    const cutoff = dateFilterToCutoffMs('7d', NOW);
    expect(cutoff).toBe(NOW.getTime() - 7 * DAY_MS);
  });

  it('"30일" cutoff는 정확히 30일 전 ms', () => {
    const cutoff = dateFilterToCutoffMs('30d', NOW);
    expect(cutoff).toBe(NOW.getTime() - 30 * DAY_MS);
  });

  it('cutoff가 null이면 created_at 무관하게 모두 통과', () => {
    expect(isWithinDateFilter('2020-01-01T00:00:00.000Z', null)).toBe(true);
    expect(isWithinDateFilter('2026-05-16T11:59:59.000Z', null)).toBe(true);
  });

  it('cutoff 이후 created_at은 통과', () => {
    const cutoff = dateFilterToCutoffMs('7d', NOW)!;
    const recent = new Date(NOW.getTime() - 3 * DAY_MS).toISOString(); // 3일 전
    expect(isWithinDateFilter(recent, cutoff)).toBe(true);
  });

  it('cutoff 이전 created_at은 제외', () => {
    const cutoff = dateFilterToCutoffMs('7d', NOW)!;
    const old = new Date(NOW.getTime() - 10 * DAY_MS).toISOString(); // 10일 전
    expect(isWithinDateFilter(old, cutoff)).toBe(false);
  });

  it('정확히 cutoff 시점은 통과 (경계 포함)', () => {
    const cutoff = dateFilterToCutoffMs('7d', NOW)!;
    const exactly = new Date(cutoff).toISOString();
    expect(isWithinDateFilter(exactly, cutoff)).toBe(true);
  });

  it('잘못된 created_at은 제외 (방어적)', () => {
    const cutoff = dateFilterToCutoffMs('7d', NOW)!;
    expect(isWithinDateFilter('잘못된날짜', cutoff)).toBe(false);
    expect(isWithinDateFilter('', cutoff)).toBe(false);
  });
});
