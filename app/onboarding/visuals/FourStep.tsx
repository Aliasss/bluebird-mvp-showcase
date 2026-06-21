// act3-1: 4 박스 closed loop — 기록 → 분석 → 검증 → 재평가 → (기록).

export default function FourStep() {
  const steps = ['기록', '분석', '검증', '재평가'];
  return (
    <div className="w-full max-w-[280px] mx-auto" aria-hidden="true">
      <div className="grid grid-cols-4 gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex-1 border border-background-tertiary rounded-lg p-2 bg-surface text-center">
              <p className="text-[11px] font-semibold text-text-primary">{s}</p>
              <p className="text-[9px] text-text-tertiary mt-0.5 font-mono">{i + 1}</p>
            </div>
          </div>
        ))}
      </div>
      {/* 회귀 화살표 */}
      <div className="mt-2 flex justify-center text-text-tertiary">
        <svg width="240" height="20" viewBox="0 0 240 20" aria-hidden="true">
          <path
            d="M 220 4 Q 220 16 120 16 Q 20 16 20 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="3 2"
          />
          <polygon points="20,4 17,10 23,10" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
