import Link from 'next/link';
import { SERVICE_CONTACT_EMAIL, buildMailto } from '@/lib/copy/contact';

/**
 * 에반젤리스트 완주자 혜택 안내 페이지.
 *
 * 톤 가드:
 *   - 정서·치유·동반 어휘 0
 *   - 의료기기 함의 0
 *   - 강한 단정 어휘 0 (영구·무조건·필수 류)
 *   - 완주 모델: 2주 사용 + 서면 회고 리포트 제출. 용어 "에반젤리스트"로 통일.
 */

export const metadata = {
  title: '에반젤리스트 완주자 혜택 안내 | BlueBird',
  description: 'BlueBird 에반젤리스트 과정을 완주하신 분께 제공하는 두 가지 서비스 혜택 안내.',
};

export default function BetaIncentivePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-[17px] font-extrabold text-primary tracking-tight">
            BlueBird
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* 타이틀 */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Beta Incentive
          </p>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            에반젤리스트(MVP 체험자) 완주자 혜택 안내
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            BlueBird는 불안할 때 내린 결정이 맞았는지 결과로 확인하는 도구입니다. 다만 되돌릴 수 없는 큰 결정은 일부러 점수 매기지 않아요. 베타 단계에서는 결제 인프라가 활성화되지 않았으며, 본 과정은 PMF(Product-Market Fit) 검증을 위해 진행됩니다.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            에반젤리스트 과정을 완주하신 분께 다음 두 가지 혜택을 제공합니다.
          </p>
        </section>

        {/* 혜택 1 */}
        <article className="bg-surface rounded-card border border-background-tertiary p-6 space-y-3">
          <h2 className="text-lg font-bold text-text-primary tracking-tight">
            혜택 1. 결제 활성화 후 6개월 무상 사용권
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            BlueBird 결제 인프라가 활성화되는 시점에 에반젤리스트 완주자에게 6개월간 무상 사용권을 제공합니다.
          </p>
        </article>

        {/* 혜택 2 */}
        <article className="bg-surface rounded-card border border-background-tertiary p-6 space-y-3">
          <h2 className="text-lg font-bold text-text-primary tracking-tight">
            혜택 2. 매뉴얼 v1.0 우선 제공
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            매뉴얼 v1.0은 60일 게이트(G2) 통과 후 출시되는 산출물입니다. 에반젤리스트 완주자에게 정식 출시 시점에 우선 제공됩니다.
          </p>
        </article>

        {/* 약속 무효 조건 */}
        <article className="bg-surface rounded-card border border-background-tertiary p-6 space-y-3">
          <h2 className="text-lg font-bold text-text-primary tracking-tight">
            약속 무효 조건
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            다음의 경우 본 혜택 약속은 효력을 잃습니다.
          </p>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-1.5 list-none pl-0">
            <li>(a) BlueBird 서비스 운영 중단</li>
            <li>(b) 운영자 결정에 의한 서비스 종료</li>
            <li>(c) 사용자의 약관 위반</li>
            <li>(d) 60일 게이트(G2) 미통과로 결제 인프라 미활성화</li>
          </ul>
        </article>

        {/* 완주의 정의 */}
        <article className="bg-surface rounded-card border border-background-tertiary p-6 space-y-3">
          <h2 className="text-lg font-bold text-text-primary tracking-tight">
            완주의 정의
          </h2>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-1.5 list-disc pl-5">
            <li>BlueBird MVP를 2주간 사용</li>
            <li>사용 후 서면 회고 리포트 작성·제출 (분량 강제 없음, 본인 페이스)</li>
          </ul>
        </article>

        {/* 안내 */}
        <section className="rounded-card border border-background-tertiary bg-background-secondary p-6 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">안내</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            본 안내는 정식 법률 자문을 대체하지 않습니다. 자세한 사항은{' '}
            <Link href="/terms" className="text-primary underline">
              이용약관
            </Link>
            ·
            <Link href="/privacy" className="text-primary underline">
              개인정보처리방침
            </Link>
            을 함께 확인하세요.
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            문의:{' '}
            <a
              href={buildMailto('[BlueBird] 베타 혜택 문의')}
              className="text-primary underline"
            >
              {SERVICE_CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <footer className="text-center pt-4 pb-12">
          <Link href="/" className="text-sm text-text-tertiary underline">
            홈으로
          </Link>
        </footer>
      </div>
    </main>
  );
}
