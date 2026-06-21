'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Top from '@/components/ui/Top';
import BottomCTA from '@/components/ui/BottomCTA';
import { validateDecisionDraft } from '@/lib/decision/prediction';
import type { DecisionDraft } from '@/lib/decision/types';
import { createClient } from '@/lib/supabase/client';
import { cohortForUser, type Cohort } from '@/lib/analytics/cohort';
import {
  DECISION_INPUT_NOTICE,
  WILD_ROLE_NOTICE,
  WILD_WORRY_SPLIT_HEADER,
  WILD_UNCERTAINTY_WORRY_LABEL,
  WILD_ANTICIPATED_REGRET_LABEL,
  WILD_FALSE_DICHOTOMY_LABEL,
  DECISION_PREVIEW_HEADER,
  DECISION_PREVIEW_BETTER,
  DECISION_PREVIEW_ASEXPECTED,
  DECISION_PREVIEW_WORSE,
  DECISION_PREVIEW_FOOT,
} from '@/lib/copy/decision';
import { SafetyNotice } from '@/components/safety/SafetyNotice';
import type { CrisisLevel } from '@/lib/safety/types';
import {
  resolveTrack,
  needsIdentityQuestion,
  type TriageAnswer,
  type TriageAnswers,
} from '@/lib/decision/triage';
import {
  buildTameFrame,
  buildWildFrame,
  selectMirrorBack,
  type TameFrameInput,
  type WildFrameInput,
  type WildAcceptUnknown,
} from '@/lib/decision/frame';

// ── 날짜 유틸 ──────────────────────────────────────────────────────────────────

/** 오늘 기준 N일 후 '그날 0시'(ISO) — 검토 당일 시작부터 복기 가능하도록(복기 대기 판정과 정합). */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** 검토 기한 상한(일) — 커스텀 날짜 입력 오류(예: 16개월 뒤) 방지. 그 너머는 결과 확인 루프가 사실상 안 닫힌다. */
const MAX_REVIEW_DAYS = 365;

/** "직접" 입력 날짜 문자열("YYYY-MM-DD") → 해당 날짜 0시 ISO. 미래·상한(1년) 이내가 아니면 null(기록 비활성). */
function dateInputToIso(value: string): string | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  const now = Date.now();
  if (t <= now || t > now + MAX_REVIEW_DAYS * 86400000) return null;
  return d.toISOString();
}

/** ISO → 일상 날짜(ko-KR) — 미리보기 echo 용. 잘못된 값이면 null. */
function reviewDateLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── 확신도 라벨 ────────────────────────────────────────────────────────────────

function confidenceLabel(v: number): string {
  if (v <= 20) return '거의 확신 없음';
  if (v <= 40) return '낮음';
  if (v <= 60) return '보통';
  if (v <= 80) return '높음';
  return '매우 높음';
}

// ── 검토 기한 칩 ───────────────────────────────────────────────────────────────

type ReviewChip = '1일 후' | '3일 후' | '1주 후' | '직접';
const REVIEW_CHIPS: ReviewChip[] = ['1일 후', '3일 후', '1주 후', '직접'];

function chipToIso(chip: ReviewChip): string | null {
  if (chip === '1일 후') return daysFromNow(1);
  if (chip === '3일 후') return daysFromNow(3);
  if (chip === '1주 후') return daysFromNow(7);
  return null; // 직접 입력
}

// ── 공통 스타일 ────────────────────────────────────────────────────────────────
const FIELD_CLASS =
  'w-full min-h-[130px] resize-none border-none bg-transparent text-[19px] font-medium leading-[1.5] tracking-snug text-text-primary outline-none placeholder:text-text-tertiary';
const SMALL_FIELD_CLASS =
  'w-full min-h-[88px] resize-none border-none bg-transparent text-[16px] font-medium leading-[1.55] tracking-snug text-text-primary outline-none placeholder:text-text-tertiary';
const CARD_CLASS = 'rounded-card border border-background-tertiary bg-surface p-5';
const PRIMARY_BTN =
  'w-full rounded-2xl bg-primary px-6 py-[17px] text-base font-semibold text-primary-fg transition-transform hover:bg-primary-dark active:scale-95 touch-manipulation disabled:opacity-50';

// ── 스텝 머신 ──────────────────────────────────────────────────────────────────
//   결정입력 → 트리아지 →
//     (tame) 공포→거리→예측 → 미러백
//     (wild) 가치→수용·후회·작은걸음→발견 → 미러백
//   단일 페이지 상태로 진행(라우팅 없음). detect() 는 마지막 1회 POST /api/decision 에서
//   결정 텍스트에 대해 그대로 수행된다(서버 — §5.1, AC-5).
//   ⚠️ wild 는 확신도·위협확률·base-rate·예측 점수 입력이 일절 없다(§0.1·§4·AC-8).
type Step =
  | 'entry'
  | 'triage'
  | 'tame-fear'
  | 'tame-distance'
  | 'tame-predict'
  | 'wild-values'
  | 'wild-accept'
  | 'wild-revelation'
  | 'mirror';

// 현재 진행 트랙(미러백·기록 분기). 트리아지 결과로 설정.
type ActiveTrack = 'tame' | 'wild';

// 불가지 수용 체크(점수 아님 — §4 ②).
const ACCEPT_OPTIONS: { value: WildAcceptUnknown; label: string }[] = [
  { value: 'yes', label: '네, 가벼워져요' },
  { value: 'partly', label: '조금은요' },
  { value: 'no', label: '아직 잘 모르겠어요' },
];

