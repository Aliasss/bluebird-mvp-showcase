import type { Config } from 'tailwindcss';

const config: Config = {
  // 다크모드: <html>에 .dark 클래스가 붙으면 활성화(시스템/수동 토글이 제어).
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── 색 토큰: 값은 globals.css의 CSS 변수(:root=라이트 / .dark=다크)가 보유한다. ──
      //   채널(RGB) 변수 + <alpha-value> 패턴 → bg-primary/50 같은 투명도 유틸 그대로 작동.
      //   호출부(bg-primary·text-text-primary·bg-surface…)는 무변경, 변수 값만 테마별로 전환.
      colors: {
        // 주 액센트 — 모든 강조·CTA·active state. 다른 액센트 색은 절제.
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)', // Deep Green (다크: 밝은 그린)
          dark: 'rgb(var(--c-primary-dark) / <alpha-value>)',
          light: 'rgb(var(--c-primary-light) / <alpha-value>)',
          tint: 'rgb(var(--c-primary-tint) / <alpha-value>)', // 강조 배경 (bg-primary-tint)
          border: 'rgb(var(--c-primary-border) / <alpha-value>)', // 강조 카드 테두리
          fg: 'rgb(var(--c-primary-fg) / <alpha-value>)', // primary 위 글자 (라이트=흰색 / 다크=짙은 잉크)
        },
        // /our-philosophy 페이지의 의도된 액센트. 다른 페이지 사용 금지(액센트 dilution 방지).
        system2: {
          DEFAULT: 'rgb(var(--c-system2) / <alpha-value>)',
          dark: 'rgb(var(--c-system2-dark) / <alpha-value>)',
          light: 'rgb(var(--c-system2-light) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--c-success) / <alpha-value>)',
          dark: 'rgb(var(--c-success-dark) / <alpha-value>)',
          light: 'rgb(var(--c-success-light) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--c-warning) / <alpha-value>)',
          dark: 'rgb(var(--c-warning-dark) / <alpha-value>)',
          light: 'rgb(var(--c-warning-light) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)',
          dark: 'rgb(var(--c-danger-dark) / <alpha-value>)',
          light: 'rgb(var(--c-danger-light) / <alpha-value>)',
        },
        // 전망이론 차트의 사용자 포인트/위험 데이터점 전용. 다른 용도 금지.
        distortion: 'rgb(var(--c-distortion) / <alpha-value>)',

        // 카드/패널 표면 — 라이트=흰색, 다크=slate-800. (기존 bg-white 치환 대상)
        surface: 'rgb(var(--c-surface) / <alpha-value>)',

        background: {
          DEFAULT: 'rgb(var(--c-bg) / <alpha-value>)',
          secondary: 'rgb(var(--c-bg-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--c-bg-tertiary) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--c-text) / <alpha-value>)',
          secondary: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--c-text-tertiary) / <alpha-value>)',
        },
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.02em',
        snug: '-0.01em',
      },
      fontFamily: {
        // Pretendard 우선 — 한·영 본문/헤딩 통합. 시스템 폰트는 fallback.
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      // 절제된 elevation 토큰 — refined minimalism. 값은 globals.css 변수(테마별).
      // shadow-card: 일반 카드용. shadow-elev2: 떠올라야 할 요소(FAB, 모달, sticky bar)용.
      boxShadow: {
        card: 'var(--shadow-card)',
        elev2: 'var(--shadow-elev2)',
      },
      // v2 반경 위계 — 기존 화면은 rounded-2xl(16)/rounded-xl(12) 유지,
      // 신규 v2 부품·화면만 아래 토큰 사용 (카드 16→20, 버튼 12→14).
      borderRadius: {
        card: '1.25rem', // 20px — 카드/패널 (rounded-card)
        ctrl: '0.875rem', // 14px — 버튼/입력 (rounded-ctrl)
      },
    },
  },
  plugins: [],
};

export default config;
