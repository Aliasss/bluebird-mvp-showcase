// act1-1: 3 시나리오 박스 격자 — 회의·답장·평가.
// 이미지·이모지 0건. 박스 라벨 + 짧은 인용만.

export default function ContextGrid() {
  const items = [
    { label: '회의', cue: '"괜히 말했다"' },
    { label: '답장', cue: '"내가 뭘 잘못한 거지"' },
    { label: '평가', cue: '"이번에도 부족할 것이다"' },
  ];
  return (
    <div className="w-full max-w-[280px] mx-auto" aria-hidden="true">
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="border border-background-tertiary rounded-xl p-3 bg-surface text-center"
          >
            <p className="text-[11px] font-semibold text-text-tertiary tracking-wide mb-2 uppercase">
              {it.label}
            </p>
            <p className="text-[10px] text-text-secondary leading-tight">{it.cue}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
