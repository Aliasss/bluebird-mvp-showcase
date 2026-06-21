'use client';

import { useEffect, useState } from 'react';
import type { Rank } from '@/lib/utils/rank';

// Plan agent 권장안 A (2026-05-16) — 단계 전이 인터스티셜.
// SDT 정합: 외부 보상·축하 X. "전이"·"분석 시작" 어휘 + 정량 회고 + 자기 기록용 캡션.
// 1회만 표시 (localStorage 플래그), 즉시 dismiss 가능, 5초 자동 dismiss.

export interface StageTransitionModalProps {
  /** 직전에 본인이 머물러 있던 단계명 (localStorage 기반). null이면 첫 진입이라 표시 안 함 */
  previousRankTitle: string | null;
  /** 현재 단계 정보 */
  currentRank: Rank;
  /** 자기 기록용 캡션에 들어갈 정량 — 옵션. 없으면 단계명만 */
  totalLogs?: number;
  /** 옵션 — 가장 자주 등장한 왜곡 한국어명 (있으면 캡션에 추가) */
  topDistortionKorean?: string | null;
  /** 사용자가 [닫기] 클릭 또는 5초 자동 dismiss 시 호출. localStorage 갱신은 부모가 처리 */
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 5000;

export default function StageTransitionModal({
  previousRankTitle,
  currentRank,
  totalLogs,
  topDistortionKorean,
  onDismiss,
}: StageTransitionModalProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => handleDismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    if (dismissed) return;
    setDismissed(true);
    onDismiss();
  };

  if (dismissed) return null;

  const transitionLabel = previousRankTitle
    ? `${previousRankTitle} → ${currentRank.title} 전이`
    : `${currentRank.title} 진입`;

  const today = new Date();
  const captionDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div
      role="dialog"
      aria-labelledby="stage-transition-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleDismiss}
    >
      <div
        className="bg-surface rounded-2xl p-6 shadow-card max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — 분석가 톤. 축하 어휘 X */}
        <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
          단계 전이
        </p>
        <h2
          id="stage-transition-title"
          className="text-lg font-bold text-text-primary tracking-tight"
        >
          {transitionLabel}
        </h2>
        <p className="text-sm text-text-secondary mt-1 leading-snug">
          {currentRank.description}
        </p>

        {/* 정량 회고 (옵션) */}
        {(totalLogs !== undefined || topDistortionKorean) && (
          <div className="mt-4 pt-4 border-t border-background-tertiary space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-text-tertiary">
              지금까지 누적
            </p>
            {totalLogs !== undefined && (
              <p className="text-sm text-text-primary">
                기록 <span className="font-semibold">{totalLogs}건</span>
              </p>
            )}
            {topDistortionKorean && (
              <p className="text-sm text-text-primary">
                가장 자주 등장한 왜곡 <span className="font-semibold">{topDistortionKorean}</span>
              </p>
            )}
          </div>
        )}

        {/* 자기 기록용 캡션 — 공유 강제 X */}
        <p className="text-[11px] text-text-tertiary mt-4 italic">
          {captionDate} · {currentRank.title} 진입
        </p>

        {/* 액션 */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5"
          >
            건너뛰기
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-semibold text-primary-fg bg-primary hover:bg-primary/90 transition-colors px-4 py-1.5 rounded-lg"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
