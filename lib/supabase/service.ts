import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client — RLS 우회.
 * 사용처는 cron handler·운영 스크립트로 한정. Server Component·일반 API에서 사용 금지.
 *
 * env 부재 시 즉시 throw — silent fallback으로 RLS 보호 우회 사고 방지.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'createServiceRoleClient: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정',
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
