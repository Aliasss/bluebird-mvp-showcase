import { describe, it, expect } from 'vitest';
import { resolveTrack } from '@/lib/decision/triage';

/**
 * 트리아지 라우팅 순수 로직 — spec §2.2 / §2.4 / §2.5 (비대칭) / AC-1~3 고정.
 *
 * 핵심 비대칭(§2.5):
 *   - Q1(reversible) 'unsure' → tame 로 단락하지 않고 Q2 요구(Wild 가능성 보존, 비가역 위험 보호).
 *   - Q2(identityShift) 'unsure' → tame 안전 기본값(MVP "wild=순수만" 절제).
 */
describe('resolveTrack — Q1 reversible (AC-1)', () => {
  it("reversible='yes' → tame (Q2 미요구로 종결)", () => {
    expect(resolveTrack({ reversible: 'yes' })).toBe('tame');
  });

  it("reversible='yes' 면 identityShift 가 'yes' 여도 tame (Q1 에서 종결, Q2 무시)", () => {
    expect(resolveTrack({ reversible: 'yes', identityShift: 'yes' })).toBe('tame');
  });
});

describe('resolveTrack — Q2 identityShift (AC-2)', () => {
  it("reversible='no' + identityShift='yes' → wild (순수 wild: 비가역 ∩ 정체성 변형)", () => {
    expect(resolveTrack({ reversible: 'no', identityShift: 'yes' })).toBe('wild');
  });

  it("reversible='no' + identityShift='no' → tame (고위험 tame)", () => {
    expect(resolveTrack({ reversible: 'no', identityShift: 'no' })).toBe('tame');
  });

  it("reversible='no' + identityShift='unsure' → tame (안전 기본값, MVP wild=순수만)", () => {
    expect(resolveTrack({ reversible: 'no', identityShift: 'unsure' })).toBe('tame');
  });
});

describe('resolveTrack — Q1 unsure 비대칭 (§2.5 · AC-3)', () => {
  it("reversible='unsure' + identityShift='yes' → wild (Q1 모름은 Wild 가능성을 연다)", () => {
    expect(resolveTrack({ reversible: 'unsure', identityShift: 'yes' })).toBe('wild');
  });

  it("reversible='unsure' + identityShift='no' → tame", () => {
    expect(resolveTrack({ reversible: 'unsure', identityShift: 'no' })).toBe('tame');
  });

  it("reversible='unsure' + identityShift='unsure' → tame (Q2 모름은 tame 착지)", () => {
    expect(resolveTrack({ reversible: 'unsure', identityShift: 'unsure' })).toBe('tame');
  });
});

describe('resolveTrack — 미완(Q2 필요) 처리 (AC-3 — tame 단락 금지)', () => {
  it("reversible='no' & identityShift 미제공 → 'incomplete' (자동 tame 폴백 금지)", () => {
    expect(resolveTrack({ reversible: 'no' })).toBe('incomplete');
  });

  it("reversible='unsure' & identityShift 미제공 → 'incomplete' (tame 단락 금지 — Q2 요구)", () => {
    expect(resolveTrack({ reversible: 'unsure' })).toBe('incomplete');
  });
});

describe('needsIdentityQuestion — Q2 노출 여부', () => {
  it("reversible='yes' → Q2 불필요", async () => {
    const { needsIdentityQuestion } = await import('@/lib/decision/triage');
    expect(needsIdentityQuestion('yes')).toBe(false);
  });

  it("reversible='no' → Q2 필요", async () => {
    const { needsIdentityQuestion } = await import('@/lib/decision/triage');
    expect(needsIdentityQuestion('no')).toBe(true);
  });

  it("reversible='unsure' → Q2 필요 (비대칭: tame 단락 안 함)", async () => {
    const { needsIdentityQuestion } = await import('@/lib/decision/triage');
    expect(needsIdentityQuestion('unsure')).toBe(true);
  });
});
