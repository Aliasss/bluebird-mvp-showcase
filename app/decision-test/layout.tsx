import type { Metadata } from 'next';

const TITLE = 'BlueBird 결정 스타일 진단';
const DESC = '나의 결정 유형은? 30초 결정 스타일 진단';
const PAGE_URL = 'https://bluebird-mvp.vercel.app/decision-test';

export const metadata: Metadata = {
  metadataBase: new URL('https://bluebird-mvp.vercel.app'),
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, url: PAGE_URL, type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
};

export default function HaesolTestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
