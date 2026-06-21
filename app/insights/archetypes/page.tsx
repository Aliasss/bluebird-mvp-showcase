import Link from 'next/link';
import { ARCHETYPES } from '@/lib/content/archetypes';
import { DistortionType } from '@/types';

// 인지 아키타입 전체 비교 페이지 — 2026-05-18.
// /insights 에서 본인 아키타입 카드 클릭 시 진입.
// ?current=<DistortionType> 로 본인 아키타입 강조.
//
// 보호 경로: proxy.ts /insights/:path* matcher → 자동 보호 + 승인 게이트 적용.
// SSOT: lib/content/archetypes.ts. 신규 아키타입 추가 시 본 페이지 자동 반영.

export const metadata = {
  title: '인지 아키타입 — 5가지 사고 시스템 유형 | BlueBird',
};

const ARCHETYPE_ORDER: DistortionType[] = [
  DistortionType.CATASTROPHIZING,
  DistortionType.ALL_OR_NOTHING,
  DistortionType.EMOTIONAL_REASONING,
  DistortionType.PERSONALIZATION,
  DistortionType.ARBITRARY_INFERENCE,
];

export default async function ArchetypesPage({
  searchParams,
}: {
  searchParams: Promise<{ current?: string }>;
}) {
  const params = await searchParams;
  const currentId = params.current ?? null;

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-primary tracking-tight">
            BlueBird
          </Link>
          <Link
            href="/insights"
            className="text-xs text-text-tertiary hover:text-text-secondary"
          >
            ← 인사이트로
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Cognitive Archetypes
          </p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            5가지 인지 아키타입
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            BlueBird는 분석 결과에서 가장 빈번히 나타난 인지 왜곡 유형을 기준으로
            본인의 사고 시스템 패턴을 5가지 아키타입 중 하나로 분류합니다. 분석 5회마다
            재계산되며, 새로운 패턴이 우세해지면 아키타입도 함께 갱신됩니다.
          </p>
        </section>

        <section className="space-y-3">
          {ARCHETYPE_ORDER.map((id) => {
            const a = ARCHETYPES[id];
            const isCurrent = currentId === id;
            return (
              <article
                key={id}
                className={`bg-surface rounded-2xl p-5 sm:p-6 space-y-3 border-2 transition-colors ${
                  isCurrent
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-background-tertiary'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-text-primary">{a.name}</h2>
                    <p className="text-sm text-text-secondary mt-0.5">{a.tagline}</p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded flex-shrink-0">
                      현재 단계
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed border-t border-background-tertiary pt-3">
                  {a.description}
                </p>
              </article>
            );
          })}
        </section>

        <section className="text-xs text-text-tertiary pt-4 border-t border-background-tertiary space-y-2">
          <p>
            ※ 본 분류는 BlueBird 분석 결과를 기반으로 한 자기 인식 도구이며, 임상 진단이
            아닙니다. 자세한 철학과 근거는{' '}
            <Link
              href="/our-philosophy"
              className="hover:text-text-secondary underline-offset-2 hover:underline"
            >
              블루버드 철학
            </Link>
            을 참고하세요.
          </p>
        </section>
      </div>
    </main>
  );
}
