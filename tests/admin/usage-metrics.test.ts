import { describe, it, expect } from 'vitest';
import { computeUsageMetrics } from '@/lib/admin/usage-metrics';

// 기준 now: 2026-06-14 12:00 KST = 2026-06-14T03:00:00Z
const NOW = new Date('2026-06-14T03:00:00.000Z');
// KST 정오 ISO 헬퍼
const at = (date: string, h = 3) => new Date(`${date}T0${h}:00:00.000Z`).toISOString();

const input = {
  now: NOW,
  users: [
    { id: 'ext1', email: 'a@ext.com', created_at: at('2026-06-10') },
    { id: 'ext2', email: 'b@ext.com', created_at: at('2026-06-14') },
    { id: 'extZero', email: 'z@ext.com', created_at: at('2026-06-01') }, // 활동 0
    { id: 'int1', email: 'mvp.bluebird@gmail.com', created_at: at('2026-05-18') }, // 내부 제외
  ],
  logs: [
    { user_id: 'ext1', log_type: 'decision', created_at: at('2026-06-10') },
    { user_id: 'ext1', log_type: 'distortion', created_at: at('2026-06-10') },
    { user_id: 'ext1', log_type: 'distortion', created_at: at('2026-06-11') },
    { user_id: 'ext2', log_type: 'decision', created_at: at('2026-06-14') },
    { user_id: 'int1', log_type: 'decision', created_at: at('2026-06-14') }, // 제외돼야 함
  ],
  checkins: [
    { user_id: 'ext1', type: 'morning', created_at: at('2026-06-10') },
    { user_id: 'ext1', type: 'evening', created_at: at('2026-06-10') },
    { user_id: 'ext2', type: 'morning', created_at: at('2026-06-14') },
  ],
  interventions: [
    { user_id: 'ext1', final_action: '{"when":"오늘"}', is_completed: true, autonomy_score: 3, created_at: at('2026-06-10'), completed_at: at('2026-06-10') },
    { user_id: 'ext1', final_action: '', is_completed: false, autonomy_score: null, created_at: at('2026-06-11'), completed_at: null },
  ],
  events: [
    { user_id: 'ext1', event_name: 'decision_review_completed', created_at: at('2026-06-12') },
    { user_id: 'ext2', event_name: 'decision_report_viewed', created_at: at('2026-06-14') },
    { user_id: null, event_name: 'log_view', created_at: at('2026-06-14') }, // 익명 → DAU 제외
  ],
};

describe('computeUsageMetrics — 누적', () => {
  const m = computeUsageMetrics(input);
  it('내부 계정 제외 + 가입/활성/이탈', () => {
    expect(m.cumulative.signups).toBe(3);
    expect(m.cumulative.activeUsers).toBe(2);
    expect(m.cumulative.churnedUsers).toBe(1);
  });
  it('결정/왜곡/체크인 — 내부 로그 제외', () => {
    expect(m.cumulative.decisions).toBe(2);
    expect(m.cumulative.distortions).toBe(2);
    expect(m.cumulative.checkinsMorning).toBe(2);
    expect(m.cumulative.checkinsEvening).toBe(1);
  });
  it('활동계획 작성/완수, 복기(이벤트 기준)', () => {
    expect(m.cumulative.actionPlanWriters).toBe(1);
    expect(m.cumulative.actionPlanCompleters).toBe(1);
    expect(m.cumulative.reviewers).toBe(1);
  });
});

describe('computeUsageMetrics — per-user', () => {
  const m = computeUsageMetrics(input);
  it('ext1 행 정확 + 자율성 합', () => {
    const ext1 = m.perUser.find((r) => r.email === 'a@ext.com')!;
    expect(ext1.decisions).toBe(1);
    expect(ext1.distortions).toBe(2);
    expect(ext1.actionPlansWritten).toBe(1);
    expect(ext1.autonomyScore).toBe(3);
    expect(ext1.reviews).toBe(1);
    expect(ext1.activeDays).toBe(3); // 06-10,06-11,06-12
  });
  it('내부 계정은 per-user에 없음', () => {
    expect(m.perUser.some((r) => r.email === 'mvp.bluebird@gmail.com')).toBe(false);
  });
});

