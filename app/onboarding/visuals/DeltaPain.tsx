// act3-2: 예측(결정 시점 확신)과 실제 결과를 나란히 맞춰 보는 캘리브레이션 그래픽.
//   효과(고통 감소 등)를 주장하지 않는다 — 슬라이드 카피("효과를 주장하지 않고 확인합니다")와 정합.
//   두 막대: 예측한 확신 vs 실제로 맞았는지. 숫자는 예시(80%)일 뿐 효능 주장 아님.

export default function DeltaPain() {
  return (
    <div className="w-full max-w-[280px] mx-auto" aria-hidden="true">
      <svg viewBox="0 0 280 140" className="w-full h-auto">
        {/* 기준선 (바닥) */}
        <line x1="40" y1="110" x2="260" y2="110" stroke="currentColor" strokeWidth="0.6" />

        {/* 예측한 확신 막대 (예: 80%) */}
        <rect x="78" y="38" width="44" height="72" rx="3" className="fill-primary" opacity="0.35" />
        <text x="100" y="32" textAnchor="middle" className="fill-text-primary text-[11px] font-bold">80%</text>
        <text x="100" y="125" textAnchor="middle" className="fill-text-secondary text-[9px]">예측한 확신</text>

        {/* 실제 결과 막대 (예시 — 효능 주장 아님) */}
        <rect x="158" y="62" width="44" height="48" rx="3" className="fill-primary" />
        <text x="180" y="56" textAnchor="middle" className="fill-text-primary text-[11px] font-bold">실제</text>
        <text x="180" y="125" textAnchor="middle" className="fill-text-secondary text-[9px]">실제 결과</text>

        {/* 두 막대 사이 — 예측과 실제의 간격(캘리브레이션)을 잇는 점선 */}
        <line x1="122" y1="38" x2="158" y2="62" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2" />
      </svg>
    </div>
  );
}
