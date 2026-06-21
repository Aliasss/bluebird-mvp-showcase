'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  needsReconsent,
} from '@/lib/copy/legal-version';

// 기존 로그인 사용자 재동의 게이트 (배포게이트 ②-AC7).
//
// 동작 원리(추가형 — 퍼널 무손상):
//   - 가입 시 동의 버전은 auth.users.user_metadata.{terms_version, privacy_version} 에 저장된다
//     (app/auth/signup). 본 게이트는 동일 위치를 읽고 updateUser 로 동일 위치를 갱신한다.
//   - 저장 버전이 현재(legal-version SSOT)보다 구버전이면 차단 모달로 재동의를 수집한다.
//   - 신규 가입자는 이미 현재 버전을 보유 → needsReconsent=false → 아무것도 렌더하지 않음.
//
// 마운트는 전역(app/layout.tsx)이지만 BottomTabBar 와 동일하게 *자기 게이팅*한다:
//   1) IN_APP_PREFIXES(앱 내부 경로)에서만 활성. /auth·/waitlist·/apply·/admin·공개 페이지 제외.
//   2) 로그인 사용자 없으면 렌더 안 함(공개/퍼널 페이지에서 무력).
//   3) 재동의 불필요면 렌더 안 함.
// → 삼중 가드로 퍼널·공개 영역에서 절대 노출되지 않는다.

// 앱 내부(로그인 사용자 전용) 경로. proxy.ts PROTECTED_PATH_PREFIXES 와 정합하되
// /admin(운영자 전용, 재동의 대상 아님)은 제외하고 /decision(피벗 코어)을 포함한다.
const IN_APP_PREFIXES = [
  '/dashboard',
  '/decision',
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
];

function isInAppPath(pathname: string): boolean {
  return IN_APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

type GateState =
  | { status: 'idle' } // 아직 사용자 확인 전 — 아무것도 렌더하지 않음(플리커 방지)
  | { status: 'inert' } // 사용자 없음 또는 재동의 불필요 — 렌더하지 않음
  | { status: 'blocking' }; // 재동의 필요 — 모달 표시

export default function ReconsentGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<GateState>({ status: 'idle' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = isInAppPath(pathname);

  useEffect(() => {
    // 앱 내부 경로가 아니면 사용자 조회조차 하지 않는다(퍼널·공개에서 완전 무력).
    if (!active) {
      setState({ status: 'inert' });
      return;
    }

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      // 로그인 사용자 없음 → 무력(공개/퍼널 페이지에 마운트돼도 inert).
      if (!user) {
        setState({ status: 'inert' });
        return;
      }

      const meta = user.user_metadata ?? {};
      const stored = {
        terms: typeof meta.terms_version === 'string' ? meta.terms_version : null,
        privacy: typeof meta.privacy_version === 'string' ? meta.privacy_version : null,
      };

      setState(needsReconsent(stored) ? { status: 'blocking' } : { status: 'inert' });
    })();

    return () => {
      cancelled = true;
    };
  }, [active, pathname]);

  const handleAgree = async () => {
    setSubmitting(true);
    setError(null);

    // 가입과 동일한 저장 메커니즘: user_metadata 갱신.
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        terms_version: CURRENT_TERMS_VERSION,
        privacy_version: CURRENT_PRIVACY_VERSION,
        // 재동의 시각 기록(가입의 *_agreed_at 패턴과 정합 — 추가 필드).
        terms_agreed_at: new Date().toISOString(),
        privacy_agreed_at: new Date().toISOString(),
      },
    });

    if (updateError) {
      // 실패 시 모달 유지 + 재시도 유도. 조용히 통과시키지 않는다.
      setError('저장에 실패했어요. 잠시 후 다시 시도해주세요.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setState({ status: 'inert' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (state.status !== 'blocking') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconsent-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-surface rounded-2xl p-6 shadow-card max-w-sm w-full">
        <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
          이용약관 · 개인정보 처리방침 개정
        </p>
        <h2 id="reconsent-title" className="text-lg font-bold text-text-primary tracking-tight">
          약관과 개인정보 처리방침이 업데이트되었습니다
        </h2>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          계속 이용하시려면 변경된 내용에 다시 동의해주세요.
        </p>

        {/* 무엇이 바뀌었는지 — 일상어 요약 */}
        <div className="mt-4 pt-4 border-t border-background-tertiary space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary">
            바뀐 내용
          </p>
          <ul className="space-y-2 text-sm text-text-primary leading-snug">
            <li>
              결정 기록(예상 결과 · 확신도 · 복기)을 수집 항목에 새로 추가했습니다.
            </li>
            <li>
              분석을 위해 입력하신 결정 텍스트가 AI 모델로 처리됩니다. 실명·연락처 등 민감 정보는 적지 않으시길 권합니다.
            </li>
          </ul>
        </div>

        {/* 원문 링크 — 새 탭 */}
        <p className="text-xs text-text-secondary mt-4 leading-relaxed">
          전문은{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            이용약관
          </a>
          {' · '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            개인정보 처리방침
          </a>
          에서 확인하실 수 있어요.
        </p>

        {error && (
          <div className="mt-4 bg-danger bg-opacity-10 border border-danger rounded-xl p-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* 액션 */}
        <button
          type="button"
          onClick={handleAgree}
          disabled={submitting}
          className="w-full mt-5 bg-primary text-primary-fg font-semibold min-h-[44px] py-3 px-6 rounded-2xl touch-manipulation active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (error ? '다시 시도' : '저장 중...') : '동의하고 계속하기'}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={submitting}
          className="w-full mt-2 text-xs text-text-secondary hover:text-text-primary transition-colors py-2 disabled:opacity-50"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