describe('computeUsageMetrics — daily', () => {
  const m = computeUsageMetrics(input);
  it('활동 있는 날만 최신순', () => {
    const d614 = m.daily.find((r) => r.date === '2026-06-14')!;
    expect(d614.signups).toBe(1);
    expect(d614.decisions).toBe(1);
    expect(d614.dau).toBe(1); // ext2 (익명 이벤트 제외)
    expect(m.daily[0].date >= m.daily[m.daily.length - 1].date).toBe(true);
    const d610 = m.daily.find((r) => r.date === '2026-06-10')!;
    expect(d610.dau).toBe(1);
    expect(d610.checkinsMorning).toBe(1);
  });
});

describe('computeUsageMetrics — 차트 확장', () => {
  const m7 = computeUsageMetrics({ ...input, dailyWindowDays: 7 });

  it('dailySeries — 최근 7일 연속(빈 날 0), ascending', () => {
    expect(m7.dailySeries).toHaveLength(7);
    expect(m7.dailySeries[0].date).toBe('2026-06-08');
    expect(m7.dailySeries[6].date).toBe('2026-06-14');
    const d13 = m7.dailySeries.find((r) => r.date === '2026-06-13')!;
    expect(d13.decisions).toBe(0);
    expect(d13.dau).toBe(0);
    const d14 = m7.dailySeries.find((r) => r.date === '2026-06-14')!;
    expect(d14.decisions).toBe(1);
  });

  it('signupCumulative — 전 기간 러닝 합, 마지막=외부 가입수', () => {
    const m = computeUsageMetrics(input);
    expect(m.signupCumulative.map((p) => p.total)).toEqual([1, 2, 3]);
    expect(m.signupCumulative[m.signupCumulative.length - 1].total).toBe(3);
    expect(m.signupCumulative[0].date).toBe('2026-06-01'); // extZero 가장 이른 가입
  });

  it('weekly — 주차 버킷, 신규가입 합 = 3', () => {
    const m = computeUsageMetrics(input);
    expect(m.weekly.reduce((s, w) => s + w.newSignups, 0)).toBe(3);
    expect(m.weekly.some((w) => w.activeUsers >= 1)).toBe(true);
    expect([...m.weekly].sort((a, b) => a.week.localeCompare(b.week))).toEqual(m.weekly);
  });
});

describe('computeUsageMetrics — 계정별 타임라인', () => {
  const m = computeUsageMetrics(input);
  it('계정별 키 + 내부 제외 + 시간 역순', () => {
    expect(Object.keys(m.timelines).sort()).toEqual(['a@ext.com', 'b@ext.com', 'z@ext.com']);
    expect(m.timelines['mvp.bluebird@gmail.com']).toBeUndefined();
    const t = m.timelines['a@ext.com'];
    expect(t[0].at >= t[t.length - 1].at).toBe(true);
  });
  it('5종 kind 매핑', () => {
    const kinds = new Set(m.timelines['a@ext.com'].map((i) => i.kind));
    expect(kinds.has('decision')).toBe(true);
    expect(kinds.has('distortion')).toBe(true);
    expect(kinds.has('checkin')).toBe(true);
    expect(kinds.has('plan_written')).toBe(true);
    expect(kinds.has('plan_completed')).toBe(true);
  });
  it('계정당 100개 cap', () => {
    const many = {
      ...input,
      logs: Array.from({ length: 150 }, (_, k) => ({
        user_id: 'ext1', log_type: 'decision',
        created_at: new Date(`2026-06-10T0${k % 9}:00:00.000Z`).toISOString(),
      })),
    };
    expect(computeUsageMetrics(many).timelines['a@ext.com'].length).toBe(100);
  });
});
