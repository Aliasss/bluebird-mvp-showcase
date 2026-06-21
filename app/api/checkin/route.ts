import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logging/server-logger';
import { z } from 'zod';

const schema = z.object({
  type: z.enum(['morning', 'evening']),
  moodWord: z.string().trim().min(1).max(20).optional(),
  moodLevel: z.number().int().min(1).max(5).optional(), // 2026-05-26 Migration 20: 5단계 자기 평가 점수
  system2Moment: z.string().trim().min(1).max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '입력 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    const { type, moodWord, moodLevel, system2Moment } = parsed.data;

    if (type === 'morning' && !moodWord) {
      return NextResponse.json({ error: '아침 체크인에는 기분 선택이 필요합니다.' }, { status: 400 });
    }
    if (type === 'morning' && moodLevel === undefined) {
      return NextResponse.json({ error: '아침 체크인에는 5단계 기분 점수가 필요합니다.' }, { status: 400 });
    }
    if (type === 'evening' && !system2Moment) {
      return NextResponse.json({ error: '저녁 체크인에는 한 줄 기록이 필요합니다.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 오늘 KST 기준 동일 타입 중복 체크인 방지
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kstNow = new Date(Date.now() + KST_OFFSET);
    const todayStart = new Date(
      Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - KST_OFFSET
    );

    const { data: existing } = await supabase
      .from('checkins')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', type)
      .gte('created_at', todayStart.toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '오늘은 이미 체크인했습니다.', alreadyDone: true }, { status: 409 });
    }

    const { error: insertError } = await supabase.from('checkins').insert({
      user_id: user.id,
      type,
      mood_word: moodWord ?? null,
      mood_level: moodLevel ?? null,
      system2_moment: system2Moment ?? null,
    });

    if (insertError) {
      return NextResponse.json({ error: '체크인 저장에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logServerError('api/checkin', error);
    return NextResponse.json({ error: '체크인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
