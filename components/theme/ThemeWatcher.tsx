'use client';

import { useEffect } from 'react';
import { applyTheme, getStoredMode } from '@/lib/theme';

/**
 * ThemeWatcher — 전역(레이아웃)에 마운트. 'system' 모드일 때 기기 다크모드 변화를 실시간 반영.
 * 초기 적용은 layout 인라인 스크립트가 이미 했으므로, 여기선 런타임 시스템 변화만 구독한다.
 * 렌더 출력 없음.
 */
export default function ThemeWatcher() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (getStoredMode() === 'system') applyTheme('system');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return null;
}
