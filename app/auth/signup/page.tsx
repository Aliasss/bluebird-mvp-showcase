'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@/lib/copy/legal-version';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  const allRequiredAgreed = agreeAge && agreeTerms && agreePrivacy;
  const allAgreed = agreeAge && agreeTerms && agreePrivacy && agreeMarketing;

  const toggleAll = () => {
    const next = !allAgreed;
    setAgreeAge(next);
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setAgreeMarketing(next);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!agreeAge) {
      setError('만 14세 이상만 가입할 수 있습니다.');
      setLoading(false);
      return;
    }

    if (!agreeTerms || !agreePrivacy) {
      setError('이용약관 및 개인정보 처리방침에 동의해주세요.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            age_confirmed_at: new Date().toISOString(),
            terms_agreed_at: new Date().toISOString(),
            privacy_agreed_at: new Date().toISOString(),
            marketing_agreed: agreeMarketing,
            marketing_agreed_at: agreeMarketing ? new Date().toISOString() : null,
            terms_version: CURRENT_TERMS_VERSION,
            privacy_version: CURRENT_PRIVACY_VERSION,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        if (data.user.identities?.length === 0) {
          setError('이미 등록된 이메일입니다.');
        } else {
          setSuccess(true);
          if (data.session) {
            setTimeout(() => {
              router.push('/dashboard');
              router.refresh();
            }, 2000);
          } else {
            setNeedsEmailVerification(true);
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          {needsEmailVerification ? (
            <div className="bg-surface border border-background-tertiary rounded-2xl p-8 space-y-4">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">이메일을 확인해주세요</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                <span className="font-semibold text-text-primary">{email}</span>로<br />
                인증 링크를 보냈어요.<br />
                링크를 클릭하면 다음 안내를 받을 수 있어요.
              </p>
              <p className="text-xs text-text-tertiary">스팸 폴더도 확인해보세요</p>
              <p className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 leading-snug text-left">
                ※ 현재 BlueBird MVP는 <strong>폐쇄 베타</strong>로 운영 중입니다.
                이메일 인증 완료 후, 가입 승인된 분께만 서비스 이용이 가능합니다.
                미응모자는{' '}
                <Link href="/apply" className="underline">
                  /apply 응모
                </Link>
                를 진행해주세요.
              </p>
            </div>
          ) : (
            <div className="bg-success bg-opacity-10 border border-success rounded-2xl p-8 space-y-4">
              <div className="w-16 h-16 bg-success rounded-full mx-auto flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-text-primary">회원가입 완료!</h2>
              <p className="text-text-secondary">대시보드로 이동합니다...</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-primary tracking-wide">BlueBird</p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">회원가입</h1>
        </div>

        {/* 회원가입 폼 */}
        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-background-tertiary bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-background-tertiary bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="최소 6자 이상"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-background-tertiary bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="비밀번호 재입력"
                disabled={loading}
              />
            </div>
          </div>

          {/* 동의 영역 */}
          <div className="bg-surface border border-background-tertiary rounded-2xl p-5 space-y-4">
            <button
              type="button"
              onClick={toggleAll}
              className="w-full flex items-center gap-3 pb-3 border-b border-background-tertiary"
              disabled={loading}
            >
              <span
                className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                  allAgreed ? 'bg-primary border-primary' : 'bg-surface border-background-tertiary'
                }`}
              >
                {allAgreed && (
                  <svg className="w-3.5 h-3.5 text-primary-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-sm font-semibold text-text-primary">전체 동의</span>
            </button>

            <ul className="space-y-3">
              <li>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeAge}
                    onChange={(e) => setAgreeAge(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm text-text-secondary leading-snug">
                    <span className="text-primary font-medium">[필수]</span> 본인은 만 14세 이상입니다.
                  </span>
                </label>
              </li>
              <li>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm text-text-secondary leading-snug">
                    <span className="text-primary font-medium">[필수]</span> 이용약관에 동의합니다.{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-primary underline hover:no-underline"
                    >
                      보기
                    </Link>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm text-text-secondary leading-snug">
                    <span className="text-primary font-medium">[필수]</span> 개인정보 수집 및 이용에
                    동의합니다 (Google Gemini로 분석 텍스트 전송 포함).{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-primary underline hover:no-underline"
                    >
                      보기
                    </Link>
                  </span>
                </label>
              </li>
              <li>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeMarketing}
                    onChange={(e) => setAgreeMarketing(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm text-text-secondary leading-snug">
                    <span className="text-text-tertiary font-medium">[선택]</span> 서비스 업데이트·신규
                    기능 안내 이메일 수신에 동의합니다. 언제든 철회할 수 있어요.
                  </span>
                </label>
              </li>
            </ul>

            <p className="text-xs text-text-tertiary leading-relaxed pt-2 border-t border-background-tertiary">
              BlueBird는 의료 서비스가 아닙니다. 위기 상황에서는 1393 또는 1577-0199로 연락해주세요.{' '}
              <Link href="/disclaimer" target="_blank" className="text-primary underline">
                면책 안내
              </Link>
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-danger bg-opacity-10 border border-danger rounded-xl p-4">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* 회원가입 버튼 */}
          <button
            type="submit"
            disabled={loading || !allRequiredAgreed}
            className="w-full bg-primary text-primary-fg font-semibold min-h-[44px] py-4 px-6 rounded-2xl touch-manipulation active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        {/* 로그인 링크 */}
        <div className="text-center space-y-4">
          <p className="text-sm text-text-secondary">
            이미 계정이 있으신가요?{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="text-primary font-semibold hover:underline"
            >
              로그인
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
