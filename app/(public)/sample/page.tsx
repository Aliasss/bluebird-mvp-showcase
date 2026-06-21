'use client';

import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { SAMPLE_CASES } from '@/lib/content/sample-cases';

export default function SampleIndexPage() {
  const router = useRouter();

  const handleSelect = (caseId: string) => {
    track('sample_case_select', { caseId });
    router.push(`/sample/${caseId}`);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-10 pb-6">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          ← 홈으로
        </button>
      </header>

      <div className="flex-1 px-5 pb-12">
        <div className="max-w-md mx-auto space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              60초 체험
            </p>
            <h1 className="text-2xl md:text-[26px] font-bold text-text-primary leading-tight tracking-tighter text-balance">
              가입 전, 어떻게 작동하는지 먼저 보여드릴게요
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              결정이 어떻게 기록되고 나중에 결과로 맞춰지는지, 미리 준비한 사례로 보여드립니다. 예상(확신도)을 미리 적어두고 → 검토일에 실제 결과와 나란히 비춰보는 흐름이에요. 결정에 낀 생각 습관도 그 안에 같이 적어둬요. 보고 마음에 들면 그때 가입하셔도 됩니다.
            </p>
          </div>

          <div className="space-y-3">
            {SAMPLE_CASES.map((c, i) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className="w-full text-left bg-surface border border-background-tertiary rounded-2xl p-5 hover:border-primary transition-colors active:scale-[0.99] touch-manipulation"
              >
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm text-text-primary font-medium leading-snug">
                      {c.shortLabel}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      탭해서 결정 흐름 보기 →
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-background-secondary rounded-xl p-4 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              있는 그대로
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              미리 적어둔 예측(확신도)과 생각 습관은 실제 BlueBird 엔진을 1회 호출해 받은 출력 그대로이고, 검토 단계의 예측 정확도 결과(%)는 실제 도구와 같은 계산 함수로 산출합니다. 복기 시점의 실제 결과만 흐름을 보여주기 위한 예시예요.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
