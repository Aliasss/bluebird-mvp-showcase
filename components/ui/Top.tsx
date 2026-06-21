/**
 * Top — 화면 진입부 대형 헤드라인 (v2 · 모바일 리스트 UI 일반 구조 재해석)
 *
 * "한 화면 한 메시지" 원칙. 26px/700 굵은 2줄 헤드라인 + 선택 보조문구.
 * Top 타이틀은 질문/관찰형(분석가 톤), 보조문구는 사실 한 줄.
 * UI 키트 `Top`.
 */
import type { ReactNode } from 'react';

type TopProps = {
  title: ReactNode;
  sub?: ReactNode;
  className?: string;
};

export default function Top({ title, sub, className = '' }: TopProps) {
  return (
    <div className={`pt-3 px-5 pb-5 ${className}`}>
      <h1
        className="text-[26px] font-bold leading-[1.32] tracking-tighter text-text-primary"
        style={{ textWrap: 'pretty' }}
      >
        {title}
      </h1>
      {sub && (
        <p className="mt-2.5 text-[15px] leading-[1.55] tracking-snug text-text-secondary">
          {sub}
        </p>
      )}
    </div>
  );
}
