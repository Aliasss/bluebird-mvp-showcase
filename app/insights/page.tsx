'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import BottomTabBar from '@/components/ui/BottomTabBar';
import DecisionPatternsView from '@/components/insights/DecisionPatternsView';
import ThoughtPatternsView from '@/components/insights/ThoughtPatternsView';

// 인사이트 허브 — 결정 패턴 ‖ 생각 패턴 두 갈래를 한 화면에서 전환.
//   피벗 정합(2026-06-09): 결정(캘리브레이션)을 앞세우고, 인지 왜곡 분석은 둘째 탭으로.
//   '인사이트'는 이제 두 갈래를 모두 담는 포괄어 → 네이밍 유지.
//   각 뷰는 자기 데이터만 fetch(자기 카운트) — '총 분석 횟수' 등 숫자 혼선 해소.

type View = 'decision' | 'thought';

export default function InsightsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('decision');

  // 초기 탭은 URL ?view= 로 결정(딥링크·새로고침 유지). useSearchParams 대신 window 직접 읽어
  // Suspense 경계 요구를 피한다(빌드 단순화).
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'thought' || v === 'decision') setView(v);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const selectView = (v: View) => {
    setView(v);
    window.history.replaceState(null, '', `/insights?view=${v}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">BlueBird</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/manual')} className="text-sm text-text-secondary hover:underline transition-colors">Manual</button>
            <button onClick={handleLogout} className="text-sm text-text-secondary hover:text-primary transition-colors">로그아웃</button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
        {/* 헤드라인 */}
        <div className="mb-5">
          <p className="text-[13px] font-extrabold tracking-tight text-primary">인사이트</p>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">내 결정과 생각 패턴</h2>
          <p className="mt-1 text-sm text-text-secondary">기록이 쌓일수록 내 결정과 생각의 패턴이 또렷해져요.</p>
        </div>

        {/* 하위 탭 — 결정 우선 */}
        <div role="tablist" aria-label="인사이트 갈래" className="mb-6 grid grid-cols-2 gap-1.5 rounded-ctrl bg-background-secondary p-1">
          {([['decision', '결정 패턴'], ['thought', '생각 패턴']] as [View, string][]).map(([v, label]) => {
            const active = view === v;
            return (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectView(v)}
                className={`rounded-[0.625rem] py-2 text-sm font-semibold transition-colors touch-manipulation ${
                  active ? 'bg-primary text-primary-fg' : 'text-text-secondary hover:bg-surface'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {view === 'decision' ? <DecisionPatternsView /> : <ThoughtPatternsView />}
      </div>
      <BottomTabBar />
    </main>
  );
}
