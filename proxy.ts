import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail } from '@/lib/auth/admin';

// Next.js 16 'proxy' (구 'middleware').
// 책임:
//   1) 미로그인 사용자 + 보호 경로 → /auth/login
//   2) 로그인 사용자 + /auth/login·signup·/(랜딩) → /dashboard
//      (/(랜딩) 서버 리다이렉트 — PWA 진입 시 가입 전 화면이 수 초 떠 있던 플래시 제거.
//       미로그인 방문자는 세션 쿠키가 없어 getUser 가 네트워크 없이 즉시 실패 → 랜딩 영향 미미.)
//   3) 로그인 사용자 + 보호 경로 + 미승인 → /waitlist (Migration 19 게이트)
//   4) 로그인 사용자 + /admin + 비운영자 → / (어드민 전용 — fail-safe 차단)

const PROTECTED_PATH_PREFIXES = [
  '/dashboard',
  '/log',
  '/analyze',
  '/visualize',
  '/action',
  '/insights',
  '/me',
  '/checkin',
  '/journal',
  '/review',
  '/account',
  '/onboarding',
  '/decision',
  '/admin',
];

// /admin 는 보호 + 추가 어드민 게이트 (env ADMIN_EMAILS 매칭만 통과).
function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) 미로그인 + 보호 경로 → 로그인 페이지
  if (!user && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 2) 로그인 + login/signup·/(랜딩) 접근 → /dashboard (해당 경로의 matcher 가 다시 가드)
  //    랜딩은 마케팅 전용 — 로그인 사용자는 서버에서 바로 보낸다(클라이언트 플래시 0).
  //    미승인 사용자는 /dashboard 요청의 4) 게이트가 /waitlist 로 다시 보낸다.
  if (
    user &&
    (pathname === '/' ||
      pathname.startsWith('/auth/login') ||
      pathname.startsWith('/auth/signup'))
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3) 로그인 + /admin → 어드민 이메일 게이트 (env ADMIN_EMAILS 매칭만 통과).
  //    승인/미승인 여부와 무관. 비운영자는 홈으로 (어드민 존재 자체 노출 최소화).
  if (user && isAdminPath(pathname)) {
    if (!isAdminEmail(user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // 4) 로그인 + 보호 경로 → 승인 여부 검사 (Migration 19 RPC)
  if (user && isProtectedPath(pathname)) {
    const { data: isApproved, error } = await supabase.rpc('is_current_user_approved');
    if (error || !isApproved) {
      const url = request.nextUrl.clone();
      url.pathname = '/waitlist';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/log/:path*',
    '/analyze/:path*',
    '/visualize/:path*',
    '/action/:path*',
    '/insights/:path*',
    '/me/:path*',
    '/checkin/:path*',
    '/journal/:path*',
    '/review/:path*',
    '/account/:path*',
    '/onboarding/:path*',
    '/decision/:path*',
    '/admin/:path*',
    '/auth/:path*',
  ],
};
