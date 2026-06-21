'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

type Props = {
  title: string;
  body: string;
};

export default function InfoSheet({ title, body }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`${title} 설명 보기`}
        className="inline-flex items-center justify-center w-4 h-4 text-text-tertiary hover:text-primary transition-colors ml-1 flex-shrink-0"
      >
        <Info size={13} />
      </button>

      {open && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* 바텀 시트 */}
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 bg-surface rounded-t-2xl p-6 shadow-elev2 w-full max-w-lg">
            <div className="w-10 h-1 bg-background-tertiary rounded-full mx-auto mb-5" />
            <h3 className="text-base font-bold text-text-primary mb-2">{title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
            <button
              onClick={() => setOpen(false)}
              className="w-full mt-6 py-3 text-sm font-semibold text-primary border border-primary border-opacity-30 rounded-2xl touch-manipulation active:scale-95 transition-transform"
            >
              확인했어요
            </button>
          </div>
        </>
      )}
    </>
  );
}
