'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type DeletionMode = 'grace' | 'immediate';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<DeletionMode>('grace');
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{ scheduledAt: string | null } | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      if (mode === 'immediate') {
        const { error: rpcError } = await supabase.rpc('delete_my_account');
        if (rpcError) throw rpcError;
        await supabase.auth.signOut();
        setCompleted({ scheduledAt: null });
        setTimeout(() => {
          router.replace('/');
          router.refresh();
        }, 2500);
      } else {
        const { data, error: rpcError } = await supabase.rpc('schedule_account_deletion');
        if (rpcError) throw rpcError;
        await supabase.auth.signOut();
        setCompleted({ scheduledAt: data as string });
        setTimeout(() => {
          router.replace('/');
          router.refresh();
        }, 3500);
      }
    } catch (err: any) {
      console.error('계정 삭제 실패:', err);
      setError(err.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-card p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-danger/10 rounded-full mx-auto flex items-center justify-center">
            <Trash2 className="text-danger" size={26} strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            {completed.scheduledAt ? '탈퇴 예약이 접수되었습니다' : '계정이 영구 삭제되었습니다'}
          </h1>
          {completed.scheduledAt ? (
            <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
              <p>
                <strong className="text-text-primary">
                  {new Date(completed.scheduledAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </strong>
                {' '}이전까지는 다시 로그인하시면 복구할 수 있어요.
              </p>
              <p className="text-xs text-text-tertiary">
                이 기간 동안 데이터는 본인 외 누구도 접근할 수 없으며, 새로운 분석에는 사용되지
                않습니다.
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary leading-relaxed">
              모든 데이터가 영구 삭제되었습니다. 그동안 BlueBird를 사용해주셔서 감사합니다.
            </p>
          )}
          <p className="text-xs text-text-tertiary pt-2">홈으로 이동합니다...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5"
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={20} className="text-text-primary" />
          </button>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">회원 탈퇴</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-5">
        {/* 경고 */}
        <div className="bg-danger/10 border border-danger/30 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-danger flex-shrink-0" size={18} strokeWidth={1.75} />
            <h2 className="text-sm font-bold text-danger">탈퇴 전에 확인해주세요</h2>
          </div>
          <ul className="text-xs text-danger leading-relaxed list-disc pl-5 space-y-1">
            <li>지금까지 기록한 자동 사고·재평가·인사이트가 모두 사라집니다.</li>
            <li>패턴 리포트와 누적된 본인의 사용설명서도 함께 삭제됩니다.</li>
            <li>같은 이메일로 재가입은 가능하지만, 이전 데이터는 복구되지 않습니다.</li>
          </ul>
        </div>

        {step === 1 && (
          <>
            {/* 옵션 선택 */}
            <section className="space-y-3">
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide px-1">
                삭제 방식 선택
              </p>

              <button
                type="button"
                onClick={() => setMode('grace')}
                className={`w-full text-left bg-surface rounded-2xl p-5 border-2 transition-colors ${
                  mode === 'grace' ? 'border-primary' : 'border-background-tertiary'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      mode === 'grace' ? 'border-primary' : 'border-background-tertiary'
                    }`}
                  >
                    {mode === 'grace' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-primary" />
                      <h3 className="text-sm font-bold text-text-primary tracking-tight">
                        30일 후 영구 삭제 (권장)
                      </h3>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      30일간 유예 기간을 둡니다. 실수로 탈퇴를 요청한 경우 같은 이메일로 다시 로그인
                      하시면 복구할 수 있어요.
                    </p>
                    <p className="text-[11px] text-text-tertiary">
                      유예 기간 동안 데이터는 본인 외 누구도 접근할 수 없습니다.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('immediate')}
                className={`w-full text-left bg-surface rounded-2xl p-5 border-2 transition-colors ${
                  mode === 'immediate' ? 'border-danger' : 'border-background-tertiary'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      mode === 'immediate' ? 'border-danger' : 'border-background-tertiary'
                    }`}
                  >
                    {mode === 'immediate' && <div className="w-2.5 h-2.5 rounded-full bg-danger" />}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Trash2 size={14} className="text-danger" />
                      <h3 className="text-sm font-bold text-text-primary tracking-tight">
                        지금 즉시 영구 삭제
                      </h3>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      지금 이 순간 모든 데이터가 영구 삭제됩니다. 복구는 불가능합니다.
                    </p>
                  </div>
                </div>
              </button>
            </section>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.back()}
                className="flex-1 py-3 text-sm font-medium text-text-secondary border border-background-tertiary rounded-2xl"
              >
                취소
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 text-sm font-semibold text-white bg-danger rounded-2xl active:scale-95 transition-transform"
              >
                다음
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <section className="bg-surface rounded-2xl shadow-card p-5 space-y-4">
              <h2 className="text-base font-bold text-text-primary tracking-tight">
                {mode === 'immediate' ? '즉시 삭제 최종 확인' : '30일 후 삭제 최종 확인'}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {mode === 'immediate' ? (
                  <>
                    지금 이 순간{' '}
                    <strong className="text-danger">모든 데이터가 영구 삭제</strong>됩니다.
                    되돌릴 수 없습니다.
                  </>
                ) : (
                  <>
                    오늘부터 <strong className="text-text-primary">30일 후</strong>에 모든 데이터가
                    영구 삭제됩니다. 그 전에 다시 로그인하시면 복구할 수 있어요.
                  </>
                )}
              </p>

              <div className="space-y-2">
                <label htmlFor="confirm" className="block text-xs text-text-tertiary">
                  진행하시려면 아래에{' '}
                  <strong className="text-text-primary">탈퇴</strong>를 입력해주세요.
                </label>
                <input
                  id="confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-background-tertiary bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-danger focus:border-transparent"
                  placeholder="탈퇴"
                  autoComplete="off"
                />
              </div>

              {error && (
                <div className="bg-danger bg-opacity-10 border border-danger rounded-xl p-3">
                  <p className="text-xs text-danger">{error}</p>
                </div>
              )}
            </section>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setStep(1);
                  setConfirmText('');
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 py-3 text-sm font-medium text-text-secondary border border-background-tertiary rounded-2xl disabled:opacity-50"
              >
                이전
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || confirmText !== '탈퇴'}
                className="flex-1 py-3 text-sm font-semibold text-white bg-danger rounded-2xl active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading
                  ? '처리 중...'
                  : mode === 'immediate'
                  ? '영구 삭제'
                  : '탈퇴 예약'}
              </button>
            </div>
          </>
        )}

        <p className="text-center text-xs text-text-tertiary pt-4">
          <Link href="/privacy" className="underline hover:no-underline">
            데이터 처리 정책
          </Link>
        </p>
      </div>
    </main>
  );
}
