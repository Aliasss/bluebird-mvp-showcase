'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase/client';
import Badge from '@/components/ui/Badge';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { useIsDark } from '@/lib/theme';
import { isAwaitingReview, isDecisionReviewed } from '@/lib/decision/review-status';

// 결정 패턴 뷰 — /insights 허브의 '결정 패턴' 탭 내용.
//   (기존 /insights/decision-patterns 페이지에서 분리. 화면 셸·헤더·탭바는 허브가 담당.)

// ---------- types ----------

type CalibrationDirection = 'overconfident' | 'underconfident' | 'calibrated';

interface Calibration {
  direction: CalibrationDirection;
  distortionInflation: number; // 0~1
}

interface DecisionRow {
  id: string;
  trigger: string | null;
  confidence: number | null;
  review_at: string | null;
  actual_outcome: string | null;
  calibration: Calibration | null;
  problem_type: 'tame' | 'wild' | null;
  decision_frame: Record<string, unknown> | null;
}

// ---------- helpers ----------

function parseCalibration(raw: unknown): Calibration | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const dir = obj['direction'];
  const inf = obj['distortionInflation'];
  if (
    (dir === 'overconfident' || dir === 'underconfident' || dir === 'calibrated') &&
    typeof inf === 'number'
  ) {
    return { direction: dir, distortionInflation: inf };
  }
  return null;
}

const DIRECTION_KOREAN: Record<CalibrationDirection, string> = {
  overconfident: '과신',
  calibrated: '정확',
  underconfident: '과소 확신',
};

type BadgeTone = 'warning' | 'neutral' | 'success';
const DIRECTION_TONE: Record<CalibrationDirection, BadgeTone> = {
  overconfident: 'warning',
  calibrated: 'neutral',
  underconfident: 'neutral',
};

// wild 회고 병치(D) — 되돌릴 수 없는 결정은 점수 대신 '그때↔복기' 본인 문장을 나란히 둔다.
//   시스템 판정·점수 0 — 사용자가 적은 원문만 양쪽에 배치(juxtaposition). 가치 일관성은 본인 자기분류.
const WILD_VALUE_ALIGN_LABEL: Record<string, string> = {
  aligned: '대체로 맞았다',
  mixed: '반반이다',
  not: '많이 달랐다',
};

interface WildReflection {
  id: string;
  trigger: string | null;
  valuesToProtect: string | null;
  uncertaintyWorry: string | null;
  anticipatedRegret: string | null;
  whatDiscovered: string | null;
  lookingBack: string | null;
  valueAlignment: string | null;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}
function toWildReflection(r: DecisionRow): WildReflection {
  const frame = isObj(r.decision_frame) ? r.decision_frame : null;
  const wild = frame && isObj(frame['wild']) ? (frame['wild'] as Record<string, unknown>) : null;
  const review = wild && isObj(wild['review']) ? (wild['review'] as Record<string, unknown>) : null;
  return {
    id: r.id,
    trigger: r.trigger,
    valuesToProtect: wild ? str(wild['valuesToProtect']) : null,
    uncertaintyWorry: wild ? str(wild['uncertaintyWorry']) : null,
    anticipatedRegret: wild ? str(wild['anticipatedRegret']) : null,
    whatDiscovered: review ? str(review['whatDiscovered']) : null,
    lookingBack: review ? str(review['lookingBack']) : null,
    valueAlignment: review ? str(review['valueAlignment']) : null,
  };
}

// 회고 한 줄 — 사용자 원문 그대로(평가·요약 0). 값 없으면 렌더 안 함.
function ReflectLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] text-text-tertiary">{label}</p>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-primary">{value}</p>
    </div>
  );
}

// ---------- view ----------

