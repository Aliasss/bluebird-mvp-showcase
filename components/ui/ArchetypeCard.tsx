import type { ArchetypeResult } from '@/lib/utils/archetype';

type Props = {
  result: ArchetypeResult | null;
  onClick?: () => void;
};

export default function ArchetypeCard({ result, onClick }: Props) {
  if (!result) {
    return (
      <div className="bg-background-secondary border border-background-tertiary rounded-xl p-4 mb-4 sm:mb-6">
        <p className="text-sm text-text-secondary">
          첫 분석을 진행하면 당신의 <span className="font-medium text-text-primary">인지 아키타입</span>이 생성됩니다.
        </p>
      </div>
    );
  }

  const { archetype, progressInCycle, untilNextUpdate, isJustUpdated } = result;
  const progressPct = (progressInCycle / 5) * 100;

  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-background-tertiary rounded-xl p-4 mb-4 sm:mb-6 ${onClick ? 'cursor-pointer hover:border-primary transition-colors' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">인지 아키타입</p>
          <p className="text-base font-bold text-text-primary">{archetype.name}</p>
          <p className="text-sm text-text-secondary mt-0.5">{archetype.tagline}</p>
        </div>
        {onClick && (
          <span className="text-text-tertiary text-sm flex-shrink-0">→</span>
        )}
      </div>

      {/* 업데이트 진행 바 */}
      <div className="space-y-1">
        <div className="h-1.5 bg-background-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${isJustUpdated ? 100 : progressPct}%` }}
          />
        </div>
        <p className="text-[10px] text-text-tertiary">
          {isJustUpdated
            ? '아키타입이 업데이트됐습니다'
            : `다음 업데이트까지 ${untilNextUpdate}회 더`}
        </p>
      </div>
    </div>
  );
}
