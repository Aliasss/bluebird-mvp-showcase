'use client';

import { useEffect, useRef, useState } from 'react';
import { usePushPermission } from './usePushPermission';
import { ENABLE_PUSH_CARD } from '@/lib/notifications/copy';
import { recordClientEvent } from '@/lib/notifications/events';

const STORAGE_KEY = 'bluebird:p2_dismissed_v1';

export interface EnablePushCardProps {
  /** 호출자가 노출 조건을 통제할 수 있도록. 기본값: dismiss 플래그 + permission default */
  forceShow?: boolean;
}

/**
 * P2 — 최초 체크인 직후 1회 노출.
 * dismiss 후 영구 미노출 (로컬 스토리지 플래그). 회복 경로는 P3 배너.
 */
export default function EnablePushCard({
  forceShow = false,
}: EnablePushCardProps) {
  const { state, loading, enable } = usePushPermission();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) === '1';
  });
  const [toast, setToast] = useState<string | null>(null);
  const shownLogged = useRef(false);

  const visible =
    state !== 'unsupported' && state === 'default' && (!dismissed || forceShow);

  useEffect(() => {
    if (visible && !shownLogged.current) {
      shownLogged.current = true;
      void recordClientEvent('p2_shown');
    }
  }, [visible]);

  if (!visible) return null;

  const persistDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
  };

  const handleEnable = async () => {
    void recordClientEvent('p2_clicked_enable');
    const result = await enable();
    if (result.ok) {
      setToast(ENABLE_PUSH_CARD.toastGranted);
      persistDismiss();
    } else if (result.reason === 'denied') {
      setToast(ENABLE_PUSH_CARD.toastDenied);
      persistDismiss();
    }
  };

  const handleLater = () => {
    void recordClientEvent('p2_clicked_later');
    persistDismiss();
  };

  return (
    <div
      className="rounded-lg border border-slate-200 bg-surface p-4 shadow-sm"
      role="region"
      aria-label="푸시 알림 켜기"
    >
      <h3 className="text-sm font-medium text-slate-900">
        {ENABLE_PUSH_CARD.title}
      </h3>
      <p className="mt-1 text-sm text-slate-600">{ENABLE_PUSH_CARD.body}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading}
          className="rounded-md bg-slate-900 dark:bg-slate-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {ENABLE_PUSH_CARD.ctaPrimary}
        </button>
        <button
          type="button"
          onClick={handleLater}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
        >
          {ENABLE_PUSH_CARD.ctaSecondary}
        </button>
      </div>
      {toast && (
        <p className="mt-2 text-xs text-slate-500" role="status">
          {toast}
        </p>
      )}
    </div>
  );
}
