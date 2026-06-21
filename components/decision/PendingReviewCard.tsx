'use client';

/**
 * components/decision/PendingReviewCard.tsx
 *
 * 대시보드 '복기 대기' pull 카드 — review_at 이 도래했고 아직 복기하지 않은 결정을
 * 관찰 톤으로 안내한다. 탭하면 결정 복기 화면으로 이동.
 *
 * 톤 가드:
 *   - 중립·관찰 톤. 의무/뱃지/긴급("지금!", "마감", "놓쳤어요") 어휘 금지.
 *   - "돌아볼 결정이 있어요" — 권유가 아닌 사실 안내.
 *
 * Δpain 재평가 카드(components/review/ReviewCard.tsx)와 동일한 카드 패턴을 따른다.
 */

import { useRouter } from 'next/navigation';

interface PendingReviewCardProps {
  logId: string;
  decisionSnippet: string;
}

export function PendingReviewCard({ logId, decisionSnippet }: PendingReviewCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/decision/${logId}/review`)}
      className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition hover:bg-primary/10"
      aria-label="결정 결과 복기하기"
    >
      <p className="text-sm font-medium text-primary">돌아볼 결정이 있어요</p>
      <p className="mt-1 text-xs text-text-secondary">
        「{decisionSnippet}」, 이제 실제 결과를 기록할 수 있어요.
      </p>
    </button>
  );
}
