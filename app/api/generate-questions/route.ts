import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateSocraticQuestionsWithGemini } from '@/lib/openai/gemini';
import { isAiInputTooLong, MAX_AI_TEXT_LENGTH } from '@/lib/security/ai-guard';
import { logServerError } from '@/lib/logging/server-logger';
import type { DistortionAnalysis } from '@/types';
import { z } from 'zod';
import { trackCognitiveFunnel } from '@/lib/analytics/server';

// Vercel Pro: Gemini 1회 호출. 기본 ~15s 타임아웃 초과 가능성 회피용 60s 명시.
export const maxDuration = 60;

const generateQuestionsRequestSchema = z.object({
  logId: z.string().uuid(),
});

const generatedQuestionsSchema = z.object({
  questions: z.array(z.string().min(5)).length(3),
});

const COMFORT_LANGUAGE_PATTERNS = [
  /괜찮아요/gi,
  /괜찮아/gi,
  /힘내/gi,
  /잘하고 있어/gi,
  /응원/gi,
];

function stripComfortLanguage(value: string) {
  return COMFORT_LANGUAGE_PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, '').trim(),
    value
  );
}

type GenerateQuestionsRequestBody = {
  logId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateQuestionsRequestBody;
    const parsedBody = generateQuestionsRequestSchema.safeParse({
      logId: body.logId?.trim(),
    });
    if (!parsedBody.success) {
      return NextResponse.json({ error: '유효한 logId가 필요합니다.' }, { status: 400 });
    }
    const logId = parsedBody.data.logId;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 분당 요청 한도 (Supabase 기반, cross-instance 안전)
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recentQuestions } = await supabase
      .from('intervention')
      .select('id, logs!inner(user_id)')
      .eq('logs.user_id', user.id)
      .gte('created_at', oneMinuteAgo);
    if ((recentQuestions?.length ?? 0) >= 6) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', retryAfterSec: 60 },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const { data: logData, error: logError } = await supabase
      .from('logs')
      .select('id, trigger, thought, user_id')
      .eq('id', logId)
      .eq('user_id', user.id)
      .single();

    if (logError || !logData) {
      return NextResponse.json({ error: '로그를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (isAiInputTooLong({ trigger: logData.trigger, thought: logData.thought })) {
      return NextResponse.json(
        { error: `입력 길이가 너무 깁니다. 트리거/자동사고를 ${MAX_AI_TEXT_LENGTH}자 이하로 줄여주세요.` },
        { status: 400 }
      );
    }

    const existingInterventionCheck = await supabase
      .from('intervention')
      .select('id, socratic_questions')
      .eq('log_id', logId)
      .maybeSingle();

    if (
      !existingInterventionCheck.error &&
      existingInterventionCheck.data &&
      Array.isArray(existingInterventionCheck.data.socratic_questions) &&
      existingInterventionCheck.data.socratic_questions.length === 3
    ) {
      return NextResponse.json(
        { questions: existingInterventionCheck.data.socratic_questions.map((q) => String(q)) },
        { status: 200 }
      );
    }

    const primaryQuery = await supabase
      .from('analysis')
      .select(
        'distortion_type, intensity, logic_error_segment, rationale, frame_type, reference_point, probability_estimate, loss_aversion_signal, cas_rumination, cas_worry, system2_question_seed, decentering_prompt'
      )
      .eq('log_id', logId);
    let analysisRows: Array<Record<string, unknown>> | null = primaryQuery.data as Array<
      Record<string, unknown>
    > | null;
    let analysisError = primaryQuery.error;

    if (analysisError) {
      const legacyQuery = await supabase
        .from('analysis')
        .select('distortion_type, intensity, logic_error_segment')
        .eq('log_id', logId);
      analysisRows = legacyQuery.data as Array<Record<string, unknown>> | null;
      analysisError = legacyQuery.error;
    }

    if (analysisError) {
      return NextResponse.json(
        { error: '분석 데이터를 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    const distortions: DistortionAnalysis[] = (analysisRows ?? [])
      .filter((row) => (row as any).distortion_type !== null)
      .map((row) => ({
        type: (row as any).distortion_type,
        intensity: Number((row as any).intensity ?? 0),
        segment: String((row as any).logic_error_segment ?? ''),
        rationale: ((row as any).rationale as string | undefined) || undefined,
      })) as DistortionAnalysis[];

    const analysisMeta = (analysisRows?.[0] ?? {}) as Record<string, any>;

    let questions = [];
    try {
      questions = await generateSocraticQuestionsWithGemini({
        trigger: logData.trigger,
        thought: logData.thought,
        distortions,
        frameType: analysisMeta?.frame_type,
        referencePoint: analysisMeta?.reference_point,
        probabilityEstimate: analysisMeta?.probability_estimate,
        casSignal: {
          rumination: Number(analysisMeta?.cas_rumination ?? 0.3),
          worry: Number(analysisMeta?.cas_worry ?? 0.3),
        },
        system2QuestionSeed: analysisMeta?.system2_question_seed,
        decenteringPrompt: analysisMeta?.decentering_prompt,
      });
    } catch (aiError) {
      logServerError('api/generate-questions:gemini-fallback', aiError, {
        logId,
        userId: user.id,
      });
      questions = [
        '이 상황이 실제로 최악으로 전개될 확률을 0~100%로 추정하면 몇 %인가요?',
        '지금 생각을 뒷받침하는 객관적 증거와 반대 증거를 각각 3가지씩 적어볼 수 있나요?',
        '같은 상황을 겪는 친구에게 조언한다면, 어떤 대안 해석을 제시하시겠어요?',
      ];
    }

    const sanitizedQuestions = questions.map((question) =>
      stripComfortLanguage(question).replace(/\s+/g, ' ').trim()
    );
    const normalizedQuestions = generatedQuestionsSchema.parse({
      questions: sanitizedQuestions.map((q, index) =>
        q.length >= 5 ? q : `질문 ${index + 1}: 객관적 지표를 포함해 재평가해볼 수 있나요?`
      ),
    }).questions;

    const theoryContext = {
      frame_type: analysisMeta?.frame_type ?? 'mixed',
      reference_point: analysisMeta?.reference_point ?? null,
      probability_estimate: analysisMeta?.probability_estimate ?? null,
      loss_aversion_signal: analysisMeta?.loss_aversion_signal ?? null,
      cas_signal: {
        rumination: analysisMeta?.cas_rumination ?? null,
        worry: analysisMeta?.cas_worry ?? null,
      },
      decentering_prompt: analysisMeta?.decentering_prompt ?? null,
    };

    const { data: existingIntervention, error: existingError } = await supabase
      .from('intervention')
      .select('id')
      .eq('log_id', logId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: '기존 개입 데이터를 확인하지 못했습니다.' }, { status: 500 });
    }

    if (existingIntervention?.id) {
      const { error: updateError } = await supabase
        .from('intervention')
        .update({ socratic_questions: normalizedQuestions, theory_context: theoryContext })
        .eq('id', existingIntervention.id);

      if (updateError) {
        return NextResponse.json({ error: '질문 저장에 실패했습니다.' }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from('intervention')
        .insert({ log_id: logId, socratic_questions: normalizedQuestions, theory_context: theoryContext });

      if (insertError) {
        return NextResponse.json({ error: '질문 저장에 실패했습니다.' }, { status: 500 });
      }
    }

    void trackCognitiveFunnel('reframe_attempted', {
      log_id: logId,
      question_count: normalizedQuestions.length,
    });

    return NextResponse.json({ questions: normalizedQuestions }, { status: 200 });
  } catch (error) {
    logServerError('api/generate-questions', error);
    return NextResponse.json(
      { error: '질문 생성 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
