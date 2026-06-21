import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logging/server-logger';

// POST /api/onboarding/complete
//   body: { reached_act: 1 | 2 | 3 }
//   - 인증 사용자 본인 user_onboarding row INSERT.
//   - 이미 존재하면 reached_act 만 더 깊은 값으로 갱신 (UPSERT).
//   - completed_at 은 INSERT 시 NOW(). 재진입(replay)은 컬럼 갱신 없이 무시.
//
// RLS는 마이그레이션 10에서 정의 — auth.uid() = user_id 만 허용.

const schema = z.object({
  reached_act: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '입력 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    const { reached_act } = parsed.data;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 기존 row 조회 — reached_act는 더 깊은 값으로만 갱신.
    const { data: existing } = await supabase
      .from('user_onboarding')
      .select('reached_act')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const nextReachedAct = Math.max(existing.reached_act ?? 1, reached_act);
      if (nextReachedAct !== existing.reached_act) {
        const { error: updateError } = await supabase
          .from('user_onboarding')
          .update({ reached_act: nextReachedAct })
          .eq('user_id', user.id);
        if (updateError) {
          return NextResponse.json({ error: '온보딩 상태 갱신 실패' }, { status: 500 });
        }
      }
    } else {
      const { error: insertError } = await supabase
        .from('user_onboarding')
        .insert({ user_id: user.id, reached_act });
      if (insertError) {
        return NextResponse.json({ error: '온보딩 상태 저장 실패' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logServerError('api/onboarding/complete', error);
    return NextResponse.json({ error: '온보딩 상태 처리 중 오류' }, { status: 500 });
  }
}
