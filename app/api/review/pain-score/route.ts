import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logging/server-logger';

const schema = z.object({
  logId: z.string().uuid(),
  painScore: z.number().int().min(0).max(10),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { logId?: string; painScore?: number };
    const parsed = schema.safeParse({
      logId: body.logId?.trim(),
      painScore: body.painScore,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: '유효한 logId와 painScore(0-10)가 필요합니다.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 소유권 확인 + 초기 pain_score 조회 (Δpain 응답용)
    const { data: logRow, error: logErr } = await supabase
      .from('logs')
      .select('id, pain_score, user_id')
      .eq('id', parsed.data.logId)
      .eq('user_id', user.id)
      .single();
    if (logErr || !logRow) {
      return NextResponse.json({ error: '로그를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 중복 재평가 방지
    const { data: interventionRow, error: intErr } = await supabase
      .from('intervention')
      .select('id, is_completed, reevaluated_pain_score, review_dismissed_at')
      .eq('log_id', parsed.data.logId)
      .single();
    if (intErr || !interventionRow) {
      return NextResponse.json({ error: 'intervention을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (!interventionRow.is_completed) {
      return NextResponse.json({ error: '완료되지 않은 intervention은 재평가할 수 없습니다.' }, { status: 409 });
    }
    if (interventionRow.reevaluated_pain_score != null) {
      return NextResponse.json({ error: '이미 재평가한 건입니다.' }, { status: 409 });
    }
    if (interventionRow.review_dismissed_at != null) {
      return NextResponse.json({ error: '해제된 건입니다.' }, { status: 409 });
    }

    const { error: updateErr } = await supabase
      .from('intervention')
      .update({
        reevaluated_pain_score: parsed.data.painScore,
        reevaluated_at: new Date().toISOString(),
      })
      .eq('id', interventionRow.id);
    if (updateErr) {
      return NextResponse.json({ error: '재평가 저장에 실패했습니다.' }, { status: 500 });
    }

    const deltaPain =
      logRow.pain_score != null ? logRow.pain_score - parsed.data.painScore : null;

    return NextResponse.json({ ok: true, deltaPain }, { status: 200 });
  } catch (error) {
    logServerError('api/review/pain-score', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
