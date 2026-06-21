import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logging/server-logger';

const schema = z.object({ endpoint: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력 형식이 올바르지 않습니다.' },
        { status: 400 },
      );
    }
    const { endpoint } = parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);

    if (error) {
      logServerError('api/push/unsubscribe', error);
      return NextResponse.json(
        { error: '구독 해지에 실패했습니다.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logServerError('api/push/unsubscribe', error);
    return NextResponse.json(
      { error: '해지 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
