/**
 * ListHeader — 섹션 큰 헤더 (제목 + 선택적 우측 텍스트 액션)
 *
 * 19px/700 섹션 제목. 우측에 "자세히" 같은 보조 액션 텍스트 버튼.
 * UI 키트 `ListHeader`.
 */
import type { ReactNode } from 'react';

type ListHeaderProps = {
  title: ReactNode;
  action?: string;
  onAction?: () => void;
};

export default function ListHeader({ title, action, onAction }: ListHeaderProps) {
  return (
    <div className="flex items-baseline justify-between pt-5 px-5 pb-2">
      <h2 className="text-[19px] font-bold tracking-tight text-text-primary">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="text-[13px] font-semibold text-text-tertiary hover:text-primary transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  );
}
