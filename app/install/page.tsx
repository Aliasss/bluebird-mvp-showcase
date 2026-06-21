'use client';

import { useRouter } from 'next/navigation';
import { Smartphone, Share, Plus, MoreHorizontal } from 'lucide-react';

export default function InstallPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone size={24} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">홈 화면에 추가하기</h1>
          <p className="text-sm text-text-secondary">
            홈 화면에 추가하면 연속 기록을 유지하기 훨씬 쉬워집니다.
          </p>
        </div>

        {/* iOS */}
        <div className="rounded-card border border-background-tertiary bg-surface p-5 space-y-4">
          <p className="text-sm font-semibold text-text-primary">iPhone / iPad (Safari)</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-fg text-xs font-bold rounded-full flex items-center justify-center mt-0.5">1</span>
              <p className="text-sm text-text-secondary">Safari 하단의 <Share size={13} className="inline mb-0.5" /> 공유 버튼을 탭합니다.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-fg text-xs font-bold rounded-full flex items-center justify-center mt-0.5">2</span>
              <p className="text-sm text-text-secondary">스크롤 내려 <strong>"홈 화면에 추가"</strong>를 탭합니다.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-fg text-xs font-bold rounded-full flex items-center justify-center mt-0.5">3</span>
              <p className="text-sm text-text-secondary">우측 상단 <strong>"추가"</strong>를 탭하면 완료입니다.</p>
            </div>
          </div>
        </div>

        {/* Android */}
        <div className="rounded-card border border-background-tertiary bg-surface p-5 space-y-4">
          <p className="text-sm font-semibold text-text-primary">Android (Chrome)</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-fg text-xs font-bold rounded-full flex items-center justify-center mt-0.5">1</span>
              <p className="text-sm text-text-secondary">Chrome 우측 상단 <MoreHorizontal size={13} className="inline mb-0.5" /> 메뉴를 탭합니다.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-fg text-xs font-bold rounded-full flex items-center justify-center mt-0.5">2</span>
              <p className="text-sm text-text-secondary"><strong>"앱 설치"</strong> 또는 <strong>"홈 화면에 추가"</strong>를 탭합니다.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-fg text-xs font-bold rounded-full flex items-center justify-center mt-0.5">3</span>
              <p className="text-sm text-text-secondary"><strong>"설치"</strong>를 탭하면 완료입니다.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.back()}
          className="w-full bg-primary text-primary-fg text-base font-semibold py-[17px] px-6 rounded-2xl touch-manipulation active:scale-95 transition-transform hover:bg-primary-dark"
        >
          돌아가기
        </button>
      </div>
    </main>
  );
}
