// act3-3: 빈 매뉴얼 카드 + 진행률 0/7.
// 7회 후 첫 패턴 — 진행률 텍스트로 표현.

export default function ManualTemplate() {
  return (
    <div className="w-full max-w-[280px] mx-auto" aria-hidden="true">
      <div className="border border-background-tertiary rounded-xl bg-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-text-primary tracking-tight">사용설명서</p>
          <p className="text-[10px] font-mono text-text-tertiary">0 / 7</p>
        </div>
        {/* 빈 줄 placeholder */}
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-2 bg-background-secondary rounded" style={{ width: `${100 - i * 10}%` }} />
          ))}
        </div>
        <div className="mt-3 h-1 bg-background-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: '0%' }} />
        </div>
        <p className="text-[10px] text-text-tertiary mt-2">7회 후 첫 패턴이 보입니다</p>
      </div>
    </div>
  );
}
