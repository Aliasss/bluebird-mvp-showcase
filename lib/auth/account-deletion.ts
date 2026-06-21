import { supabase } from '@/lib/supabase/client';

export {
  evaluateDeletionState,
  getDeletionScheduledAt,
  type PostLoginAction,
} from './deletion-state';

/**
 * 만료된 삭제 예약 계정을 즉시 영구 삭제 후 로그아웃.
 * lazy delete on next login pattern. 호출자는 호출 후 안내 화면으로 이동.
 */
export async function purgeExpiredAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    console.error('만료된 계정 삭제 실패:', error);
  }
  await supabase.auth.signOut();
}
