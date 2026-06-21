'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildMailtoSubjectOnly, buildDirectApprovalEmailBody } from '@/lib/copy/admin-email';

export type PendingUser = {
  id: string;
  email: string;
  createdAt: string;
  emailConfirmed: boolean;
};

export default function PendingUserCard({ user }: { user: PendingUser }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState(false);
  const [mailHint, setMailHint] = useState<string | null>(null);

  // 승인 안내 메일: 본문은 클립보드 복사(길이 한계로 mailto 본문 불가), mailto는 제목만.
  async function handleSendMail() {
    const body = buildDirectApprovalEmailBody(user.email);
    try {
      await navigator.clipboard.writeText(body);
      setMailHint('본문이 클립보드에 복사되었습니다. 열린 메일 본문에 붙여넣기(⌘V) 후 발송하세요.');
    } catch {
      setMailHint('클립보드 복사 실패 — 아래 "본문 직접 복사"를 펼쳐 수동 복사해주세요.');
    }
    window.location.href = buildMailtoSubjectOnly(user.email);
  }

  async function handleApprove() {
    if (busy) return;
    const ok = confirm(
      `${user.email} 을(를) 직접 승인하시겠습니까?\n(응모 답변 없는 상태에서 selected_emails 화이트리스트에 추가됩니다)`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/approve-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    });
    if (!res.ok) {
      const text = await res.text();
      setError(text || '승인 실패');
      setBusy(false);
      return;
    }
    setJustApproved(true);
    setBusy(false);
    // 안내 메일 발송 안내 후 새로고침 (사용자가 mailto 클릭할 시간 부여)
    setTimeout(() => router.refresh(), 200);
  }

  return (
    <article className="bg-surface border border-background-tertiary rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary truncate">{user.email}</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            가입: {new Date(user.createdAt).toLocaleString('ko-KR')}
            <span className="ml-2">
              {user.emailConfirmed ? (
                <span className="text-success">✓ 인증 완료</span>
              ) : (
                <span className="text-warning">⚠ 인증 미완</span>
              )}
            </span>
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded bg-warning/10 text-warning border border-warning/30">
          가입 대기
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-background-tertiary">
        <button
          onClick={handleApprove}
          disabled={busy || justApproved}
          className="flex-1 px-3 py-2 text-sm font-semibold text-primary-fg bg-success hover:bg-success/90 disabled:opacity-50 rounded-lg transition-colors"
        >
          {busy ? '처리 중…' : justApproved ? '승인됨 ✓' : '직접 승인'}
        </button>
        <button
          type="button"
          onClick={handleSendMail}
          className="flex-1 px-3 py-2 text-sm font-semibold text-center text-primary border border-primary/30 hover:bg-primary/5 rounded-lg transition-colors"
        >
          승인 안내 메일 ✉
        </button>
      </div>

      {mailHint && (
        <p className="text-[11px] text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 leading-snug">
          {mailHint}
        </p>
      )}
      <details className="text-[11px] text-text-tertiary">
        <summary className="cursor-pointer select-none px-1">본문 직접 복사 (메일 앱이 안 열릴 때)</summary>
        <textarea
          readOnly
          value={buildDirectApprovalEmailBody(user.email)}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-1 w-full h-32 p-2 text-[11px] border border-background-tertiary rounded-lg bg-background-secondary"
        />
      </details>

      {justApproved && (
        <p className="text-xs text-success bg-success/5 border border-success/30 rounded-lg px-3 py-2 leading-snug">
          승인 완료. 사용자에게 ✉ 버튼으로 안내 메일을 보내주세요. 본인이 다시 로그인하면 즉시 서비스 진입 가능합니다.
        </p>
      )}

      {error && (
        <p className="text-xs text-danger bg-danger/5 border border-danger/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </article>
  );
}
