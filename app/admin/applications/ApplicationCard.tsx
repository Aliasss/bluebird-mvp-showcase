'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildMailtoSubjectOnly, buildSelectionEmailBody } from '@/lib/copy/admin-email';

export type Application = {
  id: string;
  user_id: string | null;
  q1_handling: string;
  q2_self_tool: string;
  q3_thinking: string;
  q4_apps: string | null;
  q5_recurring: string | null;
  age_band: string;
  consent_written_report: boolean;
  consent_data_analysis: boolean;
  consent_contact: boolean;
  contact_email: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  status: 'pending' | 'selected' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
};

const AGE_LABEL: Record<string, string> = {
  under_20: '20세 미만',
  '20s': '20대',
  '30s': '30대',
  '40s': '40대',
  '50s': '50대',
  '60_plus': '60대 이상',
};

const STATUS_BADGE: Record<Application['status'], string> = {
  pending: 'bg-warning/10 text-warning border border-warning/30',
  selected: 'bg-success/10 text-success border border-success/30',
  rejected: 'bg-text-tertiary/10 text-text-tertiary border border-background-tertiary',
  withdrawn: 'bg-text-tertiary/10 text-text-tertiary border border-background-tertiary',
};

export default function ApplicationCard({
  app,
  statusLabel,
}: {
  app: Application;
  statusLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailHint, setMailHint] = useState<string | null>(null);

  // 선발 안내 메일: 본문은 클립보드로 복사하고(길이 한계로 mailto 본문 불가),
  // mailto는 제목만 담아 메일 앱을 연다. 운영자가 본문을 붙여넣기(⌘V)한다.
  async function handleSendMail() {
    const body = buildSelectionEmailBody(app.contact_email);
    try {
      await navigator.clipboard.writeText(body);
      setMailHint('본문이 클립보드에 복사되었습니다. 열린 메일 본문에 붙여넣기(⌘V) 후 발송하세요.');
    } catch {
      setMailHint('클립보드 복사 실패 — 아래 "본문 직접 복사"를 펼쳐 수동 복사해주세요.');
    }
    window.location.href = buildMailtoSubjectOnly(app.contact_email);
  }

  async function callAction(action: 'approve' | 'reject') {
    if (busy) return;
    const confirmMsg =
      action === 'approve'
        ? `${app.contact_email} 선발하시겠습니까?\n(selected_emails 화이트리스트에 추가됩니다)`
        : `${app.contact_email} 미선발 처리하시겠습니까?`;
    if (!confirm(confirmMsg)) return;

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: app.id }),
    });
    if (!res.ok) {
      const text = await res.text();
      setError(text || `${action} 실패`);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  const utmParts = [
    app.utm_source && `source=${app.utm_source}`,
    app.utm_medium && `medium=${app.utm_medium}`,
    app.utm_campaign && `campaign=${app.utm_campaign}`,
    app.utm_content && `content=${app.utm_content}`,
    app.utm_term && `term=${app.utm_term}`,
  ].filter(Boolean);

  return (
    <article className="bg-surface border border-background-tertiary rounded-2xl p-5 space-y-4">
      {/* 헤더: 이메일 + 상태 + 메타 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary truncate">{app.contact_email}</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            {AGE_LABEL[app.age_band] ?? app.age_band} ·{' '}
            {new Date(app.created_at).toLocaleString('ko-KR')}
            {app.user_id && <span className="ml-1">· 가입자</span>}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_BADGE[app.status]}`}>
          {statusLabel}
        </span>
      </div>

      {/* 동의 + UTM */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <ConsentChip on={app.consent_written_report} label="서면 리포트" />
        <ConsentChip on={app.consent_data_analysis} label="분석 동의" />
        <ConsentChip on={app.consent_contact} label="연락 동의" />
        {utmParts.length > 0 && (
          <span className="px-2 py-0.5 bg-background-secondary text-text-tertiary rounded">
            {utmParts.join(' · ')}
          </span>
        )}
      </div>

      {/* 답변 5문항 */}
      <div className="space-y-3 text-sm">
        <Answer label="Q1 마음에 걸리는 일 다루는 방식" value={app.q1_handling} />
        <Answer label="Q2 본인 알아가는 도구·방법" value={app.q2_self_tool} />
        <Answer label="Q3 평일 생각 시간·맥락" value={app.q3_thinking} />
        <Answer label="Q4 사고·감정 앱 경험 (선택)" value={app.q4_apps} />
        <Answer label="Q5 최근 2주 자주 떠오른 어려움 (선택)" value={app.q5_recurring} />
      </div>

      {/* 액션 */}
      {app.status === 'pending' && (
        <div className="flex gap-2 pt-2 border-t border-background-tertiary">
          <button
            onClick={() => callAction('approve')}
            disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-semibold text-primary-fg bg-success hover:bg-success/90 disabled:opacity-50 rounded-lg transition-colors"
          >
            {busy ? '처리 중…' : '선발'}
          </button>
          <button
            onClick={() => callAction('reject')}
            disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-semibold text-text-secondary border border-background-tertiary hover:bg-background-secondary disabled:opacity-50 rounded-lg transition-colors"
          >
            {busy ? '처리 중…' : '미선발'}
          </button>
        </div>
      )}

      {/* 선발 안내 메일 — 선발된 응모만 노출 */}
      {app.status === 'selected' && (
        <div className="pt-2 border-t border-background-tertiary space-y-2">
          <button
            type="button"
            onClick={handleSendMail}
            className="block w-full px-4 py-2 text-sm font-semibold text-center text-primary border border-primary/30 hover:bg-primary/5 rounded-lg transition-colors"
          >
            선발 안내 메일 보내기 ✉
          </button>
          <p className="text-[11px] text-text-tertiary leading-snug px-1">
            클릭 시 메일 앱이 열리고 본문은 클립보드에 복사됩니다. 메일 본문에 붙여넣기(⌘V) 후 검토·발송하세요.
            {!app.user_id && (
              <span className="text-warning">
                {' '}본 응모자는 아직 가입 전입니다 — 메일 안내 필수.
              </span>
            )}
          </p>
          {mailHint && (
            <p className="text-[11px] text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 leading-snug">
              {mailHint}
            </p>
          )}
          <details className="text-[11px] text-text-tertiary">
            <summary className="cursor-pointer select-none px-1">본문 직접 복사 (메일 앱이 안 열릴 때)</summary>
            <textarea
              readOnly
              value={buildSelectionEmailBody(app.contact_email)}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-1 w-full h-32 p-2 text-[11px] border border-background-tertiary rounded-lg bg-background-secondary"
            />
          </details>
        </div>
      )}

      {error && (
        <p className="text-xs text-danger bg-danger/5 border border-danger/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </article>
  );
}

function ConsentChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded ${
        on
          ? 'bg-success/10 text-success border border-success/30'
          : 'bg-danger/10 text-danger border border-danger/30'
      }`}
    >
      {on ? '✓' : '✗'} {label}
    </span>
  );
}

function Answer({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
        {value && value.trim().length > 0 ? value : <span className="text-text-tertiary">(미응답)</span>}
      </p>
    </div>
  );
}
