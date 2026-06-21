import { describe, it, expect } from 'vitest';
import { screenKeywords } from '@/lib/safety/keyword-screener';

describe('screenKeywords - critical 판정', () => {
  it('"죽고 싶어" 표현은 critical', () => {
    const result = screenKeywords('요즘 너무 힘들어서 죽고 싶어');
    expect(result.verdict).toBe('critical');
    expect(result.matchedPattern).toBeDefined();
  });

  it('"자살" 단어 포함은 critical', () => {
    const result = screenKeywords('자살 생각이 멈추질 않아');
    expect(result.verdict).toBe('critical');
  });

  it('"자해했어" 표현은 critical', () => {
    const result = screenKeywords('어제 자해했어. 아직도 아프다');
    expect(result.verdict).toBe('critical');
  });
});

describe('screenKeywords - self-harm 서술형 표현', () => {
  it('"손목을 긋고 싶어" 표현은 critical', () => {
    expect(screenKeywords('손목을 긋고 싶어').verdict).toBe('critical');
  });

  it('"팔을 그었어" 과거형 표현은 critical', () => {
    expect(screenKeywords('어제 팔을 그었어').verdict).toBe('critical');
  });

  it('"허벅지에 베었어" 표현은 critical', () => {
    expect(screenKeywords('허벅지에 베었어').verdict).toBe('critical');
  });
});

describe('screenKeywords - suspected 판정', () => {
  it('"사라지고 싶어" 표현은 suspected', () => {
    const result = screenKeywords('그냥 사라지고 싶어');
    expect(result.verdict).toBe('suspected');
  });

  it('"더 이상 못 버티겠어" 표현은 suspected', () => {
    const result = screenKeywords('더 이상 못 버티겠어');
    expect(result.verdict).toBe('suspected');
  });

  it('"끝내고 싶다" 표현은 suspected', () => {
    const result = screenKeywords('다 끝내고 싶다');
    expect(result.verdict).toBe('suspected');
  });
});

describe('screenKeywords - 정상 표현', () => {
  it('일반 감정 표현은 none', () => {
    const result = screenKeywords('오늘 회의에서 실수해서 너무 창피했어');
    expect(result.verdict).toBe('none');
  });

  it('의문형 "힘들다"는 none', () => {
    const result = screenKeywords('이번 주는 정말 힘들다');
    expect(result.verdict).toBe('none');
  });

  it('빈 문자열은 none', () => {
    const result = screenKeywords('');
    expect(result.verdict).toBe('none');
  });

  // v0에서는 "죽겠다" 관용 표현도 보수적으로 suspected 이상으로 분류하지 않는다.
  // 실제 critical 정규식은 "죽고 싶" 형태에만 매칭되므로 "죽겠다"는 걸리지 않아야 한다.
  it('"배고파 죽겠다" 관용 표현은 none', () => {
    const result = screenKeywords('배고파 죽겠다');
    expect(result.verdict).toBe('none');
  });

  it('"웃겨 죽는 줄" 관용 표현은 none', () => {
    const result = screenKeywords('친구가 너무 웃겨서 죽는 줄 알았다');
    expect(result.verdict).toBe('none');
  });
});

describe('screenKeywords - AC-5 결정 맥락 ruinous-risk (suspected, 배포게이트 ②-B)', () => {
  // 회복 불가능한 손실 가능성이 있는 충동적 결정 신호는 suspected → LLM 맥락 재판정.
  // 자살/자해가 아니므로 critical 자동 격상 금지 (오탐 방지).
  it('"전 재산을 다 투자할까"는 suspected', () => {
    const result = screenKeywords('전 재산을 다 투자할까');
    expect(result.verdict).toBe('suspected');
    expect(result.matchedPattern).toBeDefined();
  });

  it('"대출 받아서 코인에 몰빵할까"는 suspected', () => {
    const result = screenKeywords('대출 받아서 코인에 몰빵할까');
    expect(result.verdict).toBe('suspected');
    expect(result.matchedPattern).toBeDefined();
  });

  // ── 오탐 가드 (CRITICAL: 일상 결정은 절대 격상 금지) ──
  it('"이직 제안을 수락할까"는 none (오탐 가드)', () => {
    expect(screenKeywords('이직 제안을 수락할까').verdict).toBe('none');
  });

  it('"이사를 갈까 말까"는 none (오탐 가드)', () => {
    expect(screenKeywords('이사를 갈까 말까').verdict).toBe('none');
  });

  it('"어떤 노트북을 살까"는 none (오탐 가드)', () => {
    expect(screenKeywords('어떤 노트북을 살까').verdict).toBe('none');
  });
});

describe('screenKeywords - AC-4 회귀 (결정 문장에서도 self-harm 시그니처 우선)', () => {
  // 결정 맥락이 추가되어도 자살/자해 키워드는 그대로 critical 발동해야 한다.
  it('"자살하고 싶어서 회사를 그만두려 한다"는 critical (none/suspected 아님)', () => {
    const result = screenKeywords('자살하고 싶어서 회사를 그만두려 한다');
    expect(result.verdict).toBe('critical');
    expect(result.verdict).not.toBe('none');
    expect(result.verdict).not.toBe('suspected');
  });
});

describe('screenKeywords - 재현율 우선 설계 (의도된 false positive)', () => {
  // v0는 recall 우선. negation은 키워드 단계에서 구분하지 않고 LLM 2차 분류로 보정한다.
  // 이 테스트들은 "현재 의도된 동작"을 문서화한다. 정규식 변경으로 아래 동작이 바뀌면
  // 그것은 의식적 결정이어야 하므로 테스트가 먼저 깨져야 한다.
  it('"죽고 싶지 않아" negation도 현재 critical로 분류 (LLM이 보정)', () => {
    expect(screenKeywords('나는 죽고 싶지 않아').verdict).toBe('critical');
  });

  it('"자해하지 마" negation도 현재 critical로 분류 (LLM이 보정)', () => {
    expect(screenKeywords('자해하지 마').verdict).toBe('critical');
  });
});
