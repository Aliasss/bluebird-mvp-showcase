'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { SERVICE_CONTACT_EMAIL, buildMailto } from '@/lib/copy/contact';

// 폐쇄 베타 승인 대기 안내 페이지 — 2026-05-18 (Migration 19 + middleware 정합).
// 미승인 사용자는 보호 경로 진입 시 root middleware 에 의해 이 페이지로 리다이렉트.

export default function WaitlistPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary tracking-tight">
            BlueBird
          </Link>
          <span className="text-xs text-text-tertiary">승인 대기</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <section className="bg-surface border border-warning rounded-2xl p-6 sm:p-8 space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-warning">
            Closed Beta
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            현재는 테스트 기간으로<br />
            가입 승인된 분들에 한해서만 접근이 가능합니다
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            가입과 이메일 인증은 정상적으로 완료되었습니다.
            <br />
            서비스 이용은 에반젤리스트(MVP 체험자)로 선발된 분께만 안내드립니다.
          </p>
          <p className="text-xs text-text-tertiary leading-relaxed">
            체험 제품이 결정 기록 중심으로 넓어졌습니다.
          </p>
          {!loading && email && (
            <p className="text-xs text-text-tertiary">
              로그인 계정: <span className="font-semibold text-text-primary">{email}</span>
            </p>
          )}
        </section>

        <section className="bg-surface border border-background-tertiary rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-text-primary">다음 단계 안내</h2>
          <ol className="text-sm text-text-secondary space-y-2 list-decimal pl-5">
            <li>
              아직 응모하지 않으셨다면{' '}
              <Link href="/apply" className="text-primary underline">
                /apply 응모 폼
              </Link>
              을 작성해주세요. 약 5~8분 소요.
            </li>
            <li>
              운영자 검토 후 선발 결과를 응모 시 입력하신 이메일로 안내드립니다.
            </li>
            <li>
              선발되시면 본 계정으로 즉시 서비스 이용이 가능합니다.
              <span className="text-text-tertiary"> (다시 가입하지 않으셔도 돼요)</span>
            </li>
          </ol>
        </section>

        <section className="bg-surface border border-background-tertiary rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-text-primary">문의·기타</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            궁금한 점이 있으시면 운영자에게 직접 메일 주세요.
          </p>
          <a
            href={buildMailto('[BlueBird] 승인 대기 관련 문의')}
            className="inline-block text-sm text-primary underline"
          >
            {SERVICE_CONTACT_EMAIL}
          </a>
          <div className="pt-3 border-t border-background-tertiary flex flex-wrap gap-3">
            <Link
              href="/apply"
              className="px-4 py-2 text-sm font-semibold text-primary-fg bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            >
              에반젤리스트 응모하러 가기 →
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-text-secondary border border-background-tertiary rounded-lg hover:bg-background-secondary transition-colors"
            >
              로그아웃
            </button>
          </div>
        </section>

        <section className="text-xs text-text-tertiary pt-4 border-t border-background-tertiary space-y-2">
          <p>
            ※ 본 계정·답변 데이터는 개인정보 보호법(PIPA)에 따라 처리됩니다. 자세한 사항은{' '}
            <Link href="/privacy" className="hover:text-text-secondary underline-offset-2 hover:underline">
              개인정보 처리방침
            </Link>
            을 확인하세요.
          </p>
          <p>
            위기 상황 시: 자살예방상담전화 <strong>1393</strong> · 정신건강위기상담{' '}
            <strong>1577-0199</strong>
          </p>
        </section>
      </div>
    </main>
  );
}
