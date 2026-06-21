'use client';

import { useEffect, useRef, useState } from 'react';
import { usePushPermission } from './usePushPermission';
import { ENABLE_PUSH_BANNER } from '@/lib/notifications/copy';
import { recordClientEvent } from '@/lib/notifications/events';

const STORAGE_KEY = 'bluebird:p3_dismissed_at_v1';
const SILENCE_DAYS = 7;

/**
 * P3 — 대시보드 fallback. permission이 default이고 최근 7일 내 dismiss 없을 때 노출.
 * granted/denied/unsupported 모두 미노출.
 */
export default function EnablePushBanner() {
  const { state, enable, loading } = usePushPermission();
  const [hidden, setHidden] = useState(true);
  const shownLogged = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    const fresh = Date.now() - dismissedAt < SILENCE_DAYS * 24 * 60 * 60 * 1000;
    setHidden(fresh);
  }, []);

  const visible =
    state !== 'unsupported' && state !== 'granted' && state !== 'denied' && !hidden;

  useEffect(() => {
    if (visible && !shownLogged.current) {
      shownLogged.current = true;
      void recordClientEvent('p3_shown');
    }
  }, [visible]);

  if (!visible) return null;

  const handleEnable = async () => {
    void recordClientEvent('p3_clicked_enable');
    const r = await enable();
    if (r.ok) setHidden(true);
  };

  const handleDismiss = () => {
    void recordClientEvent('p3_dismissed');
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
    setHidden(true);
  };

  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-700">{ENABLE_PUSH_BANNER.text}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading}
          className="rounded bg-slate-900 dark:bg-slate-700 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {ENABLE_PUSH_BANNER.cta}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="닫기"
          className="text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
