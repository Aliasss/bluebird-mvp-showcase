// act2-1: System 1 (10ms · 자동) ↔ System 2 (3s · 검증) 두 박스 + 양방향 화살표.

export default function DualProcess() {
  return (
    <div className="w-full max-w-[280px] mx-auto" aria-hidden="true">
      <div className="flex items-stretch gap-2">
        <div className="flex-1 border border-background-tertiary rounded-xl p-3 bg-surface text-center">
          <p className="text-[11px] font-semibold text-text-primary">System 1</p>
          <p className="text-[10px] text-text-tertiary mt-1">10ms</p>
          <p className="text-[10px] text-text-secondary mt-0.5">자동</p>
        </div>
        <div className="flex flex-col items-center justify-center text-text-tertiary text-[10px]">
          <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
            <line x1="2" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="1" />
            <polygon points="20,3 16,1 16,5" fill="currentColor" />
            <line x1="20" y1="11" x2="2" y2="11" stroke="currentColor" strokeWidth="1" />
            <polygon points="2,11 6,9 6,13" fill="currentColor" />
          </svg>
        </div>
        <div className="flex-1 border border-primary rounded-xl p-3 bg-surface text-center">
          <p className="text-[11px] font-semibold text-primary">System 2</p>
          <p className="text-[10px] text-text-tertiary mt-1">3s</p>
          <p className="text-[10px] text-text-secondary mt-0.5">검증</p>
        </div>
      </div>
      <p className="text-[10px] text-text-tertiary text-center mt-2">결정 점검 = S1 → S2</p>
    </div>
  );
}
