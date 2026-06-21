/**
 * 복기 미리보기 A/B 코호트 해시 (preview-activation).
 * 순수 함수 — 네트워크/DB/시간/랜덤 없음. 결정론·분포만 검증.
 */
import { describe, it, expect } from 'vitest';
import { cohortForUser, type Cohort } from '@/lib/analytics/cohort';

describe('cohortForUser', () => {
  it('결정론: 같은 user_id 는 늘 같은 군', () => {
    const id = '7f3c1a2e-1111-4222-8333-444455556666';
    const first = cohortForUser(id);
    for (let i = 0; i < 50; i++) {
      expect(cohortForUser(id)).toBe(first);
    }
  });

  it('산출값은 preview 또는 control 둘 중 하나뿐', () => {
    const valid: Cohort[] = ['preview', 'control'];
    for (let i = 0; i < 200; i++) {
      expect(valid).toContain(cohortForUser(`user-${i}`));
    }
  });

  it('두 군이 모두 산출됨(여러 샘플 id 로 한쪽 쏠림 아님)', () => {
    const counts: Record<Cohort, number> = { preview: 0, control: 0 };
    // UUID 유사 다양한 샘플 — 한 군에만 떨어지지 않는지(해시 분할 유효성).
    for (let i = 0; i < 1000; i++) {
      const id = `id-${i}-${(i * 2654435761) >>> 0}`;
      counts[cohortForUser(id)] += 1;
    }
    expect(counts.preview).toBeGreaterThan(0);
    expect(counts.control).toBeGreaterThan(0);
    // 합은 정확히 샘플 수(모든 id 가 둘 중 하나로 배정됨).
    expect(counts.preview + counts.control).toBe(1000);
  });

  it('빈 문자열도 안전하게 한 군으로 배정(throw 없음)', () => {
    expect(['preview', 'control']).toContain(cohortForUser(''));
  });
});
