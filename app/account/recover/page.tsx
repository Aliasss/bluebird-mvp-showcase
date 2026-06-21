'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Heart, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { evaluateDeletionState, purgeExpiredAccount } from '@/lib/auth/account-deletion';

export default function RecoverPage() {
  const router = useRouter();
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<'recover' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const action = evaluateDeletionState(user);

      if (action.kind === 'expired') {
        await purgeExpiredAccount();
        router.replace('/auth/login?deleted=expired');
        return;
      }

      if (action.kind === 'proceed') {
        router.replace('/dashboard');
        return;
      }

      setScheduledAt(action.scheduledAt);
      setLoading(false);
    };

    fetchUser();
  }, [router]);

  const daysLeft = scheduledAt
    ? Math.max(
        0,
        Math.ceil((new Date(scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null;

  const handleRecover = async () => {
    setActing('recover');
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('cancel_account_deletion');
      if (rpcError) throw rpcError;
      await supabase.auth.refreshSession();
      router.replace('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('복구 실패:', err);
      setError(err.message || '복구 처리에 실패했습니다.');
      setActing(null);
    }
  };

  const handleDeleteNow = async () => {
    if (!confirm('정말 지금 즉시 영구 삭제할까요? 되돌릴 수 없습니다.')) return;
    setActing('delete');
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('delete_my_account');
      if (rpcError) throw rpcError;
      await supabase.auth.signOut();
      router.replace('/');
      router.refresh();
    } catch (err: any) {
      console.error('즉시 삭제 실패:', err);
      setError(err.message || '삭제 처리에 실패했습니다.');
      setActing(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-card p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-warning/10 rounded-full mx-auto flex items-center justify-center">
            <Clock className="text-warning" size={26} strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            탈퇴 예약된 계정입니다
          </h1>
          {daysLeft !== null && scheduledAt && (
            <p className="text-sm text-text-secondary leading-relaxed">
              <strong className="text-text-primary">D-{daysLeft}</strong>
              {' · '}
              {new Date(scheduledAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {' '}에 영구 삭제될 예정입니다.
            </p>
          )}
        </div>

        <div className="bg-background rounded-xl p-4 space-y-1.5">
          <p className="text-xs text-text-secondary leading-relaxed">
            지금 복구하시면 모든 데이터가 그대로 유지됩니다. 그동안 작성하신 자동 사고 기록과 패턴
            리포트도 모두 살아있어요.
          </p>
        </div>

        {error && (
          <div className="bg-danger bg-opacity-10 border border-danger rounded-xl p-3">
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRecover}
            disabled={acting !== null}
            className="w-full bg-primary text-primary-fg font-semibold py-4 px-6 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Heart size={16} strokeWidth={2.25} />
            {acting === 'recover' ? '복구 중...' : '계정 복구하기'}
          </button>

          <button
            onClick={handleDeleteNow}
            disabled={acting !== null}
            className="w-full bg-surface border border-danger/30 text-danger font-medium py-3 px-6 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 size={14} strokeWidth={2} />
            {acting === 'delete' ? '삭제 중...' : '지금 즉시 영구 삭제'}
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace('/');
            }}
            disabled={acting !== null}
            className="w-full text-xs text-text-tertiary py-2 disabled:opacity-50"
          >
            나중에 결정하기 (로그아웃)
          </button>
        </div>
      </div>
    </main>
  );
}
