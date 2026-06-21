'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { supabase } from '@/lib/supabase/client';
import { recordClientEvent } from '@/lib/notifications/events';

const MOOD_OPTIONS = [
  { word: '집중', emoji: '🎯' },
  { word: '평온', emoji: '😌' },
  { word: '활기', emoji: '⚡' },
  { word: '불안', emoji: '😟' },
  { word: '피곤', emoji: '😪' },
  { word: '의욕', emoji: '💪' },
  { word: '호기심', emoji: '🤔' },
];

// 2026-05-26 Migration 20: 5단계 자기 평가 점수 — line chart 객관적 추이.
// 단어(mood_word)는 자기 표현, 점수(mood_level)는 객관 수치 — 둘 분리.
const MOOD_LEVEL_OPTIONS = [
  { level: 1, emoji: '😞', label: '매우 나쁨' },
  { level: 2, emoji: '😕', label: '나쁨' },
  { level: 3, emoji: '😐', label: '보통' },
  { level: 4, emoji: '🙂', label: '좋음' },
  { level: 5, emoji: '😄', label: '매우 좋음' },
];

function getCheckinType(): 'morning' | 'evening' {
  // KST 시각: UTC + 9
  const kstHour = (new Date().getUTCHours() + 9) % 24;
  return kstHour >= 5 && kstHour < 13 ? 'morning' : 'evening';
}

function getKstTodayStartIso(): string {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const now = Date.now();
  const kst = new Date(now + KST_OFFSET);
  const kstMidnightUtcMs =
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - KST_OFFSET;
  return new Date(kstMidnightUtcMs).toISOString();
}

export default function CheckinPage() {
  const router = useRouter();
  const [type, setType] = useState<'morning' | 'evening'>('morning');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [moment, setMoment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusChecking, setStatusChecking] = useState(true);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    // 푸시 알림에서 진입한 경우 push_clicked 이벤트 기록 (`?src=push` 트릭)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('src') === 'push') {
        void recordClientEvent('push_clicked');
      }
    }

    const currentType = getCheckinType();
    setType(currentType);

    // 마운트 시 오늘 해당 type의 체크인 존재 여부 확인 (RLS로 자동 user 필터링됨)
    (async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('checkins')
          .select('id')
          .eq('type', currentType)
          .gte('created_at', getKstTodayStartIso())
          .limit(1);
        if (!queryError) {
          setAlreadyDone((data ?? []).length > 0);
        }
      } finally {
        setStatusChecking(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (type === 'morning' && !selectedMood) {
      setError('기분을 선택해주세요.');
      return;
    }
    if (type === 'morning' && selectedLevel === null) {
      setError('5단계 점수를 선택해주세요.');
      return;
    }
    if (type === 'evening' && moment.trim().length < 1) {
      setError('한 줄이라도 적어주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          moodWord: selectedMood ?? undefined,
          moodLevel: selectedLevel ?? undefined,
          system2Moment: moment.trim() || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        if (payload.alreadyDone) {
          router.push('/dashboard?checkin=done');
          return;
        }
        throw new Error(payload.error || '저장에 실패했습니다.');
      }
      sessionStorage.setItem('justCheckedIn', '1');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (statusChecking) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader
          title="체크인"
          onBack={() => router.push('/dashboard')}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </main>
    );
  }

  if (alreadyDone) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <PageHeader
          title={type === 'morning' ? '모닝 체크인' : '이브닝 체크인'}
          onBack={() => router.push('/dashboard')}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-5">
            <div className="text-5xl">✓</div>
            <h1 className="text-xl font-bold text-text-primary">
              오늘 {type === 'morning' ? '아침' : '저녁'} 체크인은 이미 완료했어요
            </h1>
            <p className="text-sm text-text-secondary">
              {type === 'morning'
                ? '저녁 체크인은 오늘 저녁에 이어서 할 수 있어요.'
                : '아침 체크인은 내일 아침에 만나요.'}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-primary text-primary-fg font-semibold py-3 px-6 rounded-2xl touch-manipulation active:scale-95 transition-transform"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <PageHeader
        title={type === 'morning' ? '모닝 체크인' : '이브닝 체크인'}
        onBack={() => router.push('/dashboard')}
      />
      <div className="flex-1 p-4 sm:p-6">
        <div className="max-w-lg mx-auto space-y-6">
          {type === 'morning' ? (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-1">
                  오늘 하루, 어떤 마음으로 시작하나요?
                </h1>
                <p className="text-sm text-text-secondary">오늘 하루를 시작하는 마음 태도를 선택하세요.</p>
              </div>

              {/* 5단계 자기 평가 (2026-05-26 Migration 20) — line chart 객관적 추이용 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                  오늘 기분 5단계
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {MOOD_LEVEL_OPTIONS.map(({ level, emoji, label }) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      aria-label={label}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all touch-manipulation active:scale-95 ${
                        selectedLevel === level
                          ? 'border-primary bg-primary/10'
                          : 'border-background-tertiary bg-surface'
                      }`}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className={`text-[10px] ${selectedLevel === level ? 'text-primary font-semibold' : 'text-text-tertiary'}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                  어떤 마음 태도인가요?
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {MOOD_OPTIONS.map(({ word, emoji }) => (
                    <button
                      key={word}
                      onClick={() => setSelectedMood(word)}
                      className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all touch-manipulation active:scale-95 ${
                        selectedMood === word
                          ? 'border-primary bg-primary/10'
                          : 'border-background-tertiary bg-surface'
                      }`}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className={`text-xs font-semibold ${selectedMood === word ? 'text-primary' : 'text-text-secondary'}`}>
                        {word}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-1">
                  오늘 한 번 더 차분히 생각한 순간이 있었나요?
                </h1>
                <p className="text-sm text-text-secondary">이성적으로 생각한 짧은 순간을 기록해보세요. 10초면 됩니다.</p>
              </div>
              <div className="bg-surface rounded-xl sm:rounded-2xl p-4 border border-background-tertiary">
                {/* 입력 컨벤션 = 결정 기록 SMALL_FIELD_CLASS — 카드 안 무테 입력, 16px(iOS 포커스 줌 방지), 토큰 색 */}
                <textarea
                  value={moment}
                  onChange={(e) => setMoment(e.target.value)}
                  placeholder="예: 지각할 것 같아 불안했지만, 내가 통제할 수 없는 일임을 인정했다"
                  className="w-full min-h-[128px] resize-none border-none bg-transparent text-[16px] font-medium leading-[1.55] tracking-snug text-text-primary outline-none placeholder:text-text-tertiary"
                  disabled={loading}
                  autoFocus
                />
                <div className="mt-1 text-right text-xs text-text-secondary">{moment.length}자</div>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-danger bg-danger/10 p-4">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || (type === 'morning' && (!selectedMood || selectedLevel === null)) || (type === 'evening' && !moment.trim())}
            className="w-full bg-primary text-primary-fg text-base font-semibold py-[17px] px-6 rounded-2xl touch-manipulation active:scale-95 transition-transform hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? '저장 중...' : '체크인 완료'}
          </button>

          <p className="text-center text-xs text-text-tertiary">
            {type === 'morning'
              ? '저녁 체크인은 오늘 저녁에 이어서 할 수 있어요'
              : '아침 체크인은 내일 아침에 시작해요'}
          </p>
        </div>
      </div>
    </main>
  );
}