// ── 접이식 선택 입력 카드 ──────────────────────────────────────────────────────
function Collapsible({
  label,
  open,
  onToggle,
  children,
  disabled,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-card border border-background-tertiary bg-surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-[15px] font-semibold text-text-secondary hover:text-text-primary transition-colors touch-manipulation"
        disabled={disabled}
      >
        <span>{label}</span>
        <span
          className={`text-sm transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-background-tertiary pt-4">{children}</div>
      )}
    </div>
  );
}

// ── 트리아지 선택지 버튼 ───────────────────────────────────────────────────────
function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-card border px-5 py-4 text-left text-[16px] font-semibold leading-snug transition touch-manipulation active:scale-[0.98] ${
        selected
          ? 'border-primary bg-primary text-primary-fg'
          : 'border-background-tertiary bg-surface text-text-primary hover:border-primary/50'
      }`}
    >
      {label}
    </button>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

export default function DecisionPage() {
  const router = useRouter();

  useEffect(() => {
    const fromParam = new URLSearchParams(window.location.search).get('from');
    const from =
      fromParam === 'report' ||
      fromParam === 'dashboard' ||
      fromParam === 'fab' ||
      fromParam === 'onboarding'
        ? fromParam
        : 'direct';
    void fetch('/api/analytics/decision-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'decision_record_started', from }),
    }).catch(() => {});
  }, []);

  // ── 복기 미리보기 A/B 코호트 (preview-activation) ─────────────────────────
  //   /decision 은 인증 게이트 안이라 user 가 존재. mount 시 1회 user.id → cohortForUser.
  //   결정론적 해시라 SessionTracker 가 보낸 군과 동치(같은 user = 같은 군).
  const [cohort, setCohort] = useState<Cohort | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        setCohort(cohortForUser(user.id));
      } catch {
        // 코호트 미확정 — 미리보기는 노출 안 함(control 과 동일 처리). best-effort.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 미리보기 노출 계측 1회 발신 가드(중복 방지).
  const previewShownRef = useRef(false);

  // 스텝
  const [step, setStep] = useState<Step>('entry');

  // 결정 입력
  const [decision, setDecision] = useState('');

  // 트리아지 답
  const [reversible, setReversible] = useState<TriageAnswer | null>(null);
  const [identityShift, setIdentityShift] = useState<TriageAnswer | null>(null);

  // Tame ① 공포설정
  const [worstCase, setWorstCase] = useState('');
  const [preventOrRecover, setPreventOrRecover] = useState('');
  const [costOfInaction, setCostOfInaction] = useState('');
  const [fearOptOpen, setFearOptOpen] = useState(false);

  // Tame ② 거리두기
  const [oneYearHorizon, setOneYearHorizon] = useState('');
  const [thirdPerson, setThirdPerson] = useState('');
  const [thirdPersonOpen, setThirdPersonOpen] = useState(false);

  // Tame ③ 예측·봉인
  const [confidence, setConfidence] = useState(50);
  const [baseRateOutOf10, setBaseRateOutOf10] = useState(5);
  const [selectedChip, setSelectedChip] = useState<ReviewChip | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [premortem, setPremortem] = useState('');
  const [ifThen, setIfThen] = useState('');
  const [sealOptOpen, setSealOptOpen] = useState(false);

  // 진행 트랙(트리아지 결과 — 미러백·기록 분기).
  const [activeTrack, setActiveTrack] = useState<ActiveTrack>('tame');

  // Wild ① 가치·정체성
  const [identity, setIdentity] = useState('');
  const [valuesToProtect, setValuesToProtect] = useState('');
  const [valuesOptOpen, setValuesOptOpen] = useState(false);
  // 가짜 양자택일 깨기 — '이게 정말 둘 중 하나인가?' (선택·접이식, wild-values).
  const [falseDichotomy, setFalseDichotomy] = useState('');
  const [dichotomyOptOpen, setDichotomyOptOpen] = useState(false);

  // Wild ② 수용 + (자기분류) 불확실 불안 + 예상 후회 + 작은 실험
  const [acceptUnknown, setAcceptUnknown] = useState<WildAcceptUnknown | null>(null);
  const [uncertaintyWorry, setUncertaintyWorry] = useState('');
  const [anticipatedRegret, setAnticipatedRegret] = useState('');
  const [reversibleStep, setReversibleStep] = useState('');
  const [wildThirdPerson, setWildThirdPerson] = useState('');
  const [wildDistanceOpen, setWildDistanceOpen] = useState(false);

  // Wild ③ 발견 리프레임 (+ 검토 기한은 Tame 과 동일 selectedChip/customDate 재사용).
  const [revelation, setRevelation] = useState('');

  // 제출/위기
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedId, setRecordedId] = useState<string | null>(null);
  const [safetyLevel, setSafetyLevel] = useState<Exclude<CrisisLevel, 'none'> | null>(null);

  // reviewAt
  const reviewAt: string | null =
    selectedChip === null
      ? null
      : selectedChip === '직접'
      ? dateInputToIso(customDate)
      : chipToIso(selectedChip);

  // 예측·봉인 draft 검증(확신도+검토기한 — 기존 게이트 재사용, tame).
  const draft: DecisionDraft = { decision, confidence, reviewAt };
  const draftErrors = validateDecisionDraft(draft, new Date());
  const sealDisabled = loading || draftErrors.length > 0;

  // wild 기록 게이트 — 확신도 점수화 없음. 검토 기한(reviewAt)이 미래 시점이면 기록 가능.
  const wildReviewValid = reviewAt != null && new Date(reviewAt).getTime() > Date.now();
  const wildRecordDisabled = loading || !wildReviewValid;

  // 미러백 인용(클라이언트 — 방금 입력한 원문 1~2개, 평가 0). 트랙별 자유텍스트만 전달
  //   (acceptUnknown enum 등 비자유텍스트는 인용 대상 아님 — 순수 원문 인용 보장).
  const mirrorQuotes =
    activeTrack === 'wild'
      ? selectMirrorBack('wild', {
          identity,
          revelation,
          uncertaintyWorry,
          anticipatedRegret,
          reversibleStep,
          valuesToProtect,
          falseDichotomy,
          thirdPerson: wildThirdPerson,
        })
      : selectMirrorBack('tame', {
          worstCase,
          oneYearHorizon,
          premortem,
          ifThen,
          preventOrRecover,
          costOfInaction,
          thirdPerson,
        });

  // ── 복기 미리보기 노출 조건 (preview-activation) ───────────────────────────
  //   ⚠️ wild 는 절대 노출 안 함(점수형 미리보기 금지·쐐기 보존). tame 전용.
  //   PREVIEW_SHOW_ALL=true → 현재 *전원* 노출(사용자 적어 A/B 측정 무의미 + 적은 사용자에게 기능 우선).
  //   베타 사용자가 늘면 false 로 전환 → cohort 'preview' 만 노출(클린 A/B). 전환 이전 노출자는 분석서 제외.
  const PREVIEW_SHOW_ALL: boolean = true;
  const showPreview =
    step === 'mirror' && activeTrack === 'tame' && (PREVIEW_SHOW_ALL || cohort === 'preview');

  // 미리보기 노출 시 1회 계측(best-effort, useRef 로 중복 방지). PII 0 — cohort·track enum 만.
  //   cohort 확정 뒤 발신(실제 배정 군 라벨 보장 — 전원 노출기엔 control 도 포함). 군은 user_id
  //   결정론 해시라 분석서 재계산도 가능.
  useEffect(() => {
    if (!showPreview || cohort == null || previewShownRef.current) return;
    previewShownRef.current = true;
    void fetch('/api/analytics/decision-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'decision_preview_shown',
        cohort, // 실제 배정 군(preview|control)
        track: 'tame', // 미리보기는 tame 전용
      }),
    }).catch(() => {});
  }, [showPreview, cohort]);

  // ── 트리아지 진행 ─────────────────────────────────────────────────────────
  const handleTriageNext = () => {
    if (reversible == null) return;
    if (needsIdentityQuestion(reversible) && identityShift == null) return; // Q2 미응답.

    const answers: TriageAnswers = {
      reversible,
      ...(identityShift != null ? { identityShift } : {}),
    };
    const track = resolveTrack(answers);
    if (track === 'incomplete') return; // Q2 가 더 필요 — 위 가드로 도달 안 함.

    // ── 트리아지 해소 계측 (decision-logic-v2 §11·AC-17) — best-effort, 비차단(void).
    //   트랙 분기 유효성(Tame/Wild 가 유의미하게 갈리는지)의 데이터.
    //   PII 금지: 결정 원문 미포함 — 비식별 enum(problemType)·문항 수(qCount=1|2)만.
    //   서버 sanitizer(decision-events.ts allowlist)가 권위 가드.
    const qCount = needsIdentityQuestion(reversible) ? 2 : 1;
    void fetch('/api/analytics/decision-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'decision_triage_completed',
        problemType: track, // 'tame' | 'wild' (resolveTrack 이 incomplete 는 위에서 차단)
        qCount, // 1 = Q1 종결(되돌릴 수 있음) · 2 = Q2 진행
      }),
    }).catch(() => {});

    if (track === 'wild') {
      setActiveTrack('wild');
      setStep('wild-values');
    } else {
      setActiveTrack('tame');
      setStep('tame-fear');
    }
  };

  // ── 최종 기록(POST 1회 — detect 는 서버에서 결정 텍스트에 대해 수행) ────────
  //   tame: confidence(슬라이더) + tame 프레임. wild: confidence=null(점수화 없음, §0.1)
  //   + wild 프레임. 두 트랙 모두 reviewAt(검토 기한) 필수, detect()·SafetyNotice 동일 경로.
  const handleRecord = async () => {
    const triage: TriageAnswers = {
      reversible: reversible as TriageAnswer,
      ...(identityShift != null ? { identityShift } : {}),
    };

    let body: Record<string, unknown>;
    if (activeTrack === 'wild') {
      if (wildRecordDisabled) return;
      const wildInput: WildFrameInput = {
        identity,
        valuesToProtect,
        falseDichotomy,
        thirdPerson: wildThirdPerson,
        ...(acceptUnknown != null ? { acceptUnknown } : {}),
        uncertaintyWorry,
        anticipatedRegret,
        reversibleStep,
        revelation,
      };
      body = {
        decision: decision.trim(),
        confidence: null, // wild — 확신도 점수화 없음(쐐기 보존). logs.confidence NULL 유지.
        reviewAt,
        problemType: 'wild',
        decisionFrame: buildWildFrame(wildInput, triage),
      };
    } else {
      if (sealDisabled) return;
      const tameInput: TameFrameInput = {
        worstCase,
        preventOrRecover,
        costOfInaction,
        thirdPerson,
        oneYearHorizon,
        baseRateOutOf10,
        premortem,
        ifThen,
      };
      body = {
        decision: decision.trim(),
        confidence,
        reviewAt,
        problemType: 'tame',
        decisionFrame: buildTameFrame(tameInput, triage),
      };
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || '기록에 실패했습니다. 다시 시도해주세요.');
      }
      setRecordedId(payload.id);

      const level: unknown = payload?.safety?.level;
      if (level === 'critical' || level === 'caution') {
        setSafetyLevel(level);
      } else {
        setStep('mirror');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '기록에 실패했습니다. 다시 시도해주세요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSafetyOverride = async () => {
    setSafetyLevel(null);
    try {
      if (recordedId) {
        await fetch('/api/safety/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logId: recordedId }),
        });
      }
    } catch {
      // override 기록 실패해도 미러백 진행 허용.
    }
    setStep('mirror');
  };

  // ── 위기 표지 (기록은 이미 저장됨 — 오버레이) ─────────────────────────────
  if (safetyLevel) {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader title="결정 기록" backHref="/dashboard" />
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          <SafetyNotice level={safetyLevel} onOverride={handleSafetyOverride} />
        </div>
      </main>
    );
  }

  // ── 기록 완료 — 자기 문장 미러백 (AC-13, 순수 반영 — 조언 0) ───────────────
  //   wild 는 "일부러 점수 안 매겨요" 정직성 한 줄을 record 시점에 미리 노출(AC-15).
  if (step === 'mirror') {
    const isWild = activeTrack === 'wild';
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader title="결정 기록" backHref="/dashboard" />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <Top
            title="기록했어요. 당신은 이렇게 적었어요:"
            sub={
              isWild
                ? '검토일에 다시 만나, 그동안 무엇을 발견했는지 함께 돌아봐요.'
                : '검토일이 되면, 이 예상과 실제가 얼마나 맞았는지 다시 비춰드릴게요.'
            }
          />
          <div className="flex-1 px-5 pb-44 space-y-4">
            {mirrorQuotes.length > 0 ? (
              mirrorQuotes.map((quote, i) => (
                <div key={i} className={CARD_CLASS}>
                  <p className="text-[18px] font-medium leading-[1.55] tracking-snug text-text-primary">
                    “{quote}”
                  </p>
                </div>
              ))
            ) : isWild ? (
              // wild 자유텍스트가 모두 비면 검토 기한 사실 진술 폴백(확신도 없음).
              <div className={CARD_CLASS}>
                <p className="text-[17px] font-medium leading-[1.6] text-text-primary">
                  검토일에 다시 보기로 했어요.
                </p>
              </div>
            ) : (
              // tame 자유텍스트가 모두 비면 사실 진술 폴백(확신도·검토기한).
              <div className={CARD_CLASS}>
                <p className="text-[17px] font-medium leading-[1.6] text-text-primary">
                  확신 {confidence}%로, 검토일에 다시 보기로 했어요.
                </p>
              </div>
            )}

            {/* wild — 정직성 한 줄(record 시점 노출, AC-15). 점수 매기지 않음을 약속 이행으로. */}
            {isWild && (
              <div className="rounded-card border border-background-tertiary bg-background-secondary p-5">
                <p className="text-[15px] leading-[1.6] text-text-secondary">
                  이 결정은 일부러 점수 매기지 않아요 — 맞았다/틀렸다로 채점할 수 있는 종류가
                  아니거든요. 검토일에 다시 만나, 그동안 무엇을 발견했는지 함께 돌아봐요.
                </p>
              </div>
            )}

            {/* 복기 미리보기 카드 (preview-activation) — tame 노출군만. wild 면 showPreview=false.
                검토일에 무엇을 보게 되는지 *예시*로 미리 보여 재방문 동기를 형성(A/B 처치). 점수형 아님. */}
            {showPreview && (
              <div className="rounded-card border border-primary/30 bg-background-secondary p-5">
                <p className="text-[15px] font-semibold leading-snug text-text-primary">
                  {DECISION_PREVIEW_HEADER}
                </p>
                {/* 본인 입력 echo — 사용자가 방금 적은 확신도·검토일을 그대로 되비춤(가공·평가 0). */}
                <p className="mt-1.5 text-[13px] leading-[1.55] text-text-tertiary">
                  이번 확신도 {confidence}%
                  {reviewDateLabel(reviewAt) ? ` · ${reviewDateLabel(reviewAt)}에 다시 봐요` : ''}
                </p>
                <ul className="mt-4 space-y-2.5">
                  <li className="text-[14px] leading-[1.6] text-text-secondary">
                    {DECISION_PREVIEW_BETTER}
                  </li>
                  <li className="text-[14px] leading-[1.6] text-text-secondary">
                    {DECISION_PREVIEW_ASEXPECTED}
                  </li>
                  <li className="text-[14px] leading-[1.6] text-text-secondary">
                    {DECISION_PREVIEW_WORSE}
                  </li>
                </ul>
                <p className="mt-4 border-t border-background-tertiary pt-3 text-[13px] leading-[1.55] text-text-tertiary">
                  {DECISION_PREVIEW_FOOT}
                </p>
              </div>
            )}
          </div>
        </div>
        <BottomCTA>
          <button type="button" onClick={() => router.push('/dashboard')} className={PRIMARY_BTN}>
            확인
          </button>
        </BottomCTA>
      </main>
    );
  }

  // ── Wild ① 가치·정체성 명료화 ─────────────────────────────────────────────
  if (step === 'wild-values') {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader title="결정 기록" onBack={() => setStep('triage')} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <Top
            title="정답을 매기는 대신 당신에게 중요한 걸 짚어볼게요"
            sub="이런 결정엔 점수를 매기지 않아요. 무엇이 중요한지만 함께 정리해요."
          />
          <div className="flex-1 px-5 pb-44 space-y-5">
            {/* 진입 역할 선언 [wild 1회 노출] — 답을 좁히지 않고 생각의 구조만 제공한다는 경계. */}
            <div className="rounded-card border border-background-tertiary bg-background-secondary p-4">
              <p className="text-[14px] leading-[1.6] text-text-secondary">{WILD_ROLE_NOTICE}</p>
            </div>
            {/* 이 결정에서 가장 중요한 것 [핵심] */}
            <div className={CARD_CLASS}>
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">
                이 결정에서 가장 중요한 게 뭔가요
              </p>
              <textarea
                autoFocus
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="예: 성장·새로운 도전 / 안정·안전 / 사람과의 관계 / 자유 / 솔직함…"
                aria-label="이 결정에서 가장 중요한 것"
                className={FIELD_CLASS}
              />
            </div>
            {/* 끝까지 지키고 싶은 것 [선택·접이식] */}
            <Collapsible
              label="어느 쪽을 택하든 끝까지 지키고 싶은 게 있나요?"
              open={valuesOptOpen}
              onToggle={() => setValuesOptOpen((p) => !p)}
            >
              <textarea
                value={valuesToProtect}
                onChange={(e) => setValuesToProtect(e.target.value)}
                placeholder="예: 가족과의 시간 / 내 건강 / 자존감 / 정직함…"
                aria-label="끝까지 지키고 싶은 것"
                className={SMALL_FIELD_CLASS}
              />
            </Collapsible>
            {/* 가짜 양자택일 깨기 [선택·접이식] — 답·대안 제시 0, 선택지를 스스로 다시 보게 하는 질문 */}
            <Collapsible
              label={WILD_FALSE_DICHOTOMY_LABEL}
              open={dichotomyOptOpen}
              onToggle={() => setDichotomyOptOpen((p) => !p)}
            >
              <textarea
                value={falseDichotomy}
                onChange={(e) => setFalseDichotomy(e.target.value)}
                placeholder="이것 말고 다른 길은 없는지, 꼭 지금 한꺼번에 정해야 하는지 적어보세요."
                aria-label="지금 떠올린 선택지가 전부인지"
                className={SMALL_FIELD_CLASS}
              />
            </Collapsible>
          </div>
        </div>
        <BottomCTA>
          <button type="button" onClick={() => setStep('wild-accept')} className={PRIMARY_BTN}>
            다음
          </button>
        </BottomCTA>
      </main>
    );
  }

  // ── Wild ② 수용 + 예상 후회 + 되돌릴 수 있는 작은 한 걸음 ───────────────────
  if (step === 'wild-accept') {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader title="결정 기록" onBack={() => setStep('wild-values')} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <Top title="지금 다 알 수 없는 게 정상이에요" />
          <div className="flex-1 px-5 pb-44 space-y-5">
            {/* 불가지 수용 한 줄 고지 + 수용 체크(점수 아님) */}
            <div className="rounded-card border border-background-tertiary bg-background-secondary p-5">
              <p className="text-[15px] leading-[1.6] text-text-secondary">
                이런 결정은 결과를 미리 알 수 없어요. 그걸 받아들이는 것도 결정의 일부예요.
              </p>
              <p className="mt-3 mb-2.5 text-[15px] font-semibold leading-snug text-text-primary">
                ‘지금 답을 모르는 게 정상’이라고 받아들이면, 마음이 조금 가벼워지나요?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {ACCEPT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setAcceptUnknown((prev) => (prev === opt.value ? null : opt.value))
                    }
                    aria-pressed={acceptUnknown === opt.value}
                    className={`rounded-ctrl border px-2 py-2.5 text-[13px] font-semibold leading-snug transition touch-manipulation active:scale-95 ${
                      acceptUnknown === opt.value
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-background-tertiary bg-surface text-text-primary hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 망설임 자기분류 [핵심] — '불확실 불안' vs '진짜 후회'를 사용자가 *스스로* 가른다.
                시스템은 분류·판정하지 않는다(이건 불안입니다 류 금지). 두 칸 모두 선택·빈칸 허용. */}
            <div className={CARD_CLASS}>
              <p className="mb-3 text-[15px] leading-[1.6] text-text-secondary">
                {WILD_WORRY_SPLIT_HEADER}
              </p>
              {/* (1) 결과를 몰라서 드는 불안 — 신규 자기분류 칸(선택) */}
              <div>
                <p className="mb-2 text-[15px] font-semibold leading-snug text-text-primary">
                  {WILD_UNCERTAINTY_WORRY_LABEL}
                </p>
                <textarea
                  value={uncertaintyWorry}
                  onChange={(e) => setUncertaintyWorry(e.target.value)}
                  placeholder="결과가 어떻게 될지 몰라서 드는 불안이 있다면 적어보세요. (선택)"
                  aria-label="결과를 미리 알 수 없어서 드는 불안"
                  className={SMALL_FIELD_CLASS}
                />
              </div>
              {/* (2) 정말 후회할 것 같은 것 — 기존 anticipatedRegret(의미 동일, 분리 강조) */}
              <div className="border-t border-background-tertiary pt-4 mt-1">
                <p className="mb-2 text-[15px] font-semibold leading-snug text-text-primary">
                  {WILD_ANTICIPATED_REGRET_LABEL}
                </p>
                <textarea
                  value={anticipatedRegret}
                  onChange={(e) => setAnticipatedRegret(e.target.value)}
                  placeholder="결과와 상관없이 정말 후회할 것 같은 게 있다면 적어보세요. 정답이 아니라 무엇을 중히 여기는지 보여줄 뿐이에요. (선택)"
                  aria-label="정말 후회할 것 같은 것"
                  className={SMALL_FIELD_CLASS}
                />
              </div>
            </div>

            {/* 되돌릴 수 있는 작은 한 걸음 [핵심] — 조언 없는 주체성의 순간 */}
            <div className={CARD_CLASS}>
              <p className="mb-2 text-[15px] font-semibold leading-snug text-text-primary">
                되돌릴 수 있는 작은 한 걸음은 없을까요?
              </p>
              <textarea
                value={reversibleStep}
                onChange={(e) => setReversibleStep(e.target.value)}
                placeholder="통째로 정하기 전에 먼저 겪어볼 작은 방법이 있을까요? (예: 옮기기 전 짧게 살아보기, 크게 바꾸기 전 일부만 시도)"
                aria-label="되돌릴 수 있는 작은 한 걸음"
                className={SMALL_FIELD_CLASS}
              />
            </div>

            {/* 정직성 한 줄 — 기록 순간 미리 노출(AC-15) */}
            <div className="rounded-card border border-background-tertiary bg-background-secondary p-4">
              <p className="text-[14px] leading-[1.6] text-text-secondary">
                이 결정은 일부러 점수를 매기지 않아요 — 채점이 거짓이 되니까요.
              </p>
            </div>

            {/* 거리두기 [선택·접이식] */}
            <Collapsible
              label="아끼는 친구의 일이라면 어떻게 보일까 적어보기"
              open={wildDistanceOpen}
              onToggle={() => setWildDistanceOpen((p) => !p)}
            >
              <textarea
                value={wildThirdPerson}
                onChange={(e) => setWildThirdPerson(e.target.value)}
                placeholder="이걸 아끼는 친구의 일이라 생각하면, 어떻게 보이나요?"
                aria-label="친구의 일이라면"
                className={SMALL_FIELD_CLASS}
              />
            </Collapsible>
          </div>
        </div>
        <BottomCTA>
          <button type="button" onClick={() => setStep('wild-revelation')} className={PRIMARY_BTN}>
            다음
          </button>
        </BottomCTA>
      </main>
    );
  }

  // ── Wild ③ 발견(revelation) 리프레임 + 검토 기한 ───────────────────────────
  if (step === 'wild-revelation') {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader title="결정 기록" onBack={() => setStep('wild-accept')} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <Top
            title="마지막 질문 하나"
            sub="이런 큰 결정은 겪어봐야 알 수 있어요. 미리 정답을 맞힐 필요는 없어요."
          />
          <div className="flex-1 px-5 pb-44 space-y-5">
            {/* 발견 리프레임 [핵심] */}
            <div className={CARD_CLASS}>
              <p className="mb-2 text-[15px] font-semibold leading-snug text-text-primary">
                결과는 해봐야 아는 거예요. 그걸 알면서도 이 선택이 끌린다면 그 이유는 뭔가요?
              </p>
              <textarea
                autoFocus
                value={revelation}
                onChange={(e) => setRevelation(e.target.value)}
                placeholder="결과를 몰라도 끌리는 이유나 지금 드는 마음을 자유롭게 적어보세요"
                aria-label="발견 리프레임"
                className={FIELD_CLASS}
              />
            </div>

            {/* 검토 기한 [핵심] — 양 트랙 공통. 복기는 비점수 자기보고(Task 4). */}
            <div className="rounded-card border border-background-tertiary bg-surface px-5 py-5">
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">
                언제쯤 다시 돌아볼까요?
              </p>
              <div className="grid grid-cols-4 gap-2">
                {REVIEW_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setSelectedChip(chip);
                      if (chip !== '직접') setCustomDate('');
                    }}
                    aria-pressed={selectedChip === chip}
                    className={`rounded-ctrl border py-2.5 text-sm font-semibold transition touch-manipulation active:scale-95 ${
                      selectedChip === chip
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-background-tertiary bg-surface text-text-primary hover:border-primary/50'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              {selectedChip === '직접' && (
                <div className="mt-3">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    aria-label="검토 기한 날짜 직접 입력"
                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                    max={new Date(Date.now() + MAX_REVIEW_DAYS * 86400000).toISOString().slice(0, 10)}
                    className="w-full rounded-ctrl border border-background-tertiary bg-background px-4 py-3 text-sm text-text-primary outline-none focus:border-primary transition"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-danger bg-danger/10 p-4">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}
          </div>
        </div>
        <BottomCTA>
          <button
            type="button"
            onClick={handleRecord}
            disabled={wildRecordDisabled}
            className={PRIMARY_BTN}
          >
            {loading ? '기록하는 중...' : '기록하기'}
          </button>
        </BottomCTA>
      </main>
    );
  }

  // ── 트리아지 (결정 텍스트 입력 직후 — 같은 페이지 스텝) ────────────────────
  if (step === 'triage') {
    const showQ2 = reversible != null && needsIdentityQuestion(reversible);
    const canProceed = reversible != null && (!showQ2 || identityShift != null);
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader title="결정 기록" onBack={() => setStep('entry')} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <Top title="이 결정, 어떤 종류인지 잠깐 볼게요" />
          <div className="flex-1 px-5 pb-44 space-y-6">
            {/* Q1 — 가역성 (항상) */}
            <div className="space-y-3">
              <p className="text-[17px] font-semibold leading-snug text-text-primary">
                잘못되면 비교적 쉽게 되돌리거나 빠져나올 수 있나요?
              </p>
              <ChoiceButton
                label="네, 되돌릴 수 있어요"
                selected={reversible === 'yes'}
                onClick={() => {
                  setReversible('yes');
                  setIdentityShift(null); // Q1=yes 면 Q2 불필요.
                }}
              />
              <ChoiceButton
                label="아니요, 되돌리기 어려워요"
                selected={reversible === 'no'}
                onClick={() => setReversible('no')}
              />
              <ChoiceButton
                label="잘 모르겠어요"
                selected={reversible === 'unsure'}
                onClick={() => setReversible('unsure')}
              />
            </div>

            {/* Q2 — 정체성/가지성 (Q1 != yes 일 때만) */}
            {showQ2 && (
              <div className="space-y-3 border-t border-background-tertiary pt-6">
                <p className="text-[17px] font-semibold leading-snug text-text-primary">
                  이건 인생이나 ‘내가 어떤 사람인지’를 크게 바꾸는 결정인가요?
                </p>
                <p className="text-sm leading-relaxed text-text-secondary">
                  해보기 전엔 어떨지 미리 가늠하기 어려운, 큰 결정인지 보는 거예요.
                </p>
                <ChoiceButton
                  label="네 — 이직·이별·이사처럼 인생이 걸린 결정이에요"
                  selected={identityShift === 'yes'}
                  onClick={() => setIdentityShift('yes')}
                />
                <ChoiceButton
                  label="아니요 — 중요해도 결과가 어느 정도 그려져요"
                  selected={identityShift === 'no'}
                  onClick={() => setIdentityShift('no')}
                />
                <ChoiceButton
                  label="잘 모르겠어요"
                  selected={identityShift === 'unsure'}
                  onClick={() => setIdentityShift('unsure')}
                />
              </div>
            )}
          </div>
        </div>
        <BottomCTA>
          <button
            type="button"
            onClick={handleTriageNext}
            disabled={!canProceed}
            className={PRIMARY_BTN}
          >
            다음
          </button>
        </BottomCTA>
      </main>
    );
  }

  // ── Tame ① 공포설정 ──────────────────────────────────────────────────────
  if (step === 'tame-fear') {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader title="결정 기록" onBack={() => setStep('triage')} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <Top title="최악을 또렷이 그려볼게요" />
          <div className="flex-1 px-5 pb-44 space-y-5">
            {/* A. 최악 [핵심] */}
            <div className={CARD_CLASS}>
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">
                가장 안 좋게 흘러간다면
              </p>
              <textarea
                autoFocus
                value={worstCase}
                onChange={(e) => setWorstCase(e.target.value)}
                placeholder="이 결정이 가장 안 좋게 흘러가면, 구체적으로 어떤 일이 벌어지나요?"
                aria-label="최악의 경우"
                className={FIELD_CLASS}
              />
            </div>
            {/* B·C [선택·접이식] */}
            <Collapsible
              label="막거나 되돌릴 방법·가만히 두면의 대가 더 적기"
              open={fearOptOpen}
              onToggle={() => setFearOptOpen((p) => !p)}
            >
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-text-tertiary">
                    막거나 되돌릴 방법 (선택)
                  </p>
                  <textarea
                    value={preventOrRecover}
                    onChange={(e) => setPreventOrRecover(e.target.value)}
                    placeholder="그 일이 실제로 벌어진다면, 미리 막거나 나중에 되돌릴 방법이 있을까요?"
                    aria-label="막거나 되돌릴 방법"
                    className={SMALL_FIELD_CLASS}
                  />
                </div>
                <div className="border-t border-background-tertiary pt-4">
                  <p className="mb-2 text-[13px] font-semibold text-text-tertiary">
                    가만히 두면의 대가 (선택)
                  </p>
                  <textarea
                    value={costOfInaction}
                    onChange={(e) => setCostOfInaction(e.target.value)}
                    placeholder="반대로, 아무것도 안 하고 이대로 두면 6개월 뒤·1년 뒤에 어떤 대가가 있을까요?"
                    aria-label="가만히 두면의 대가"
                    className={SMALL_FIELD_CLASS}
                  />
                </div>
              </div>
            </Collapsible>
          </div>
        </div>
        <BottomCTA>
          <button type="button" onClick={() => setStep('tame-distance')} className={PRIMARY_BTN}>
            다음
          </button>
        </BottomCTA>
      </main>
    );
  }

  // ── Tame ② 거리두기 (단일 호라이즌) ──────────────────────────────────────
  if (step === 'tame-distance') {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader title="결정 기록" onBack={() => setStep('tame-fear')} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <Top title="잠깐 한 발짝 떨어져서" />
          <div className="flex-1 px-5 pb-44 space-y-5">
            {/* 단일 호라이즌 [핵심] */}
            <div className={CARD_CLASS}>
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">
                1년 뒤의 나에게
              </p>
              <textarea
                autoFocus
                value={oneYearHorizon}
                onChange={(e) => setOneYearHorizon(e.target.value)}
                placeholder="1년 뒤의 나에게, 이 결정은 얼마나 중요할까요?"
                aria-label="1년 뒤의 나"
                className={FIELD_CLASS}
              />
            </div>
            {/* 3인칭 재서술 [선택·접이식] */}
            <Collapsible
              label="친구의 일이라면 어떻게 보일까 적어보기"
              open={thirdPersonOpen}
              onToggle={() => setThirdPersonOpen((p) => !p)}
            >
              <textarea
                value={thirdPerson}
                onChange={(e) => setThirdPerson(e.target.value)}
                placeholder="이 상황을 아끼는 친구의 일이라고 생각하고, 그 친구에게 무슨 일이 있는지 한 문장으로 말해주세요."
                aria-label="친구의 일이라면"
                className={SMALL_FIELD_CLASS}
              />
            </Collapsible>
          </div>
        </div>
        <BottomCTA>
          <button type="button" onClick={() => setStep('tame-predict')} className={PRIMARY_BTN}>
            다음
          </button>
        </BottomCTA>
      </main>
    );
  }

  // ── Tame ③ 예측·봉인 (확신도 + base-rate + 검토기한, 사전부검/if-then 접이식) ─
  if (step === 'tame-predict') {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader title="결정 기록" onBack={() => setStep('tame-distance')} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <Top title="지금 예상을 적어둘게요" sub="검토일이 되면 예상과 실제를 나란히 맞춰봐요." />
          <div className="flex-1 px-5 pb-44 space-y-5">
            {/* 확신도 [핵심] — "이 걱정이 맞을 가능성"으로 라벨 명료화. */}
            <div className="rounded-card border border-background-tertiary bg-surface px-5 py-5">
              <p className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">
                이 걱정이 맞을 가능성
              </p>
              <p className="mb-3 text-[13px] leading-snug text-text-tertiary">
                지금 떠올린 걱정대로 안 좋게 흘러갈 가능성이 얼마나 된다고 보세요?
              </p>
              <div className="text-center mb-4">
                <p className="text-6xl font-extrabold leading-none tracking-tighter text-primary tabular-nums">
                  {confidence}%
                </p>
                <p className="mt-2 text-[15px] font-semibold text-text-secondary">
                  {confidenceLabel(confidence)}
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                aria-label="확신도"
                className="w-full accent-primary"
              />
              <div className="mt-1.5 flex justify-between text-xs text-text-tertiary">
                <span>0 · 불확실</span>
                <span>100 · 확실</span>
              </div>
            </div>

            {/* base-rate (외부 관점) [핵심] — 위협확률 칸 없음, 이것 하나만 */}
            <div className="rounded-card border border-background-tertiary bg-surface px-5 py-5">
              <p className="mb-3 text-[15px] font-semibold leading-snug text-text-primary">
                비슷한 상황에 있던 사람 10명 중, 그 걱정대로 안 좋게 끝난 사람은 몇 명쯤일까요?
              </p>
              <div className="text-center mb-3">
                <p className="text-5xl font-extrabold leading-none tracking-tighter text-primary tabular-nums">
                  {baseRateOutOf10}
                  <span className="text-2xl font-bold text-text-tertiary"> / 10명</span>
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={baseRateOutOf10}
                onChange={(e) => setBaseRateOutOf10(Number(e.target.value))}
                aria-label="10명 중 안 좋게 끝난 사람 수"
                className="w-full accent-primary"
              />
              <div className="mt-1.5 flex justify-between text-xs text-text-tertiary">
                <span>0명</span>
                <span>10명</span>
              </div>
            </div>

            {/* 검토기한 [핵심] */}
            <div className="rounded-card border border-background-tertiary bg-surface px-5 py-5">
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">
                언제쯤 결과를 알 수 있나요?
              </p>
              <div className="grid grid-cols-4 gap-2">
                {REVIEW_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setSelectedChip(chip);
                      if (chip !== '직접') setCustomDate('');
                    }}
                    aria-pressed={selectedChip === chip}
                    className={`rounded-ctrl border py-2.5 text-sm font-semibold transition touch-manipulation active:scale-95 ${
                      selectedChip === chip
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-background-tertiary bg-surface text-text-primary hover:border-primary/50'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              {selectedChip === '직접' && (
                <div className="mt-3">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    aria-label="검토 기한 날짜 직접 입력"
                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                    max={new Date(Date.now() + MAX_REVIEW_DAYS * 86400000).toISOString().slice(0, 10)}
                    className="w-full rounded-ctrl border border-background-tertiary bg-background px-4 py-3 text-sm text-text-primary outline-none focus:border-primary transition"
                  />
                </div>
              )}
            </div>

            {/* 사전부검·if-then [선택·접이식] */}
            <Collapsible
              label="실패 원인·대응 계획 미리 적어보기"
              open={sealOptOpen}
              onToggle={() => setSealOptOpen((p) => !p)}
            >
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-text-tertiary">
                    실패한다면 그 이유 (선택)
                  </p>
                  <textarea
                    value={premortem}
                    onChange={(e) => setPremortem(e.target.value)}
                    placeholder="1년 뒤, 이 선택이 잘못된 선택이었다고 상상해보세요. 무엇 때문에 그렇게 됐을까요?"
                    aria-label="실패한다면 그 이유"
                    className={SMALL_FIELD_CLASS}
                  />
                </div>
                <div className="border-t border-background-tertiary pt-4">
                  <p className="mb-2 text-[13px] font-semibold text-text-tertiary">
                    대응 계획 (선택)
                  </p>
                  <textarea
                    value={ifThen}
                    onChange={(e) => setIfThen(e.target.value)}
                    placeholder="그 위험 신호가 보이면 어떻게 할까요? '이런 상황이 오면 → 이렇게 한다'로 적어보세요."
                    aria-label="대응 계획"
                    className={SMALL_FIELD_CLASS}
                  />
                </div>
              </div>
            </Collapsible>

            {error && (
              <div className="rounded-xl border border-danger bg-danger/10 p-4">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}
          </div>
        </div>
        <BottomCTA>
          <button
            type="button"
            onClick={handleRecord}
            disabled={sealDisabled}
            className={PRIMARY_BTN}
          >
            {loading ? '기록하는 중...' : '기록하기'}
          </button>
        </BottomCTA>
      </main>
    );
  }

  // ── 결정 입력 (entry — 결정 텍스트만, 5자 이상이면 트리아지로) ─────────────
  const entryTooShort = decision.trim().length < 5;
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <PageHeader title="결정 기록" onBack={() => router.back()} />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <Top title="어떤 결정을 앞두고 있나요?" sub="지금 고민 중인 결정 하나를 적어주세요." />

        <div className="flex-1 px-5 pb-44 space-y-5">
          <div className="rounded-card border border-background-tertiary bg-background-secondary p-3">
            <p className="text-sm text-text-secondary leading-snug">{DECISION_INPUT_NOTICE}</p>
          </div>

          <div className={CARD_CLASS}>
            <textarea
              autoFocus
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="예: 다른 회사에서 받은 이직 제안을 수락할지"
              aria-label="고민 중인 결정을 입력하세요"
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </div>

      <BottomCTA>
        <button
          type="button"
          onClick={() => setStep('triage')}
          disabled={entryTooShort}
          className={PRIMARY_BTN}
        >
          다음
        </button>
      </BottomCTA>
    </main>
  );
}
