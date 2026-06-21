'use client';

import { Monitor, Sun, Moon } from 'lucide-react';
import { useThemeMode, type ThemeMode } from '@/lib/theme';

const OPTIONS: { value: ThemeMode; label: string; Icon: typeof Monitor }[] = [
  { value: 'system', label: '시스템', Icon: Monitor },
  { value: 'light', label: '라이트', Icon: Sun },
  { value: 'dark', label: '다크', Icon: Moon },
];

/**
 * 화면 테마 3택 토글 (시스템/라이트/다크). 설정(/me)에서 사용.
 * 색은 전부 토큰 — 라이트/다크 양쪽에서 자동으로 맞춰진다.
 */
export default function ThemeToggle() {
  const [mode, setMode] = useThemeMode();

  return (
    <div
      role="radiogroup"
      aria-label="화면 테마"
      className="grid grid-cols-3 gap-1.5 rounded-ctrl bg-background-secondary p-1"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(value)}
            className={`flex items-center justify-center gap-1.5 rounded-[0.625rem] py-2 text-sm font-medium transition-colors touch-manipulation ${
              active
                ? 'bg-primary text-primary-fg'
                : 'text-text-secondary hover:bg-surface'
            }`}
          >
            <Icon size={15} strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
