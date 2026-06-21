'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Top from '@/components/ui/Top';
import Badge from '@/components/ui/Badge';
import BottomCTA from '@/components/ui/BottomCTA';
import { supabase } from '@/lib/supabase/client';

type Step = 'situation' | 'action';

const FIELD_CLASS =
  'w-full min-h-[150px] resize-none border-none bg-transparent text-[19px] font-medium leading-[1.5] tracking-snug text-text-primary outline-none placeholder:text-text-tertiary';

export default function SuccessLogPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('situation');
  const [situation, setSituation] = useState('');
  const [system2Action, setSystem2Action] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    const checkTodayLimit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      const KST_OFFSET = 9 * 60 * 60 * 1000;
      const kstNow = new Date(Date.now() + KST_OFFSET);
      const todayStart = new Date(
        Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - KST_OFFSET
      ).toISOString();

      const { data } = await supabase
        .from('logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('log_type', 'success')
        .gte('created_at', todayStart)
        .maybeSingle();

      setAlreadyDone(!!data);
      setChecking(false);
    };
    checkTodayLimit();
  }, [router]);

  const handleSituationNext = () => {
    if (situation.trim().length < 5) {
      setError('상황은 최소 5자 이상 입력해주세요.');
      return;
    }
    setError(null);
    setStep('action');
  };

  const handleSubmit = async () => {
    if (system2Action.trim().length < 10) {
      setError('대처 방법은 최소 10자 이상 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/success-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: situation.trim(), system2Action: system2Action.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) {
        if (res.status === 409 && payload.alreadyDone) {
          router.push('/dashboard');
          return;
        }
        throw new Error(payload.error || '저장에 실패했습니다.');
      }
      sessionStorage.setItem('justSuccessLogged', '1');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'action') {
      setStep('situation');
      setError(null);
    } else {
      router.push('/dashboard');
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </main>
    );
  }

  if (alreadyDone) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader title="성공 순간 기록" onBack={() => router.push('/dashboard')} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary mb-2">오늘은 이미 기록했어요</h1>
          <p className="text-sm text-text-secondary mb-8">
            성공 순간 기록은 하루 1회입니다.<br />내일 또 이성이 이기는 순간을 기록해보세요.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-primary text-primary-fg text-base font-semibold py-[17px] px-8 rounded-2xl touch-manipulation active:scale-95 transition-transform hover:bg-primary-dark"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <PageHeader
        title="성공 순간 기록"
        onBack={handleBack}
        step={{ current: step === 'situation' ? 1 : 2, total: 2 }}
      />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {step === 'situation' ? (
          <>
            <Top
              title="어떤 상황이었나요?"
              sub="왜곡된 사고로 빠질 수 있었던 상황을 설명해주세요."
            />
            <div className="flex-1 px-5 pb-44">
              <div className="rounded-card border border-background-tertiary bg-surface p-5">
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="예: 발표에서 말이 조금 꼬였을 때"
                  aria-label="상황을 입력하세요"
                  className={FIELD_CLASS}
                  disabled={loading}
                  autoFocus
                />
              </div>
              {error && (
                <div className="mt-4 rounded-xl border border-danger bg-danger/10 p-4">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Top
              title="어떻게 이성적으로 대처했나요?"
              sub="이성적으로 판단해 왜곡을 피한 방법을 적어주세요."
            />
            <div className="flex-1 px-5 pb-44">
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="neutral">상황</Badge>
                <span className="truncate text-[13px] text-text-secondary">{situation}</span>
              </div>
              <div className="rounded-card border border-background-tertiary bg-surface p-5">
                <textarea
                  value={system2Action}
                  onChange={(e) => setSystem2Action(e.target.value)}
                  placeholder="예: '한 번의 실수가 전체를 결정하지 않는다'고 스스로 상기했다"
                  aria-label="대처 방법을 입력하세요"
                  className={FIELD_CLASS}
                  disabled={loading}
                  autoFocus
                />
              </div>
              {error && (
                <div className="mt-4 rounded-xl border border-danger bg-danger/10 p-4">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomCTA>
        {step === 'situation' ? (
          <button
            onClick={handleSituationNext}
            disabled={situation.trim().length < 5}
            className="w-full rounded-2xl bg-primary px-6 py-[17px] text-base font-semibold text-primary-fg transition-transform hover:bg-primary-dark active:scale-95 touch-manipulation disabled:opacity-50"
          >
            다음
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || system2Action.trim().length < 10}
            className="w-full rounded-2xl bg-success px-6 py-[17px] text-base font-semibold text-primary-fg transition-transform active:scale-95 touch-manipulation disabled:opacity-50"
          >
            {loading ? '저장 중...' : '성공 순간 저장하기 (+15점)'}
          </button>
        )}
      </BottomCTA>
    </main>
  );
}
