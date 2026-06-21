import { describe, it, expect } from 'vitest';
import {
  formatActionPlanForDisplay,
  parseActionPlan,
  serializeActionPlan,
  validateActionPlan,
  type ActionPlan,
} from '@/lib/intervention/action-plan';

const VALID_PLAN: ActionPlan = {
  when: '오늘 21:00',
  what: '보고서 첫 문단 쓰기',
  howLong: '5분',
};

describe('parseActionPlan', () => {
  it('returns null for null/empty/whitespace', () => {
    expect(parseActionPlan(null)).toBeNull();
    expect(parseActionPlan(undefined)).toBeNull();
    expect(parseActionPlan('')).toBeNull();
    expect(parseActionPlan('   ')).toBeNull();
  });

  it('returns null for legacy free text', () => {
    expect(parseActionPlan('내일 보고서 작성하기')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseActionPlan('{when: 오늘}')).toBeNull();
  });

  it('returns null when required keys missing', () => {
    expect(parseActionPlan('{"when":"오늘"}')).toBeNull();
    expect(parseActionPlan('{"when":"오늘","what":"x"}')).toBeNull();
  });

  it('returns null when any required field is empty', () => {
    expect(
      parseActionPlan(JSON.stringify({ when: '', what: 'x', howLong: '5분' }))
    ).toBeNull();
  });

  it('parses valid JSON and trims fields', () => {
    const result = parseActionPlan(
      JSON.stringify({ when: '  오늘 21:00  ', what: '  쓰기 ', howLong: ' 5분 ' })
    );
    expect(result).toEqual({ when: '오늘 21:00', what: '쓰기', howLong: '5분' });
  });
});

describe('serializeActionPlan', () => {
  it('roundtrips through parse', () => {
    const raw = serializeActionPlan(VALID_PLAN);
    expect(parseActionPlan(raw)).toEqual(VALID_PLAN);
  });

  it('trims fields before serializing', () => {
    const raw = serializeActionPlan({ when: ' 오늘 ', what: ' x ', howLong: ' 5분 ' });
    expect(JSON.parse(raw)).toEqual({ when: '오늘', what: 'x', howLong: '5분' });
  });
});

describe('formatActionPlanForDisplay', () => {
  it('formats parsed plan with 가운데점 separator', () => {
    expect(formatActionPlanForDisplay(serializeActionPlan(VALID_PLAN))).toBe(
      '오늘 21:00 · 보고서 첫 문단 쓰기 · 5분'
    );
  });

  it('falls back to raw text for legacy free text', () => {
    expect(formatActionPlanForDisplay('내일 보고서 작성')).toBe('내일 보고서 작성');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatActionPlanForDisplay(null)).toBe('');
    expect(formatActionPlanForDisplay(undefined)).toBe('');
  });
});

describe('validateActionPlan', () => {
  it('passes valid plan', () => {
    expect(validateActionPlan(VALID_PLAN)).toBeNull();
  });

  it('rejects empty fields', () => {
    expect(validateActionPlan({ when: '', what: 'x', howLong: '5분' })).toMatch(/언제/);
    expect(validateActionPlan({ when: '오늘', what: '', howLong: '5분' })).toMatch(/무엇/);
    expect(validateActionPlan({ when: '오늘', what: 'xxxx', howLong: '' })).toMatch(/얼마나/);
  });

  it('rejects too-short what field', () => {
    expect(validateActionPlan({ when: '오늘', what: '쓰기', howLong: '5분' })).toMatch(
      /4자 이상/
    );
  });

  it('rejects howLong without number', () => {
    expect(
      validateActionPlan({ when: '오늘', what: '보고서 쓰기', howLong: '잠깐' })
    ).toMatch(/숫자/);
  });
});
