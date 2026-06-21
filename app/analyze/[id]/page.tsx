'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import {
  DistortionManualAnchor,
  DistortionTypeKorean,
  TriggerCategoryKorean,
  type CasSignal,
  type DistortionAnalysis,
  type FrameType,
  type Log,
  type TriggerCategory,
} from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import Top from '@/components/ui/Top';
import Badge from '@/components/ui/Badge';
import SkeletonCard from '@/components/ui/SkeletonCard';
import InfoSheet from '@/components/ui/InfoSheet';
import { SafetyNotice } from '@/components/safety/SafetyNotice';
import type { CrisisLevel } from '@/lib/safety/types';
import {
  findTriggerRevisit,
  getDominantDistortion,
  type RevisitCandidate,
  type RevisitDistortion,
  type RevisitLogRow,
} from '@/lib/insights/trigger-revisit';
import {
  computeLongitudinalPattern,
  type LongitudinalPattern,
} from '@/lib/insights/longitudinal-pattern';

type Stage = 'fetch' | 'analyze' | 'question' | 'done';
type InterventionRow = {
  socratic_questions: string[] | null;
  user_answers: Record<string, string> | null;
};
type TheoryMeta = {
  frameType: FrameType;
  referencePoint: string;
  probabilityEstimate: number | null;
  lossAversionSignal: number;
  casSignal: CasSignal;
  system2QuestionSeed: string;
  decenteringPrompt: string;
};

function hasNumericContent(value: string): boolean {
  return /\d+/.test(value);
}

function toAnswerArray(userAnswers: Record<string, string> | null | undefined): string[] {
  return [userAnswers?.q1 ?? '', userAnswers?.q2 ?? '', userAnswers?.q3 ?? ''];
}

function renderThoughtWithHighlights(
  thought: string,
  distortions: DistortionAnalysis[]
): ReactNode {
  const segments = distortions
    .map((item) => item.segment.trim())
    .filter((segment) => segment.length >= 2)
    .slice(0, 3);

  if (segments.length === 0) {
    return thought;
  }

  const sortedSegments = [...segments].sort((a, b) => b.length - a.length);
  let nodes: ReactNode[] = [thought];

  sortedSegments.forEach((segment, index) => {
    nodes = nodes.flatMap((node) => {
      if (typeof node !== 'string') return [node];
      if (!node.includes(segment)) return [node];

      const parts = node.split(segment);
      const mapped: ReactNode[] = [];
      parts.forEach((part, partIndex) => {
        if (part) mapped.push(part);
        if (partIndex < parts.length - 1) {
          mapped.push(
            <mark
              key={`highlight-${index}-${partIndex}`}
              className="bg-warning bg-opacity-30 px-1 rounded"
            >
              {segment}
            </mark>
          );
        }
      });
      return mapped;
    });
  });

  return nodes;
}

