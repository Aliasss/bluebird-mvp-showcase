import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import BottomTabBar from '@/components/ui/BottomTabBar';
import ReconsentGate from '@/components/legal/ReconsentGate';
import ThemeWatcher from '@/components/theme/ThemeWatcher';
import SessionTracker from '@/components/analytics/SessionTracker';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project Bluebird',
  description: '결정을 기록하고, 그 결정이 맞았는지 결과로 확인하는 도구',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bluebird',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#2D6A4F',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 랜딩 플래시 방지 스크립트용 — 세션 쿠키 이름(sb-<ref>-auth-token)의 프로젝트 ref.
  const supabaseRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];

  return (
    <html lang="ko">
      <head>
        {/* 로그인 사용자 랜딩(/) 플래시 방지 — paint 전 동기 실행.
            일반 접속은 proxy.ts 가 서버에서 리다이렉트하지만, PWA 는 서비스워커가
            캐시된 / 를 그려 proxy 를 우회한다 → 세션 쿠키 존재 시 그리기 전에 이동. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(location.pathname!=='/')return;if(document.cookie.indexOf('sb-${supabaseRef}-auth-token')!==-1){location.replace('/dashboard');}}catch(e){}})();`,
          }}
        />
        {/* 다크모드 초기 적용 — paint 전 동기 실행으로 깜빡임(FOUC) 방지.
            저장된 모드(localStorage) 또는 시스템 설정으로 .dark 클래스 + theme-color 결정.
            ⚠️ lib/theme.ts 와 로직 동기화 필요(이 스크립트는 import 불가 — 자립이어야 함). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='bluebird-theme';var m=localStorage.getItem(k);if(m!=='light'&&m!=='dark'&&m!=='system')m='system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d)r.classList.add('dark');else r.classList.remove('dark');var c=d?'#0F172A':'#2D6A4F';var mt=document.querySelector('meta[name="theme-color"]');if(!mt){mt=document.createElement('meta');mt.setAttribute('name','theme-color');document.head.appendChild(mt);}mt.setAttribute('content',c);}catch(e){}})();`,
          }}
        />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        {/* Pretendard variable subset — 한·영 본문/헤딩 통합 폰트.
            기기별 시스템 폰트 차이로 인한 시각적 무관심 해결 (refined minimalism). */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Script id="disable-sw-in-local-dev" strategy="afterInteractive">
          {`
            (function () {
              if (location.hostname !== 'localhost') return;
              if (!('serviceWorker' in navigator)) return;
              navigator.serviceWorker.getRegistrations().then(function (registrations) {
                registrations.forEach(function (registration) {
                  registration.unregister();
                });
              });
              if ('caches' in window) {
                caches.keys().then(function (keys) {
                  keys.forEach(function (key) {
                    caches.delete(key);
                  });
                });
              }
            })();
          `}
        </Script>
        {children}
        {/* 세션 진입 + 복기 미리보기 A/B 코호트 귀속 (preview-activation).
            null 렌더·best-effort — 비로그인 발신은 서버에서 silent skip 되어 무해. */}
        <SessionTracker />
        <ThemeWatcher />
        <BottomTabBar />
        {/* 기존 로그인 사용자 재동의 게이트 — 앱 내부 경로에서만 자기 활성화(퍼널·공개·/admin 제외). */}
        <ReconsentGate />
        <Analytics />
      </body>
    </html>
  );
}
