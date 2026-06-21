'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, ScrollText, Plus, TrendingUp, User } from 'lucide-react';
import { useState } from 'react';

const TAB_ROUTES = ['/dashboard', '/journal', '/insights', '/me'];

const TABS = [
  { href: '/dashboard', icon: Home, label: '홈' },
  { href: '/journal', icon: ScrollText, label: '일지' },
  null, // FAB
  { href: '/insights', icon: TrendingUp, label: '인사이트' },
  { href: '/me', icon: User, label: '나' },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);

  const isTabRoute = TAB_ROUTES.some((r) => pathname === r);
  if (!isTabRoute) return null;

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* FAB 오버레이 */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* FAB 팝업 메뉴 */}
      {fabOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 items-center">
          <button
            onClick={() => { setFabOpen(false); router.push('/decision?from=fab'); }}
            className="bg-primary text-primary-fg text-sm font-semibold py-3 px-7 rounded-2xl shadow-elev2 whitespace-nowrap active:scale-95 transition-transform touch-manipulation"
          >
            결정 기록하기
          </button>
          <button
            onClick={() => { setFabOpen(false); router.push('/log/success'); }}
            className="bg-success text-primary-fg text-sm font-semibold py-3 px-7 rounded-2xl shadow-elev2 whitespace-nowrap active:scale-95 transition-transform touch-manipulation"
          >
            성공 순간 기록하기
          </button>
          <button
            onClick={() => { setFabOpen(false); router.push('/log'); }}
            className="bg-background-secondary text-text-secondary border border-background-tertiary text-sm font-semibold py-3 px-7 rounded-2xl shadow-elev2 whitespace-nowrap active:scale-95 transition-transform touch-manipulation"
          >
            왜곡 기록하기
          </button>
        </div>
      )}

      {/* 바텀 탭 바 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-background-tertiary bg-surface/85 backdrop-blur-md pb-safe-bottom">
        <div className="flex items-center h-16 max-w-lg mx-auto px-2">
          {TABS.map((tab, i) => {
            if (!tab) {
              return (
                <div key="fab" className="flex-1 flex justify-center">
                  <button
                    onClick={() => setFabOpen(!fabOpen)}
                    className={`w-14 h-14 -mt-6 rounded-full bg-primary text-primary-fg flex items-center justify-center shadow-elev2 active:scale-95 transition-all touch-manipulation ${fabOpen ? 'rotate-45' : ''}`}
                    aria-label="기록하기"
                  >
                    <Plus size={26} strokeWidth={2} />
                  </button>
                </div>
              );
            }

            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 touch-manipulation transition-colors ${
                  active ? 'text-primary' : 'text-text-tertiary'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-text-tertiary'}`}>
                  {tab.label}
                </span>
                {active && <div className="w-1 h-1 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
