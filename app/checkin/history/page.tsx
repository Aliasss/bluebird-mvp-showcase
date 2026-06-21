'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import PageHeader from '@/components/ui/PageHeader';
import { supabase } from '@/lib/supabase/client';
import { useIsDark } from '@/lib/theme';

// 2026-05-26 검토:
//   - 탭 분리 (Morning / Evening) — 각 모드 정보 밀도·사용 의도 다름
//   - 모닝 탭: mood_level (1~5 점수, Migration 20) line chart + 일별 카드
//   - 이브닝 탭: 기존 리스트 그대로

type Checkin = {
  id: string;
  type: 'morning' | 'evening';
  mood_word: string | null;
  mood_level: number | null;
  system2_moment: string | null;
  created_at: string;
};

type Tab = 'morning' | 'evening';

const KST_OFFSET = 9 * 60 * 60 * 1000;

function toKstDateLabel(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + KST_OFFSET);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${d}일 (${days[kst.getUTCDay()]})`;
}

function toKstDateKey(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + KST_OFFSET);
  return kst.toISOString().slice(0, 10);
}

function toKstShortLabel(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + KST_OFFSET);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  return `${m}/${d}`;
}

const MOOD_LEVEL_EMOJI: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};
const MOOD_LEVEL_LABEL: Record<number, string> = {
  1: '매우 나쁨',
  2: '나쁨',
  3: '보통',
  4: '좋음',
  5: '매우 좋음',
};

export default function CheckinHistoryPage() {
  const router = useRouter();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('morning');

  useEffect(() => {
    const fetchCheckins = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      const { data } = await supabase
        .from('checkins')
        .select('id, type, mood_word, mood_level, system2_moment, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setCheckins((data || []) as Checkin[]);
      setLoading(false);
    };
    fetchCheckins();
  }, [router]);

  const morningCheckins = useMemo(
    () => checkins.filter((c) => c.type === 'morning'),
    [checkins],
  );
  const eveningCheckins = useMemo(
    () => checkins.filter((c) => c.type === 'evening'),
    [checkins],
  );

  // 모닝 line chart 데이터 — 최근 30일, mood_level NULL 제외 (Migration 20 이전 데이터)
  const chartData = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return morningCheckins
      .filter((c) => c.mood_level !== null && new Date(c.created_at).getTime() >= cutoff)
      .reverse() // 오래된 → 최신 순으로 차트
      .map((c) => ({
        date: toKstShortLabel(c.created_at),
        level: c.mood_level,
        word: c.mood_word,
      }));
  }, [morningCheckins]);

  // 최근 7일 일관성 — 모닝 체크인 했는지 binary
  const last7Consistency = useMemo(() => {
    const days: { date: string; label: string; done: boolean; level: number | null }[] = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = toKstDateKey(d.toISOString());
      const match = morningCheckins.find((c) => toKstDateKey(c.created_at) === key);
      const kst = new Date(d.getTime() + KST_OFFSET);
      const days_kr = ['일', '월', '화', '수', '목', '금', '토'];
      days.push({
        date: key,
        label: days_kr[kst.getUTCDay()],
        done: Boolean(match),
        level: match?.mood_level ?? null,
      });
    }
    return days;
  }, [morningCheckins]);

  const morningAvgLevel = useMemo(() => {
    const withLevel = morningCheckins.filter((c) => c.mood_level !== null);
    if (withLevel.length === 0) return null;
    const sum = withLevel.reduce((a, c) => a + (c.mood_level ?? 0), 0);
    return sum / withLevel.length;
  }, [morningCheckins]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <PageHeader title="체크인 기록" onBack={() => router.push('/dashboard')} />

      {/* 탭 — sticky */}
      <div className="sticky top-[56px] z-10 bg-background border-b border-background-tertiary">
        <div className="max-w-lg mx-auto px-4 sm:px-6 flex gap-1">
          {([
            { id: 'morning' as const, label: '🌅 아침', count: morningCheckins.length },
            { id: 'evening' as const, label: '🌙 저녁', count: eveningCheckins.length },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                tab === t.id
                  ? 'text-primary border-primary'
                  : 'text-text-tertiary border-transparent hover:text-text-secondary'
              }`}
            >
              {t.label} <span className="text-xs font-normal">({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        <div className="max-w-lg mx-auto">
          {tab === 'morning' ? (
            <MorningView
              morningCheckins={morningCheckins}
              chartData={chartData}
              last7Consistency={last7Consistency}
              avgLevel={morningAvgLevel}
              onFirstCheckin={() => router.push('/checkin')}
            />
          ) : (
            <EveningView
              eveningCheckins={eveningCheckins}
              onFirstCheckin={() => router.push('/checkin')}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function MorningView({
  morningCheckins,
  chartData,
  last7Consistency,
  avgLevel,
  onFirstCheckin,
}: {
  morningCheckins: Checkin[];
  chartData: { date: string; level: number | null; word: string | null }[];
  last7Consistency: { date: string; label: string; done: boolean; level: number | null }[];
  avgLevel: number | null;
  onFirstCheckin: () => void;
}) {
  const isDark = useIsDark();

  if (morningCheckins.length === 0) {
    return <EmptyState icon="🌅" text="아직 모닝 체크인 기록이 없어요" onClick={onFirstCheckin} />;
  }

  const done7 = last7Consistency.filter((d) => d.done).length;

  return (
    <div className="space-y-6">
      {/* 통계 헤더 */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="총 체크인" value={`${morningCheckins.length}회`} />
        <StatCard label="최근 7일 일관성" value={`${done7}/7일`} />
        <StatCard
          label="평균 기분"
          value={avgLevel !== null ? `${avgLevel.toFixed(1)}/5` : '—'}
        />
      </div>

      {/* 최근 7일 일관성 칩 */}
      <section className="bg-surface rounded-card p-4 border border-background-tertiary">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
          최근 7일
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {last7Consistency.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <div
                className={`w-full aspect-square rounded-lg flex items-center justify-center text-lg ${
                  d.done
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-background-secondary border border-background-tertiary'
                }`}
              >
                {d.done && d.level !== null ? MOOD_LEVEL_EMOJI[d.level] : ''}
              </div>
              <p className="text-[10px] text-text-tertiary">{d.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 30일 mood 추이 line chart */}
      {chartData.length > 0 ? (
        <section className="bg-surface rounded-card p-4 border border-background-tertiary">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
              최근 30일 기분 추이
            </p>
            <p className="text-[10px] text-text-tertiary">{chartData.length}건</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={isDark ? '#475569' : '#9ca3af'} />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 10 }}
                  stroke={isDark ? '#475569' : '#9ca3af'}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: isDark ? '#1E293B' : 'white',
                    border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 12,
                    color: isDark ? '#F1F5F9' : undefined,
                  }}
                  formatter={((value: unknown, _name: unknown, item: unknown) => {
                    const v = Number(value);
                    const word = (item as { payload?: { word?: string | null } })?.payload?.word;
                    const label = `${MOOD_LEVEL_EMOJI[v] ?? ''} ${MOOD_LEVEL_LABEL[v] ?? ''}${word ? ` · ${word}` : ''}`;
                    return [label, ''];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  }) as any}
                />
                <ReferenceLine y={3} stroke={isDark ? '#475569' : '#d1d5db'} strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="level"
                  stroke={isDark ? '#52B788' : '#2D6A4F'}
                  strokeWidth={2}
                  dot={{ r: 3, fill: isDark ? '#52B788' : '#2D6A4F' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-text-tertiary mt-2 leading-snug">
            1=매우 나쁨 · 3=보통 · 5=매우 좋음. 점선=중간선. 5/26 이전 데이터는 점수 없어 차트에서 제외됩니다.
          </p>
        </section>
      ) : (
        <section className="bg-background-secondary border border-background-tertiary rounded-card p-4 text-center">
          <p className="text-sm text-text-secondary">
            아직 점수가 기록된 모닝 체크인이 없어요.
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            내일 아침부터 5단계 점수가 같이 기록됩니다.
          </p>
        </section>
      )}

      {/* 일별 카드 리스트 */}
      <section className="space-y-2">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide px-1">
          전체 기록
        </p>
        {morningCheckins.map((c) => (
          <div
            key={c.id}
            className="bg-surface rounded-xl border border-background-tertiary p-4"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-text-tertiary">{toKstDateLabel(c.created_at)}</p>
              {c.mood_level !== null && (
                <span className="text-base">{MOOD_LEVEL_EMOJI[c.mood_level]}</span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              {c.mood_word && (
                <span className="text-sm font-medium text-primary">{c.mood_word}</span>
              )}
              {c.mood_level !== null && (
                <span className="text-xs text-text-tertiary">
                  · {MOOD_LEVEL_LABEL[c.mood_level]} ({c.mood_level}/5)
                </span>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function EveningView({
  eveningCheckins,
  onFirstCheckin,
}: {
  eveningCheckins: Checkin[];
  onFirstCheckin: () => void;
}) {
  if (eveningCheckins.length === 0) {
    return <EmptyState icon="🌙" text="아직 이브닝 체크인 기록이 없어요" onClick={onFirstCheckin} />;
  }
  return (
    <div className="space-y-3">
      {eveningCheckins.map((c) => (
        <div key={c.id} className="bg-surface rounded-xl border border-background-tertiary p-4">
          <p className="text-xs text-text-tertiary mb-2">{toKstDateLabel(c.created_at)}</p>
          {c.system2_moment && (
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {c.system2_moment}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-background-tertiary rounded-card p-3 text-center">
      <p className="text-base font-bold text-text-primary">{value}</p>
      <p className="text-[10px] text-text-tertiary mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function EmptyState({
  icon,
  text,
  onClick,
}: {
  icon: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-sm font-semibold text-text-primary mb-1">{text}</p>
      <p className="text-xs text-text-secondary mb-6">매일 체크인하면 추이가 쌓입니다.</p>
      <button
        onClick={onClick}
        className="bg-primary text-primary-fg text-base font-semibold py-[17px] px-8 rounded-2xl touch-manipulation active:scale-95 transition-transform hover:bg-primary-dark"
      >
        체크인 하기
      </button>
    </div>
  );
}
