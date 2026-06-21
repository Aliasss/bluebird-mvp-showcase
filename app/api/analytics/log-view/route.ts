import { NextResponse } from 'next/server';
import { trackCognitiveFunnel } from '@/lib/analytics/server';

// POST /api/analytics/log-view
// 클라이언트(/log 페이지) 진입 시 호출.
// 입력 비용 측정 — log_view → log.created_at 차이로 사용자가 사고를 입력하는 데 걸린 시간 산출.
// 2026-05-19 deep-dive 액션 ①.

export async function POST() {
  // trackCognitiveFunnel 가 내부에서 auth 검사 + 비인증 시 silent skip.
  // best-effort — 실패해도 사용자 흐름 방해 X.
  await trackCognitiveFunnel('log_view');
  return NextResponse.json({ ok: true });
}
