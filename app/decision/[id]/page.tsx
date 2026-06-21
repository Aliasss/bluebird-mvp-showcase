'use client';

/**
 * 결정 상세 보기 — /decision/[id]
 *   내가 기록한 결정의 *전체 내용*을 아무 때나 다시 읽는 읽기 전용 화면.
 *   (인사이트 '결정 패턴' 목록 항목 → 이 페이지. 검토 기한 도래 시 '복기하기' CTA 노출.)
 *   소유권: id + user_id 로 조회(RLS + 방어적 필터). 쓰기 없음 — 순수 조회.
 *   톤(RM/AC-14): 결정을 채점하지 않고 적은 그대로 되비춘다. 의료/위로 어휘 0.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import { isAwaitingReview, isDecisionReviewed } from '@/lib/decision/review-status';
import type { Log } from '@/types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

const ACCEPT_LABEL: Record<string, string> = {
  yes: '네, 가벼워져요',
  partly: '조금은요',
  no: '아직 잘 모르겠어요',
};
const VALUE_ALIGN_LABEL: Record<string, string> = {
  aligned: '대체로 맞았다',
  mixed: '반반이다',
  not: '많이 달랐다',
};
const DIRECTION_LABEL: Record<string, string> = {
  overconfident: '과신',
  calibrated: '정확',
  underconfident: '과소 확신',
};

function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <p className="text-xs font-semibold text-text-tertiary">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-text-primary">{value}</p>
    </div>
  );
}

export default function DecisionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<Log | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const { data } = await supabase
        .from('logs')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .eq('log_type', 'decision')
        .maybeSingle();

      if (!data) { setNotFound(true); setLoading(false); return; }
      setLog(data as Log);
      setLoading(false);
    };
    load();
  }, [params.id, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </main>
    );
  }

  if (notFound || !log) {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="결정 기록" backHref="/insights?view=decision" />
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <p className="text-sm text-text-secondary">결정을 찾을 수 없어요.</p>
          <button
            type="button"
            onClick={() => router.push('/insights?view=decision')}
            className="mt-4 rounded-ctrl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg transition-transform active:scale-95 touch-manipulation"
          >
            결정 패턴으로
          </button>
        </div>
      </main>
    );
  }

  const isWild = log.problem_type === 'wild';
  const reviewed = isDecisionReviewed(log);
  const awaiting = isAwaitingReview(log, new Date());

  const frame = isPlainObject(log.decision_frame) ? log.decision_frame : null;
  const tame = frame && isPlainObject(frame.tame) ? frame.tame : null;
  const wild = frame && isPlainObject(frame.wild) ? frame.wild : null;
  const wildReview = wild && isPlainObject(wild.review) ? wild.review : null;
  const calibration = isPlainObject(log.calibration) ? log.calibration : null;

  const trackLabel = isWild ? '큰 결정' : '되돌릴 수 있는 결정';

  // 섹션별 내용 유무(빈 섹션 숨김)
  const tameFields = tame
    ? [
        str(tame.worstCase), str(tame.preventOrRecover), str(tame.costOfInaction),
        str(tame.oneYearHorizon), str(tame.thirdPerson), num(tame.baseRateOutOf10),
        str(tame.premortem), str(tame.ifThen),
      ].some((v) => v != null)
    : false;
  const wildFields = wild
    ? [
        str(wild.identity), str(wild.valuesToProtect), str(wild.falseDichotomy),
        str(wild.acceptUnknown), str(wild.uncertaintyWorry), str(wild.anticipatedRegret),
        str(wild.reversibleStep), str(wild.thirdPerson), str(wild.revelation),
      ].some((v) => v != null)
    : false;

  return (
    <main className="min-h-screen bg-background">
      <PageHeader title="결정 기록" backHref="/insights?view=decision" />

      <div className="mx-auto max-w-lg px-5 py-6 pb-28 space-y-5">
        {/* 헤더 — 트랙·상태·결정 텍스트 */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={isWild ? 'neutral' : 'primary'}>{trackLabel}</Badge>
            {reviewed ? (
              <Badge tone="success">복기 완료</Badge>
            ) : awaiting ? (
              <Badge tone="warning">복기 대기</Badge>
            ) : (
              <Badge tone="neutral">검토 예정</Badge>
            )}
          </div>
          <h1 className="text-xl font-bold leading-snug tracking-tight text-text-primary">
            {log.trigger}
          </h1>
          <p className="text-xs text-text-tertiary">
            {fmtDate(log.created_at)} 기록
            {log.review_at ? ` · 검토 기한 ${fmtDate(log.review_at)}` : ''}
          </p>
        </div>

        {/* 복기 대기 CTA */}
        {awaiting && (
          <button
            type="button"
            onClick={() => router.push(`/decision/${log.id}/review`)}
            className="flex w-full items-center justify-between rounded-card bg-primary px-5 py-4 text-left text-primary-fg transition-transform active:scale-[0.98] touch-manipulation"
          >
            <div>
              <p className="text-base font-semibold">지금 복기하기</p>
              <p className="mt-0.5 text-xs opacity-80">검토 기한이 됐어요. 예상과 실제를 맞춰볼까요?</p>
            </div>
            <span className="ml-3 flex-shrink-0 text-lg">→</span>
          </button>
        )}

        {/* 결정 내용 */}
        <div className="space-y-4 rounded-card border border-background-tertiary bg-surface p-5">
          <h2 className="text-base font-bold text-text-primary">결정 내용</h2>
          <Field label="고려한 선택지" value={log.decision_options} />
          <Field label="봉인한 예상 결과" value={log.expected_outcome} />
          {!isWild && log.confidence != null && (
            <Field label="이 걱정이 맞을 가능성" value={`${log.confidence}%`} />
          )}
        </div>

        {/* Tame — 더 적어둔 것 */}
        {!isWild && tameFields && tame && (
          <div className="space-y-4 rounded-card border border-background-tertiary bg-surface p-5">
            <h2 className="text-base font-bold text-text-primary">짚어본 것</h2>
            <Field label="그려본 최악" value={str(tame.worstCase)} />
            <Field label="막거나 되돌릴 방법" value={str(tame.preventOrRecover)} />
            <Field label="그대로 뒀을 때의 대가" value={str(tame.costOfInaction)} />
            <Field label="1년 뒤 관점" value={str(tame.oneYearHorizon)} />
            <Field label="아끼는 친구의 일이라면" value={str(tame.thirdPerson)} />
            {num(tame.baseRateOutOf10) != null && (
              <Field label="비슷한 상황 10명 중 안 좋게 끝난 사람" value={`${num(tame.baseRateOutOf10)} / 10명`} />
            )}
            <Field label="실패한다면 그 이유" value={str(tame.premortem)} />
            <Field label="대응 계획" value={str(tame.ifThen)} />
          </div>
        )}

        {/* Wild — 결정 메모: 적은 내용을 결정 구조대로 모아 보여주는 기록물.
            톤(RM/AC-14): 판정·권유 0 — 푸터로 '판단이 아님'을 명시. uncertaintyWorry↔anticipatedRegret
            (결과 모르는 불안 ↔ 진짜 후회) 자기분류 한 쌍을 인접 배치. */}
        {isWild && wildFields && wild && (
          <div className="space-y-4 rounded-card border border-background-tertiary bg-surface p-5">
            <div>
              <h2 className="text-base font-bold text-text-primary">결정 메모</h2>
              <p className="mt-1 text-xs text-text-tertiary">당신이 적은 내용을 결정의 구조대로 모았어요.</p>
            </div>
            <Field label="이 결정에서 중요한 것" value={str(wild.identity)} />
            <Field label="끝까지 지키고 싶은 것" value={str(wild.valuesToProtect)} />
            <Field label="떠올린 선택지 말고 다른 길" value={str(wild.falseDichotomy)} />
            <Field label="결과를 몰라서 드는 불안" value={str(wild.uncertaintyWorry)} />
            <Field label="정말 후회할 것 같은 것" value={str(wild.anticipatedRegret)} />
            <Field label="아끼는 친구의 일이라면" value={str(wild.thirdPerson)} />
            {str(wild.acceptUnknown) && (
              <Field label="지금 답을 모르는 것에 대해" value={ACCEPT_LABEL[str(wild.acceptUnknown) as string] ?? str(wild.acceptUnknown)} />
            )}
            <Field label="되돌릴 수 있는 작은 한 걸음" value={str(wild.reversibleStep)} />
            <Field label="그래도 끌리는 이유" value={str(wild.revelation)} />
            <p className="border-t border-background-tertiary pt-3 text-xs leading-relaxed text-text-tertiary">
              이 메모는 당신이 적은 내용을 그대로 모은 거예요. BlueBird의 판단이나 권유가 아닙니다.
            </p>
          </div>
        )}

        {/* 복기 결과 */}
        {reviewed && (
          <div className="space-y-4 rounded-card border border-primary-border bg-primary-tint p-5">
            <h2 className="text-base font-bold text-text-primary">복기 결과</h2>
            {!isWild ? (
              <>
                <Field label="실제 결과" value={str(log.actual_outcome)} />
                {calibration && str(calibration.direction) && (
                  <Field
                    label="예측 평가"
                    value={DIRECTION_LABEL[str(calibration.direction) as string] ?? str(calibration.direction)}
                  />
                )}
              </>
            ) : (
              <>
                <Field label="지금 돌아보면" value={wildReview ? str(wildReview.lookingBack) : null} />
                <Field label="겪으며 발견한 것" value={wildReview ? str(wildReview.whatDiscovered) : null} />
                {wildReview && str(wildReview.valueAlignment) && (
                  <Field
                    label="처음 적은 가치와 견줘보면"
                    value={VALUE_ALIGN_LABEL[str(wildReview.valueAlignment) as string] ?? str(wildReview.valueAlignment)}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
