import type { NextConfig } from 'next';
const { default: withPWAInit, runtimeCaching } = require('@ducanh2912/next-pwa');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "worker-src 'self' blob:",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next.js 16 + next-pwa(webpack) 동시 사용 시 build 모드 명시 필요
  turbopack: {},
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

// next-pwa 설정을 별도로 적용
const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  // 푸시 알림 핸들러를 위한 custom worker — worker/index.js를 자동 생성 SW에 append.
  customWorkerSrc: 'worker',
  customWorkerDest: 'public',
  workboxOptions: {
    runtimeCaching,
    skipWaiting: true,
    clientsClaim: true,
  },
  fallbacks: {
    document: '/offline.html',
  },
});

export default withPWA(nextConfig);
