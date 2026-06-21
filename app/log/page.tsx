'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import PageHeader from '@/components/ui/PageHeader';
import Top from '@/components/ui/Top';
import Badge from '@/components/ui/Badge';
import BottomCTA from '@/components/ui/BottomCTA';

type Step = 'trigger' | 'thought' | 'pain';

// NRS-11 (Hawker et al., 2011) — 0=전혀 없음, 10=참을 수 없는 통증.
function painBandLabel(score: number): string {
  if (score <= 2) return '거의 없음';
  if (score <= 4) return '약간';
  if (score <= 6) return '보통';
  if (score <= 8) return '심함';
  return '극심';
}

const STEP_INDEX: Record<Step, number> = { trigger: 1, thought: 2, pain: 3 };

const TITLES: Record<Step, { title: string; sub: string }> = {
  trigger: {
    title: '무슨 일이 있었나요?',
    sub: '어떤 일이 있었는지 적어주세요. 구체적일수록 더 정확히 분석돼요.',
  },
  thought: {
    title: '그때 어떤 생각이 들었나요?',
    sub: '그 순간 자동으로 떠오른 생각을 그대로 적어주세요.',
  },
  pain: {
    title: '지금 얼마나 힘든가요?',
    sub: '0(전혀 없음)부터 10(참을 수 없는)까지. 재평가 때 처음과의 차이로 써요.',
  },
};

const FIELD_CLASS =
  'w-full min-h-[130px] resize-none border-none bg-transparent text-[19px] font-medium leading-[1.5] tracking-snug text-text-primary outline-none placeholder:text-text-tertiary';

export default function LogPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('trigger');
  const [trigger, setTrigger] = useState('');
  const [thought, setThought] = useState('');
  const [painScore, setPainScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 입력 비용 측정 — 페이지 진입 시점 기록 (2026-05-19 deep-dive 액션 ①).
  // log_view → logs.created_at 차이 = 입력에 들인 시간. best-effort.
  useEffect(() => {
    void fetch('/api/analytics/log-view', { method: 'POST' }).catch(() => {});
  }, []);

  const handleNext = () => {
    setError(null);
    if (step === 'trigger') setStep('thought');
    else if (step === 'thought') setStep('pain');
  };

  const handleSubmit = async (selectedScore: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('logs')
        .insert({
          user_id: user.id,
          trigger: trigger.trim(),
          thought: thought.trim(),
          ...(selectedScore !== null ? { pain_score: selectedScore } : {}),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (data) router.push(`/analyze/${data.id}`);
    } catch (err: any) {
      console.error('로그 저장 실패:', err);
      setError(err.message || '저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'pain') {
      setStep('thought');
      setError(null);
    } else if (step === 'thought') {
      setStep('trigger');
      setError(null);
    } else {
      router.push('/dashboard');
    }
  };

  const t = TITLES[step];
  const primaryDisabled =
    loading ||
    (step === 'trigger' && trigger.trim().length < 5) ||
    (step === 'thought' && thought.trim().length < 10) ||
    (step === 'pain' && painScore === null);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <PageHeader title="생각 기록" onBack={handleBack} step={{ current: STEP_INDEX[step], total: 3 }} />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <Top title={t.title} sub={t.sub} />

        <div className="flex-1 px-5 pb-44">
          {step === 'trigger' && (
            <div className="rounded-card border border-background-tertiary bg-surface p-5">
              <textarea
                autoFocus
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="예: 팀장이 내 보고서에 피드백을 주지 않았다"
                aria-label="오늘 있었던 사건을 입력하세요"
                className={FIELD_CLASS}
                disabled={loading}
              />
            </div>
          )}

          {step === 'thought' && (
            <>
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="neutral">트리거</Badge>
                <span className="truncate text-[13px] text-text-secondary">{trigger}</span>
              </div>
              <div className="rounded-card border border-background-tertiary bg-surface p-5">
                <textarea
                  autoFocus
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  placeholder="예: 내가 일을 못하니까 무시하는 거겠지"
                  aria-label="그 순간 떠오른 생각을 입력하세요"
                  className={FIELD_CLASS}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {step === 'pain' && (
            <div className="rounded-card border border-background-tertiary bg-surface p-6">
              <div className="text-center">
                <p className="text-6xl font-extrabold leading-none tracking-tighter text-primary tabular-nums">
                  {painScore ?? '–'}
                </p>
                <p className="mt-2 text-[15px] font-semibold text-text-secondary">
                  {painScore !== null ? painBandLabel(painScore) : '값을 선택하세요'}
                </p>
              </div>
              <div className="mt-5 grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPainScore(n)}
                    aria-pressed={painScore === n}
                    aria-label={`고통 ${n}점`}
                    className={`aspect-square rounded-lg border text-sm font-semibold transition ${
                      painScore === n
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-background-tertiary bg-surface text-text-primary hover:border-primary/50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="mt-2.5 flex justify-between text-xs text-text-tertiary">
                <span>0 · 전혀 없음</span>
                <span>10 · 참을 수 없는</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-danger bg-danger/10 p-4">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
        </div>
      </div>

      <BottomCTA>
        <button
          onClick={() => (step === 'pain' ? handleSubmit(painScore) : handleNext())}
          disabled={primaryDisabled}
          className="w-full rounded-2xl bg-primary px-6 py-[17px] text-base font-semibold text-primary-fg transition-transform hover:bg-primary-dark active:scale-95 touch-manipulation disabled:opacity-50"
        >
          {step === 'pain' ? (loading ? '저장하고 있어요...' : '분석 시작하기') : '다음'}
        </button>
        {step === 'pain' && (
          <button
            onClick={() => handleSubmit(null)}
            disabled={loading}
            className="mt-2 w-full py-2 text-sm text-text-tertiary"
          >
            건너뛰기
          </button>
        )}
      </BottomCTA>
    </main>
  );
}
