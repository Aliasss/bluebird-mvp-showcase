'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Stepper from './Stepper';

type Props = {
  title: string;
  backHref?: string;
  onBack?: () => void;
  step?: { current: number; total: number };
  rightElement?: React.ReactNode;
};

export default function PageHeader({ title, backHref, onBack, step, rightElement }: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    if (backHref) { router.push(backHref); return; }
    router.back();
  };

  // v2: 텍스트 "뒤로" → chevron 아이콘, 흰 배경+보더 → 무테 bg-background,
  //     진행 바 → 분절 Stepper. props 시그니처는 그대로 유지(호출부 무손상).
  return (
    <>
      <header className="sticky top-0 z-40 flex items-center bg-background px-3 sm:px-4 py-3">
        <button
          onClick={handleBack}
          aria-label="뒤로"
          className="flex min-w-[44px] items-center text-text-primary active:opacity-60 transition-opacity"
        >
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
        <div className="flex-1 text-center">
          {/* 단계 진행 화면은 중앙 타이틀 없이 Stepper로 진행 표시(v2).
              그 외 화면은 중앙 타이틀 표시(하위 호환). */}
          {!step && <p className="text-sm font-semibold text-text-primary">{title}</p>}
        </div>
        <div className="flex min-w-[44px] justify-end">{rightElement ?? null}</div>
      </header>
      {step && <Stepper current={step.current} total={step.total} />}
    </>
  );
}
