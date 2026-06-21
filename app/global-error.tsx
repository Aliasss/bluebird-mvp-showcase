'use client';

import { AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('전역 에러:', error);

  return (
    <html lang="ko">
      <body className="antialiased">
        <main className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface rounded-2xl p-8 shadow-card text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="text-danger" size={36} strokeWidth={1.75} />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              예상치 못한 오류가 발생했습니다
            </h1>
            <p className="text-sm text-text-secondary">
              페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={reset}
                className="bg-primary text-primary-fg font-semibold py-3 px-6 rounded-xl"
              >
                다시 시도
              </button>
              <a
                href="/"
                className="bg-surface border border-primary text-primary font-semibold py-3 px-6 rounded-xl"
              >
                홈으로
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