export default function AnalyzePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [logData, setLogData] = useState<Log | null>(null);
  const [distortions, setDistortions] = useState<DistortionAnalysis[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>('fetch');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const isRequestInFlightRef = useRef(false);
  const [safetyLevel, setSafetyLevel] = useState<Exclude<CrisisLevel, 'none'> | null>(null);
  const [safetyOverride, setSafetyOverride] = useState(false);
  const safetyOverrideRef = useRef(false);
  const [dailyLimit, setDailyLimit] = useState<{ title: string; message: string } | null>(null);
  const [theoryMeta, setTheoryMeta] = useState<TheoryMeta>({
    frameType: 'mixed',
    referencePoint: '준거점 정보 없음',
    probabilityEstimate: null,
    lossAversionSignal: 0.3,
    casSignal: { rumination: 0.3, worry: 0.3 },
    system2QuestionSeed: '판단 근거의 비율을 숫자로 분리해보세요.',
    decenteringPrompt: '생각을 사실이 아닌 가설로 두고 관찰 가능한 데이터만 분리하세요.',
  });
  const [triggerCategory, setTriggerCategory] = useState<TriggerCategory | null>(null);
  const [revisit, setRevisit] = useState<RevisitCandidate | null>(null);
  const [longitudinal, setLongitudinal] = useState<LongitudinalPattern | null>(null);

  const startAnalysis = useCallback(async () => {
    const logId = params.id;

    if (!logId) {
      setError('올바른 경로로 접근할 수 없어요.');
      setLoading(false);
      return;
    }

    if (isRequestInFlightRef.current) {
      return;
    }
    isRequestInFlightRef.current = true;
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data, error: logError } = await supabase
        .from('logs')
        .select('*')
        .eq('id', logId)
        .eq('user_id', user.id)
        .single();

      if (logError) throw logError;

      setLogData(data);
      const cachedCategory = (data as { trigger_category?: TriggerCategory | null } | null)
        ?.trigger_category;
      if (cachedCategory) {
        setTriggerCategory(cachedCategory);
      }

      const [{ data: analysisRows }, { data: interventionRow }] = await Promise.all([
        supabase
          .from('analysis')
          .select('distortion_type, intensity, logic_error_segment, frame_type, reference_point, probability_estimate, loss_aversion_signal, cas_rumination, cas_worry, system2_question_seed, decentering_prompt')
          .eq('log_id', logId),
        supabase
          .from('intervention')
          .select('socratic_questions, user_answers')
          .eq('log_id', logId)
          .maybeSingle(),
      ]);

      const existingDistortions = (analysisRows ?? [])
        .filter((row) => row.distortion_type !== null)
        .map((row) => ({
          type: row.distortion_type,
          intensity: row.intensity,
          segment: row.logic_error_segment,
        })) as DistortionAnalysis[];

      if (existingDistortions.length > 0) {
        setDistortions(existingDistortions);
      }

      const castIntervention = interventionRow as InterventionRow | null;
      const existingQuestions = Array.isArray(castIntervention?.socratic_questions)
        ? castIntervention.socratic_questions.map((q) => String(q))
        : [];
      const existingAnswers =
        castIntervention?.user_answers && typeof castIntervention.user_answers === 'object'
          ? toAnswerArray(castIntervention.user_answers)
          : ['', '', ''];

      if (existingAnswers.some((answer) => answer.length > 0)) {
        setAnswers(existingAnswers);
      }

      if (existingDistortions.length > 0 && existingQuestions.length === 3) {
        // 캐시에서 theoryMeta 복원
        const metaRow = (analysisRows ?? []).find((row) => row.distortion_type !== null) ?? (analysisRows ?? [])[0];
        if (metaRow) {
          setTheoryMeta({
            frameType: (metaRow.frame_type as FrameType) || 'mixed',
            referencePoint: String(metaRow.reference_point || '준거점 정보 없음'),
            probabilityEstimate: typeof metaRow.probability_estimate === 'number' ? metaRow.probability_estimate : null,
            lossAversionSignal: typeof metaRow.loss_aversion_signal === 'number' ? metaRow.loss_aversion_signal : 0.3,
            casSignal: {
              rumination: typeof metaRow.cas_rumination === 'number' ? metaRow.cas_rumination : 0.3,
              worry: typeof metaRow.cas_worry === 'number' ? metaRow.cas_worry : 0.3,
            },
            system2QuestionSeed: String(metaRow.system2_question_seed || '판단 근거의 비율을 숫자로 분리해보세요.'),
            decenteringPrompt: String(metaRow.decentering_prompt || '생각을 사실이 아닌 가설로 두고 관찰 가능한 데이터만 분리하세요.'),
          });
        }
        setQuestions(existingQuestions);
        setStage('done');
        return;
      }

      setStage('analyze');
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });
      const analyzePayload = await analyzeRes.json();

      if (!analyzeRes.ok) {
        if (analyzeRes.status === 429 && analyzePayload.error === 'daily_limit_reached') {
          setDailyLimit({
            title: analyzePayload.title ?? '오늘은 충분히 기록하셨어요',
            message: analyzePayload.message ?? '내일 다시 만나요.',
          });
          setLoading(false);
          return;
        }
        throw new Error(analyzePayload.error || '분석을 완료하지 못했어요.');
      }

      // ── 위기 감지 응답 처리 ──
      // safetyOverrideRef.current을 사용해 stale-closure 방지
      if (analyzePayload.safety && !safetyOverrideRef.current) {
        setSafetyLevel(analyzePayload.safety.level);
        return;
      }
      // ── /위기 감지 응답 처리 ──

      const analyzedDistortions = (analyzePayload.distortions ?? []) as DistortionAnalysis[];
      setDistortions(analyzedDistortions);
      if (analyzePayload.trigger_category) {
        setTriggerCategory(analyzePayload.trigger_category as TriggerCategory);
      }
      setTheoryMeta({
        frameType: (analyzePayload.frame_type as FrameType) || 'mixed',
        referencePoint: analyzePayload.reference_point || '준거점 정보 없음',
        probabilityEstimate:
          typeof analyzePayload.probability_estimate === 'number'
            ? analyzePayload.probability_estimate
            : null,
        lossAversionSignal:
          typeof analyzePayload.loss_aversion_signal === 'number'
            ? analyzePayload.loss_aversion_signal
            : 0.3,
        casSignal: {
          rumination:
            typeof analyzePayload.cas_signal?.rumination === 'number'
              ? analyzePayload.cas_signal.rumination
              : 0.3,
          worry:
            typeof analyzePayload.cas_signal?.worry === 'number'
              ? analyzePayload.cas_signal.worry
              : 0.3,
        },
        system2QuestionSeed:
          analyzePayload.system2_question_seed || '판단 근거의 비율을 숫자로 분리해보세요.',
        decenteringPrompt:
          analyzePayload.decentering_prompt ||
          '생각을 사실이 아닌 가설로 두고 관찰 가능한 데이터만 분리하세요.',
      });

      setStage('question');
      const questionRes = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });
      const questionPayload = await questionRes.json();

      if (!questionRes.ok) {
        throw new Error(questionPayload.error || '질문을 만들지 못했어요.');
      }

      setQuestions((questionPayload.questions ?? []) as string[]);
      setStage('done');
    } catch (err: any) {
      console.error('로그 조회 실패:', err);
      setError(err.message || '분석 중에 문제가 생겼어요.');
    } finally {
      isRequestInFlightRef.current = false;
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (!params.id) {
      setError('올바른 경로로 접근할 수 없어요.');
      setLoading(false);
      return;
    }
    startAnalysis();
  }, [params.id, startAnalysis]);

  // Phase 1.2: 비슷한 패턴(같은 카테고리 × 같은 dominant 왜곡) 60일 내 과거 로그 매칭.
  // 분석이 완료(stage === 'done')되어 distortions와 카테고리가 모두 결정된 후에만 실행.
  useEffect(() => {
    if (stage !== 'done') return;
    if (!params.id || !triggerCategory || distortions.length === 0) return;

    const dominant = getDominantDistortion(
      distortions.map((d) => ({ type: d.type, intensity: d.intensity }))
    );
    if (!dominant) return;

    let cancelled = false;
    (async () => {
      const sixtyDaysAgoIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('logs')
        .select('id, trigger, trigger_category, created_at, analysis(distortion_type, intensity)')
        .eq('trigger_category', triggerCategory)
        .neq('id', params.id)
        .gte('created_at', sixtyDaysAgoIso)
        .order('created_at', { ascending: false })
        .limit(50);

      if (cancelled || error || !data) return;

      const history: RevisitLogRow[] = data.map((row: any) => ({
        id: row.id,
        trigger: row.trigger ?? '',
        trigger_category: row.trigger_category ?? null,
        created_at: row.created_at,
        distortions: ((row.analysis ?? []) as Array<{
          distortion_type: string | null;
          intensity: number | null;
        }>)
          .filter((a) => a.distortion_type != null && a.intensity != null)
          .map((a) => ({
            type: a.distortion_type as RevisitDistortion['type'],
            intensity: Number(a.intensity),
          })),
      }));

      const now = new Date();
      const candidate = findTriggerRevisit({
        currentLogId: params.id,
        currentCategory: triggerCategory,
        currentDominantDistortion: dominant,
        history,
        now,
      });

      // 종단 패턴 산출 — 같은 history 재사용. 신규 쿼리 0.
      const longitudinalResult = computeLongitudinalPattern({
        currentCategory: triggerCategory,
        currentDominantDistortion: dominant,
        history,
        now,
      });

      if (!cancelled) {
        setRevisit(candidate);
        setLongitudinal(longitudinalResult);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stage, params.id, triggerCategory, distortions]);

  const retryAnalysis = () => {
    window.location.reload();
  };

  const handleSafetyOverride = async () => {
    safetyOverrideRef.current = true;
    setSafetyOverride(true);
    setSafetyLevel(null);

    try {
      await fetch('/api/safety/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: params.id }),
      });
    } catch {
      // override 기록 실패해도 분석 진행 허용
    }

    isRequestInFlightRef.current = false;
    await startAnalysis();
  };

  const handleAnswerChange = (value: string) => {
    setSaveError(null);
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestion] = value;
      return next;
    });
  };

  const goNextQuestion = () => {
    if (!answers[currentQuestion]?.trim()) {
      setSaveError('답변을 적어주세요.');
      return;
    }
    setSaveError(null);
    setCurrentQuestion((prev) => Math.min(prev + 1, questions.length - 1));
  };

  const goPrevQuestion = () => {
    setSaveError(null);
    setCurrentQuestion((prev) => Math.max(prev - 1, 0));
  };

  const handleSaveAnswers = async () => {
    if (answers.some((answer) => !answer.trim())) {
      setSaveError('세 질문 모두 답변해주세요.');
      return;
    }

    try {
      setSavingAnswers(true);
      setSaveError(null);

      const response = await fetch('/api/intervention/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: params.id,
          answers,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || '답변 저장에 실패했습니다.');
      }

      router.push(`/visualize/${params.id}`);
    } catch (err: any) {
      setSaveError(err.message || '답변 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingAnswers(false);
    }
  };

  if (loading) {
    const stageMessages: Record<Stage, { title: string; sub: string }> = {
      fetch: { title: '기록을 불러오고 있어요', sub: '' },
      analyze: { title: '인지 패턴을 분석하고 있어요', sub: '보통 10~20초 정도 걸려요. 잠깐만 기다려주세요.' },
      question: { title: '맞춤 질문을 준비하고 있어요', sub: '분석 결과를 바탕으로 질문을 만들고 있어요.' },
      done: { title: '완료', sub: '' },
    };
    const msg = stageMessages[stage];

    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="분석 결과" backHref="/dashboard" />
        {stage === 'fetch' ? (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center text-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-background-tertiary" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-text-primary">{msg.title}</p>
              {msg.sub && <p className="text-sm text-text-secondary">{msg.sub}</p>}
            </div>
          </div>
        )}
      </main>
    );
  }

  if (dailyLimit) {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="오늘의 한도" backHref="/dashboard" />
        <div className="max-w-md mx-auto px-4 sm:px-6 py-12 space-y-6">
          <div className="bg-surface rounded-2xl shadow-card p-8 space-y-5 text-center">
            <div className="w-14 h-14 bg-primary bg-opacity-10 rounded-full mx-auto flex items-center justify-center">
              <RotateCcw className="text-primary" size={26} strokeWidth={1.75} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                {dailyLimit.title}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">{dailyLimit.message}</p>
            </div>
            <div className="bg-background rounded-xl p-3 text-xs text-text-tertiary leading-relaxed">
              방금 적으신 기록은 그대로 보관돼요. 내일 다시 들어와 분석을 이어갈 수 있어요.
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-primary text-primary-fg font-semibold py-3 px-4 rounded-xl"
              >
                홈으로
              </button>
              <Link
                href="/safety/resources"
                className="flex-1 bg-surface border border-primary text-primary font-semibold py-3 px-4 rounded-xl text-center"
              >
                안전 자원 보기
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !logData) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-lg md:text-xl font-bold text-text-primary">
            잠깐, 분석에 문제가 생겼어요
          </h2>
          <p className="text-text-secondary">
            {error || '다시 시도하거나 홈으로 돌아가볼까요?'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={retryAnalysis}
              className="bg-surface border border-primary text-primary font-semibold py-3 px-6 rounded-xl"
            >
              다시 시도할게요
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-primary text-primary-fg font-semibold py-3 px-6 rounded-xl"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (safetyLevel) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <SafetyNotice level={safetyLevel} onOverride={handleSafetyOverride} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="분석 결과" backHref="/dashboard" />
      <Top
        title="분석이 완료됐어요"
        sub={
          distortions.length > 1
            ? `${distortions.length}개 왜곡이 동시에 작동하고 있어요.`
            : distortions.length === 1
              ? '한 가지 왜곡 패턴이 보여요.'
              : '뚜렷한 왜곡 패턴은 보이지 않아요.'
        }
      />
      <div className="mx-auto w-full max-w-lg space-y-4 px-5 pb-16">
        {/* Phase 1.2: 트리거 재방문 배너 — 같은 카테고리 × 같은 dominant 왜곡 60일 내 매칭 */}
        {revisit && (
          <Link
            href={`/analyze/${revisit.logId}`}
            className="block bg-primary/5 border border-primary/20 rounded-2xl p-4 hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-start gap-3">
              <RotateCcw className="text-primary mt-0.5 shrink-0" size={20} strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  {revisit.daysAgo}일 전에도 비슷한 패턴이 있었어요
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {TriggerCategoryKorean[revisit.category]} · {DistortionTypeKorean[revisit.distortionType]}
                </p>
                <p className="text-xs text-text-secondary mt-1.5 line-clamp-1">
                  &ldquo;{revisit.triggerSnippet}&rdquo;
                </p>
                <p className="text-xs font-semibold text-primary mt-1.5">
                  그때 분석 보기 →
                </p>
              </div>
            </div>
          </Link>
        )}

        <div className="rounded-card border border-background-tertiary bg-surface p-5">
          <p className="mb-1.5 text-xs text-text-secondary">어떤 일이 있었나요</p>
          <p className="mb-4 text-text-primary">{logData?.trigger}</p>
          <Badge tone="neutral">기록한 생각</Badge>
          <p className="mt-3 leading-relaxed text-text-primary">
            {renderThoughtWithHighlights(logData?.thought ?? '', distortions)}
          </p>
        </div>

        <div className="rounded-card border border-background-tertiary bg-surface p-5">
          <h2 className="text-lg font-bold text-text-primary mb-4 tracking-tight">이론 기반 해석</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-sm md:text-base">
            <div className="bg-background-secondary rounded-xl p-4">
              <p className="text-text-secondary mb-1 flex items-center">
                현재 프레임
                <InfoSheet
                  title="현재 프레임이란?"
                  body="지금 이 상황을 '잃는 것'으로 보고 있는지, '얻는 것'으로 보고 있는지를 나타내요. 손실 프레임일 때 우리는 실제보다 훨씬 더 고통스럽게 느끼는 경향이 있어요."
                />
              </p>
              <p className="font-semibold text-text-primary">
                {theoryMeta.frameType === 'loss'
                  ? '손실 프레임'
                  : theoryMeta.frameType === 'gain'
                    ? '이득 프레임'
                    : '혼합 프레임'}
              </p>
            </div>
            <div className="bg-background-secondary rounded-xl p-4">
              <p className="text-text-secondary mb-1 flex items-center">
                추정 확률
                <InfoSheet
                  title="추정 확률이란?"
                  body="내가 두려워하는 일이 실제로 일어날 가능성을 AI가 추정한 값이에요. 우리는 보통 나쁜 일이 일어날 확률을 실제보다 훨씬 높게 느끼는 경향이 있어요."
                />
              </p>
              <p className="font-semibold text-text-primary">
                {theoryMeta.probabilityEstimate !== null
                  ? `${theoryMeta.probabilityEstimate}%`
                  : '추정치 없음'}
              </p>
            </div>
            <div className="bg-background-secondary rounded-xl p-4">
              <p className="text-text-secondary mb-1 flex items-center">
                준거점
                <InfoSheet
                  title="준거점이란?"
                  body="내가 '기준'으로 삼고 있는 상태예요. 예를 들어 '원래대로라면 칭찬받았어야 해'라는 생각이 있을 때, 그 '원래 상태'가 준거점이에요. 준거점에서 멀어질수록 더 고통스럽게 느껴져요."
                />
              </p>
              <p className="font-semibold text-text-primary">{theoryMeta.referencePoint}</p>
            </div>
            <div className="bg-background-secondary rounded-xl p-4">
              <p className="text-text-secondary mb-1 flex items-center">
                손실 민감도
                <InfoSheet
                  title="손실 민감도란?"
                  body="같은 크기의 이득과 손실 중 손실을 얼마나 더 크게 느끼는지를 나타내요. 수치가 높을수록 잃는 것에 더 민감하게 반응하고 있다는 신호예요."
                />
              </p>
              <p className="font-semibold text-text-primary">
                {(theoryMeta.lossAversionSignal * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-background-secondary rounded-xl p-4">
              <p className="text-text-secondary mb-1 flex items-center">
                반추 경향
                <InfoSheet
                  title="반추 경향이란?"
                  body="특정 생각에 마음이 고착되어 같은 생각이 계속 맴도는 상태예요. 수치가 높을수록 이 기록에서 한 가지 생각을 반복해서 되새기는 패턴이 보여요."
                />
              </p>
              <p className="font-semibold text-text-primary">
                {(theoryMeta.casSignal.rumination * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-background-secondary rounded-xl p-4">
              <p className="text-text-secondary mb-1 flex items-center">
                걱정 경향
                <InfoSheet
                  title="걱정 경향이란?"
                  body="아직 일어나지 않은 미래의 부정적인 결과를 미리 떠올리며 불안해하는 상태예요. 수치가 높을수록 '앞으로 어떻게 될까'에 대한 불안이 크게 작용하고 있어요."
                />
              </p>
              <p className="font-semibold text-text-primary">
                {(theoryMeta.casSignal.worry * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs md:text-sm text-text-secondary">한 번 더 따져보기. 핵심 질문</p>
            <p className="text-sm text-text-primary">{theoryMeta.system2QuestionSeed}</p>
            <p className="text-xs md:text-sm text-text-secondary">탈중심화 안내</p>
            <p className="text-sm text-text-primary">{theoryMeta.decenteringPrompt}</p>
          </div>
        </div>

        {/* 종단 패턴 카드 — 같은 카테고리·우세 왜곡 누적 surface (P0-1) */}
        {longitudinal && longitudinal.occurrenceCount >= 2 && triggerCategory && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 shadow-card">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              누적 패턴
            </p>
            <p className="text-sm text-text-primary font-medium">
              이 패턴은 지난 60일 <span className="font-bold text-primary">{longitudinal.occurrenceCount}번째</span>
              {' · '}
              {TriggerCategoryKorean[triggerCategory]} × {DistortionTypeKorean[getDominantDistortion(distortions.map((d) => ({ type: d.type, intensity: d.intensity }))) ?? distortions[0]?.type] ?? ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
              {longitudinal.recentMonthCount > 0 && (
                <span>지난 30일: <span className="font-medium text-text-primary">{longitudinal.recentMonthCount}회</span></span>
              )}
              {longitudinal.lastOccurrenceDaysAgo !== null && (
                <span>직전 발생: <span className="font-medium text-text-primary">{longitudinal.lastOccurrenceDaysAgo === 0 ? '오늘' : `${longitudinal.lastOccurrenceDaysAgo}일 전`}</span></span>
              )}
              {longitudinal.averageIntensity !== null && (
                <span>평균 강도: <span className="font-medium text-text-primary">{(longitudinal.averageIntensity * 100).toFixed(0)}%</span></span>
              )}
              {longitudinal.totalCategoryCount > longitudinal.occurrenceCount && (
                <span>{TriggerCategoryKorean[triggerCategory]} 전체: <span className="font-medium text-text-primary">{longitudinal.totalCategoryCount}회</span></span>
              )}
            </div>
          </div>
        )}

        <div className="rounded-card border border-background-tertiary bg-surface p-5">
          <h2 className="text-lg font-bold text-text-primary mb-4 tracking-tight">발견된 생각의 패턴</h2>
          {distortions.length === 0 ? (
            <p className="text-text-secondary">이번 기록에서는 뚜렷한 왜곡 패턴이 보이지 않아요.</p>
          ) : (
            <div className="space-y-3">
              {/* 복합 왜곡 헤드라인 (P0-2) — 2개 이상 동시 작동 시만 노출 */}
              {distortions.length > 1 && (
                <div className="bg-background-secondary/60 border-l-2 border-primary rounded-r-md px-3 py-2 mb-1">
                  <p className="text-xs md:text-sm text-text-primary">
                    <span className="font-bold text-primary">{distortions.length}개 왜곡이 동시 작동</span> ·
                    {' '}우세{' '}
                    <span className="font-medium">{DistortionTypeKorean[distortions[0].type]}</span>
                    {distortions.length > 1 && (
                      <span className="text-text-secondary">
                        {' '}+ 보조 {distortions.slice(1).map((d) => DistortionTypeKorean[d.type]).join(' · ')}
                      </span>
                    )}
                  </p>
                </div>
              )}
              {distortions.map((item, index) => (
                <div key={`${item.type}-${index}`} className="bg-surface border border-background-tertiary/80 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-text-primary">
                        {DistortionTypeKorean[item.type]}
                      </p>
                      <Link
                        href={`/manual#${DistortionManualAnchor[item.type]}`}
                        aria-label={`${DistortionTypeKorean[item.type]} 매뉴얼 보기`}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-background-tertiary text-[10px] text-text-secondary hover:bg-primary hover:text-primary-fg hover:border-primary transition-colors"
                      >
                        ?
                      </Link>
                    </div>
                    <span className="text-xs md:text-sm text-primary">
                      강도 {(item.intensity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-background-secondary rounded-full mb-2 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.max(5, item.intensity * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs md:text-sm text-text-secondary">{item.segment}</p>
                  {item.rationale && (
                    <p className="text-[10px] md:text-xs text-text-secondary mt-2">
                      판단 근거: {item.rationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-card border border-background-tertiary bg-surface p-5">
          <h2 className="text-lg font-bold text-text-primary mb-4 tracking-tight">생각을 점검하는 질문</h2>
          {questions.length === 0 ? (
            <p className="text-text-secondary">질문을 만들지 못했어요. 다시 시도해주세요.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs md:text-sm">
                <span className="text-text-secondary">
                  질문 {currentQuestion + 1} / {questions.length}
                </span>
                <span className="text-primary font-medium">
                  구체적인 근거를 담아 적어주세요
                </span>
              </div>

              <div className="bg-surface border border-background-tertiary rounded-xl p-4">
                <p className="text-text-primary font-medium mb-3">
                  {currentQuestion + 1}. {questions[currentQuestion]}
                </p>
                <textarea
                  value={answers[currentQuestion] ?? ''}
                  onChange={(event) => handleAnswerChange(event.target.value)}
                  placeholder="예: 최악의 경우는 30% 정도라고 생각해요. 근거는 ..."
                  aria-label={`질문 ${currentQuestion + 1}에 대한 답변`}
                  className="w-full h-28 p-3 border border-background-tertiary rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={savingAnswers}
                />
              </div>

              {saveError && (
                <div className="bg-danger bg-opacity-10 border border-danger rounded-xl p-3">
                  <p className="text-xs md:text-sm text-danger">{saveError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={goPrevQuestion}
                  disabled={savingAnswers || currentQuestion === 0}
                  className="flex-1 bg-surface border border-background-tertiary text-text-primary font-semibold min-h-[44px] h-auto py-3 px-3 rounded-xl text-sm leading-snug disabled:opacity-50"
                >
                  이전 질문
                </button>

                {currentQuestion < questions.length - 1 ? (
                  <button
                    onClick={goNextQuestion}
                    disabled={savingAnswers}
                    className="flex-1 bg-primary text-primary-fg font-semibold min-h-[44px] h-auto py-3 px-3 rounded-xl text-sm leading-snug disabled:opacity-50"
                  >
                    다음 질문
                  </button>
                ) : (
                  <button
                    onClick={handleSaveAnswers}
                    disabled={savingAnswers}
                    className="flex-1 bg-primary text-primary-fg font-semibold min-h-[44px] h-auto py-3 px-3 rounded-xl text-sm leading-snug text-center whitespace-normal disabled:opacity-50"
                  >
                    {savingAnswers ? '저장 중...' : '저장 후 시각화 보기'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-primary text-primary-fg font-semibold min-h-[44px] py-3 px-6 rounded-2xl text-sm"
            >
              대시보드로 돌아가기
            </button>
            <button
              onClick={() => router.push(`/visualize/${params.id}`)}
              className="w-full bg-surface border border-background-tertiary text-text-secondary font-medium min-h-[44px] py-3 px-6 rounded-2xl text-sm"
            >
              답변 없이 시각화 보기
            </button>
          </div>
          <p className="text-xs text-text-tertiary">답변은 나중에 이 페이지로 돌아와 작성할 수 있습니다</p>
        </div>
      </div>
    </main>
  );
}
