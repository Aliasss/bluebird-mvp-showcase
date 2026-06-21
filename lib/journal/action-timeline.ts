// 행동 계획을 실행 예정일(planned_at) 기준 6개 버킷으로 그룹화 (순수 함수).
// ⚠️ 읽기 전용 정렬·그룹화 전용 — 알림·완료 강제 없음(안전 가드).
// KST(UTC+9) 고정. TZ 독립 테스트를 위해 now를 인자로 받는다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TimelineBucket = 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'undated' | 'past';

export const TIMELINE_BUCKET_LABEL: Record<TimelineBucket, string> = {
  today: '오늘',
  tomorrow: '내일',
  thisWeek: '이번 주',
  later: '이후',
  undated: '날짜 미지정',
  past: '지난 계획',
};

// 화면 표시 순서 (미래 → 미지정 → 과거)
export const TIMELINE_BUCKET_ORDER: TimelineBucket[] = [
  'today', 'tomorrow', 'thisWeek', 'later', 'undated', 'past',
];

function kstDayIndex(instant: Date): number {
  return Math.floor((instant.getTime() + KST_OFFSET_MS) / DAY_MS);
}

export function bucketForPlannedAt(plannedAt: string | null, now: Date): TimelineBucket {
  if (!plannedAt) return 'undated';
  const t = new Date(plannedAt);
  if (!Number.isFinite(t.getTime())) return 'undated';
  const diff = kstDayIndex(t) - kstDayIndex(now);
  if (diff < 0) return 'past';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= 7) return 'thisWeek';
  return 'later';
}

export interface HasPlannedAt {
  planned_at: string | null;
}

export interface TimelineGroup<T> {
  bucket: TimelineBucket;
  label: string;
  items: T[];
}

export function groupActionsByPlannedAt<T extends HasPlannedAt>(
  items: T[],
  now: Date,
): TimelineGroup<T>[] {
  const map = new Map<TimelineBucket, T[]>();
  for (const item of items) {
    const b = bucketForPlannedAt(item.planned_at, now);
    const arr = map.get(b) ?? [];
    arr.push(item);
    map.set(b, arr);
  }

  const result: TimelineGroup<T>[] = [];
  for (const bucket of TIMELINE_BUCKET_ORDER) {
    const group = map.get(bucket);
    if (!group || group.length === 0) continue;
    if (bucket !== 'undated') {
      group.sort((a, b) => {
        const ta = a.planned_at ? new Date(a.planned_at).getTime() : 0;
        const tb = b.planned_at ? new Date(b.planned_at).getTime() : 0;
        return bucket === 'past' ? tb - ta : ta - tb; // past는 최근 지난 것 먼저
      });
    }
    result.push({ bucket, label: TIMELINE_BUCKET_LABEL[bucket], items: group });
  }
  return result;
}
