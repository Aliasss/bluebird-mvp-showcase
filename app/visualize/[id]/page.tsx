'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProspectValueChart from '@/components/charts/prospect-value-chart';
import { supabase } from '@/lib/supabase/client';
import { calculateProspectValue, generateProspectTheoryCurve } from '@/lib/utils';
import { DistortionTypeKorean, type DistortionAnalysis, type FrameType, type Log } from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import Top from '@/components/ui/Top';
import SkeletonCard from '@/components/ui/SkeletonCard';

type PageState = {
  log: Log | null;
  distortions: DistortionAnalysis[];
  answers: string[];
  questions: string[];
  frameType: FrameType;
  referencePoint: string;
  probabilityEstimate: number | null;
  lossAversionSignal: number | null;
  casRumination: number | null;
  casWorry: number | null;
  decenteringPrompt: string | null;
};

function extractFirstNumber(input: string): number | null {
  const match = input.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function VisualizePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [state, setState] = useState<PageState>({
    log: null,
    distortions: [],
    answers: ['', '', ''],
    questions: [],
    frameType: 'mixed',
    referencePoint: '준거점 정보 없음',
    probabilityEstimate: null,
    lossAversionSignal: null,
    casRumination: null,
    casWorry: null,
    decenteringPrompt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const logId = params.id;
    if (!logId) {
      setError('올바른 경로로 접근할 수 없어요.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/auth/login');
          return;
        }

        const [logResult, analysisResult, interventionResult] = await Promise.all([
          supabase.from('logs').select('*').eq('id', logId).eq('user_id', user.id).single(),
          supabase
            .from('analysis')
            .select('distortion_type, intensity, logic_error_segment, rationale')
            .eq('log_id', logId),
          supabase
            .from('intervention')
            .select('socratic_questions, user_answers, theory_context')
            .eq('log_id', logId)
            .maybeSingle(),
        ]);

        let finalInterventionResult: any = interventionResult;
        if (interventionResult.error) {
          const legacyInterventionResult = await supabase
            .from('intervention')
            .select('socratic_questions, user_answers')
            .eq('log_id', logId)
            .maybeSingle();
          finalInterventionResult = legacyInterventionResult;
        }

        if (logResult.error || !logResult.data) {
          throw new Error('로그 데이터를 찾을 수 없습니다.');
        }

        const distortions = (analysisResult.data ?? []).map((row) => ({
          type: row.distortion_type,
          intensity: row.intensity,
          segment: row.logic_error_segment,
          rationale: (row as any).rationale ?? undefined,
        })) as DistortionAnalysis[];

        const rawAnswers = finalInterventionResult.data?.user_answers;
        const answers = [
          String(rawAnswers?.q1 ?? ''),
          String(rawAnswers?.q2 ?? ''),
          String(rawAnswers?.q3 ?? ''),
        ];
        const questions = Array.isArray(finalInterventionResult.data?.socratic_questions)
          ? finalInterventionResult.data.socratic_questions.map((q: unknown) => String(q))
          : [];
        const theoryContext =
          finalInterventionResult.data?.theory_context &&
          typeof finalInterventionResult.data.theory_context === 'object'
            ? finalInterventionResult.data.theory_context
            : {};

        setState({
          log: logResult.data,
          distortions,
          answers,
          questions,
          frameType: (theoryContext.frame_type as FrameType) || 'mixed',
          referencePoint: String(theoryContext.reference_point ?? '준거점 정보 없음'),
          probabilityEstimate:
            typeof theoryContext.probability_estimate === 'number'
              ? theoryContext.probability_estimate
              : null,
          lossAversionSignal:
            typeof theoryContext.loss_aversion_signal === 'number'
              ? theoryContext.loss_aversion_signal
              : null,
          casRumination:
            typeof theoryContext.cas_signal?.rumination === 'number'
              ? theoryContext.cas_signal.rumination
              : null,
          casWorry:
            typeof theoryContext.cas_signal?.worry === 'number'
              ? theoryContext.cas_signal.worry
              : null,
          decenteringPrompt:
            typeof theoryContext.decentering_prompt === 'string'
              ? theoryContext.decentering_prompt
              : null,
        });
      } catch (err: any) {
        console.error('시각화 데이터 조회 실패:', err);
        setError(err.message || '시각화 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  const chartMeta = useMemo(() => {
    const averageIntensity =
      state.distortions.length > 0
        ? state.distortions.reduce((sum, item) => sum + item.intensity, 0) / state.distortions.length
        : 0.3;

    const firstAnswerNumber = extractFirstNumber(state.answers[0]);
    const objectiveProbability = clamp(
      ((state.probabilityEstimate ?? firstAnswerNumber ?? 50) as number) / 100,
      0,
      1
    );
    const subjectiveLossWeight =
      2.25 + averageIntensity * 1.5 + (state.lossAversionSignal ?? 0.3) * 0.5;
    const userPointX = -objectiveProbability;
    const userPointY = calculateProspectValue(userPointX, 0.88, 0.88, subjectiveLossWeight);

    const curveData = generateProspectTheoryCurve(100).map((point) => ({
      x: point.x,
      y: calculateProspectValue(point.x, 0.88, 0.88, subjectiveLossWeight),
    }));

    return {
      objectiveProbability,
      averageIntensity,
      curveData,
      userPoint: {
        x: userPointX,
        y: userPointY,
        label: '나의 현재 평가 지점',
      },
    };
  }, [state.answers, state.distortions, state.lossAversionSignal, state.probabilityEstimate]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="시각화" />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </main>
    );
  }

  if (error || !state.log) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-xl md:text-2xl">⚠️</p>
          <p className="text-text-primary font-semibold">시각화를 불러오지 못했습니다.</p>
          <p className="text-text-secondary text-xs md:text-sm">{error}</p>
          <button
            onClick={() => router.push(`/analyze/${params.id}`)}
            className="bg-primary text-primary-fg font-semibold min-h-[44px] py-3 px-6 rounded-2xl text-sm"
          >
            분석으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="시각화" onBack={() => router.push(`/analyze/${params.id}`)} />
      <Top
        title="고통이 실제보다 커지는 이유"
        sub="같은 사건도 '손실'로 볼 때 우리는 실제보다 훨씬 크게 아파요."
      />
      <div className="mx-auto w-full max-w-lg space-y-4 px-5 pb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-background-secondary px-3 py-1 text-xs">
          <span className="text-text-secondary">현재 프레임</span>
          <span className="font-semibold text-text-primary">
            {state.frameType === 'loss'
              ? '손실 프레임'
              : state.frameType === 'gain'
                ? '이득 프레임'
                : '혼합 프레임'}
          </span>
        </div>

        <div className="rounded-card border border-background-tertiary bg-surface p-3 sm:p-4">
          <ProspectValueChart
            curveData={chartMeta.curveData}
            userPoint={chartMeta.userPoint}
          />
          <div className="mt-2 flex justify-center gap-5 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[3px] w-3.5 rounded bg-primary" />가치 함수
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-distortion" />당신의 현재 위치
            </span>
          </div>
          <div className="mt-2 text-center">
            <Link href="/manual#dyn-02" className="text-xs text-primary hover:underline">
              전망이론이 뭐예요? →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-card border border-background-tertiary bg-surface p-5 space-y-3">
            <h2 className="text-base md:text-lg font-bold text-text-primary">해석 가이드</h2>
            <p className="text-sm text-text-secondary">
              빨간 점은 현재 답변 기준 주관적 평가 지점입니다. 0에 가까울수록 균형적 판단이며,
              아래로 갈수록 손실 과대평가 경향이 큽니다.
            </p>
            <ul className="text-xs md:text-sm text-text-secondary space-y-1">
              <li>객관 확률(답변1): {(chartMeta.objectiveProbability * 100).toFixed(0)}%</li>
              <li>평균 왜곡 강도: {(chartMeta.averageIntensity * 100).toFixed(0)}%</li>
              <li>준거점: {state.referencePoint}</li>
            </ul>
          </div>

          <div className="rounded-card border border-background-tertiary bg-surface p-5 space-y-3">
            <h2 className="text-base md:text-lg font-bold text-text-primary">발견된 왜곡 요약</h2>
            {state.distortions.length === 0 ? (
              <p className="text-xs md:text-sm text-text-secondary">명확한 왜곡이 보이지 않았어요.</p>
            ) : (
              <ul className="space-y-2">
                {state.distortions.map((item, index) => (
                  <li key={`${item.type}-${index}`} className="text-xs md:text-sm text-text-secondary space-y-0.5">
                    <p>
                      <span className="text-text-primary font-medium">
                        {DistortionTypeKorean[item.type]}
                      </span>{' '}
                      ({(item.intensity * 100).toFixed(0)}%) — {item.segment}
                    </p>
                    {item.rationale && (
                      <p className="text-[10px] text-text-tertiary pl-1">근거: {item.rationale}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-card border border-background-tertiary bg-surface p-5 space-y-3">
          <h2 className="text-base md:text-lg font-bold text-text-primary">BlueBird 이론 지표</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs md:text-sm">
            <div className="border border-background-tertiary rounded-xl p-3">
              <p className="text-text-secondary mb-1">추정 확률</p>
              <p className="font-semibold text-text-primary">
                {state.probabilityEstimate !== null ? `${state.probabilityEstimate}%` : '미측정'}
              </p>
            </div>
            <div className="border border-background-tertiary rounded-xl p-3">
              <p className="text-text-secondary mb-1">반추 신호</p>
              <p className="font-semibold text-text-primary">
                {state.casRumination !== null
                  ? `${(state.casRumination * 100).toFixed(0)}%`
                  : '미측정'}
              </p>
            </div>
            <div className="border border-background-tertiary rounded-xl p-3">
              <p className="text-text-secondary mb-1">걱정 신호</p>
              <p className="font-semibold text-text-primary">
                {state.casWorry !== null ? `${(state.casWorry * 100).toFixed(0)}%` : '미측정'}
              </p>
            </div>
          </div>
          {state.decenteringPrompt && (
            <div className="bg-background-secondary rounded-xl p-3">
              <p className="text-[10px] md:text-xs text-text-secondary mb-1">탈중심화 가이드</p>
              <p className="text-xs md:text-sm text-text-primary">{state.decenteringPrompt}</p>
            </div>
          )}
        </div>

        <div className="rounded-card border border-background-tertiary bg-surface p-5 space-y-3">
          <h2 className="text-base md:text-lg font-bold text-text-primary">내가 입력한 답변</h2>
          {state.questions.length === 3 ? (
            <ol className="space-y-3">
              {state.questions.map((question, index) => (
                <li key={index} className="border border-background-tertiary rounded-xl p-3 sm:p-4">
                  <p className="text-xs md:text-sm font-medium text-text-primary mb-2">
                    {index + 1}. {question}
                  </p>
                  <p className="text-xs md:text-sm text-text-secondary">
                    {state.answers[index] || '아직 답변하지 않았습니다.'}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs md:text-sm text-text-secondary">질문/답변 데이터가 아직 없습니다.</p>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 pt-2">
          <button
            onClick={() => router.push(`/action/${params.id}`)}
            className="w-full rounded-2xl bg-primary px-6 py-[17px] text-base font-semibold text-primary-fg transition-transform hover:bg-primary-dark active:scale-95 touch-manipulation"
          >
            행동 하나 정하기
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/analyze/${params.id}`)}
              className="flex-1 rounded-2xl border border-background-tertiary py-3 px-4 text-sm font-medium text-text-secondary"
            >
              분석으로 돌아가기
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 rounded-2xl border border-background-tertiary py-3 px-4 text-sm font-medium text-text-secondary"
            >
              대시보드
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
