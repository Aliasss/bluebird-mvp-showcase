'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SAFETY_RESOURCES, getCriticalResources } from '@/lib/safety/resources';
import type { CrisisLevel } from '@/lib/safety/types';

interface SafetyNoticeProps {
  level: Exclude<CrisisLevel, 'none'>;
  onOverride: () => void; // "계속할래요" 콜백
}

export function SafetyNotice({ level, onOverride }: SafetyNoticeProps) {
  const [confirmingOverride, setConfirmingOverride] = useState(false);
  const resources = level === 'critical' ? getCriticalResources() : SAFETY_RESOURCES;

  const headline =
    level === 'critical'
      ? '지금 이야기해주신 내용이 걱정됩니다'
      : '지금 많이 지쳐 있는 것 같아요';

  const body =
    level === 'critical'
      ? '말씀해주셔서 고맙습니다. 지금 이 순간 함께할 수 있는 자원을 먼저 안내드릴게요. 어떤 선택이든 괜찮습니다.'
      : '분석을 잠시 멈출게요. 먼저 쉬어가는 것도 방법이고, 필요하면 아래 자원을 이용하실 수 있어요.';

  return (
    <section
      role="alert"
      aria-live="assertive"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-6 space-y-4"
    >
      <header>
        <h2 className="text-lg font-semibold text-rose-900">{headline}</h2>
        <p className="mt-2 text-sm text-rose-800">{body}</p>
      </header>

      <ul className="space-y-3">
        {resources.map((r) => (
          <li key={r.id} className="rounded-xl bg-surface p-4 border border-rose-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{r.name}</p>
                <p className="text-xs text-gray-600 mt-1">{r.description}</p>
                <p className="text-xs text-gray-500 mt-1">운영시간: {r.availability}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {r.phone && (
                  <a
                    href={`tel:${r.phone}`}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white text-center"
                  >
                    전화 {r.phone}
                  </a>
                )}
                {r.sms && (
                  <a
                    href={`sms:${r.sms}`}
                    className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-700 text-center"
                  >
                    문자 {r.sms}
                  </a>
                )}
                {r.webUrl && (
                  <a
                    href={r.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-700 text-center"
                  >
                    웹 상담
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="pt-2 space-y-2">
        <Link
          href="/safety/resources"
          className="block text-center text-sm text-rose-700 underline"
        >
          더 많은 자원 보기
        </Link>

        {confirmingOverride ? (
          <div className="rounded-xl border border-gray-200 bg-surface p-4 text-sm space-y-2">
            <p className="text-gray-700">정말 분석을 계속하시겠어요? 언제든 돌아와도 괜찮습니다.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOverride}
                className="flex-1 rounded-lg bg-gray-900 dark:bg-slate-700 py-2 text-sm text-white"
              >
                네, 계속할래요
              </button>
              <button
                type="button"
                onClick={() => setConfirmingOverride(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700"
              >
                조금 더 있을래요
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingOverride(true)}
            className="block w-full rounded-lg border border-gray-300 bg-surface py-2 text-sm text-gray-700"
          >
            괜찮아요, 계속할래요
          </button>
        )}
      </div>
    </section>
  );
}
