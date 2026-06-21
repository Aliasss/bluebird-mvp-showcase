/**
 * ListRow — 좌(아이콘+텍스트) / 우(값+chevron) 구조 행. 리스트 UI 핵심 단위.
 *
 * 40px 틴트 아이콘 + 제목/설명 + 우측 값/chevron. onClick 있을 때만 press 피드백.
 * 아이콘은 lucide-react 컴포넌트를 직접 전달(트리 셰이킹·타입 안전).
 * 흰 카드 + divider 그룹 래핑은 화면 레벨 조합 — 이 부품은 투명 단일 행.
 * UI 키트 `ListRow`.
 */
import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';

type ListRowProps = {
  icon?: LucideIcon;
  iconBg?: string; // Tailwind 배경 클래스 (기본 bg-primary-tint)
  title: ReactNode;
  desc?: string;
  right?: ReactNode;
  rightSub?: string;
  chevron?: boolean;
  onClick?: () => void;
  tone?: string; // 의미색 오버라이드 Tailwind 클래스 (예: text-success)
};

export default function ListRow({
  icon: Icon,
  iconBg = 'bg-primary-tint',
  title,
  desc,
  right,
  rightSub,
  chevron,
  onClick,
  tone,
}: ListRowProps) {
  const interactive = Boolean(onClick);
  const iconColor = tone ?? 'text-primary'; // 아이콘 기본 = 코발트
  const rightColor = tone ?? 'text-text-primary'; // 우측 값 기본 = 본문색

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3.5 py-3.5 px-5 ${
        interactive ? 'cursor-pointer transition-colors active:bg-background-secondary' : ''
      }`}
    >
      {Icon && (
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
        >
          <Icon size={20} strokeWidth={1.9} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold tracking-snug text-text-primary">{title}</p>
        {desc && <p className="mt-0.5 truncate text-[13px] text-text-tertiary">{desc}</p>}
      </div>
      {(right || chevron) && (
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {right && (
            <div className="text-right">
              <span className={`text-[15px] font-bold tabular-nums ${rightColor}`}>{right}</span>
              {rightSub && <p className="mt-px text-[11px] text-text-tertiary">{rightSub}</p>}
            </div>
          )}
          {chevron && <ChevronRight size={20} strokeWidth={1.75} className="text-text-tertiary" />}
        </div>
      )}
    </div>
  );
}
