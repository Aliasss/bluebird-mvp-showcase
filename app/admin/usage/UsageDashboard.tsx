'use client';

import { useState } from 'react';
import type { UsageMetrics } from '@/lib/admin/usage-metrics';
import UsageCharts from './UsageCharts';
import UsageAccountTimeline from './UsageAccountTimeline';

export default function UsageDashboard({ metrics }: { metrics: UsageMetrics }) {
  const [tab, setTab] = useState<'cumulative' | 'daily' | 'charts' | 'accounts'>('cumulative');
  const c = metrics.cumulative;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <TabBtn active={tab === 'cumulative'} onClick={() => setTab('cumulative')}>누적(전체기간)</TabBtn>
        <TabBtn active={tab === 'daily'} onClick={() => setTab('daily')}>Daily</TabBtn>
        <TabBtn active={tab === 'charts'} onClick={() => setTab('charts')}>차트</TabBtn>
        <TabBtn active={tab === 'accounts'} onClick={() => setTab('accounts')}>계정별</TabBtn>
      </div>

      {tab === 'cumulative' && (
        <>
          <section className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <Stat label="외부 가입" value={c.signups} />
            <Stat label="활성" value={c.activeUsers} />
            <Stat label="이탈" value={c.churnedUsers} muted />
            <Stat label="총 결정" value={c.decisions} />
            <Stat label="총 왜곡" value={c.distortions} />
            <Stat label="체크인 오전" value={c.checkinsMorning} />
            <Stat label="체크인 저녁" value={c.checkinsEvening} />
            <Stat label="활동계획 작성" value={c.actionPlanWriters} />
            <Stat label="활동계획 완수" value={c.actionPlanCompleters} />
            <Stat label="결정 복기" value={c.reviewers} />
          </section>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-text-tertiary border-b border-background-tertiary">
                  {['이메일', '가입', '결정', '왜곡', '성공', '오전', '저녁', '계획작성', '완수', '자율성', '복기', '활동일', '마지막'].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.perUser.map((r) => (
                  <tr key={r.email} className="border-b border-background-tertiary/60">
                    <Td left>{r.email}</Td>
                    <Td>{r.signedUp}</Td>
                    <Td>{r.decisions}</Td>
                    <Td>{r.distortions}</Td>
                    <Td>{r.success}</Td>
                    <Td>{r.checkinsMorning}</Td>
                    <Td>{r.checkinsEvening}</Td>
                    <Td>{r.actionPlansWritten}</Td>
                    <Td>{r.actionPlansCompleted}</Td>
                    <Td>{r.autonomyScore}</Td>
                    <Td>{r.reviews}</Td>
                    <Td>{r.activeDays}</Td>
                    <Td>{r.lastActivity ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'daily' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-text-tertiary border-b border-background-tertiary">
                {['날짜', '신규가입', 'DAU', '오전', '저녁', '결정', '왜곡', '복기', '계획작성', '완수'].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.daily.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-text-tertiary">최근 30일 활동 없음</td></tr>
              ) : metrics.daily.map((r) => (
                <tr key={r.date} className="border-b border-background-tertiary/60">
                  <Td left>{r.date}</Td>
                  <Td>{r.signups}</Td>
                  <Td>{r.dau}</Td>
                  <Td>{r.checkinsMorning}</Td>
                  <Td>{r.checkinsEvening}</Td>
                  <Td>{r.decisions}</Td>
                  <Td>{r.distortions}</Td>
                  <Td>{r.reviews}</Td>
                  <Td>{r.actionPlansWritten}</Td>
                  <Td>{r.actionPlansCompleted}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-text-tertiary mt-2 px-1">
            DAU = 일별 활동 사용자(이벤트·로그·체크인 중 ≥1). 순수 방문/세션 추적 아님.
          </p>
        </div>
      )}

      {tab === 'charts' && <UsageCharts metrics={metrics} />}

      {tab === 'accounts' && <UsageAccountTimeline metrics={metrics} />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
        active ? 'bg-primary text-primary-fg' : 'text-text-secondary border border-background-tertiary hover:bg-background-secondary'
      }`}
    >
      {children}
    </button>
  );
}
function Stat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="bg-surface border border-background-tertiary rounded-2xl p-3 text-center">
      <p className={`text-xl font-bold ${muted ? 'text-text-tertiary' : 'text-text-primary'}`}>{value}</p>
      <p className="text-[10px] text-text-secondary mt-0.5 leading-tight">{label}</p>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-2 text-right font-semibold whitespace-nowrap first:text-left">{children}</th>;
}
function Td({ children, left }: { children: React.ReactNode; left?: boolean }) {
  return <td className={`px-2 py-1.5 whitespace-nowrap ${left ? 'text-left text-text-secondary' : 'text-right text-text-primary'}`}>{children}</td>;
}
