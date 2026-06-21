// /onboarding/[act] — server component.
// params.act 검증 (1·2·3만) → notFound. 슬라이드 데이터 client에 전달.
// 인증 확인은 client에서. 비로그인도 온보딩 미리보기 가능 (Act 1·2·3 — 일관 톤 검증용).

import { notFound } from 'next/navigation';
import { slidesForAct } from '@/lib/onboarding/slides';
import OnboardingActClient from './OnboardingActClient';

type ActParam = '1' | '2' | '3';
const VALID_ACTS: ActParam[] = ['1', '2', '3'];

export default async function OnboardingActPage({
  params,
}: {
  params: Promise<{ act: string }>;
}) {
  const { act } = await params;
  if (!VALID_ACTS.includes(act as ActParam)) {
    notFound();
  }
  const actNum = Number(act) as 1 | 2 | 3;
  const slides = slidesForAct(actNum);

  return <OnboardingActClient act={actNum} slides={slides} />;
}
