import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { consumeRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { logServerError } from '@/lib/logging/server-logger';
import { trackCognitiveFunnel } from '@/lib/analytics/server';
import { z } from 'zod';

type SaveAnswersRequestBody = {
  logId?: string;
  answers?: string[];
};

const saveAnswersSchema = z.object({
  logId: z.string().uuid(),
  answers: z.array(z.string().trim().min(1).max(500)).length(3),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveAnswersRequestBody;
    const parsedBody = saveAnswersSchema.safeParse({
      logId: body.logId?.trim(),
      answers: Array.isArray(body.answers) ? body.answers.map((v) => String(v).trim()) : [],
    });
    if (!parsedBody.success) {
      return NextResponse.json({ error: '입력 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    const { logId, answers } = parsedBody.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const rateKey = `answers:${user.id}:${getClientIp(request)}`;
    const rate = consumeRateLimit(rateKey, { windowMs: 60_000, maxRequests: 20 });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
          retryAfterSec: rate.retryAfterSec,
        },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      );
    }

    const { data: logData, error: logError } = await supabase
      .from('logs')
      .select('id')
      .eq('id', logId)
      .eq('user_id', user.id)
      .single();

    if (logError || !logData) {
      return NextResponse.json({ error: '로그를 찾을 수 없습니다.' }, { status: 404 });
    }

    const userAnswers = {
      q1: answers[0],
      q2: answers[1],
      q3: answers[2],
    };

    const { data: existingIntervention, error: existingError } = await supabase
      .from('intervention')
      .select('id')
      .eq('log_id', logId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: '기존 데이터 조회에 실패했습니다.' }, { status: 500 });
    }

    if (existingIntervention?.id) {
      const { error: updateError } = await supabase
        .from('intervention')
        .update({ user_answers: userAnswers })
        .eq('id', existingIntervention.id);

      if (updateError) {
        return NextResponse.json({ error: '답변 저장에 실패했습니다.' }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase.from('intervention').insert({
        log_id: logId,
        user_answers: userAnswers,
      });

      if (insertError) {
        return NextResponse.json({ error: '답변 저장에 실패했습니다.' }, { status: 500 });
      }
    }

    void trackCognitiveFunnel('reframe_completed', {
      log_id: logId,
      answer_count: answers.length,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logServerError('api/intervention/answers', error);
    return NextResponse.json(
      { error: '답변 저장 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
