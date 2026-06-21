'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import TheoryValueCurveChart from '@/components/charts/theory-value-curve-chart';
import {
  MANUAL_HEADER,
  MANUAL_PREFACE,
  MANUAL_SECTIONS,
  PROSPECT_THEORY_CHART_NOTE,
  type ManualSubSection,
} from '@/lib/content/technical-manual';

function SubSectionBlock({ sub }: { sub: ManualSubSection }) {
  return (
    <div className="rounded-xl border border-background-tertiary p-4 sm:p-5 space-y-3">
      <h3 className="text-base font-semibold text-text-primary">{sub.title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{sub.body}</p>
      {sub.items && sub.items.length > 0 && (
        <ul className="space-y-2">
          {sub.items.map((item) => (
            <li key={item.label} className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{item.label}: </span>
              {item.text}
            </li>
          ))}
        </ul>
      )}
      {sub.debuggingQuestion && (
        <div className="mt-2 bg-primary bg-opacity-5 border border-primary border-opacity-20 rounded-lg px-4 py-2">
          <p className="text-xs font-semibold text-primary mb-1">디버깅 질문</p>
          <p className="text-sm text-text-primary italic">{sub.debuggingQuestion}</p>
        </div>
      )}
    </div>
  );
}

export default function ManualPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="기술 매뉴얼" onBack={() => router.push('/me')} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 sm:gap-8">

        {/* 사이드바 */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="bg-surface border border-background-tertiary rounded-card p-4 space-y-2">
            <p className="text-xs text-text-secondary mb-1">목차</p>
            <a href="#preface" className="block text-sm text-text-primary hover:text-primary transition-colors py-0.5">
              <span className="lg:hidden">서문</span>
              <span className="hidden lg:inline">0. 서문</span>
            </a>
            {MANUAL_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block text-sm text-text-primary hover:text-primary transition-colors py-0.5"
              >
                <span className="lg:hidden">{section.navLabel}</span>
                <span className="hidden lg:inline">{section.title.split(':')[0]}.</span>
              </a>
            ))}
            <div className="pt-3 border-t border-background-tertiary">
              <Link href="/me" className="text-sm text-primary hover:underline">
                돌아가기
              </Link>
            </div>
          </div>
        </aside>

        {/* 본문 */}
        <div className="space-y-6 sm:space-y-8">

          {/* 헤더 */}
          <section className="bg-surface rounded-card p-5 sm:p-8 border border-background-tertiary">
            <p className="text-xs uppercase tracking-wide text-text-secondary mb-2">BlueBird Knowledge Base</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight mb-1">
              {MANUAL_HEADER.title}
            </h1>
            <p className="text-sm sm:text-base text-text-secondary">{MANUAL_HEADER.subtitle}</p>
          </section>

          {/* 서문 */}
          <section id="preface" className="bg-surface rounded-card p-5 sm:p-8 border border-background-tertiary space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-text-primary">0. 서문: 왜 당신의 뇌는 디버깅이 필요한가?</h2>
            {MANUAL_PREFACE.paragraphs.map((p, i) => (
              <p key={i} className="text-sm sm:text-base text-text-secondary leading-relaxed">{p}</p>
            ))}
          </section>

          {/* 각 섹션 */}
          {MANUAL_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="bg-surface rounded-card p-5 sm:p-8 border border-background-tertiary space-y-4 sm:space-y-5"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-text-primary">{section.title}</h2>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed">{section.intro}</p>

              {/* 전망이론 섹션에만 차트 삽입 */}
              {section.id === 'dyn-02' && (
                <div className="bg-background-secondary rounded-xl p-4 sm:p-5">
                  <p className="text-xs text-text-secondary mb-3">{PROSPECT_THEORY_CHART_NOTE}</p>
                  <TheoryValueCurveChart />
                </div>
              )}

              {/* 서브섹션 */}
              {section.subSections && section.subSections.length > 0 && (
                <div className="space-y-3">
                  {section.subSections.map((sub) => (
                    <SubSectionBlock key={sub.id} sub={sub} />
                  ))}
                </div>
              )}
            </section>
          ))}

        </div>
      </div>
    </main>
  );
}
