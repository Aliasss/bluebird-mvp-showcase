'use client';

import { useState } from 'react';
import type { UsageMetrics, TimelineItem } from '@/lib/admin/usage-metrics';

const KIND_LABEL: Record<TimelineItem['kind'], string> = {
  decision: '결정', distortion: '왜곡', checkin: '체크인',
  plan_written: '계획작성', plan_completed: '계획완수',
};
const KIND_TONE: Record<TimelineItem['kind'], string> = {
  decision: 'bg-primary/10 text-primary',
  distortion: 'bg-warning/10 text-warning',
  checkin: 'bg-background-secondary text-text-secondary',
  plan_written: 'bg-background-secondary text-text-secondary',
  plan_completed: 'bg-success/10 text-success',
};

function kstDateTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export default function UsageAccountTimeline({ metrics }: { metrics: UsageMetrics }) {
  const emails = metrics.perUser.map((r) => r.email); // 활동 많은 순 (perUser 정렬)
  const [email, setEmail] = useState(emails[0] ?? '');

  if (emails.length === 0) {
    return <p className="text-sm text-text-tertiary py-8 text-center">표시할 계정 없음</p>;
  }
  const items = metrics.timelines[email] ?? [];

  return (
    <div className="space-y-4">
      <select
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full sm:w-auto px-3 py-2 text-sm border border-background-tertiary rounded-lg bg-surface text-text-primary"
      >
        {emails.map((em) => (
          <option key={em} value={em}>{em}</option>
        ))}
      </select>

      {items.length === 0 ? (
        <p className="text-sm text-text-tertiary py-8 text-center">이 계정의 활동 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 bg-surface border border-background-tertiary rounded-xl px-3 py-2"
            >
              <span className="text-[11px] text-text-tertiary whitespace-nowrap pt-0.5 w-20 flex-shrink-0">
                {kstDateTime(it.at)}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${KIND_TONE[it.kind]}`}>
                {KIND_LABEL[it.kind]}
              </span>
              <span className="text-sm text-text-primary line-clamp-2 min-w-0">{it.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
