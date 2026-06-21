'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { getSampleCase } from '@/lib/content/sample-cases';
import { DistortionTypeKorean } from '@/types';
import { computeCalibration, inflationBand } from '@/lib/decision/calibration';

// 실제 결과 라벨 — 실제 복기 화면(app/decision/[id]/review)의 OUTCOME_RESULT_LABEL 과 동일.
const OUTCOME_RESULT_LABEL: Record<'better' | 'as_expected' | 'worse', string> = {
  better: '예상보다 좋았음',
  as_expected: '예상대로였음',
  worse: '예상보다 나빴음',
};

export default function SampleResultPage() {
  const router = useRouter();
  const params = useParams<{ caseId: string }>();
  const sample = params.caseId ? getSampleCase(params.caseId) : null;

  if (!sample) {
    notFound();
  }

  const { trigger, thought, analysis, decisionLabel, reviewHorizon, outcome, outcomeNote } =
    sample;

  // 봉인된 예측 = 실제 엔진 출력(probability_estimate). null 이면 50% 중립 가정(실제 도구 동일).
  const sealedConfidence = analysis.probability_estimate ?? 50;

  // distortion 강도 평균 — 실제 복기 API(app/api/decision/review/route.ts)와 동일하게
  //   analysis 강도들의 평균을 캘리브레이션 입력으로 쓴다. distortion 0개면 중립 기본값(0.3).
  const intensities = analysis.distortions.map((d) => d.intensity);
  const avgDistortionIntensity =
    intensities.length > 0
      ? intensities.reduce((sum, v) => sum + v, 0) / intensities.length
      : 0.3;

  // ⚠️ 캘리브레이션 결과는 박아넣지 않는다 — 실제 도구와 같은 함수를 렌더 시점에 호출한다.
  //   입력: 실제 엔진 출력(확신도·강도 평균) + 예시 시나리오(outcome). 결과는 전적으로 함수가 정함.
  const calibration = computeCalibration({
    confidence: sealedConfidence,
    outcome,
    avgDistortionIntensity,
  });
  // RM 가드: 카드엔 딱딱한 %를 노출하지 않고 정도(band)만 — 실제 복기 화면과 동일.
  const band = inflationBand(calibration.distortionInflation);

  // 임베드(후면)로 보여줄 생각 습관 1개 — 첫 번째 distortion(실제 엔진 출력).
  const embeddedDistortion = analysis.distortions[0] ?? null;

  const handleSignupClick = () => {
    track('sample_signup_click', { caseId: sample.id });
    router.push('/auth/signup');
  };

  const handleOtherCaseClick = () => {
    track('sample_other_case_click', { caseId: sample.id });
    router.push('/sample');
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-10 pb-4">
        <button
          onClick={() => router.push('/sample')}
          className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          ← 다른 사례 보기
        </button>
      </header>

      <div className="flex-1 px-5 pb-12">
        <div className="max-w-md mx-auto space-y-6">
          {/* ── 1. 결정 상황 + 트리아지 ─────────────────────────────────────── */}
          <section className="bg-surface border border-background-tertiary rounded-2xl p-5 space-y-4 shadow-card">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                1 · 어떤 결정을 앞두고 있나
              </p>
              <p className="text-xs text-text-tertiary">지금 고민을 앞으로의 결정 하나로 적어요.</p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-text-tertiary mb-1">상황</p>
                <p className="text-sm text-text-primary leading-relaxed">{trigger}</p>
              </div>
              <div className="bg-background-secondary rounded-xl p-4">
                <p className="text-[11px] text-text-tertiary mb-1">앞두고 있는 결정</p>
                <p className="text-base text-text-primary font-semibold leading-snug">
                  {decisionLabel}
                </p>
              </div>
            </div>
            {/* 트리아지 결과 — 실제 도구의 "되돌릴 수 있는 결정 → Tame 트랙" 분기를 비춤. */}
            <div className="rounded-xl bg-primary-tint p-4 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                이 결정의 종류
              </p>
              <p className="text-sm text-text-primary leading-relaxed">
                되돌릴 수 있는 결정이에요 →{' '}
                <span className="font-semibold">결과로 맞춰보는 트랙</span>으로 가요.
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                나중에 실제 결과와 나란히 둘 수 있는 결정이라, 예상을 적어두고 검토일에 다시
                맞춰봐요.
              </p>
            </div>
          </section>

          {/* ── 2. 예측 봉인 ─────────────────────────────────────────────────── */}
          <section className="bg-surface border border-background-tertiary rounded-2xl p-5 space-y-4 shadow-card">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                2 · 지금 예상을 적어둘게요
              </p>
              <p className="text-xs text-text-tertiary">검토일이 되면 예상과 실제를 나란히 맞춰봐요.</p>
            </div>
            <div className="bg-background-secondary rounded-xl p-4 space-y-3">
              <p className="text-sm text-text-secondary leading-relaxed">
                “{thought}”
              </p>
              <div className="border-t border-background-tertiary pt-3">
                <p className="text-[11px] text-text-tertiary mb-1">
                  “이 일이 잘 안 풀릴 것 같다”는 확신
                </p>
                <p className="text-4xl font-extrabold leading-none tracking-tighter text-primary tabular-nums">
                  {sealedConfidence}%
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-background-tertiary pt-3">
                <span className="text-xs text-text-tertiary">검토 기한</span>
                <span className="text-sm text-text-primary font-semibold">{reviewHorizon}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-primary font-semibold">🔒 미리 적어둔 예측</span>
                <span className="text-[11px] text-text-tertiary">
                  검토일 전까지 바꾸지 않고 그대로 둬요.
                </span>
              </div>
            </div>
          </section>

          {/* ── 3. 결정에 낀 생각 습관 (임베드, 후면) ──────────────────────────── */}
          {embeddedDistortion && (
            <section className="bg-surface border border-background-tertiary rounded-2xl p-5 space-y-3 shadow-card">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  이 판단을 흔든 생각 습관
                </p>
                <p className="text-xs text-text-tertiary leading-relaxed">
                  결정을 기록하는 동안, 이 예상을 흔든 생각의 결을 한 가지 같이 적어둬요.
                </p>
              </div>
              <div className="bg-background-secondary rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text-primary">
                    {DistortionTypeKorean[embeddedDistortion.type]}
                  </p>
                  <span className="text-xs text-text-tertiary font-medium">
                    강도 {(embeddedDistortion.intensity * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  “{embeddedDistortion.segment}”
                </p>
              </div>
            </section>
          )}

          {/* ── 4. 복기·캘리브레이션 (검토일 후) ──────────────────────────────── */}
          <section className="bg-surface border border-background-tertiary rounded-2xl p-5 space-y-4 shadow-card">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                4 · 검토일이 되어, 결과를 정리했어요
              </p>
              <p className="text-xs text-text-tertiary">확신도와 실제 결과를 나란히 둔 관찰입니다.</p>
            </div>

            {/* 가상 실제 결과(예시 시나리오) — 봉인했던 예측과 나란히. */}
            <div className="bg-background-secondary rounded-xl p-4 space-y-2">
              <p className="text-[11px] text-text-tertiary">실제로는</p>
              <p className="text-sm text-text-primary leading-relaxed">{outcomeNote}</p>
            </div>

            {/* 확신도 → 실제 — 실제 복기 카드와 동일 문장 구조. */}
            <div className="rounded-xl border border-background-tertiary p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                확신도 대비 결과
              </p>
              <p className="mt-2 text-[17px] font-bold tracking-tight text-text-primary">
                확신 {sealedConfidence}% → 실제 {OUTCOME_RESULT_LABEL[outcome]}
              </p>
              {/* direction 별 일상어 풀이 — 실제 복기 화면 DIRECTION_TEXT 분기와 동일. */}
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                {calibration.direction === 'overconfident'
                  ? '불안이 위협을 실제보다 크게 그렸던 것으로 보여요.'
                  : calibration.direction === 'underconfident'
                  ? '이번엔 실제 결과가 예상보다 무거웠어요.'
                  : '이번엔 불안의 예상과 실제가 거의 비슷했어요.'}
              </p>
            </div>

            {/* AC-14 캘리브레이션 카드 — 실제 review 화면과 동일 분기·문구.
                RM 가드: 딱딱한 % 대신 정도(band)로, 먼저 그때 마음을 인정한 뒤 이번 결과와 대조. */}
            <div className="rounded-xl bg-primary-tint p-4 space-y-2">
              {calibration.direction === 'overconfident' ? (
                <>
                  <p className="text-sm leading-relaxed text-text-primary">
                    그때 그렇게 느낄 만했어요. 다만 이번 결과를 나란히 놓고 보면, 불안이 위협을
                    실제보다 {band} 크게 그렸던 것으로 보여요.
                  </p>
                  {/* AC-14 가드(맞다/틀리다를 가리지 않음) — 실제 review 화면과 동일 문구. */}
                  <p className="text-xs leading-relaxed text-text-tertiary">
                    확신도와 실제 결과의 간격, 그리고 이 결정에 함께 기록된 생각의 결을 바탕으로 본
                    추정치예요. 당신의 결정이 맞았는지 틀렸는지를 가리는 게 아니라, 불안의 예상이
                    실제와 얼마나 달랐는지를 비춰드릴 뿐이에요.
                  </p>
                </>
              ) : calibration.direction === 'underconfident' ? (
                <p className="text-sm leading-relaxed text-text-primary">
                  이번엔 실제 결과가 예상보다 무거웠어요. 불안이 맞았다는 뜻이 아니라, 이번 한 번이
                  그랬다는 기록이에요.
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-text-primary">
                  이번엔 불안의 예상과 실제가 거의 비슷했어요.
                </p>
              )}
            </div>
          </section>

          {/* ── 5. 가입 CTA ───────────────────────────────────────────────────── */}
          <section className="space-y-3 pt-2">
            <button
              onClick={handleSignupClick}
              className="w-full bg-primary text-primary-fg font-semibold py-4 px-6 rounded-2xl active:scale-95 transition-transform touch-manipulation"
            >
              내 결정으로 직접 해보기 →
            </button>
            <button
              onClick={handleOtherCaseClick}
              className="w-full bg-surface border border-background-tertiary text-text-secondary font-medium py-3 px-6 rounded-2xl active:scale-95 transition-transform touch-manipulation"
            >
              다른 사례 더 보기
            </button>
          </section>

          <p className="text-[11px] text-text-tertiary text-center pt-2 leading-relaxed">
            미리 적어둔 예측(확신도)과 생각 습관은 실제 BlueBird 엔진의 출력 그대로이고, 위 예측 정확도
            결과는 실제 도구와 같은 계산 함수로 산출한 값입니다. 복기 시점의 실제 결과는 흐름을
            보여주기 위한 예시예요.
          </p>
        </div>
      </div>
    </main>
  );
}
