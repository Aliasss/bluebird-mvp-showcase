'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle, Star, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import BottomTabBar from '@/components/ui/BottomTabBar';
import InfoTooltip from '@/components/ui/InfoTooltip';
import PushToggle from '@/components/notifications/PushToggle';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { AUTONOMY_SCORE_TOOLTIP } from '@/lib/copy/autonomy';
import { SERVICE_CONTACT_EMAIL, buildMailto } from '@/lib/copy/contact';
import { getRankResult, RANKS } from '@/lib/utils/rank';
import type { User } from '@supabase/supabase-js';

const SECTION_LABEL = 'mb-2 px-1 text-[19px] font-bold tracking-tight text-text-primary';

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLogs: 0, completedActions: 0, autonomyScore: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);

      const [
        { count: totalLogs },
        { count: completedActions },
        { data: interventionsData },
      ] = await Promise.all([
        supabase.from('logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('intervention')
          .select('log_id, logs!inner(user_id)', { count: 'exact', head: true })
          .eq('is_completed', true)
          .eq('logs.user_id', user.id),
        supabase
          .from('intervention')
          .select('autonomy_score, logs!inner(user_id)')
          .eq('logs.user_id', user.id)
          .not('autonomy_score', 'is', null),
      ]);

      const totalScore = interventionsData?.reduce((sum, item) => sum + (item.autonomy_score || 0), 0) || 0;
      setStats({ totalLogs: totalLogs || 0, completedActions: completedActions || 0, autonomyScore: totalScore });
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const name = user?.email?.split('@')[0] ?? '';

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </main>
    );
  }

  const { rank, progressPct, pointsToNext } = getRankResult(stats.autonomyScore);

  const MENU = [
    { label: '인사이트', sub: '결정 정확도 · 생각 패턴 분석', href: '/insights' },
    { label: '결정 스타일 진단', sub: '베타 미리보기 · 새 탭에서 열려요', href: '/decision-test', external: true },
    { label: '체크인 기록', sub: '모닝·이브닝 체크인 히스토리', href: '/checkin/history' },
    { label: '매뉴얼', sub: '서비스 이용 가이드', href: '/manual' },
    { label: '블루버드 철학', sub: '결정을 기록하면 뭐가 달라지나요?', href: '/our-philosophy' },
    { label: '업데이트 노트', sub: '최근에 바뀐 점', href: '/updates' },
    { label: '온보딩 다시 보기', sub: '온보딩 9장면 다시 보기 — 왜·무엇·어떻게', href: '/onboarding/1?replay=1' },
    { label: '운영자에게 문의', sub: `${SERVICE_CONTACT_EMAIL} — 메일로 직접 전달`, href: buildMailto('[BlueBird] 문의'), external: true },
    { label: '베타 혜택 안내', sub: '인터뷰 완주자 혜택 + 무효 조건', href: '/beta-incentive' },
    { label: '홈 화면에 추가', sub: 'PWA 설치 가이드', href: '/install' },
    { label: '정신건강 자원', sub: '위기 상담·전문기관 안내', href: '/safety/resources' },
  ];

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background px-5 pt-4 pb-1">
        <span className="text-[17px] font-extrabold tracking-tight text-primary">나</span>
      </header>

      <div className="mx-auto max-w-lg px-5 pb-28 space-y-6">

        {/* 프로필 */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center rounded-full bg-primary-tint">
            <span className="text-2xl font-bold text-primary">{name[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xl font-extrabold tracking-tight text-text-primary">{name}님</p>
            <p className="mt-0.5 text-sm text-text-tertiary">{rank.title} · 분석 {stats.totalLogs}회</p>
            <p className="truncate text-xs text-text-tertiary">{user?.email}</p>
          </div>
        </div>

        {/* 분석 활동 */}
        <div>
          <h2 className={SECTION_LABEL}>분석 활동</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-card border border-background-tertiary bg-surface p-4 text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint">
                <BookOpen size={16} className="text-primary" />
              </div>
              <p className="text-xl font-bold text-text-primary tabular-nums">{stats.totalLogs}</p>
              <p className="mt-0.5 text-[10px] text-text-secondary">전체 로그</p>
            </div>
            <div className="rounded-card border border-background-tertiary bg-surface p-4 text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                <CheckCircle size={16} className="text-success" />
              </div>
              <p className="text-xl font-bold text-text-primary tabular-nums">{stats.completedActions}</p>
              <p className="mt-0.5 text-[10px] text-text-secondary">완료한 행동</p>
            </div>
            <div className="rounded-card border border-background-tertiary bg-surface p-4 text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-warning/10">
                <Star size={16} className="text-warning" />
              </div>
              <p className="text-xl font-bold text-text-primary tabular-nums">{stats.autonomyScore}</p>
              <p className="mt-0.5 text-[10px] text-text-secondary">
                <InfoTooltip text={AUTONOMY_SCORE_TOOLTIP}>자율성 지수</InfoTooltip>
              </p>
            </div>
          </div>

          {/* 등급 카드 */}
          <div className="mt-3 rounded-card border border-warning/30 bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">현재 단계</p>
                <p className="text-base font-bold text-warning">{rank.title}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{rank.description}</p>
              </div>
              <p className="text-2xl font-bold text-text-primary tabular-nums">{stats.autonomyScore}점</p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background-secondary">
              <div
                className="h-full rounded-full bg-warning transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-text-tertiary">
              {pointsToNext !== null
                ? `다음 단계까지 ${pointsToNext}점 남았습니다`
                : '최종 단계 도달 — 자기 인지 시스템이 일관되게 운영되는 구간'}
            </p>

            <div className="mt-4 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">단계 로드맵</p>
              {RANKS.map((r) => (
                <div key={r.title} className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${stats.autonomyScore >= r.min ? 'bg-warning' : 'bg-background-tertiary'}`} />
                  <span className={`text-[11px] ${stats.autonomyScore >= r.min ? 'font-medium text-text-primary' : 'text-text-tertiary'}`}>
                    {r.title}
                  </span>
                  <span className="ml-auto text-[10px] text-text-tertiary">
                    {r.max !== null ? `${r.min}~${r.max}점` : `${r.min}점+`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 탐색 */}
        <div>
          <h2 className={SECTION_LABEL}>탐색</h2>
          <div className="divide-y divide-background-tertiary overflow-hidden rounded-card border border-background-tertiary bg-surface">
            {MENU.map(({ label, sub, href, external }) => (
              <button
                key={href}
                onClick={() =>
                  external
                    ? window.open(href, '_blank', 'noopener,noreferrer')
                    : router.push(href)
                }
                className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-background-secondary touch-manipulation"
              >
                <div>
                  <p className="text-base font-semibold tracking-snug text-text-primary">{label}</p>
                  <p className="text-[13px] text-text-tertiary">{sub}</p>
                </div>
                <ChevronRight size={20} strokeWidth={1.75} className="flex-shrink-0 text-text-tertiary" />
              </button>
            ))}
          </div>
        </div>

        {/* 알림 */}
        <div>
          <h2 className={SECTION_LABEL}>알림</h2>
          <div className="rounded-card border border-background-tertiary bg-surface px-4">
            <PushToggle />
          </div>
        </div>

        {/* 화면 */}
        <div>
          <h2 className={SECTION_LABEL}>화면</h2>
          <div className="space-y-3 rounded-card border border-background-tertiary bg-surface p-4">
            <div>
              <p className="text-base font-semibold tracking-snug text-text-primary">테마</p>
              <p className="text-[13px] text-text-tertiary">밝게 보거나 어둡게 볼 수 있어요</p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* 로그아웃 / 탈퇴 */}
        <div className="space-y-2">
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border border-danger/30 py-3 text-sm font-medium text-danger"
          >
            로그아웃
          </button>
          <button
            onClick={() => router.push('/me/delete-account')}
            className="w-full py-3 text-xs font-medium text-text-tertiary transition-colors hover:text-danger"
          >
            회원 탈퇴
          </button>
        </div>

        {/* 법적 문서 */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pb-4 pt-2 text-xs text-text-tertiary">
          <a href="/terms" className="underline-offset-2 hover:text-text-secondary hover:underline">이용약관</a>
          <span>·</span>
          <a href="/privacy" className="underline-offset-2 hover:text-text-secondary hover:underline">개인정보 처리방침</a>
          <span>·</span>
          <a href="/disclaimer" className="underline-offset-2 hover:text-text-secondary hover:underline">면책 안내</a>
          <span>·</span>
          <a href="/licenses" className="underline-offset-2 hover:text-text-secondary hover:underline">오픈소스 라이선스</a>
        </div>
      </div>

      <BottomTabBar />
    </main>
  );
}
