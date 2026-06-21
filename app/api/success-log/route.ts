import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AUTONOMY_NOTE_BONUS, calcAutonomyScore } from '@/lib/intervention/autonomy-score';
import { logServerError } from '@/lib/logging/server-logger';
import { z } from 'zod';

const schema = z.object({
  situation: z.string().trim().min(5).max(1000),
  system2Action: z.string().trim().min(10).max(1000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '입력 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    const { situation, system2Action } = parsed.data;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 오늘 KST 기준 성공 로그 중복 방지 (1일 1회)
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kstNow = new Date(Date.now() + KST_OFFSET);
    const todayStart = new Date(
      Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - KST_OFFSET
    ).toISOString();

    const { data: existing } = await supabase
      .from('logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('log_type', 'success')
      .gte('created_at', todayStart)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: '오늘의 성공 순간은 이미 기록했습니다.', alreadyDone: true },
        { status: 409 }
      );
    }

    // logs 테이블에 성공 로그 저장
    const { data: logData, error: logError } = await supabase
      .from('logs')
      .insert({
        user_id: user.id,
        trigger: situation,
        thought: system2Action,
        log_type: 'success',
      })
      .select()
      .single();

    if (logError || !logData) {
      return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
    }

    // intervention 테이블에 완료 상태로 저장
    // 분석 데이터·소크라테스 답변이 없는 회고형 기록이므로 answerCount=0.
    // system2Action(최소 10자)이 자기 표현(SDT autonomy 차원) 역할을 하므로
    // noteBonus만 부여 — autonomy_score v2.
    const autonomyScore =
      calcAutonomyScore({ answerCount: 0 }) + AUTONOMY_NOTE_BONUS;

    const { error: interventionError } = await supabase.from('intervention').insert({
      log_id: logData.id,
      socratic_questions: [],
      user_answers: {},
      final_action: system2Action,
      is_completed: true,
      autonomy_score: autonomyScore,
    });

    if (interventionError) {
      // logs 저장은 됐으니 실패해도 진행 (non-critical)
      logServerError('api/success-log:intervention-insert', interventionError, {
        userId: user.id,
        logId: logData.id,
      });
    }

    return NextResponse.json({ success: true, logId: logData.id }, { status: 200 });
  } catch (error) {
    logServerError('api/success-log', error);
    return NextResponse.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
