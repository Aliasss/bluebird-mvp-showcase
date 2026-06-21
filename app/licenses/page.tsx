import type { Metadata } from 'next';
import PageHeader from '@/components/ui/PageHeader';

// 오픈소스 라이선스 고지(앱 내) — 핵심만. 전체 목록은 repo의 THIRD_PARTY_NOTICES.md.
export const metadata: Metadata = {
  title: '오픈소스 라이선스 | BlueBird',
  description: 'BlueBird가 사용하는 오픈소스 소프트웨어와 라이선스 고지.',
};

// 대표 항목만(전체는 프로젝트의 THIRD_PARTY_NOTICES 파일). [이름, 라이선스]
const KEY_PACKAGES: { name: string; license: string }[] = [
  { name: 'Pretendard (폰트)', license: 'SIL Open Font License 1.1' },
  { name: 'Next.js · React', license: 'MIT' },
  { name: 'Tailwind CSS', license: 'MIT' },
  { name: 'Recharts', license: 'MIT' },
  { name: 'lucide (아이콘)', license: 'ISC' },
  { name: 'Supabase JS', license: 'MIT' },
  { name: 'web-push', license: 'MPL-2.0' },
];

export default function LicensesPage() {
  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="오픈소스 라이선스" backHref="/me" />

      <div className="mx-auto max-w-lg px-5 py-6 pb-24 space-y-6">
        <p className="text-sm leading-relaxed text-text-secondary">
          BlueBird는 여러 오픈소스 소프트웨어 덕분에 만들어졌습니다. 각 저작권자와 라이선스에
          감사드립니다. 아래는 대표 항목이며, 전체 목록은 아래 링크에서 보실 수 있어요.
        </p>

        <section className="overflow-hidden rounded-card border border-background-tertiary bg-surface">
          {KEY_PACKAGES.map((p, i) => (
            <div key={p.name}>
              {i > 0 && <div className="mx-5 h-px bg-background-secondary" />}
              <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <p className="text-[15px] font-medium text-text-primary">{p.name}</p>
                <p className="flex-shrink-0 text-xs text-text-tertiary tabular-nums">{p.license}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="rounded-card border border-background-tertiary bg-surface px-5 py-4">
          <p className="text-base font-semibold text-text-primary">전체 라이선스 목록</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            프로젝트의 <span className="font-medium">THIRD_PARTY_NOTICES</span> 파일에 모든 의존성과
            라이선스가 정리되어 있습니다.
          </p>
        </div>

        <p className="px-1 text-xs leading-relaxed text-text-tertiary">
          각 폰트·라이브러리의 저작권은 해당 저작권자에게 있습니다.
        </p>
      </div>
    </main>
  );
}
