import type { Metadata } from 'next';
import PageHeader from '@/components/ui/PageHeader';
import { CHANGELOG } from '@/lib/content/changelog';

// 업데이트 노트 — 최근에 바뀐 점을 아주 간단히. 정적 콘텐츠(lib/content/changelog.ts).
export const metadata: Metadata = {
  title: '업데이트 노트 | BlueBird',
  description: 'BlueBird에서 최근에 달라진 점을 간단히 모았습니다.',
};

export default function UpdatesPage() {
  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="업데이트 노트" backHref="/me" />

      <div className="mx-auto max-w-lg px-5 py-6 pb-24 space-y-6">
        <p className="text-sm leading-relaxed text-text-secondary">
          BlueBird는 아직 만들어가는 중이라 자주 바뀌어요. 최근에 달라진 점을 간단히 적어둘게요.
        </p>

        <div className="space-y-3">
          {CHANGELOG.map((note) => (
            <section
              key={note.date}
              className="rounded-card border border-background-tertiary bg-surface p-5"
            >
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary tabular-nums">
                {note.date}
              </p>
              <ul className="space-y-2">
                {note.items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-text-primary">
                    <span aria-hidden className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="px-1 text-xs leading-relaxed text-text-tertiary">
          더 바라는 점이나 불편한 점이 있으면 ‘나 → 운영자에게 문의’로 알려주세요.
        </p>
      </div>
    </main>
  );
}
