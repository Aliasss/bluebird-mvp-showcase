// act2-2: CBT 5왜곡 격자 — 영문 type 라벨 (코드 식별자와 일치).

export default function CbtGrid() {
  const types = [
    'catastrophizing',
    'all_or_nothing',
    'emotional_reasoning',
    'personalization',
    'arbitrary_inference',
  ];
  return (
    <div className="w-full max-w-[280px] mx-auto" aria-hidden="true">
      <div className="grid grid-cols-2 gap-1.5">
        {types.slice(0, 4).map((t) => (
          <div
            key={t}
            className="border border-background-tertiary rounded-lg p-2 bg-surface text-center"
          >
            <p className="text-[10px] font-mono text-text-primary break-all">{t}</p>
          </div>
        ))}
      </div>
      <div className="mt-1.5">
        <div className="border border-background-tertiary rounded-lg p-2 bg-surface text-center">
          <p className="text-[10px] font-mono text-text-primary">{types[4]}</p>
        </div>
      </div>
    </div>
  );
}
