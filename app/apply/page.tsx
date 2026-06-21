import type { Metadata } from 'next';
import Link from 'next/link';
import ApplyForm from '@/components/apply/ApplyForm';
import { SERVICE_CONTACT_EMAIL, buildMailto } from '@/lib/copy/contact';

// 폐쇄 베타 응모 페이지 — 2026-05-17.
// 사용자 결정: 비선정자는 서비스 진입 자체 차단 → /me 통합 폼 제거 + 외부 접근 가능한 /apply 페이지 신설.
// Migration 18: anon INSERT 허용 + auth.users 가입 화이트리스트 트리거.

export const metadata: Metadata = {
  title: '에반젤리스트(MVP 체험자) 응모 | BlueBird',
  description:
    '불안할 때 내린 결정이 맞았는지 결과로 확인하고, 그 결정을 흔드는 인지 왜곡까지 함께 짚어보는 BlueBird MVP를 2주간 사용하고 서면 리포트로 통찰을 나눠주실 30명을 모집합니다. 단순 베타 테스터가 아니라 서비스 방향을 함께 정의하는 공동 설계자.',
};

export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary tracking-tight">
            BlueBird
          </Link>
          <span className="text-xs text-text-tertiary">폐쇄 베타 응모</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Closed Beta</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            에반젤리스트(MVP 체험자) 모집
          </h1>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            BlueBird MVP를 2주간 사용하고 서면 리포트로 통찰을 공유해주실 30명을 모집합니다.
            단순 베타 테스터가 아니라 서비스 방향을 함께 정의하는 공동 설계자입니다.
          </p>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            요즘 그만둘까·말할까·정리할까 같은 결정 앞에서 마음이 오락가락한 적 있다면, 잘 맞습니다. 불안할 때 내린 결정이 맞았는지 결과로 확인하고, 그 결정을 흔드는 인지 왜곡(생각 습관)까지 함께 짚어보는 도구거든요. 다만 되돌릴 수 없는 큰 결정은 일부러 점수 매기지 않아요.
          </p>
        </section>

        <section className="bg-surface border border-background-tertiary rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-text-primary">진행 흐름</h2>
          <ol className="text-sm text-text-secondary space-y-2 list-decimal pl-5">
            <li>아래 폼 작성 — 5~8분 (Q1~Q5 + 연령 + 동의 3개)</li>
            <li>운영자 검토 — 선발/미선발 결과를 입력하신 이메일로 안내</li>
            <li>
              <strong>선발자</strong>는 안내 메일 수신 후{' '}
              <strong>본인이 직접 BlueBird 가입</strong> (응모 시 입력한 이메일과{' '}
              <strong>반드시 동일하게</strong>) → 이메일 인증 → 2주 사용 + 서면 리포트
            </li>
          </ol>
          <p className="text-xs text-text-tertiary leading-snug">
            ※ 현재 BlueBird MVP는 <strong>폐쇄 베타</strong>로 운영됩니다. 응모 결과는 입력하신 이메일로만 안내드리며,
            선발 안내 메일을 받기 전에는 별도로 가입하셔도 서비스 진입이 차단됩니다.
            <br />
            가입 시 응모 이메일과 다른 이메일을 사용하면 사전 등록된 이메일과 달라 입장이 막힐 수 있어요.
          </p>
        </section>

        <ApplyForm />

        <section className="text-xs text-text-tertiary space-y-2 pt-4 border-t border-background-tertiary">
          <p>
            ※ 본 응모에서 <strong>직무·소속·연봉·진단명은 수집하지 않습니다.</strong>
          </p>
          <p>
            ※ 응답·서면 리포트는 분석 외 사용하지 않으며, 30일 후 원본 데이터를 폐기하고 코딩 결과만 보존합니다.
          </p>
          <p>
            위기 상황 시: 자살예방상담전화 <strong>1393</strong> · 정신건강위기상담{' '}
            <strong>1577-0199</strong>
          </p>
          <p>
            응모 관련 문의:{' '}
            <a
              href={buildMailto('[BlueBird] 에반젤리스트 응모 문의')}
              className="text-primary underline"
            >
              {SERVICE_CONTACT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
