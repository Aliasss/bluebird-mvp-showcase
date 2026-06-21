import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { evaluateDeletionState } from '@/lib/auth/deletion-state';

// 이메일 인증 콜백 — 2026-05-18 server route handler 로 전환.
//
// 변경 전: client page (page.tsx) + onAuthStateChange 청취 + 1초 probe.
//   문제: @supabase/ssr createBrowserClient 의 detectSessionInUrl 자동 PKCE 코드 교환이
//        쿠키 기반 setAll 누락·race 로 실패 → loading spinner 무한 회전 →
//        새로고침해야 (다른 경로로 세션 복구되어) 통과되는 회귀 발생.
//
// 변경 후: server route handler 에서 exchangeCodeForSession 명시 호출.
//   - 쿠키는 buffer 에 누적 후 최종 redirect 응답에 일괄 적용
//   - 1회 round-trip 으로 인증 완료 → /dashboard (proxy.ts 가 추가로 승인 게이트 처리)
//   - 삭제 예약 사용자는 server-side 분기 + RPC 호출.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorDescription = searchParams.get('error_description');

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  // Supabase 가 setAll 콜백으로 기록할 쿠키 버퍼 — 최종 응답 생성 후 일괄 적용.
  const cookieBuffer: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => cookieBuffer.push(c));
        },
      },
    },
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  // 삭제 예약 분기 (lazy delete on next login pattern)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const action = evaluateDeletionState(user);

  if (action.kind === 'expired') {
    await supabase.rpc('delete_my_account');
    await supabase.auth.signOut(); // signOut 도 setAll 호출 → 버퍼에 만료 쿠키 누적
    const expired = NextResponse.redirect(`${origin}/auth/login?deleted=expired`);
    cookieBuffer.forEach((c) => expired.cookies.set(c.name, c.value, c.options));
    return expired;
  }

  const destination =
    action.kind === 'recover' ? `${origin}/account/recover` : `${origin}/dashboard`;

  // 미승인 사용자가 /dashboard 로 가면 proxy.ts 가 /waitlist 로 리다이렉트 (Migration 19 정합).
  const response = NextResponse.redirect(destination);
  cookieBuffer.forEach((c) => response.cookies.set(c.name, c.value, c.options));
  return response;
}