export default function DecisionPatternsView() {
  const router = useRouter();
  const isDark = useIsDark();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DecisionRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      // ⑤ 검증 계측(spec §D.2 ⑤) — 캘리브레이션 리포트 열람. B(결과 효용) 재방문율.
      //   best-effort — 발신 실패가 리포트 렌더를 막지 않음. PII 미포함(properties 없음).
      void fetch('/api/analytics/decision-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'decision_report_viewed' }),
      }).catch(() => {});

      const { data } = await supabase
        .from('logs')
        .select('id, trigger, confidence, review_at, actual_outcome, calibration, problem_type, decision_frame')
        .eq('user_id', user.id)
        .eq('log_type', 'decision')
        .order('created_at', { ascending: false });

      const parsed: DecisionRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
        id: r['id'] as string,
        trigger: (r['trigger'] as string | null) ?? null,
        confidence: (r['confidence'] as number | null) ?? null,
        review_at: (r['review_at'] as string | null) ?? null,
        actual_outcome: (r['actual_outcome'] as string | null) ?? null,
        calibration: parseCalibration(r['calibration']),
        problem_type: (r['problem_type'] as 'tame' | 'wild' | null) ?? null,
        decision_frame:
          r['decision_frame'] && typeof r['decision_frame'] === 'object'
            ? (r['decision_frame'] as Record<string, unknown>)
            : null,
      }));

      setRows(parsed);
      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // ---------- aggregations ----------

  const total = rows.length;
  // 복기 완료 = isDecisionReviewed(트랙별 단일 진실): tame=actual_outcome / wild=decision_frame.wild.review.
  //   actual_outcome 만 보면 wild 복기가 누락돼 '내 결정' 목록 배지(복기 완료)와 어긋난다.
  const reviewedCount = rows.filter((r) => isDecisionReviewed(r)).length;
  const completionRate = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;

  // 예측 정확도 분포·평균 차이는 *점수가 매겨진* 복기(tame calibration)만. wild 는 비점수라 제외.
  const reviewedWithCalibration = rows.filter((r) => r.calibration !== null);
  const avgInflation =
    reviewedWithCalibration.length > 0
      ? Math.round(
          (reviewedWithCalibration.reduce(
            (sum, r) => sum + (r.calibration!.distortionInflation ?? 0),
            0
          ) /
            reviewedWithCalibration.length) *
            100
        )
      : null;

  const directionCounts: Record<CalibrationDirection, number> = {
    overconfident: 0,
    calibrated: 0,
    underconfident: 0,
  };
  for (const r of reviewedWithCalibration) {
    directionCounts[r.calibration!.direction] += 1;
  }

  const chartData = [
    { name: '과신', count: directionCounts['overconfident'] },
    { name: '정확', count: directionCounts['calibrated'] },
    { name: '과소 확신', count: directionCounts['underconfident'] },
  ];

  const chartHasData = chartData.some((d) => d.count > 0);

  // (D) wild 회고 — 복기 완료된 큰 결정만 '그때↔복기' 병치. 점수 0.
  const wildTotal = rows.filter((r) => r.problem_type === 'wild').length;
  const reviewedWild = rows
    .filter((r) => r.problem_type === 'wild' && isDecisionReviewed(r))
    .map(toWildReflection);

  const now = new Date();

  return (
    <div className="space-y-6">
      <p className="-mt-2 text-sm text-text-secondary">
        기록한 결정과 예측이 실제 결과와 얼마나 맞았는지 보여드려요.
      </p>

      {total === 0 ? (
        <div className="bg-surface border border-background-tertiary rounded-card p-8 text-center space-y-3">
          <p className="text-sm text-text-secondary">아직 기록한 결정이 없어요.</p>
          <p className="text-xs text-text-tertiary leading-relaxed">
            결정을 기록하고 정해둔 검토 기한이 지나면 여기에 예측 정확도가 쌓여요.
          </p>
          <button
            type="button"
            onClick={() => router.push('/decision')}
            className="mt-1 inline-block rounded-ctrl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg transition-transform active:scale-95 touch-manipulation"
          >
            결정 기록하기
          </button>
        </div>
      ) : (
        <>
          {/* 요약 카드 3-grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface border border-background-tertiary rounded-card p-4 text-center">
              <p className="text-xs text-text-secondary mb-1">기록한 결정</p>
              <p className="text-2xl font-bold text-text-primary">{total}</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">건</p>
            </div>
            <div className="bg-surface border border-background-tertiary rounded-card p-4 text-center">
              <p className="text-xs text-text-secondary mb-1">복기 완료율</p>
              <p className="text-2xl font-bold text-text-primary">{completionRate}%</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">{reviewedCount}/{total} 건</p>
            </div>
            <div className="bg-surface border border-background-tertiary rounded-card p-4 text-center">
              <p className="text-xs text-text-secondary mb-1">
                <InfoTooltip text="예측한 확신도와 실제 결과의 평균 차이예요. 값이 작을수록 예측이 실제와 가까웠다는 뜻이에요.">평균 예측-실제 차이</InfoTooltip>
              </p>
              {avgInflation !== null ? (
                <>
                  <p className="text-2xl font-bold text-text-primary">{avgInflation}%</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">복기 기준</p>
                </>
              ) : (
                <p className="mt-1.5 text-[11px] leading-snug text-text-tertiary">
                  되돌릴 수 있는 결정을
                  <br />
                  복기하면 채워져요
                </p>
              )}
            </div>
          </div>

          {/* 캘리브레이션 분포 차트 */}
          <div className="bg-surface border border-background-tertiary rounded-card p-4 sm:p-6">
            <h2 className="text-base font-bold text-text-primary mb-4">예측 정확도 분포</h2>
            {!chartHasData ? (
              <div className="py-8 text-center">
                <p className="text-sm text-text-secondary leading-relaxed">
                  되돌릴 수 있는 결정을 복기하면
                  <br />
                  예측이 얼마나 맞았는지 여기에 쌓여요.
                </p>
                <p className="mt-2 text-xs text-text-tertiary leading-relaxed">
                  되돌릴 수 없는 큰 결정은 점수 대신 아래 ‘큰 결정, 그 뒤’에서 비춰드려요.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#F1F5F9'} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="결정 수" fill={isDark ? '#52B788' : '#2D6A4F'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* (D) 큰 결정, 그 뒤 — wild 점수 없는 맞춤. 예상↔실제 본인 문장 병치(판정·점수 0). */}
          {wildTotal > 0 && (
            <div className="bg-surface border border-background-tertiary rounded-card p-4 sm:p-6">
              <h2 className="text-base font-bold text-text-primary mb-1">큰 결정, 그 뒤</h2>
              <p className="text-xs text-text-tertiary mb-4">
                되돌릴 수 없는 결정은 점수 대신 그때 적은 것과 복기 때 적은 것을 나란히 둬요.
              </p>
              {reviewedWild.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-text-secondary leading-relaxed">
                    큰 결정을 복기하면
                    <br />
                    그때와 지금을 나란히 볼 수 있어요.
                  </p>
                  <p className="mt-2 text-xs text-text-tertiary">기록한 큰 결정 {wildTotal}개 · 복기 0개</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {reviewedWild.map((w) => (
                    <li key={w.id} className="rounded-ctrl border border-background-tertiary bg-background-secondary p-4">
                      <p className="mb-3 line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
                        {w.trigger ?? '(내용 없음)'}
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">그때 적은 것</p>
                          <ReflectLine label="정말 후회할 것 같던 것" value={w.anticipatedRegret} />
                          <ReflectLine label="결과를 몰라 들던 불안" value={w.uncertaintyWorry} />
                          <ReflectLine label="지키고 싶던 가치" value={w.valuesToProtect} />
                        </div>
                        <div className="space-y-1.5 sm:border-l sm:border-background-tertiary sm:pl-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">복기 때 적은 것</p>
                          <ReflectLine label="겪으며 발견한 것" value={w.whatDiscovered} />
                          <ReflectLine label="지금 돌아보면" value={w.lookingBack} />
                          <ReflectLine
                            label="처음 가치와 견줘보면"
                            value={w.valueAlignment ? (WILD_VALUE_ALIGN_LABEL[w.valueAlignment] ?? w.valueAlignment) : null}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/decision/${w.id}`)}
                        className="mt-3 text-xs font-medium text-primary touch-manipulation"
                      >
                        결정 메모 전체 보기 →
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 내 결정 — 전체(클릭 시 상세 보기). 미복기 포함, 최신순. */}
          <div className="bg-surface border border-background-tertiary rounded-card p-4 sm:p-6">
            <h2 className="text-base font-bold text-text-primary mb-1">내 결정</h2>
            <p className="text-xs text-text-tertiary mb-4">눌러서 적은 내용을 다시 볼 수 있어요.</p>
            <ul className="space-y-2.5">
              {rows.map((r) => {
                const reviewedRow = isDecisionReviewed(r);
                const awaitingRow = isAwaitingReview(r, now);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/decision/${r.id}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-ctrl border border-background-tertiary bg-background-secondary px-4 py-3 text-left transition-colors hover:border-primary touch-manipulation"
                    >
                      <p className="text-sm text-text-primary leading-snug line-clamp-2 flex-1 min-w-0">
                        {r.trigger ?? '(내용 없음)'}
                      </p>
                      <span className="flex-shrink-0">
                        {reviewedRow ? (
                          r.calibration ? (
                            <Badge tone={DIRECTION_TONE[r.calibration.direction]}>
                              {DIRECTION_KOREAN[r.calibration.direction]}
                            </Badge>
                          ) : (
                            <Badge tone="success">복기 완료</Badge>
                          )
                        ) : awaitingRow ? (
                          <Badge tone="warning">복기 대기</Badge>
                        ) : (
                          <span className="text-[11px] text-text-tertiary whitespace-nowrap">
                            {r.review_at
                              ? `검토 ${new Date(r.review_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}`
                              : '검토 예정'}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
