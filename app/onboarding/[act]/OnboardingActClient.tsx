'use client';

// 온보딩 Act 슬라이드 client component.
//   - 좌우 swipe (touch)
//   - 키보드 ←→
//   - 진행률 인디케이터: "n / 3" + Act dot (●○○ / ○●○ / ○○●)
//   - Act 1·2 끝 슬라이드 CTA 2개 (다음 Act / 바로 시작)
//   - Act 3 끝 CTA 1개 (지금 첫 결정 기록)
//   - 우상단 X 버튼 (Act 1·2 — 스킵·완료 처리)
//   - sr-only live region (슬라이드 위치 announce)
//   - 슬라이드 전환 200ms ease-out
//
// completes onboarding: POST /api/onboarding/complete { reached_act }.
// 실패해도 사용자 흐름은 진행 (best-effort fire-and-forget — 사용자 경험 우선).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import type { SlideMeta } from '@/lib/onboarding/slides';
import { VISUAL_REGISTRY } from '../visuals/registry';

type Props = {
  act: 1 | 2 | 3;
  slides: SlideMeta[];
};

const SWIPE_THRESHOLD = 50; // px. 이 이상 좌·우 drag시 슬라이드 이동.

export default function OnboardingActClient({ act, slides }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReplay = searchParams.get('replay') === '1';

  const [index, setIndex] = useState(0); // 0~2 (Act 내 슬라이드)
  const touchStartX = useRef<number | null>(null);
  const completing = useRef(false);

  const slide = slides[index];
  const isLastSlideInAct = index === slides.length - 1;

  // ─────────────────────────────────────────────
  // 슬라이드 이동
  // ─────────────────────────────────────────────
  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [slides.length]);
  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  // ─────────────────────────────────────────────
  // completes onboarding (스킵·완주 공통)
  //   - reached_act: 사용자가 본 가장 깊은 Act (현재 act)
  //   - replay 모드는 호출 안 함 (이미 completed)
  // ─────────────────────────────────────────────
  const completeOnboarding = useCallback(
    async (reachedAct: 1 | 2 | 3) => {
      if (isReplay) return;
      if (completing.current) return;
      completing.current = true;
      try {
        await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reached_act: reachedAct }),
        });
      } catch {
        // best-effort. 실패해도 사용자 흐름은 막지 않는다.
      }
    },
    [isReplay]
  );

  // ─────────────────────────────────────────────
  // CTA 핸들러
  // ─────────────────────────────────────────────
  const handleNextAct = () => {
    // Act 1·2 → 다음 Act 진입 (completes 호출 X — Act 더 깊게 보러 감)
    router.push(`/onboarding/${act + 1}${isReplay ? '?replay=1' : ''}`);
  };

  const handleStartNow = async () => {
    // Act 1·2 끝 「바로 시작하기」 — 스킵 처리. reached_act = 현재 act.
    await completeOnboarding(act);
    router.push('/dashboard');
  };

  const handleFinishAct3 = async () => {
    // Act 3 끝 「지금 첫 결정 기록하기」 — 완주. reached_act=3.
    await completeOnboarding(3);
    router.push('/decision?from=onboarding');
  };

  const handleClose = async () => {
    // 우상단 X — 스킵 처리. Act 1·2에서만 노출.
    await completeOnboarding(act);
    router.push('/dashboard');
  };

  // ─────────────────────────────────────────────
  // 키보드 ←→
  // ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (index < slides.length - 1) next();
      } else if (e.key === 'ArrowLeft') {
        if (index > 0) prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, slides.length, next, prev]);

  // ─────────────────────────────────────────────
  // Touch swipe
  // ─────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0 && index < slides.length - 1) next();
    else if (dx > 0 && index > 0) prev();
  };

  if (!slide) {
    // 슬라이드 데이터 부재 — 방어. (slidesForAct는 항상 3개 반환하므로 도달 X)
    return null;
  }

  const Visual = VISUAL_REGISTRY[slide.visualKey];
  const showCloseButton = act === 1 || act === 2;

  // Act dot 인디케이터 — Act 1: ●○○, Act 2: ○●○, Act 3: ○○●
  const actDots = ([1, 2, 3] as const).map((a) => a === act);

  return (
    <main
      className="min-h-screen bg-background flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* sr-only live region — 슬라이드 위치 announce */}
      <div role="status" aria-live="polite" className="sr-only">
        Act {act}, 슬라이드 {index + 1} / {slides.length}
      </div>

      {/* 상단: Act dot + n/3 인디케이터 + (조건부) X 버튼 */}
      <header className="sticky top-0 z-10 bg-background border-b border-background-tertiary">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-label={`현재 Act ${act}`}>
              {actDots.map((filled, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${filled ? 'bg-primary' : 'bg-background-tertiary'}`}
                />
              ))}
            </div>
            <span className="text-[11px] font-mono text-text-tertiary">
              {index + 1} / {slides.length}
            </span>
          </div>

          {showCloseButton && (
            <button
              onClick={handleClose}
              aria-label="온보딩 닫기"
              className="w-8 h-8 flex items-center justify-center text-text-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md touch-manipulation"
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </header>

      {/* 슬라이드 본문 — 200ms ease-out fade */}
      <section
        key={slide.id}
        className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-lg mx-auto w-full"
        style={{ animation: 'onboardingFade 200ms ease-out' }}
      >
        {/* 시각 */}
        {Visual && (
          <div className="mb-8 text-text-secondary">
            <Visual />
          </div>
        )}

        {/* 카피 */}
        <div className="space-y-3 text-center max-w-md">
          {slide.paragraphs.map((p, i) => (
            <p key={i} className="text-base text-text-primary leading-relaxed tracking-tight">
              {p}
            </p>
          ))}
        </div>

        {/* caption — 학술 출처. 작은 텍스트, 로고·이미지 없음. */}
        {slide.caption && (
          <p className="mt-6 text-[11px] text-text-tertiary text-center">
            {slide.caption}
          </p>
        )}

        {/* 슬라이드 내 페이지 인디케이터 dot */}
        <div className="mt-8 flex items-center gap-2" aria-hidden="true">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-200 ${
                i === index ? 'bg-primary w-6' : 'bg-background-tertiary w-1.5'
              }`}
            />
          ))}
        </div>
      </section>

      {/* 하단: 다음/CTA 버튼 영역 */}
      <footer className="sticky bottom-0 bg-background border-t border-background-tertiary">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
          {!isLastSlideInAct ? (
            <button
              onClick={next}
              className="w-full bg-primary text-primary-fg text-base font-semibold py-[17px] rounded-2xl hover:bg-primary-dark active:scale-95 transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              다음
            </button>
          ) : act === 1 ? (
            <>
              <button
                onClick={handleNextAct}
                className="w-full bg-primary text-primary-fg text-base font-semibold py-[17px] rounded-2xl hover:bg-primary-dark active:scale-95 transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                작동 원리 더 알아보기
              </button>
              <button
                onClick={handleStartNow}
                className="w-full bg-surface border border-background-tertiary text-text-secondary text-sm font-medium py-3 rounded-2xl active:scale-95 transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                바로 시작하기
              </button>
            </>
          ) : act === 2 ? (
            <>
              <button
                onClick={handleNextAct}
                className="w-full bg-primary text-primary-fg text-base font-semibold py-[17px] rounded-2xl hover:bg-primary-dark active:scale-95 transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                누적 가치 더 알아보기
              </button>
              <button
                onClick={handleStartNow}
                className="w-full bg-surface border border-background-tertiary text-text-secondary text-sm font-medium py-3 rounded-2xl active:scale-95 transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                바로 시작하기
              </button>
            </>
          ) : (
            <button
              onClick={handleFinishAct3}
              className="w-full bg-primary text-primary-fg text-base font-semibold py-[17px] rounded-2xl hover:bg-primary-dark active:scale-95 transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              지금 첫 결정 기록하기
            </button>
          )}

          {index > 0 && (
            <button
              onClick={prev}
              className="w-full text-xs text-text-tertiary py-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
            >
              이전
            </button>
          )}
        </div>
      </footer>

      {/* 슬라이드 전환 애니메이션 keyframe (전역 globals.css 침입 회피) */}
      <style jsx>{`
        @keyframes onboardingFade {
          from {
            opacity: 0;
            transform: translateX(8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </main>
  );
}
