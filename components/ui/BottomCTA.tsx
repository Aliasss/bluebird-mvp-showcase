/**
 * BottomCTA — 하단 고정 1차 액션 + 위쪽 보호 그라데이션.
 *
 * 입력/플로우 화면 하단에 고정. 위 28px 그라데이션(bg→투명)으로 스크롤 콘텐츠를
 * 부드럽게 가리고, 아래 bg 패딩 영역에 풀폭 버튼(children) + 선택 보조문구.
 * 모바일 컨테이너(max-w-lg) 중앙 정렬. safe-area 하단 여백 포함.
 * UI 키트 `BottomCTA`.
 */
import type { ReactNode } from 'react';

type BottomCTAProps = {
  children: ReactNode;
  sub?: string;
};

export default function BottomCTA({ children, sub }: BottomCTAProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[45]">
      <div className="mx-auto max-w-lg">
        {/* 28px 보호 그라데이션 */}
        <div className="h-7 bg-gradient-to-t from-background to-transparent" />
        <div className="pointer-events-auto bg-background px-5 pb-[34px] pt-1.5">
          {sub && <p className="mb-2.5 text-center text-xs text-text-tertiary">{sub}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
