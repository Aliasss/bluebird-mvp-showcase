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

    // 소유권 + 상태 확인
    const { data: interventionRow, error: intErr } = await supabase
      .from('intervention')
      .select('id, is_completed, reevaluated_pain_score, review_dismissed_at, logs!inner(user_id)')
      .eq('log_id', parsed.data.logId)
      .eq('logs.user_id', user.id)
      .single();
    if (intErr || !interventionRow) {
      return NextResponse.json({ error: 'intervention을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (interventionRow.review_dismissed_at != null) {
      return NextResponse.json({ ok: true }, { status: 200 }); // 이미 해제 — 멱등
    }
    if (interventionRow.reevaluated_pain_score != null) {
      return NextResponse.json({ error: '이미 재평가한 건은 해제할 수 없습니다.' }, { status: 409 });
    }

    const { error: updateErr } = await supabase
      .from('intervention')
      .update({ review_dismissed_at: new Date().toISOString() })
      .eq('id', interventionRow.id);
    if (updateErr) {
      return NextResponse.json({ error: '해제 저장 실패' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('api/review/dismiss', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
