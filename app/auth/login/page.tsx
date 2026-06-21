'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { evaluateDeletionState, purgeExpiredAccount } from '@/lib/auth/account-deletion';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const deletedFlag = searchParams.get('deleted');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus('로그인 요청을 전송 중입니다...');

    try {
      const formData = new FormData(e.currentTarget);
      const email = String(formData.get('email') ?? '').trim();
      const password = String(formData.get('password') ?? '');

      if (!email || !password) {
        setError('이메일과 비밀번호를 모두 입력해주세요.');
        setStatus(null);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session && data.user) {
        const action = evaluateDeletionState(data.user);

        if (action.kind === 'expired') {
          setStatus('탈퇴 예약 기간이 경과하여 계정을 영구 삭제합니다...');
          await purgeExpiredAccount();
          router.replace('/auth/login?deleted=expired');
          router.refresh();
          return;
        }

        if (action.kind === 'recover') {
          router.replace('/account/recover');
          router.refresh();
          return;
        }

        setStatus('로그인 성공! 대시보드로 이동합니다...');
        router.replace('/dashboard');
        router.refresh();
      } else {
        setError('로그인 세션을 생성하지 못했습니다. 다시 시도해주세요.');
        setStatus(null);
      }
    } catch (err: any) {
      console.error('로그인 실패:', err);
      setError(err.message || '로그인에 실패했습니다.');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-primary tracking-wide">BlueBird</p>
          <h1 className="text-2xl font-bold text-text-primary">로그인</h1>
        </div>

        {/* 탈퇴 처리 안내 */}
        {deletedFlag === 'expired' && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 space-y-1.5">
            <p className="text-sm font-semibold text-danger">계정이 영구 삭제되었습니다</p>
            <p className="text-xs text-danger leading-relaxed">
              30일 유예 기간이 경과하여 모든 데이터가 삭제되었습니다. 다시 시작하시려면 회원가입을
              해주세요.
            </p>
          </div>
        )}

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            {/* 이메일 입력 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-background-tertiary bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border border-background-tertiary bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-danger bg-opacity-10 border border-danger rounded-xl p-4">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
          {status && (
            <div className="bg-primary bg-opacity-10 border border-primary rounded-xl p-4">
              <p className="text-sm text-primary">{status}</p>
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-fg font-semibold min-h-[44px] py-4 px-6 rounded-2xl touch-manipulation active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 회원가입 링크 */}
        <div className="text-center space-y-4">
          <p className="text-sm text-text-secondary">
            계정이 없으신가요?{' '}
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-primary font-semibold hover:underline"
            >
              회원가입
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
