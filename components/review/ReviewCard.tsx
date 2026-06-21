'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReviewCardProps {
  logId: string;
  triggerSnippet: string;
  daysAgo: number;
}

export function ReviewCard({ logId, triggerSnippet, daysAgo }: ReviewCardProps) {
  const router = useRouter();
  const [isDismissing, setIsDismissing] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  async function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    if (isDismissing) return;
    setIsDismissing(true);
    try {
      await fetch('/api/review/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });
    } finally {
      setHidden(true);
    }
  }

  function handleOpen() {
    router.push(`/review/${logId}`);
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="w-full text-left rounded-2xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition"
      aria-label="지난 기록 재평가하기"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-primary">지난 기록 재평가하기</p>
          <p className="mt-1 text-xs text-text-secondary">
            {daysAgo === 1 ? '어제' : `${daysAgo}일 전`} 기록한 「{triggerSnippet}」, 지금은 어떠신가요?
          </p>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={handleDismiss}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleDismiss(e as unknown as React.MouseEvent);
          }}
          className="text-text-tertiary hover:text-text-secondary px-2 py-1 text-xs"
          aria-label="카드 숨기기"
        >
          ✕
        </span>
      </div>
    </button>
  );
}
