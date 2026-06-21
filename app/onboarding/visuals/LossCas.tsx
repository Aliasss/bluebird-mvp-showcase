// act2-3: 손실/이득 비대칭 그래프 (λ ≈ 2.25) + 반추/걱정 게이지 2개.
// Kahneman & Tversky 전망이론 + Wells CAS 모델 시각화.

export default function LossCas() {
  return (
    <div className="w-full max-w-[280px] mx-auto" aria-hidden="true">
      {/* 손실/이득 그래프 */}
      <svg viewBox="0 0 280 100" className="w-full h-auto">
        {/* 축 */}
        <line x1="20" y1="50" x2="260" y2="50" stroke="currentColor" strokeWidth="0.5" />
        <line x1="140" y1="10" x2="140" y2="90" stroke="currentColor" strokeWidth="0.5" />

        {/* 이득 곡선 (오른쪽 위) — 완만 */}
        <path
          d="M 140 50 Q 180 42 220 36 T 260 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        {/* 손실 곡선 (왼쪽 아래) — 가파름 (2.25배) */}
        <path
          d="M 140 50 Q 110 65 80 78 T 20 92"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="text-primary"
        />

        <text x="245" y="24" textAnchor="end" className="fill-text-tertiary text-[9px]">이득</text>
        <text x="60" y="70" textAnchor="start" className="fill-primary text-[9px] font-semibold">손실 ×2.25</text>
      </svg>

      {/* 반추/걱정 게이지 */}
      <div className="mt-2 space-y-1.5">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-text-secondary">반추</span>
            <span className="text-[9px] text-text-tertiary font-mono">측정</span>
          </div>
          <div className="h-1 bg-background-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '64%' }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-text-secondary">걱정</span>
            <span className="text-[9px] text-text-tertiary font-mono">측정</span>
          </div>
          <div className="h-1 bg-background-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '48%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
