/**
 * 복기 미리보기 A/B 코호트 결정 (preview-activation).
 *
 * 봉인 직후 "검토일 미리보기" 노출의 효과를 *반증 가능*하게 재기 위한 2군 분할.
 * user_id 를 결정론적으로 해시해 고정 배정한다 — 같은 user 는 늘 같은 군(세션·기기 무관).
 *
 * ⚠️ 순수 함수다(네트워크·DB·시간·랜덤 없음). 운영자/내부 계정 제외는 여기서 하지 않고
 *    *분석 시점*(Supabase 쿼리)에서 user_id 필터로 처리한다 — 클라에 운영자 목록을
 *    하드코딩하면 노출 자체가 달라져 측정이 오염된다.
 */

export type Cohort = 'preview' | 'control';

/**
 * user_id → 고정 코호트. FNV-1a 32bit 해시의 짝/홀로 2군 분할.
 * 해시는 결정론적이라 같은 id 는 늘 같은 군으로 떨어진다(재현 가능·세션 독립).
 */
export function cohortForUser(userId: string): Cohort {
  let h = 2166136261; // FNV-1a 32bit offset basis
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 16777619); // FNV prime
  }
  return (h >>> 0) % 2 === 0 ? 'preview' : 'control';
}
