import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'BlueBird 결정 스타일 진단';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const FONT_URL = 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf';

// public/icons/icon.svg 임베드 (BlueBird 마크)
const ICON_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="115" fill="#2D6A4F"/><g transform="translate(256, 256)"><ellipse cx="0" cy="0" rx="80" ry="100" fill="white" opacity="0.95"/><path d="M -40 -20 Q -100 -60 -120 -40 Q -100 -20 -60 0 Z" fill="white" opacity="0.9"/><path d="M 40 -20 Q 100 -60 120 -40 Q 100 -20 60 0 Z" fill="white" opacity="0.9"/><circle cx="0" cy="-60" r="40" fill="white"/><path d="M 0 -60 L 20 -55 L 0 -50 Z" fill="#FFB340"/><circle cx="-10" cy="-65" r="5" fill="#2D6A4F"/><path d="M 0 80 Q -30 120 -10 140 Q 0 120 0 100 Q 0 120 10 140 Q 30 120 0 80 Z" fill="white" opacity="0.85"/></g></svg>`;

export default async function Image() {
  const fontData = await fetch(FONT_URL).then((r) => r.arrayBuffer());
  const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(ICON_SVG).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2D6A4F',
          fontFamily: 'Pretendard',
          gap: 24,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconDataUri} width={200} height={200} alt="" style={{ borderRadius: 44 }} />
        <div style={{ display: 'flex', fontSize: 34, color: 'rgba(255,255,255,0.82)', letterSpacing: 2 }}>
          BlueBird
        </div>
        <div style={{ display: 'flex', fontSize: 88, color: '#ffffff' }}>결정 스타일 진단</div>
        <div style={{ display: 'flex', fontSize: 40, color: 'rgba(255,255,255,0.9)' }}>나의 결정 유형은?</div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Pretendard', data: fontData, weight: 700, style: 'normal' }],
    },
  );
}
