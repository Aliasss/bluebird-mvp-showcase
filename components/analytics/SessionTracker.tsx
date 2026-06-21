'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cohortForUser } from '@/lib/analytics/cohort';

/**
 * 세션 진입 + 복기 미리보기 A/B 코호트 귀속 트래커 (preview-activation).
 *
 * 루트 레이아웃에 1회 장착(null 렌더). mount 시 한 번:
 *   1) sessionStorage 표식(`bb_session`)이 이미 있으면 아무것도 안 함(세션당 1회 보장).
 *   2) 로그인 상태면 user.id → cohortForUser 로 군 산출 → session_started 발신(best-effort).
 *   3) 발신 여부와 무관하게 표식 set — *단, 로그인 상태에서만*. 비로그인이면 표식도 안 셋해서
 *      로그인 후 첫 진입에서 세션 진입이 잡힌다(코호트 귀속 누락 방지).
 *
 * ⚠️ 전부 best-effort — 텔레메트리 실패(.catch)가 어떤 사용자 흐름도 깨지 않는다. DB write 없음
 *    (analytics_events INSERT 는 서버 trackCognitiveFunnel 이 처리, 비로그인은 silent skip).
 *    cohort 라벨(enum)만 발신 — PII 0.
 */
export default function SessionTracker() {
  useEffect(() => {
    // SSR/비브라우저 가드 — sessionStorage 접근 전.
    if (typeof window === 'undefined') return;

    let alreadyMarked = false;
    try {
      alreadyMarked = window.sessionStorage.getItem('bb_session') != null;
    } catch {
      // sessionStorage 차단 환경(시크릿·정책) — 발신은 시도하되 표식은 못 남길 수 있음.
    }
    if (alreadyMarked) return;

    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        // 비로그인 — 발신·표식 모두 생략(로그인 후 첫 진입에 잡히게).
        if (!user) return;

        const cohort = cohortForUser(user.id);
        // 세션 진입 1회 — 코호트 귀속 분모. best-effort(실패 무시).
        void fetch('/api/analytics/decision-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'session_started', cohort }),
        }).catch(() => {});

        // 로그인 상태에서만 표식 — 세션당 1회 보장.
        try {
          window.sessionStorage.setItem('bb_session', '1');
        } catch {
          // 표식 실패는 무해(다음 mount 에서 재시도될 뿐).
        }
      } catch {
        // getUser 실패 등 — 조용히 무시.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
