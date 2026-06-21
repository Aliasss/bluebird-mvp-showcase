'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { formatActionPlanForDisplay } from '@/lib/intervention/action-plan';
import BottomTabBar from '@/components/ui/BottomTabBar';
import Badge from '@/components/ui/Badge';
import { groupActionsByPlannedAt } from '@/lib/journal/action-timeline';
import type { Log, TriggerCategory } from '@/types';
import { TriggerCategoryKorean } from '@/types';
import {
  DATE_FILTERS,
  DATE_FILTER_LABEL,
  dateFilterToCutoffMs,
  isWithinDateFilter,
  type DateFilter,
} from '@/lib/journal/date-filter';

type LogWithType = Log & { log_type?: string | null };

type RecentActionItem = {
  id: string;
  log_id: string;
  final_action: string | null;
  is_completed: boolean;
  autonomy_score: number | null;
  created_at: string;
  planned_at: string | null;
  logs?: {
    trigger?: string;
    log_type?: string | null;
    trigger_category?: TriggerCategory | null;
  } | null;
};

type Tab = 'logs' | 'actions';

const FILTER_ALL = 'all' as const;
type CategoryFilter = typeof FILTER_ALL | TriggerCategory;

export default function JournalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('logs');
  const [logs, setLogs] = useState<LogWithType[]>([]);
  const [recentActions, setRecentActions] = useState<RecentActionItem[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(FILTER_ALL);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const [{ data: logsData }, { data: actionData }] = await Promise.all([
        supabase
          .from('logs')
          .select('*, log_type')
          .eq('user_id', user.id)
          .or('log_type.eq.distortion,log_type.is.null')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('intervention')
          .select('id, log_id, final_action, is_completed, autonomy_score, created_at, planned_at, logs!inner(trigger, user_id, log_type, trigger_category)')
          .eq('logs.user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setLogs((logsData || []) as LogWithType[]);
      const filteredActions = ((actionData || []) as unknown as RecentActionItem[]).filter(
        (item) => item.logs?.log_type !== 'success'
      );
      setRecentActions(filteredActions);
      setLoading(false);
    };

    fetchData();
  }, [router]);

  // 카테고리 + 날짜 필터 동시 적용 — 클라이언트 사이드. 'all'은 해당 필터 미적용 의미.
  const dateCutoffMs = useMemo(
    () => dateFilterToCutoffMs(dateFilter, new Date()),
    [dateFilter],
  );

  const visibleLogs = useMemo(() => {
    return logs.filter((l) => {
      if (categoryFilter !== FILTER_ALL && l.trigger_category !== categoryFilter) return false;
      if (!isWithinDateFilter(l.created_at, dateCutoffMs)) return false;
      return true;
    });
  }, [logs, categoryFilter, dateCutoffMs]);

  const visibleActions = useMemo(() => {
    return recentActions.filter((a) => {
      if (categoryFilter !== FILTER_ALL && a.logs?.trigger_category !== categoryFilter) return false;
      if (!isWithinDateFilter(a.created_at, dateCutoffMs)) return false;
      return true;
    });
  }, [recentActions, categoryFilter, dateCutoffMs]);

  // 사용자가 실제 데이터에 보유한 카테고리만 칩으로 노출 (12개 전부 X — UI 부담↓)
  const availableCategories = useMemo(() => {
    const set = new Set<TriggerCategory>();
    for (const l of logs) {
      if (l.trigger_category) set.add(l.trigger_category as TriggerCategory);
    }
    for (const a of recentActions) {
      const c = a.logs?.trigger_category;
      if (c) set.add(c);
    }
    return Array.from(set);
  }, [logs, recentActions]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-lg mx-auto px-5 pt-3 pb-2">
          <p className="text-[13px] font-extrabold tracking-tight text-primary">일지</p>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">기록 일지</h1>
        </div>
        {/* 탭 */}
        <div className="max-w-lg mx-auto px-4 flex gap-4 border-t border-background-tertiary">
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-tertiary'
            }`}
          >
            최근 활동
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'actions'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-tertiary'
            }`}
          >
            행동 계획
          </button>
        </div>
        {/* 카테고리 필터 (보유 데이터 있을 때만 노출) */}
        {availableCategories.length > 0 && (
          <div className="max-w-lg mx-auto px-4 py-2 border-t border-background-tertiary/60 overflow-x-auto whitespace-nowrap">
            <div className="flex gap-1.5">
              <button
                onClick={() => setCategoryFilter(FILTER_ALL)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors flex-shrink-0 ${
                  categoryFilter === FILTER_ALL
                    ? 'bg-primary text-primary-fg'
                    : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
                }`}
              >
                전체
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors flex-shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-primary text-primary-fg'
                      : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
                  }`}
                >
                  {TriggerCategoryKorean[cat]}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* 날짜 필터 — 기록 1건이라도 있을 때 노출 (전체기간 / 7일 / 30일) */}
        {(logs.length > 0 || recentActions.length > 0) && (
          <div className="max-w-lg mx-auto px-4 py-2 border-t border-background-tertiary/60 flex items-center gap-1.5">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider flex-shrink-0">기간</span>
            {DATE_FILTERS.map((df) => (
              <button
                key={df}
                onClick={() => setDateFilter(df)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  dateFilter === df
                    ? 'bg-primary text-primary-fg'
                    : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
                }`}
              >
                {DATE_FILTER_LABEL[df]}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 pb-28">
        {activeTab === 'logs' && (
          <>
            {visibleLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm font-semibold text-text-primary mb-1">
                  {categoryFilter === FILTER_ALL && dateFilter === 'all'
                    ? '아직 기록이 없어요'
                    : '조건에 맞는 기록이 없어요'}
                </p>
                <p className="text-xs text-text-secondary">
                  {categoryFilter === FILTER_ALL && dateFilter === 'all'
                    ? '하단 + 버튼으로 첫 기록을 시작해보세요.'
                    : '다른 카테고리·기간을 선택하거나 전체 보기로 돌아가세요.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(showAllLogs ? visibleLogs : visibleLogs.slice(0, 3)).map((log) => (
                  <div
                    key={log.id}
                    onClick={() => router.push(`/analyze/${log.id}`)}
                    className="rounded-card border border-background-tertiary bg-surface p-4 transition-colors hover:border-primary cursor-pointer"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {log.trigger_category ? (
                        <Badge tone="primary">{TriggerCategoryKorean[log.trigger_category as TriggerCategory]}</Badge>
                      ) : (
                        <span />
                      )}
                      <span className="flex-shrink-0 whitespace-nowrap text-xs text-text-tertiary">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-[15px] font-medium text-text-primary">{log.trigger}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary">{log.thought}</p>
                    {typeof log.pain_score === 'number' && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-xs text-text-tertiary">고통</span>
                        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-background-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${log.pain_score * 10}%` }} />
                        </div>
                        <span className="text-xs font-bold tabular-nums text-text-secondary">{log.pain_score}</span>
                      </div>
                    )}
                  </div>
                ))}
                {visibleLogs.length > 3 && !showAllLogs && (
                  <button
                    onClick={() => setShowAllLogs(true)}
                    className="w-full py-2.5 text-sm text-primary font-semibold border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors"
                  >
                    더보기 ({visibleLogs.length - 3}개 더)
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'actions' && (
          <>
            {visibleActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-4xl mb-3">📝</p>
                <p className="text-sm font-semibold text-text-primary mb-1">
                  {categoryFilter === FILTER_ALL && dateFilter === 'all'
                    ? '아직 행동 계획이 없어요'
                    : '조건에 맞는 행동 계획이 없어요'}
                </p>
                <p className="text-xs text-text-secondary">
                  {categoryFilter === FILTER_ALL && dateFilter === 'all'
                    ? '분석 후 행동 설계를 완료해보세요.'
                    : '다른 카테고리·기간을 선택하거나 전체 보기로 돌아가세요.'}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {groupActionsByPlannedAt(
                  showAllActions ? visibleActions : visibleActions.slice(0, 3),
                  new Date(),
                ).map((group) => (
                  <div key={group.bucket} className="space-y-2">
                    <p className="text-xs font-semibold text-text-tertiary px-1">{group.label}</p>
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => router.push(`/action/${item.log_id}`)}
                          className="rounded-card border border-background-tertiary bg-surface p-4 transition-colors hover:border-primary cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-sm font-medium text-text-primary line-clamp-1">
                                {item.logs?.trigger || '행동 계획'}
                              </p>
                              {item.logs?.trigger_category && (
                                <span className="text-[10px] text-text-tertiary bg-background-secondary px-1.5 py-0.5 rounded flex-shrink-0">
                                  {TriggerCategoryKorean[item.logs.trigger_category]}
                                </span>
                              )}
                            </div>
                            <span className={`text-xs font-semibold flex-shrink-0 ${item.is_completed ? 'text-success' : 'text-text-tertiary'}`}>
                              {item.is_completed ? '완료' : '결과 기록 전'}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {formatActionPlanForDisplay(item.final_action) || '행동 계획이 아직 작성되지 않았습니다.'}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-text-secondary">{formatDate(item.created_at)}</span>
                            <span className="text-xs text-primary">
                              {item.autonomy_score ? `+${item.autonomy_score}점` : '완료하면 점수 반영'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {visibleActions.length > 3 && !showAllActions && (
                  <button
                    onClick={() => setShowAllActions(true)}
                    className="w-full py-2.5 text-sm text-primary font-semibold border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors"
                  >
                    더보기 ({visibleActions.length - 3}개 더)
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <BottomTabBar />
    </main>
  );
}
