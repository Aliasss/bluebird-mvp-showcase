// act1-2: 자극 → [자동 회로 ✕5] → 반복 화살표 loop.
// SVG path로 회귀 화살표. 텍스트 라벨은 한국어.

export default function AutoLoop() {
  return (
    <div className="w-full max-w-[280px] mx-auto" aria-hidden="true">
      <svg viewBox="0 0 280 200" className="w-full h-auto">
        {/* 자극 박스 */}
        <rect x="10" y="80" width="60" height="40" rx="6"
          className="fill-white" stroke="currentColor" strokeWidth="1" />
        <text x="40" y="105" textAnchor="middle" className="fill-text-primary text-[11px] font-semibold">자극</text>

        {/* 가운데 회로 5칸 */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={90 + i * 22}
            y="85"
            width="18"
            height="30"
            rx="3"
            className="fill-background-secondary"
            stroke="currentColor"
            strokeWidth="0.6"
          />
        ))}

        {/* 자극 → 회로 화살표 */}
        <line x1="70" y1="100" x2="88" y2="100" stroke="currentColor" strokeWidth="1.2" />
        <polygon points="88,100 84,97 84,103" fill="currentColor" />

        {/* 회로 → 반응 화살표 */}
        <line x1="200" y1="100" x2="218" y2="100" stroke="currentColor" strokeWidth="1.2" />
        <polygon points="218,100 214,97 214,103" fill="currentColor" />

        {/* 반응 박스 */}
        <rect x="220" y="80" width="50" height="40" rx="6"
          className="fill-white" stroke="currentColor" strokeWidth="1" />
        <text x="245" y="105" textAnchor="middle" className="fill-text-primary text-[11px] font-semibold">반응</text>

        {/* 회귀 loop — 반응 → 자극 (아래로 돌아오는 호) */}
        <path
          d="M 245 120 Q 245 160 140 160 Q 40 160 40 120"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <polygon points="40,120 37,127 43,127" fill="currentColor" />

        <text x="140" y="178" textAnchor="middle" className="fill-text-tertiary text-[10px]">반복</text>
      </svg>
    </div>
  );
}
