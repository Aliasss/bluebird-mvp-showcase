import { describe, it, expect } from 'vitest';
import { TRIGGER_CATEGORIES, TriggerCategoryKorean } from '@/types';

describe('TriggerCategory enum (Migration 16 확장)', () => {
  it('총 12개 카테고리 (기본 8 + 신규 4)', () => {
    expect(TRIGGER_CATEGORIES.length).toBe(12);
  });

  it('기본 8개 카테고리 모두 포함', () => {
    for (const cat of [
      'work',
      'relationship',
      'family',
      'health',
      'self',
      'finance',
      'study',
      'other',
    ]) {
      expect(TRIGGER_CATEGORIES).toContain(cat);
    }
  });

  it('Migration 16 신규 4 카테고리 포함', () => {
    expect(TRIGGER_CATEGORIES).toContain('sleep_rumination');
    expect(TRIGGER_CATEGORIES).toContain('decision_paralysis');
    expect(TRIGGER_CATEGORIES).toContain('social_comparison');
    expect(TRIGGER_CATEGORIES).toContain('avoidance_accumulation');
  });

  it('TriggerCategoryKorean 모든 카테고리에 한국어 라벨 존재', () => {
    for (const cat of TRIGGER_CATEGORIES) {
      expect(TriggerCategoryKorean[cat]).toBeTruthy();
      expect(TriggerCategoryKorean[cat].length).toBeGreaterThan(0);
    }
  });

  it('신규 4 카테고리 한국어 라벨 정합 (분석 톤·UI 노출용)', () => {
    expect(TriggerCategoryKorean.sleep_rumination).toBe('잠/반추');
    expect(TriggerCategoryKorean.decision_paralysis).toBe('결정 마비');
    expect(TriggerCategoryKorean.social_comparison).toBe('사회적 비교');
    expect(TriggerCategoryKorean.avoidance_accumulation).toBe('회피 누적');
  });
});
