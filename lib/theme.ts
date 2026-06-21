'use client';

/**
 * lib/theme.ts — 다크모드 테마 상태·적용 유틸 + 훅.
 *
 * 모델: 사용자 선택 모드 = 'light' | 'dark' | 'system'(기본). localStorage 영속.
 *   'system' 이면 기기 prefers-color-scheme 를 따른다(실시간).
 *   적용 = <html> 의 .dark 클래스 토글 + <meta name=theme-color> 갱신.
 *
 * ⚠️ 초기 적용(FOUC 방지)은 app/layout.tsx 의 인라인 <script>가 paint 전에 수행한다
 *   (이 모듈을 import 하지 않는 자립 스크립트 — 하이드레이션 이전 실행 보장).
 *   본 모듈은 런타임 전환(토글)·시스템 변화 감지·차트 색 결정에 쓰인다.
 */

import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_KEY = 'bluebird-theme';

/** 모바일 브라우저 상태바 색 — 해석된 테마별. (라이트=브랜드 그린 / 다크=페이지 배경) */
const THEME_COLOR: Record<'light' | 'dark', string> = {
  light: '#2D6A4F',
  dark: '#0F172A',
};

export function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const v = window.localStorage.getItem(THEME_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** 선택 모드를 실제 라이트/다크로 해석. */
export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
}

/** <html>.dark 토글 + theme-color 메타 갱신(저장은 하지 않음). */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveMode(mode);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', THEME_COLOR[resolved]);
}

/** 모드 저장 + 즉시 적용. */
export function setThemeMode(mode: ThemeMode): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

/**
 * 현재 다크 여부 구독 훅 — <html>.dark 클래스 변화를 관찰.
 * 차트 등 SVG 내부 색(테일윈드 토큰 미적용)을 테마별로 고를 때 사용.
 * SSR/첫 렌더는 false → 마운트 직후 실제 값으로 갱신(차트 한정, 짧은 깜빡임 무해).
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

/** 토글 UI용 — 저장된 모드 상태 + 변경 함수. */
export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>('system');
  useEffect(() => {
    setMode(getStoredMode());
  }, []);
  const update = (m: ThemeMode) => {
    setMode(m);
    setThemeMode(m);
  };
  return [mode, update];
}
