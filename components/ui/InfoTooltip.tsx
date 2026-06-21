'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

type Props = {
  text: string;
  children: React.ReactNode;
};

export default function InfoTooltip({ text, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 relative">
      {children}
      <button
        type="button"
        aria-label={`도움말: ${text}`}
        title={text}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center w-4 h-4 text-text-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
      >
        <Info size={12} strokeWidth={2} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute top-full left-0 mt-1 px-2 py-1.5 text-[11px] text-background bg-text-primary rounded-md shadow-card max-w-[280px] whitespace-normal leading-snug z-20"
        >
          {text}
        </span>
      )}
    </span>
  );
}
