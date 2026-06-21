/**
 * Badge — 알약 상태 칩 (semantic tone).
 *
 * 12px/700 pill. primary는 강조, success/warning/danger는 알림 시점, neutral은 메타.
 * UI 키트 `Badge2`.
 */
import type { ReactNode } from 'react';

type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_MAP: Record<BadgeTone, string> = {
  primary: 'bg-primary-tint text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/[0.12] text-warning',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-background-secondary text-text-secondary',
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
};

export default function Badge({ children, tone = 'primary' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold leading-none tracking-snug ${TONE_MAP[tone]}`}
    >
      {children}
    </span>
  );
}
