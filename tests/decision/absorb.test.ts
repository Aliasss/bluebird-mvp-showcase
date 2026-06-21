import { describe, it, expect } from 'vitest';
import { resolveAbsorbBranch } from '@/lib/decision/absorb';
describe('resolveAbsorbBranch', () => {
  it('결정과 닿음(yes) → 결정 루프로', () => { expect(resolveAbsorbBranch('yes')).toEqual({ next: 'decision_loop' }); });
  it('안 닿음(no) → 경량 점검 + 승격 옵션', () => { expect(resolveAbsorbBranch('no')).toEqual({ next: 'light_check', allowPromote: true }); });
  it('모름(unsure) → 경량 점검 + 승격 옵션', () => { expect(resolveAbsorbBranch('unsure')).toEqual({ next: 'light_check', allowPromote: true }); });
});
