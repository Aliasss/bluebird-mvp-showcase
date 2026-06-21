'use client';

/**
 * app/decision/[id]/review/page.tsx
 *
 * 결정(decision) 복기 화면 — review_at 도래 후 실제 결과를 관찰·기록하고
 * 확신도 대비 캘리브레이션 결과 카드를 보여준다.
 *
 * 톤 가드:
 *   - 중립·관찰·분석가 톤. streak·점수 경쟁·게이미피케이션·축하/달성 어휘 금지.
 *   - direction 은 "예측이 얼마나 빗나갔는지"를 사실로 기술할 뿐, 잘잘못을 평가하지 않는다.
 *
 * 데이터: logs(id, log_type='decision') 로드 → 결정 텍스트 echo + confidence 표시.
 *   3택 제출 → POST /api/decision/review → { calibration } → 결과 카드.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { Log } from '@/types';
import type { CalibrationResult } from '@/lib/decision/types';
import { inflationBand } from '@/lib/decision/calibration';
import { isDecisionReviewed } from '@/lib/decision/review-status';
import PageHeader from '@/components/ui/PageHeader';
import Top from '@/components/ui/Top';
import Badge from '@/components/ui/Badge';
import BottomCTA from '@/components/ui/BottomCTA';

type Outcome = 'better' | 'as_expected' | 'worse';

// ── WILD 복기(비점수 자기보고, §4) ─────────────────────────────────────────────
//   점수·방향·inflation·3택 결과 enum 없음(false-precision 안전장치 §0.1).
//   valueAlignment 은 ①에서 적은 '되고 싶은 나·지키고 싶은 것'과의 정합 자기보고(점수 아님).
type ValueAlignment = 'aligned' | 'mixed' | 'not';

const VALUE_ALIGN_OPTIONS: ReadonlyArray<{ value: ValueAlignment; label: string }> = [
  { value: 'aligned', label: '맞게 지내요' },
  { value: 'mixed', label: '반반이에요' },
  { value: 'not', label: '아직은 아니에요' },
];

// 저장된 wild 자기보고를 안전 파싱(decision_frame.wild.review). 비정형이면 null.
type StoredWildReview = {
  lookingBack?: string;
  whatDiscovered?: string;
  valueAlignment?: ValueAlignment;
};
function parseStoredWildReview(frame: unknown): StoredWildReview | null {
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) return null;
  const wild = (frame as Record<string, unknown>).wild;
  if (!wild || typeof wild !== 'object' || Array.isArray(wild)) return null;
  const review = (wild as Record<string, unknown>).review;
  if (!review || typeof review !== 'object' || Array.isArray(review)) return null;
  const r = review as Record<string, unknown>;
  const out: StoredWildReview = {};
  if (typeof r.lookingBack === 'string') out.lookingBack = r.lookingBack;
  if (typeof r.whatDiscovered === 'string') out.whatDiscovered = r.whatDiscovered;
  if (r.valueAlignment === 'aligned' || r.valueAlignment === 'mixed' || r.valueAlignment === 'not') {
    out.valueAlignment = r.valueAlignment;
  }
  return out;
}

const OUTCOME_OPTIONS: ReadonlyArray<{ value: Outcome; emoji: string; label: string }> = [
  { value: 'better', emoji: '😌', label: '예상보다 좋았어요' },
  { value: 'as_expected', emoji: '😐', label: '예상대로였어요' },
  { value: 'worse', emoji: '😟', label: '예상보다 나빴어요' },
];

const OUTCOME_RESULT_LABEL: Record<Outcome, string> = {
  better: '예상보다 좋았음',
  as_expected: '예상대로였음',
  worse: '예상보다 나빴음',
};

// 저장된 calibration JSON(Record<string, unknown> | null)을 CalibrationResult 로 안전 파싱.
//   shape: { direction: 'overconfident'|'underconfident'|'calibrated', distortionInflation: number }.
//   값이 없거나 형식이 어긋나면 null → 호출부가 카드의 inflation 줄을 생략(방어).
function parseStoredCalibration(value: unknown): CalibrationResult | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const direction = record.direction;
  const inflation = record.distortionInflation;
  if (
    (direction === 'overconfident' ||
      direction === 'underconfident' ||
      direction === 'calibrated') &&
    typeof inflation === 'number'
  ) {
    return { direction, distortionInflation: inflation };
  }
  return null;
}

// direction 을 일상어로 풀이 — 평가 아닌 관찰 기술.
//   ⚠️ AC-14 잠금: 채점 대상은 *불안의 예측*이지 *사용자의 결정*이 아니다.
//   "결정이 맞았다/틀렸다/옳았다/잘했다" 류 문구 금지 — 오직 불안의 과대/과소예측만 진술.
const DIRECTION_TEXT: Record<CalibrationResult['direction'], string> = {
  // worse + 낮은 확신 — "불안이 맞았다"가 아니라 "이번 한 번"임을 분명히(접종).
  underconfident: '이번엔 실제 결과가 예상보다 무거웠어요.',
  overconfident: '불안이 위협을 실제보다 크게 그렸던 것으로 보여요.',
  calibrated: '이번엔 불안의 예상과 실제가 거의 비슷했어요.',
};

export default function DecisionReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Outcome | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationResult | null>(null);
  // 이미 복기한 결정 재방문 — 저장된 결과를 그대로 재노출(트랙별 마커는 isDecisionReviewed).
  //   tame/레거시: actual_outcome(한국어 라벨) + calibration JSON. wild: decision_frame.wild.review.
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [storedOutcomeLabel, setStoredOutcomeLabel] = useState<string | null>(null);

  // 트랙 — wild 면 비점수 자기보고 분기(캘리브레이션·3택 없음, §4).
  const isWild = log?.problem_type === 'wild';

  // WILD 입력 상태(자기보고 — 점수 아님).
  const [lookingBack, setLookingBack] = useState('');
  const [whatDiscovered, setWhatDiscovered] = useState('');
  const [valueAlignment, setValueAlignment] = useState<ValueAlignment | null>(null);
  // 저장된 wild 자기보고(이미 복기 / 제출 직후) — 본인 문장 되비추기에 사용.
  const [storedWildReview, setStoredWildReview] = useState<StoredWildReview | null>(null);
  // wild 제출 직후 플래그(완료 확인 카드 노출 — "이미 복기"와 구분).
  const [wildJustSaved, setWildJustSaved] = useState(false);

  useEffect(() => {
    const logId = params.id;
    if (!logId) {
      setError('올바른 경로로 접근할 수 없어요.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/auth/login');
          return;
        }

        const { data, error: logError } = await supabase
          .from('logs')
          .select('*')
          .eq('id', logId)
          .eq('user_id', user.id)
          .single();

        if (logError || !data) {
          throw new Error('결정을 찾을 수 없어요.');
        }
        const loadedLog = data as Log;
        setLog(loadedLog);

        // 이미 복기한 결정이면 입력 폼 대신 저장된 결과/자기보고를 재노출(idempotent·재방문).
        //   "복기 완료" 마커는 트랙별 단일 진실 공급원(isDecisionReviewed): API·대시보드·cron 과 동일.
        if (isDecisionReviewed(loadedLog)) {
          setAlreadyReviewed(true);
          if (loadedLog.problem_type === 'wild') {
            // wild — 저장된 자기보고를 본인 문장 그대로 되비춘다(점수 없음).
            setStoredWildReview(parseStoredWildReview(loadedLog.decision_frame));
          } else {
            // tame/레거시 — 캘리브레이션 카드 재노출.
            setStoredOutcomeLabel(loadedLog.actual_outcome ?? null);
            const stored = parseStoredCalibration(loadedLog.calibration);
            if (stored) {
              setCalibration(stored);
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '데이터를 불러오지 못했어요.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/decision/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: params.id, outcome: selected }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || '복기를 저장하지 못했어요.');
      }
      setCalibration(payload.calibration as CalibrationResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '처리 중에 문제가 생겼어요.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // WILD 복기 제출 — 비점수 자기보고를 decision_frame.wild.review 에 저장(§4).
  //   점수·방향·calibration 을 받지도 보여주지도 않는다. 최소 1개 답을 요구.
  const wildHasAnswer =
    lookingBack.trim().length > 0 ||
    whatDiscovered.trim().length > 0 ||
    valueAlignment !== null;

  const handleWildSubmit = async () => {
    if (!wildHasAnswer || submitting) return;
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/decision/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: params.id,
          track: 'wild',
          lookingBack: lookingBack.trim() || undefined,
          whatDiscovered: whatDiscovered.trim() || undefined,
          valueAlignment: valueAlignment ?? undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || '복기를 저장하지 못했어요.');
      }
      // 저장된 자기보고를 그대로 받아 본인 문장 되비추기 화면으로 전환(점수 없음).
      setStoredWildReview(parseStoredWildReview({ wild: { review: payload.review } }));
      setAlreadyReviewed(false); // 방금 완료 — "이미 복기" 문구 대신 완료 확인 문구.
      setSubmitting(false);
      setWildJustSaved(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '처리 중에 문제가 생겼어요.';
      setError(msg);
      setSubmitting(false);
    }
  };

  // ── 로딩 ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="결정 복기" backHref="/dashboard" />
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-5 py-16 text-center">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-background-tertiary" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <p className="text-base font-semibold text-text-primary">복기할 결정을 불러오고 있어요</p>
        </div>
      </main>
    );
  }

  // ── 오류 ─────────────────────────────────────────────────────────────────
  if (error && !log) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-5">
        <div className="w-full max-w-md space-y-6 text-center">
          <h2 className="text-lg font-bold text-text-primary">복기에 문제가 생겼어요</h2>
          <p className="text-text-secondary">{error || '다시 시도하거나 홈으로 돌아가볼까요?'}</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-fg"
          >
            홈으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  const confidence = log?.confidence ?? 50;

  // ════════════════════════════════════════════════════════════════════════
  //  WILD 트랙 — 비점수 자기보고 복기(§4). 캘리브레이션·3택·점수 일절 없음.
  // ════════════════════════════════════════════════════════════════════════
  if (isWild) {
    // ── WILD 결과/확인 (제출 직후 · 또는 이미 복기 재방문) ──────────────────
    //   점수·판정 없음. 본인이 적은 자기보고 문장을 그대로 되비춘다(부드러운 반영 확인).
    if (storedWildReview || alreadyReviewed) {
      const r = storedWildReview;
      const alignLabel =
        r?.valueAlignment != null
          ? VALUE_ALIGN_OPTIONS.find((o) => o.value === r.valueAlignment)?.label ?? null
          : null;
      return (
        <main className="min-h-screen bg-background">
          <PageHeader title="결정 복기" backHref="/dashboard" />
          <div className="mx-auto w-full max-w-lg">
            <Top
              title={wildJustSaved ? '돌아본 마음을 적어뒀어요' : '앞서 돌아본 기록이에요'}
              sub="이 결정은 점수가 아니라 발견을 남겨요."
            />

            <div className="space-y-4 px-5 pb-40">
              {/* 본인 문장 되비추기 — 평가·요약·추천 0(순수 반영). */}
              {r?.lookingBack && (
                <div className="rounded-card border border-background-tertiary bg-surface p-5">
                  <Badge tone="neutral">지금 돌아보면</Badge>
                  <p className="mt-3 text-[17px] font-medium leading-relaxed text-text-primary">
                    “{r.lookingBack}”
                  </p>
                </div>
              )}
              {r?.whatDiscovered && (
                <div className="rounded-card border border-background-tertiary bg-surface p-5">
                  <Badge tone="neutral">이 길에서 발견한 것</Badge>
                  <p className="mt-3 text-[17px] font-medium leading-relaxed text-text-primary">
                    “{r.whatDiscovered}”
                  </p>
                </div>
              )}
              {alignLabel && (
                <div className="rounded-card bg-primary-tint p-5">
                  <p className="text-sm leading-relaxed text-text-primary">
                    그때 지키고 싶던 가치에 — <span className="font-semibold">{alignLabel}</span>.
                  </p>
                </div>
              )}
              {!r?.lookingBack && !r?.whatDiscovered && !alignLabel && (
                <div className="rounded-card border border-background-tertiary bg-surface p-5">
                  <p className="text-[15px] leading-relaxed text-text-secondary">
                    이 결정은 점수 매기지 않아요. 돌아본 그 마음만 여기 남겨뒀어요.
                  </p>
                </div>
              )}
            </div>
          </div>

          <BottomCTA>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-2xl bg-primary px-6 py-[17px] text-base font-semibold text-primary-fg transition-transform hover:bg-primary-dark active:scale-95 touch-manipulation"
            >
              마치기
            </button>
          </BottomCTA>
        </main>
      );
    }

    // ── WILD 입력 (반영형 프롬프트만) ──────────────────────────────────────
    //   3택·확신도·점수 없음. 최소 1개 답을 적으면 저장 가능.
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="결정 복기" backHref="/dashboard" />
        <div className="mx-auto w-full max-w-lg">
          <Top title="지금 돌아보면 어떤가요?" sub={log?.trigger} />

          <div className="space-y-4 px-5 pb-40">
            {/* 정직성 한 줄 — 점수가 아니라 발견을 남긴다(기록 시점 약속의 이행). */}
            <div className="rounded-card border border-background-tertiary bg-background-secondary p-5">
              <p className="text-[15px] leading-relaxed text-text-secondary">
                이 결정엔 일부러 점수를 매기지 않아요 — ‘맞았다/틀렸다’로 채점할 수 있는 종류가
                아니거든요. 이 결정은 점수가 아니라 발견을 남겨요.
              </p>
            </div>

            {/* 발견 [반영] */}
            <div className="rounded-card border border-background-tertiary bg-surface p-5">
              <p className="mb-2 text-[15px] font-semibold leading-snug text-text-primary">
                지금 돌아보면, 그때 무엇을 발견했나요?
              </p>
              <textarea
                value={whatDiscovered}
                onChange={(e) => {
                  setWhatDiscovered(e.target.value);
                  setError(null);
                }}
                placeholder="겪기 전엔 몰랐던 것, 직접 가보니 알게 된 것을 적어보세요."
                aria-label="그때 무엇을 발견했나요"
                className="w-full min-h-[96px] resize-none border-none bg-transparent text-[16px] font-medium leading-[1.55] text-text-primary outline-none placeholder:text-text-tertiary"
              />
            </div>

            {/* 가치 정합 [자기보고 — 점수 아님] */}
            <div className="rounded-card border border-background-tertiary bg-surface p-5">
              <p className="mb-3 text-[15px] font-semibold leading-snug text-text-primary">
                그때 지키고 싶던 가치에 맞게 지내고 있나요?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {VALUE_ALIGN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setValueAlignment((prev) => (prev === opt.value ? null : opt.value));
                      setError(null);
                    }}
                    aria-pressed={valueAlignment === opt.value}
                    className={`rounded-ctrl border px-2 py-2.5 text-[13px] font-semibold leading-snug transition touch-manipulation active:scale-95 ${
                      valueAlignment === opt.value
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-background-tertiary bg-surface text-text-primary hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 후회(선택) [반영] */}
            <div className="rounded-card border border-background-tertiary bg-surface p-5">
              <p className="mb-2 text-[15px] font-semibold leading-snug text-text-primary">
                후회가 있다면, 어떤 점인가요? <span className="text-text-tertiary">(선택)</span>
              </p>
              <textarea
                value={lookingBack}
                onChange={(e) => {
                  setLookingBack(e.target.value);
                  setError(null);
                }}
                placeholder="지금 이 결정이 어떻게 느껴지는지, 마음에 남는 게 있다면 적어보세요."
                aria-label="지금 돌아본 느낌"
                className="w-full min-h-[88px] resize-none border-none bg-transparent text-[16px] font-medium leading-[1.55] text-text-primary outline-none placeholder:text-text-tertiary"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-danger bg-danger/10 p-3">
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}
          </div>
        </div>

        <BottomCTA sub="이 결정은 점수가 아니라 발견을 남겨요.">
          <button
            type="button"
            onClick={handleWildSubmit}
            disabled={!wildHasAnswer || submitting}
            className="w-full rounded-2xl bg-primary px-6 py-[17px] text-base font-semibold text-primary-fg transition-transform hover:bg-primary-dark active:scale-95 touch-manipulation disabled:opacity-50"
          >
            {submitting ? '저장 중...' : '돌아본 마음 남기기'}
          </button>
        </BottomCTA>
      </main>
    );
  }

  // ── 결과 카드 (복기 제출 후 · 또는 이미 복기한 결정 재방문) ───────────────
  //   calibration 이 없어도 alreadyReviewed 이면 카드를 노출해 입력 폼 재제출(→409)을 막는다.
  //   calibration 의존 블록(방향 문구·inflation 카드)은 calibration 존재 시에만 렌더(방어).
  if (calibration || alreadyReviewed) {
    // RM 가드: 딱딱한 정수 %는 카드에 노출하지 않고 일상어 정도(band)로만 보여준다.
    //   수치(distortionInflation)는 계산·저장만 — 화면 문구엔 '조금/꽤/훨씬'만.
    const band = calibration ? inflationBand(calibration.distortionInflation) : null;
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="결정 복기" backHref="/dashboard" />
        <div className="mx-auto w-full max-w-lg">
          <Top
            title={alreadyReviewed ? '이미 복기한 결정이에요' : '기록한 결과를 정리했어요'}
            sub={
              alreadyReviewed
                ? '앞서 기록한 결과를 다시 보여드려요.'
                : '확신도와 실제 결과를 나란히 둔 관찰입니다.'
            }
          />

          <div className="space-y-4 px-5 pb-40">
            <div className="rounded-card border border-background-tertiary bg-surface p-5">
              <Badge tone="neutral">확신도 대비 결과</Badge>
              <p className="mt-3 text-[19px] font-bold tracking-tight text-text-primary">
                확신 {confidence}% → 실제{' '}
                {selected ? OUTCOME_RESULT_LABEL[selected] : (storedOutcomeLabel ?? '')}
              </p>
              {calibration && (
                <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                  {DIRECTION_TEXT[calibration.direction]}
                </p>
              )}
            </div>

            {calibration && band !== null && (
              <div className="rounded-card bg-primary-tint p-5">
                {/* AC-14: 오직 *불안의 과대예측*만 진술 — 결정의 정오를 평가하지 않는다.
                    RM 가드: 딱딱한 % 대신 정도(band)로, 먼저 그때 마음을 인정한 뒤 이번 결과와 대조. */}
                {calibration.direction === 'overconfident' ? (
                  <>
                    <p className="text-sm leading-relaxed text-text-primary">
                      그때 그렇게 느낄 만했어요. 다만 이번 결과를 나란히 놓고 보면, 불안이 위협을
                      실제보다 {band} 크게 그렸던 것으로 보여요.
                    </p>
                    {/* 개인화 빈도-대조 — 본인 확신도를 자기 데이터로 되비춘다(§11 1순위 지표 목소리).
                        과대예측(overconfident)일 때만 — "예상만큼은 아니었다"가 성립하는 방향. */}
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      확신 {confidence}%로 적어두셨는데, 이번엔 실제로 그 예상만큼은 아니었던 셈이에요.
                    </p>
                    {/* AC-14 가드(맞다/틀리다를 가리지 않음) — 불안-주장 분기(overconfident)에 부착(LOCKED). */}
                    <p className="mt-2 text-xs leading-relaxed text-text-tertiary">
                      확신도와 실제 결과의 간격, 그리고 이 결정에 함께 기록된 생각의 결을 바탕으로 본
                      추정치예요. 당신의 결정이 맞았는지 틀렸는지를 가리는 게 아니라, 불안의 예상이
                      실제와 얼마나 달랐는지를 비춰드릴 뿐이에요.
                    </p>
                  </>
                ) : calibration.direction === 'underconfident' ? (
                  // worse + 낮은 확신 — "불안이 맞았다"는 결론을 막는다(접종). 수치/정도 없음.
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
            )}
          </div>
        </div>

        <BottomCTA>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-2xl bg-primary px-6 py-[17px] text-base font-semibold text-primary-fg transition-transform hover:bg-primary-dark active:scale-95 touch-manipulation"
          >
            마치기
          </button>
        </BottomCTA>
      </main>
    );
  }

  // ── 결과 입력 (3택) ───────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="결정 복기" backHref="/dashboard" />
      <div className="mx-auto w-full max-w-lg">
        <Top title="결과가 어땠나요?" sub={log?.trigger} />

        <div className="space-y-3 px-5 pb-40">
          {OUTCOME_OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelected(option.value);
                  setError(null);
                }}
                className={`flex w-full items-center gap-4 rounded-card border-2 p-5 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary-tint'
                    : 'border-background-tertiary bg-surface'
                }`}
                aria-pressed={isSelected}
              >
                <span className="text-2xl">{option.emoji}</span>
                <span
                  className={`text-[15px] font-semibold ${
                    isSelected ? 'text-primary' : 'text-text-primary'
                  }`}
                >
                  {option.label}
                </span>
              </button>
            );
          })}

          {error && (
            <div className="rounded-xl border border-danger bg-danger/10 p-3">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}
        </div>
      </div>

      <BottomCTA sub={`이 결정의 확신도는 ${confidence}% 였어요.`}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="w-full rounded-2xl bg-primary px-6 py-[17px] text-base font-semibold text-primary-fg transition-transform hover:bg-primary-dark active:scale-95 touch-manipulation disabled:opacity-50"
        >
          {submitting ? '저장 중...' : '결과 기록하기'}
        </button>
      </BottomCTA>
    </main>
  );
}
