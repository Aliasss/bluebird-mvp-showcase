'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, SunMedium, Moon, ClipboardList, ChevronRight, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import StreakBanner from '@/components/ui/StreakBanner';
import EnablePushCard from '@/components/notifications/EnablePushCard';
import EnablePushBanner from '@/components/notifications/EnablePushBanner';
import ArchetypeCard from '@/components/ui/ArchetypeCard';
import BottomTabBar from '@/components/ui/BottomTabBar';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { calculateStreak, type StreakResult } from '@/lib/utils/streak';
import { getArchetypeResultFromRows, type ArchetypeResult } from '@/lib/utils/archetype';
import { getRankResult } from '@/lib/utils/rank';
import StageTransitionModal from '@/components/insights/StageTransitionModal';
import { DistortionTypeKorean } from '@/types';
import { AUTONOMY_SCORE_TOOLTIP, DELTA_PAIN_WEEKLY_TOOLTIP } from '@/lib/copy/autonomy';
import type { User } from '@supabase/supabase-js';
import type { Log } from '@/types';
import { findPendingReview, type PendingReviewClient, type PendingReview } from '@/lib/review/pending-review';
import { sumPositiveDeltaPain, type PainPair } from '@/lib/review/delta-pain';
import { ReviewCard } from '@/components/review/ReviewCard';
import { PendingReviewCard } from '@/components/decision/PendingReviewCard';
import { isAwaitingReview } from '@/lib/decision/review-status';

type LogWithType = Log & { log_type?: string | null };

function getGreeting(email: string) {
  const name = email.split('@')[0];
  const kstHour = (new Date().getUTCHours() + 9) % 24;
  let message = '';
  if (kstHour >= 5 && kstHour < 13) {
    message = '오늘 점검할 결정이 있나요?';
  } else if (kstHour >= 13 && kstHour < 19) {
    message = '마음에 걸리는 선택을 기록해보세요.';
  } else {
    message = '내린 결정들이 맞았는지 확인해보세요.';
  }
  return { name, message };
}

function DashboardContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [successLogs, setSuccessLogs] = useState<LogWithType[]>([]);
  const [streak, setStreak] = useState<StreakResult>({ current: 0, best: 0, doneToday: false });
  const [archetype, setArchetype] = useState<ArchetypeResult | null>(null);
  const [autonomyScore, setAutonomyScore] = useState(0);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  // 결정 복기 대기 — review_at 도래 + 미복기(트랙별 isAwaitingReview, Migration 24). 가장 이른 것부터.
  const [pendingDecisions, setPendingDecisions] = useState<Array<{ id: string; trigger: string }>>([]);
  const [weeklyPositiveDeltaPain, setWeeklyPositiveDeltaPain] = useState(0);
  const [successToast, setSuccessToast] = useState(false);
  const [checkinToast, setCheckinToast] = useState(false);
  // 방금 체크인 완료한 직후 진입 시 P2 카드 노출 트리거 (component가 permission/dismiss 자체 게이팅)
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState<{ morning: boolean; evening: boolean }>({ morning: false, evening: false });
  const [showManualNudge, setShowManualNudge] = useState(false);
  // 단계 전이 인터스티셜 (Plan agent 권장안 A, 2026-05-16). localStorage 1회 표시.
  const [stageTransition, setStageTransition] = useState<{
    previousTitle: string | null;
    currentTitle: string;
    totalLogs: number;
    topDistortionKorean: string | null;
  } | null>(null);

  useEffect(() => {
    // sessionStorage 기반 — Router Cache가 stale searchParams를 복원해도 토스트 재발사 안 됨.
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('justSuccessLogged') === '1') {
      sessionStorage.removeItem('justSuccessLogged');
      setSuccessToast(true);
      const timer = setTimeout(() => setSuccessToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('justCheckedIn') === '1') {
      sessionStorage.removeItem('justCheckedIn');
      setCheckinToast(true);
      setJustCheckedIn(true);
      const timer = setTimeout(() => setCheckinToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // 온보딩 미완 사용자는 /onboarding/1 redirect.
      // user_onboarding row 부재 = 미완. RLS로 본인 row만 조회.
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!onboarding) {
        router.push('/onboarding/1');
        return;
      }

      setUser(user);
      await fetchData(user.id);
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/auth/login');
      } else {
        setUser(session.user);
        fetchData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchData = async (userId: string) => {
    try {
      const KST_OFFSET = 9 * 60 * 60 * 1000;
      const toKstDate = (iso: string) =>
        new Date(new Date(iso).getTime() + KST_OFFSET).toISOString().slice(0, 10);

      // 성공 로그
      const { data: successLogsData } = await supabase
        .from('logs')
        .select('*, log_type')
        .eq('user_id', userId)
        .eq('log_type', 'success')
        .order('created_at', { ascending: false })
        .limit(3);
      setSuccessLogs((successLogsData || []) as LogWithType[]);

      // 스트릭 계산
      const [{ data: analysisData }, { data: checkinData }] = await Promise.all([
        supabase
          .from('analysis')
          .select('distortion_type, created_at, logs!inner(user_id)')
          .eq('logs.user_id', userId),
        supabase
          .from('checkins')
          .select('created_at')
          .eq('user_id', userId),
      ]);

      const analysisDates = (analysisData ?? []).map((r) => toKstDate((r as { created_at: string }).created_at));
      const checkinDates = (checkinData ?? []).map((r) => toKstDate((r as { created_at: string }).created_at));
      const allDates = [...new Set([...analysisDates, ...checkinDates])];
      setStreak(calculateStreak(allDates));

      // 자율성 지수
      const { data: interventionsData } = await supabase
        .from('intervention')
        .select('autonomy_score, logs!inner(user_id)')
        .eq('logs.user_id', userId)
        .not('autonomy_score', 'is', null);
      const totalScore = interventionsData?.reduce((sum, item) => sum + (item.autonomy_score || 0), 0) || 0;
      setAutonomyScore(totalScore);

      // 단계 전이 인터스티셜 — Plan agent 권장안 A (2026-05-16)
      // localStorage 1회 표시 가드. 본인의 마지막으로 본 단계와 현 단계가 다르면 모달 표시
      if (typeof window !== 'undefined') {
        const currentRank = getRankResult(totalScore).rank;
        const STORAGE_KEY = 'bluebird:last_seen_rank_v1';
        const previousTitle = window.localStorage.getItem(STORAGE_KEY);

        if (previousTitle !== currentRank.title) {
          // 첫 진입 (previousTitle === null) 시에는 modal 표시 안 함 (단계 진입 신호가 아니라 첫 가입)
          if (previousTitle !== null) {
            // 정량 회고용 데이터 — best-effort 별도 fetch
            const { data: patternsData } = await supabase
              .from('user_patterns')
              .select('distortion_type')
              .eq('user_id', userId);

            const counts = new Map<string, number>();
            (patternsData ?? []).forEach((p) => {
              const t = (p as { distortion_type?: string }).distortion_type;
              if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
            });
            let topType: string | null = null;
            let topN = 0;
            counts.forEach((n, t) => {
              if (n > topN) {
                topN = n;
                topType = t;
              }
            });

            setStageTransition({
              previousTitle,
              currentTitle: currentRank.title,
              totalLogs: (analysisData ?? []).length,
              topDistortionKorean:
                topType && topType in DistortionTypeKorean
                  ? DistortionTypeKorean[topType as keyof typeof DistortionTypeKorean]
                  : null,
            });
          }
          // 첫 진입이든 전이든 localStorage 갱신
          window.localStorage.setItem(STORAGE_KEY, currentRank.title);
        }
      }

      // 재평가 대기 (Δpain)
      const pendingReviewClient: PendingReviewClient = {
        async queryPendingInterventions({ userId: uid, completedAtGte, completedAtLte }) {
          const { data, error } = await supabase
            .from('intervention')
            .select('id, log_id, completed_at, logs!inner(id, trigger, pain_score, user_id)')
            .eq('is_completed', true)
            .is('reevaluated_pain_score', null)
            .is('review_dismissed_at', null)
            .gte('completed_at', completedAtGte)
            .lte('completed_at', completedAtLte)
            .eq('logs.user_id', uid);
          const normalized = (data ?? []).map((row) => ({
            ...row,
            logs: Array.isArray(row.logs) ? row.logs[0] : row.logs,
          })) as import('@/lib/review/pending-review').PendingReviewRow[];
          return { data: normalized, error };
        },
      };
      const pending = await findPendingReview({
        userId,
        now: new Date(),
        client: pendingReviewClient,
      });
      setPendingReview(pending);

      // 결정 복기 대기 — review_at 도래 + 미복기. 가장 이른 review_at 부터.
      // ⚠️ "미복기" 판정은 SQL 의 actual_outcome IS NULL 에 더는 의존하지 않는다(Phase 4 #1-risk):
      //   wild 트랙은 actual_outcome 을 null 로 유지하고 "복기 완료"를 decision_frame.wild.review 로
      //   표시하므로, SQL 로 actual_outcome IS NULL 만 거르면 (a) 복기된 wild 가 영영 대기로 남고
      //   (b) DB 는 JS 헬퍼를 못 부른다. → SQL 은 review_at 도래 + decision 만 거르고(인덱스 가능),
      //   복기 여부는 isAwaitingReview(트랙별 단일 진실 공급원)로 JS post-filter 한다.
      //   tame/레거시 동작은 동일: actual_outcome 있으면 isAwaitingReview=false → 목록에서 제외.
      // LIMIT: post-filter 로 일부가 탈락할 수 있으므로 후보를 넉넉히(12) 받아 필터 후 3개로 자른다.
      const reviewNow = new Date();
      // 상한 = 오늘 끝(KST 23:59:59.999) — review_at 이 검토일 23:59(KST)로 저장돼도 '당일' 결정이
      //   SQL 단계에서 걸러지지 않게 한다. 정밀 판정(KST 날짜)은 아래 isAwaitingReview 가 한다.
      const reviewKstNow = new Date(reviewNow.getTime() + 9 * 60 * 60 * 1000);
      const endOfTodayKstIso = new Date(
        Date.UTC(reviewKstNow.getUTCFullYear(), reviewKstNow.getUTCMonth(), reviewKstNow.getUTCDate(), 23, 59, 59, 999) -
          9 * 60 * 60 * 1000,
      ).toISOString();
      const { data: pendingDecisionRows } = await supabase
        .from('logs')
        .select('id, trigger, problem_type, actual_outcome, decision_frame, review_at')
        .eq('user_id', userId)
        .eq('log_type', 'decision')
        .lte('review_at', endOfTodayKstIso)
        .order('review_at', { ascending: true })
        .limit(12);
      setPendingDecisions(
        (pendingDecisionRows ?? [])
          .filter((row) =>
            isAwaitingReview(
              row as Pick<Log, 'problem_type' | 'actual_outcome' | 'decision_frame' | 'review_at'>,
              reviewNow
            )
          )
          .slice(0, 3)
          .map((row) => ({
            id: (row as { id: string }).id,
            trigger: (row as { trigger: string }).trigger,
          }))
      );

      // 이번 주 (7일) Δpain 양수 합계
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: deltaPainRows } = await supabase
        .from('intervention')
        .select('reevaluated_pain_score, logs!inner(pain_score, user_id)')
        .eq('logs.user_id', userId)
        .not('reevaluated_pain_score', 'is', null)
        .gte('reevaluated_at', oneWeekAgo);

      const pairs: PainPair[] = (deltaPainRows ?? []).map((row) => {
        const logsField = row.logs as unknown as
          | { pain_score: number | null }
          | Array<{ pain_score: number | null }>;
        const log = Array.isArray(logsField) ? logsField[0] : logsField;
        return {
          initial: log?.pain_score ?? null,
          reevaluated: (row as { reevaluated_pain_score: number | null }).reevaluated_pain_score,
        };
      });
      setWeeklyPositiveDeltaPain(sumPositiveDeltaPain(pairs));

      // 아키타입 — distortion_type=null placeholder는 자동 제외 (insights와 통일)
      const archetypeRows = (analysisData ?? []) as Array<{ distortion_type: string | null }>;
      setArchetype(getArchetypeResultFromRows(archetypeRows));

      // 매뉴얼 너지 배너: 3회 이상 분석(왜곡 탐지된 것만) + 영구 dismiss 안 한 사용자에게만
      const realDistortionCount = archetypeRows.filter((r) => r.distortion_type != null).length;
      if (typeof window !== 'undefined') {
        const dismissed = localStorage.getItem('manual-nudge-dismissed') === '1';
        setShowManualNudge(!dismissed && realDistortionCount >= 3);
      }

      // 오늘 체크인 상태
      const kstNow = new Date(Date.now() + KST_OFFSET);
      const todayStartIso = new Date(
        Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - KST_OFFSET
      ).toISOString();

      const { data: todayCheckins } = await supabase
        .from('checkins')
        .select('type')
        .eq('user_id', userId)
        .gte('created_at', todayStartIso);

      setTodayCheckin({
        morning: (todayCheckins ?? []).some((c: { type: string }) => c.type === 'morning'),
        evening: (todayCheckins ?? []).some((c: { type: string }) => c.type === 'evening'),
      });
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </main>
    );
  }

  const greeting = user ? getGreeting(user.email!) : null;

  const dismissManualNudge = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('manual-nudge-dismissed', '1');
    }
    setShowManualNudge(false);
  };

  return (
    <main className="min-h-screen bg-background">
      {successToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-primary-fg text-sm font-semibold px-6 py-3 rounded-2xl shadow-elev2">
          성공 순간이 기록됐습니다 +15점 (분석 보너스 포함)
        </div>
      )}
      {checkinToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-fg text-sm font-semibold px-6 py-3 rounded-2xl shadow-elev2">
          체크인 완료. 연속 기록이 유지됩니다.
        </div>
      )}

      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 pt-4 pb-1">
          <h1 className="text-[17px] font-extrabold tracking-tight text-primary">BlueBird</h1>
          <button
            onClick={() => router.push('/me')}
            aria-label="내 프로필"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-tint text-sm font-bold text-primary"
          >
            {greeting?.name?.[0]?.toUpperCase()}
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="max-w-lg mx-auto px-5 py-5 pb-28 space-y-4">

        {/* 인사말 */}
        <div className="pt-1">
          <p className="text-2xl font-bold leading-snug tracking-tight text-text-primary">
            {greeting?.name}님,<br />{greeting?.message}
          </p>
        </div>

        {/* 새 결정 기록 — 핵심 진입점 (decision-pivot). v2 primary 필 카드 */}
        <button
          onClick={() => router.push('/decision?from=dashboard')}
          className="flex w-full items-center justify-between rounded-card bg-primary px-5 py-4 text-left text-primary-fg transition-transform active:scale-[0.98] touch-manipulation"
        >
          <div className="flex items-center gap-3 min-w-0">
            <ClipboardList size={22} strokeWidth={1.75} className="flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight">새 결정 기록하기</p>
              <p className="mt-0.5 text-xs text-white/80">결정과 확신을 적어두면, 나중에 결과로 맞춰 볼 수 있어요.</p>
            </div>
          </div>
          <ChevronRight size={20} strokeWidth={2} className="flex-shrink-0 text-white/80" />
        </button>

        {/* 왜곡 기록 — 뚜렷한 2차 진입점 (결정 1차에 종속하는 윤곽선 카드). decision-pivot 위계 보존:
            채움(primary) 1개 + 윤곽선(surface) 대비로 "결정 1차 / 왜곡 2차"를 시각·카피로 명시. */}
        <button
          onClick={() => router.push('/log?from=dashboard')}
          className="flex w-full items-center justify-between rounded-card border border-background-tertiary bg-surface px-5 py-4 text-left transition-transform active:scale-[0.98] touch-manipulation"
          aria-label="결정과 무관한 생각 기록하기"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Search size={22} strokeWidth={1.75} className="flex-shrink-0 text-text-secondary" />
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight text-text-primary">결정과 무관한 생각도 기록</p>
              <p className="mt-0.5 text-xs text-text-secondary">떠오른 생각의 왜곡 패턴을 따로 짚어둘 수 있어요.</p>
            </div>
          </div>
          <ChevronRight size={20} strokeWidth={2} className="flex-shrink-0 text-text-tertiary" />
        </button>

        {/* 재평가 대기 카드 */}
        {pendingReview && (
          <ReviewCard
            logId={pendingReview.logId}
            triggerSnippet={pendingReview.triggerSnippet}
            daysAgo={pendingReview.daysAgo}
          />
        )}

        {/* 결정 복기 대기 카드 — review_at 도래 + 미복기. 관찰 톤(가드 #4) */}
        {pendingDecisions.map((decision) => (
          <PendingReviewCard
            key={decision.id}
            logId={decision.id}
            decisionSnippet={decision.trigger.slice(0, 40)}
          />
        ))}

        {/* 매뉴얼 너지 배너 — 3회 이상 분석한 사용자에게만, 영구 dismiss 가능 */}
        {showManualNudge && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="text-primary mt-0.5 shrink-0" size={20} strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary mb-0.5">
                  왜곡이 작동하는 이유가 궁금하다면
                </p>
                <p className="text-xs text-text-secondary">
                  매뉴얼에서 인지 왜곡 5가지의 정의와 디버깅 질문을 확인할 수 있어요.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <Link
                    href="/manual"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    매뉴얼 열기 →
                  </Link>
                  <button
                    onClick={dismissManualNudge}
                    className="text-xs text-text-tertiary hover:text-text-secondary"
                  >
                    다시 보지 않기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 체크인 카드 */}
        <div className="bg-surface rounded-2xl p-4 border border-background-tertiary shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">오늘의 체크인</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/checkin/history')}
                className="text-xs text-text-secondary"
              >
                기록 보기
              </button>
              {(() => {
                // 현재 KST 시각대의 type 결정 — /checkin 페이지의 getCheckinType과 동일 로직
                const kstHour = (new Date().getUTCHours() + 9) % 24;
                const currentType: 'morning' | 'evening' =
                  kstHour >= 5 && kstHour < 13 ? 'morning' : 'evening';
                const currentTypeDone =
                  currentType === 'morning' ? todayCheckin.morning : todayCheckin.evening;
                return currentTypeDone ? (
                  <span className="text-xs text-text-tertiary font-medium">
                    오늘 완료 ✓
                  </span>
                ) : (
                  <button
                    onClick={() => router.push('/checkin')}
                    className="text-xs text-primary font-semibold"
                  >
                    체크인하기
                  </button>
                );
              })()}
            </div>
          </div>
          <div className="flex gap-3">
            <div className={`flex-1 flex items-center gap-2 p-3 rounded-xl border ${
              todayCheckin.morning ? 'border-success bg-success bg-opacity-5' : 'border-background-tertiary'
            }`}>
              <SunMedium
                size={18}
                strokeWidth={1.75}
                className={todayCheckin.morning ? 'text-success' : 'text-text-tertiary'}
              />
              <div>
                <p className="text-xs font-semibold text-text-primary">모닝</p>
                <p className={`text-[10px] ${todayCheckin.morning ? 'text-success' : 'text-text-tertiary'}`}>
                  {todayCheckin.morning ? '완료' : '미완료'}
                </p>
              </div>
            </div>
            <div className={`flex-1 flex items-center gap-2 p-3 rounded-xl border ${
              todayCheckin.evening ? 'border-success bg-success bg-opacity-5' : 'border-background-tertiary'
            }`}>
              <Moon
                size={18}
                strokeWidth={1.75}
                className={todayCheckin.evening ? 'text-success' : 'text-text-tertiary'}
              />
              <div>
                <p className="text-xs font-semibold text-text-primary">이브닝</p>
                <p className={`text-[10px] ${todayCheckin.evening ? 'text-success' : 'text-text-tertiary'}`}>
                  {todayCheckin.evening ? '완료' : '미완료'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/*
          푸시 알림 자산 — 사용자 permission이 default일 때만 컴포넌트 내부에서 렌더.
          - 방금 체크인 완료 직후: P2 카드 (1회 한정, dismiss 영구)
          - 그 외 기본 상태: P3 배너 (7일 silence, dismiss 시 침묵)
          상호배타로 렌더해 같은 화면 중복 노출 방지.
        */}
        {justCheckedIn ? <EnablePushCard /> : <EnablePushBanner />}

        {/* 스트릭 + 자율성 지수 + 이번 주 줄어든 고통 */}
        {(() => {
          const { rank, progressPct, pointsToNext } = getRankResult(autonomyScore);
          return (
            <>
              {/* 자율성 지수 — 그라데이션 Hero 스탯 (v2) */}
              <div
                className="rounded-card p-[22px] text-white"
                style={{
                  background: 'linear-gradient(160deg,#1B4332 0%,#2D6A4F 60%,#40916C 140%)',
                  boxShadow: '0 10px 30px rgba(45,106,79,0.28)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white/80">
                      <InfoTooltip text={AUTONOMY_SCORE_TOOLTIP}>자율성 지수</InfoTooltip>
                    </p>
                    <p className="mt-1 flex items-baseline gap-1 text-[40px] font-extrabold leading-none tracking-tight tabular-nums">
                      {autonomyScore}
                      <span className="text-lg font-bold opacity-85">점</span>
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-surface/[0.18] px-[11px] py-1.5 text-xs font-bold">
                    {rank.title}
                  </span>
                </div>
                <div className="mt-[18px] h-1.5 overflow-hidden rounded-full bg-surface/20">
                  <div className="h-full rounded-full bg-surface transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="mt-2.5 text-xs leading-snug text-white/80">
                  {pointsToNext !== null
                    ? `다음 단계까지 ${pointsToNext}점 · ${rank.description}`
                    : `최종 단계 · ${rank.description}`}
                </p>
              </div>

              {/* 2칸 스탯: 연속 기록 / 이번 주 Δ고통 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-card border border-background-tertiary bg-surface p-4">
                  <p className="text-xs text-text-secondary">연속 기록</p>
                  <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-text-primary tabular-nums">
                    {streak.current}<span className="ml-0.5 text-sm font-bold text-text-tertiary">일</span>
                  </p>
                  <p className="mt-1 text-[10px] text-text-tertiary">
                    {streak.doneToday ? '오늘 기록 완료' : streak.best > 0 ? `최고 ${streak.best}일` : '오늘 시작해보세요'}
                  </p>
                </div>
                <div
                  onClick={() => router.push('/insights?view=thought#delta-pain')}
                  className="cursor-pointer rounded-card border border-background-tertiary bg-surface p-4 transition-colors hover:border-primary"
                >
                  <p className="text-xs text-text-secondary">
                    <InfoTooltip text={DELTA_PAIN_WEEKLY_TOOLTIP}>이번 주 줄어든 고통</InfoTooltip>
                  </p>
                  <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-primary tabular-nums">
                    {weeklyPositiveDeltaPain}<span className="ml-0.5 text-sm font-bold text-text-tertiary">점</span>
                  </p>
                  <p className="mt-1 text-[10px] text-text-tertiary">자세히 보기 →</p>
                </div>
              </div>
            </>
          );
        })()}

        {/* 아키타입 카드 */}
        <ArchetypeCard result={archetype} onClick={() => router.push('/insights?view=thought')} />

        {/* 성공 순간 기록 */}
        {successLogs.length > 0 && (
          <div className="bg-surface rounded-2xl p-4 border border-success/30 shadow-sm">
            <h3 className="text-sm font-semibold text-text-primary mb-3">최근 성공 순간</h3>
            <div className="space-y-2">
              {successLogs.map((log) => (
                <div key={log.id} className="bg-success/5 border border-success/20 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-text-primary line-clamp-1">{log.trigger}</p>
                    <span className="text-xs text-text-secondary whitespace-nowrap ml-2">{formatDate(log.created_at)}</span>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">{log.thought}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 푸터: 보조 콘텐츠 진입점 */}
        <div className="pt-2 flex items-center justify-center gap-3 text-[11px] text-text-tertiary">
          <Link href="/our-philosophy" className="hover:text-text-secondary hover:underline">
            철학
          </Link>
          <span aria-hidden>·</span>
          <Link href="/manual" className="hover:text-text-secondary hover:underline">
            매뉴얼
          </Link>
          <span aria-hidden>·</span>
          <Link href="/safety/resources" className="hover:text-text-secondary hover:underline">
            정신건강 자원
          </Link>
        </div>
        <p className="pb-1 text-center text-[10px] text-text-tertiary">© 2026 BlueBird. All rights reserved.</p>
      </div>

      <BottomTabBar />

      {/* 단계 전이 인터스티셜 — Plan agent 권장안 A (2026-05-16). localStorage 1회 표시 가드 */}
      {stageTransition && (
        <StageTransitionModal
          previousRankTitle={stageTransition.previousTitle}
          currentRank={getRankResult(autonomyScore).rank}
          totalLogs={stageTransition.totalLogs}
          topDistortionKorean={stageTransition.topDistortionKorean}
          onDismiss={() => setStageTransition(null)}
        />
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
