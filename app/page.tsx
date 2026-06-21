'use client';

import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { ExternalLink, MessageCircle, Clock, Target } from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Badge from '@/components/ui/Badge';
import ListRow from '@/components/ui/ListRow';

// v2 랜딩: 짧은 title/desc 쌍 + 아이콘 (ListRow 형식). 기존 3개 시나리오와 동일 맥락.
const SCENARIOS = [
  { icon: MessageCircle, title: '지금 이 일을 그만둘지 고민될 때', desc: '불안 때문에 서두르는 건 아닌지' },
  { icon: Clock, title: '이 관계를 정리할지 망설일 때', desc: '최악만 떠올라 판단이 흔들릴 때' },
  { icon: Target, title: '중요한 선택을 앞두고', desc: '"이번에도 틀릴 것 같다"가 들릴 때' },
];

export default function HomePage() {
  const router = useRouter();

  // 인증 사용자 /dashboard redirect 의 마지막 fallback.
  //   1차: proxy.ts 서버 리다이렉트 · 2차: layout paint-전 쿠키 체크(PWA 캐시 우회용).
  //   여기는 getSession(로컬 쿠키 읽기, 수 ms) — 기존 getUser(서버 왕복, 1~3초 플래시 원인) 대체.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
    });
  }, [router]);

  const handleSampleStart = () => {
    track('sample_funnel_start');
    router.push('/sample');
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 w-full max-w-lg mx-auto px-5 pt-8 pb-8 flex flex-col">
        {/* Hero */}
        <div className="pt-2">
          <Badge tone="primary">결정·생각 기록 도구</Badge>
          <h1
            className="mt-4 text-[32px] font-extrabold leading-[1.28] text-text-primary"
            style={{ letterSpacing: '-0.035em' }}
          >
            결정과 그 뒤의 불안을
            <br />
            <span className="text-primary">함께 들여다봅니다.</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed tracking-snug text-text-secondary">
            결정을 적을 때, 그 판단을 흔드는 불안이나 생각 습관이 끼어 있진 않은지 짚어 봅니다. 되돌릴 수 있는
            결정은 &quot;얼마나 확신하는지&quot;를 같이 적어 두었다가 나중에 실제 결과와 맞춰 보고, 기록이 쌓일수록 내가
            어떤 결정에서 과하게 확신하거나 불안에 휘둘리는지 또렷해집니다. 되돌릴 수 없는 큰 결정은 일부러 점수
            매기지 않고, 무엇을 지키고 싶은지를 정리하도록 돕습니다.
          </p>
        </div>

        {/* 시나리오 카드 */}
        <div className="mt-7 overflow-hidden rounded-card border border-background-tertiary bg-surface">
          <p className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-[0.04em] text-text-tertiary">
            이런 결정 앞에서
          </p>
          {SCENARIOS.map((s, i) => (
            <div key={s.title}>
              {i > 0 && <div className="mx-5 h-px bg-background-secondary" />}
              <ListRow icon={s.icon} title={s.title} desc={s.desc} />
            </div>
          ))}
        </div>

        {/* 1차 / 2차 액션 */}
        <div className="mt-8 space-y-2.5">
          <button
            onClick={handleSampleStart}
            className="w-full rounded-2xl bg-primary px-6 py-[17px] text-base font-semibold text-primary-fg transition-transform active:scale-95 touch-manipulation hover:bg-primary-dark"
          >
            60초로 어떻게 작동하는지 보기
          </button>
          <button
            onClick={() => router.push('/auth/signup')}
            className="w-full rounded-2xl border border-primary bg-surface px-6 py-[17px] text-base font-semibold text-primary transition-transform active:scale-95 touch-manipulation hover:bg-primary-tint"
          >
            바로 가입하기
          </button>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full rounded-2xl px-6 py-2 text-[15px] font-medium text-text-secondary transition-transform active:scale-95 touch-manipulation"
          >
            이미 계정이 있어요
          </button>
        </div>

        {/* 보조 링크 — 하단 고정 */}
        <div className="mt-auto space-y-3 pt-8">
          <button
            onClick={() => router.push('/our-philosophy')}
            className="w-full py-1 text-sm text-text-secondary transition-colors"
          >
            결정을 기록하면 뭐가 달라지나요? →
          </button>
          <button
            onClick={() => router.push('/install')}
            className="mx-auto flex items-center justify-center gap-1.5 text-xs text-text-tertiary transition-colors hover:text-primary"
          >
            <ExternalLink size={11} />
            홈 화면에 추가하고 결정 기록을 이어가세요
          </button>
          {/* 법적 문서 (lint-copy 예외 영역) */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 pt-2 text-xs text-text-tertiary">
            <a href="/disclaimer" className="py-2 underline-offset-2 hover:text-text-secondary hover:underline">
              면책 안내
            </a>
            <span aria-hidden>·</span>
            <a href="/terms" className="py-2 underline-offset-2 hover:text-text-secondary hover:underline">
              이용약관
            </a>
            <span aria-hidden>·</span>
            <a href="/privacy" className="py-2 underline-offset-2 hover:text-text-secondary hover:underline">
              개인정보 처리방침
            </a>
            <span aria-hidden>·</span>
            <a href="/safety/resources" className="py-2 underline-offset-2 hover:text-text-secondary hover:underline">
              정신건강 자원
            </a>
          </div>
          <p className="pt-1 text-center text-[11px] text-text-tertiary">© 2026 BlueBird. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
