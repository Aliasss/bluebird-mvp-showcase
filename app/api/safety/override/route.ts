import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logging/server-logger';

const schema = z.object({ logId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { logId?: string };
    const parsed = schema.safeParse({ logId: body.logId?.trim() });
    if (!parsed.success) {
      return NextResponse.json({ error: '유효한 logId가 필요합니다.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { error } = await supabase
      .from('safety_events')
      .update({ user_override: true })
      .eq('user_id', user.id)
      .eq('log_id', parsed.data.logId);

    if (error) {
      return NextResponse.json({ error: 'override 기록 실패' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('api/safety/override', error);
    return NextResponse.json({ error: 'override 처리 실패' }, { status: 500 });
  }
}
