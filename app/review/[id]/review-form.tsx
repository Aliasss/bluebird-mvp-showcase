'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReviewFormProps {
  logId: string;
}

// NRS-11 (Hawker et al., 2011) — 0~10 정수 척도. Δpain = initial − reevaluated.
const SCORES = Array.from({ length: 11 }, (_, i) => i);

export function ReviewForm({ logId }: ReviewFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (selected == null || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/review/pain-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, painScore: selected }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? '저장에 실패했어요.');
        setSubmitting(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('네트워크 오류가 발생했어요.');
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-primary">괴로움 다시 적기 (0 전혀 없음 ~ 10 참을 수 없는)</h2>
        <p className="mt-1 text-xs text-text-secondary">
          지금 이 문제를 다시 생각하면 고통 강도는 얼마인가요? 처음 기록한 값과의 차이예요.
        </p>
      </div>
      <div className="text-center">
        <span className="text-3xl font-extrabold text-primary tabular-nums">
          {selected ?? '–'}
        </span>
      </div>
      <div className="grid grid-cols-11 gap-1">
        {SCORES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSelected(n)}
            className={`aspect-square rounded-lg text-sm font-semibold border transition ${
              selected === n
                ? 'bg-primary text-primary-fg border-primary'
                : 'bg-surface text-primary border-primary/20 hover:border-primary/50'
            }`}
            aria-pressed={selected === n}
            aria-label={`고통 ${n}점`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-text-tertiary">
        <span>0 · 전혀 없음</span>
        <span>10 · 참을 수 없는</span>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        disabled={selected == null || submitting}
        onClick={handleSubmit}
        className="w-full rounded-xl bg-primary-dark py-3 text-sm font-semibold text-primary-fg disabled:bg-background-tertiary disabled:text-text-tertiary"
      >
        {submitting ? '저장 중…' : '저장하기'}
      </button>
    </section>
  );
}
