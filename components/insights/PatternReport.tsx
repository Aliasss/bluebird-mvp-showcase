'use client';

import {
  DistortionTypeKorean,
  TriggerCategoryKorean,
  type DistortionType,
  type TriggerCategory,
} from '@/types';
import {
  aggregatePatterns,
  countByCategory,
  topByCount,
  topByDelta,
  type PatternCell,
  type PatternRow,
} from '@/lib/insights/pattern-report';

interface PatternReportProps {
  rows: readonly PatternRow[];
  periodLabel: string;
}

const MIN_SAMPLES_FOR_DELTA = 2;
const TOP_K = 3;

function formatDelta(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '±0.0';
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
}

function buildSummary(
  cells: readonly PatternCell[],
  periodLabel: string
): string[] {
  const sentences: string[] = [];

  const totals = countByCategory(cells);
  if (totals[0]) {
    sentences.push(
      `최근 ${periodLabel}간 ${TriggerCategoryKorean[totals[0].category]} 영역에서 가장 많이 분석했어요 (${totals[0].count}회)`
    );
  }

  const topPattern = topByCount(cells, 1)[0];
  if (topPattern && topPattern.count >= 2) {
    sentences.push(
      `가장 자주 나타난 패턴은 ${TriggerCategoryKorean[topPattern.category]} × ${DistortionTypeKorean[topPattern.distortion]} (${topPattern.count}회)`
    );
  }

  const topEffective = topByDelta(cells, 1, MIN_SAMPLES_FOR_DELTA)[0];
  if (topEffective && (topEffective.avgDelta ?? 0) > 0) {
    sentences.push(
      `${TriggerCategoryKorean[topEffective.category]} × ${DistortionTypeKorean[topEffective.distortion]}에서 인지 개입이 가장 효과적이었어요 (평균 ${formatDelta(topEffective.avgDelta as number)}점)`
    );
  }

  return sentences;
}

function PatternRowItem({
  category,
  distortion,
  rightLabel,
  rightTone,
}: {
  category: TriggerCategory;
  distortion: DistortionType;
  rightLabel: string;
  rightTone: 'default' | 'positive' | 'muted';
}) {
  const toneClass =
    rightTone === 'positive'
      ? 'text-success font-semibold'
      : rightTone === 'muted'
        ? 'text-text-tertiary'
        : 'text-text-primary font-semibold';

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background-secondary">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-primary">
          <span className="text-text-secondary">{TriggerCategoryKorean[category]}</span>
          <span className="mx-1.5 text-text-tertiary">·</span>
          {DistortionTypeKorean[distortion]}
        </p>
      </div>
      <p className={`text-xs ${toneClass}`}>{rightLabel}</p>
    </div>
  );
}

export default function PatternReport({ rows, periodLabel }: PatternReportProps) {
  const cells = aggregatePatterns(rows);

  if (cells.length === 0) {
    return (
      <div className="bg-surface border border-background-tertiary rounded-xl p-4 sm:p-6">
        <h2 className="text-base font-bold text-text-primary mb-2">개인화 패턴 리포트</h2>
        <p className="text-sm text-text-secondary">
          분석을 몇 번 더 진행하면 당신만의 패턴이 보이기 시작해요. 보통 5회 이상의 분석이 누적되면 의미 있는 신호가 잡혀요.
        </p>
      </div>
    );
  }

  const sentences = buildSummary(cells, periodLabel);
  const frequent = topByCount(cells, TOP_K);
  const effective = topByDelta(cells, TOP_K, MIN_SAMPLES_FOR_DELTA);

  return (
    <div className="bg-surface border border-background-tertiary rounded-xl p-4 sm:p-6 space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-text-primary">개인화 패턴 리포트</h2>
        <p className="text-xs text-text-secondary">
          트리거 도메인과 왜곡 유형을 교차해 당신의 사고 지문을 보여줍니다.
        </p>
      </div>

      {sentences.length > 0 && (
        <ul className="space-y-1.5">
          {sentences.map((s, i) => (
            <li key={i} className="text-sm text-text-primary">
              <span className="text-primary mr-1.5">•</span>
              {s}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-text-secondary">가장 자주 나타난 패턴</h3>
        <div className="space-y-1.5">
          {frequent.map((cell) => (
            <PatternRowItem
              key={`freq-${cell.category}-${cell.distortion}`}
              category={cell.category}
              distortion={cell.distortion}
              rightLabel={`${cell.count}회`}
              rightTone="default"
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-text-secondary">
          가장 효과적인 패턴 (고통 변화량 · {MIN_SAMPLES_FOR_DELTA}회 이상)
        </h3>
        {effective.length === 0 ? (
          <p className="text-xs text-text-tertiary">
            재평가 데이터가 더 쌓이면 여기에 표시돼요.
          </p>
        ) : (
          <div className="space-y-1.5">
            {effective.map((cell) => (
              <PatternRowItem
                key={`eff-${cell.category}-${cell.distortion}`}
                category={cell.category}
                distortion={cell.distortion}
                rightLabel={`${formatDelta(cell.avgDelta as number)} (${cell.count}회)`}
                rightTone={(cell.avgDelta ?? 0) > 0 ? 'positive' : 'muted'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
