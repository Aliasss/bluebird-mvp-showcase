// 운영자 사용 현황 — raw 테이블을 누적/per-user/daily로 집계하는 순수 함수.
// 내부 계정 제외, KST(UTC+9) 일자 버킷. page.tsx는 조회·위임만 한다.
import { isInternalEmail } from './internal-accounts';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_EVENT = 'decision_review_completed';

export interface RawUser { id: string; email: string; created_at: string; }
export interface RawLog { user_id: string; log_type: string | null; created_at: string; trigger?: string | null; }
export interface RawCheckin { user_id: string; type: string; created_at: string; mood_word?: string | null; }
export interface RawIntervention {
  user_id: string; final_action: string | null; is_completed: boolean;
  autonomy_score: number | null; created_at: string; completed_at: string | null;
}
export interface RawEvent { user_id: string | null; event_name: string; created_at: string; }

export interface CumulativeMetrics {
  signups: number; activeUsers: number; churnedUsers: number;
  decisions: number; distortions: number;
  checkinsMorning: number; checkinsEvening: number;
  actionPlanWriters: number; actionPlanCompleters: number; reviewers: number;
}
export interface PerUserRow {
  email: string; signedUp: string;
  decisions: number; distortions: number; success: number;
  checkinsMorning: number; checkinsEvening: number;
  actionPlansWritten: number; actionPlansCompleted: number;
  autonomyScore: number; reviews: number; activeDays: number;
  lastActivity: string | null;
}
export interface DailyRow {
  date: string; signups: number; dau: number;
  checkinsMorning: number; checkinsEvening: number;
  decisions: number; distortions: number; reviews: number;
  actionPlansWritten: number; actionPlansCompleted: number;
}
export interface SignupCumulativePoint { date: string; total: number; }
export interface WeeklyRow { week: string; activeUsers: number; newSignups: number; }
export type TimelineKind = 'decision' | 'distortion' | 'checkin' | 'plan_written' | 'plan_completed';
export interface TimelineItem { at: string; kind: TimelineKind; text: string; }
export interface UsageMetrics {
  cumulative: CumulativeMetrics;
  perUser: PerUserRow[];
  daily: DailyRow[];
  dailySeries: DailyRow[];
  signupCumulative: SignupCumulativePoint[];
  weekly: WeeklyRow[];
  timelines: Record<string, TimelineItem[]>;
}

function kstShift(iso: string): Date { return new Date(new Date(iso).getTime() + KST_OFFSET_MS); }
function kstDayKey(iso: string): string {
  const d = kstShift(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function kstDateTime(iso: string): string {
  const d = kstShift(iso);
  return `${kstDayKey(iso)} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
function kstDayIndex(iso: string): number {
  return Math.floor((new Date(iso).getTime() + KST_OFFSET_MS) / DAY_MS);
}
function hasAction(i: RawIntervention): boolean { return (i.final_action ?? '').trim() !== ''; }
function dateKeyFromKstIndex(i: number): string {
  // KST 일 인덱스 → 그 날 정오(KST)의 ISO → 날짜키 (역산)
  const utcMs = i * DAY_MS + DAY_MS / 2 - KST_OFFSET_MS;
  return kstDayKey(new Date(utcMs).toISOString());
}
function kstWeekMonday(iso: string): string {
  const d = kstShift(iso); // UTC 필드 = KST 벽시계
  const deltaToMonday = (d.getUTCDay() + 6) % 7; // 월요일까지 거슬러갈 일수
  const mondayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - deltaToMonday * DAY_MS;
  const m = new Date(mondayMs);
  return `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}-${String(m.getUTCDate()).padStart(2, '0')}`;
}

export function computeUsageMetrics(input: {
  users: RawUser[]; logs: RawLog[]; checkins: RawCheckin[];
  interventions: RawIntervention[]; events: RawEvent[];
  now: Date; dailyWindowDays?: number;
}): UsageMetrics {
  const windowDays = input.dailyWindowDays ?? 30;

  const externalUsers = input.users.filter((u) => u.email && !isInternalEmail(u.email));
  const extIds = new Set(externalUsers.map((u) => u.id));
  const logs = input.logs.filter((l) => extIds.has(l.user_id));
  const checkins = input.checkins.filter((c) => extIds.has(c.user_id));
  const itv = input.interventions.filter((i) => extIds.has(i.user_id));
  const events = input.events.filter((e) => e.user_id != null && extIds.has(e.user_id));

  // ---- 누적 ----
  const activeIds = new Set<string>();
  logs.forEach((l) => activeIds.add(l.user_id));
  checkins.forEach((c) => activeIds.add(c.user_id));
  events.forEach((e) => activeIds.add(e.user_id as string));

  const cumulative: CumulativeMetrics = {
    signups: externalUsers.length,
    activeUsers: activeIds.size,
    churnedUsers: externalUsers.length - activeIds.size,
    decisions: logs.filter((l) => l.log_type === 'decision').length,
    distortions: logs.filter((l) => l.log_type === 'distortion').length,
    checkinsMorning: checkins.filter((c) => c.type === 'morning').length,
    checkinsEvening: checkins.filter((c) => c.type === 'evening').length,
    actionPlanWriters: new Set(itv.filter(hasAction).map((i) => i.user_id)).size,
    actionPlanCompleters: new Set(itv.filter((i) => i.is_completed).map((i) => i.user_id)).size,
    reviewers: new Set(events.filter((e) => e.event_name === REVIEW_EVENT).map((e) => e.user_id as string)).size,
  };

  // ---- per-user ----
  const perUser: PerUserRow[] = externalUsers.map((u) => {
    const uLogs = logs.filter((l) => l.user_id === u.id);
    const uCk = checkins.filter((c) => c.user_id === u.id);
    const uItv = itv.filter((i) => i.user_id === u.id);
    const uEv = events.filter((e) => e.user_id === u.id);
    const activeDates = new Set<string>();
    let lastTs = 0;
    [...uLogs, ...uCk, ...uEv].forEach((r) => {
      activeDates.add(kstDayKey(r.created_at));
      const t = new Date(r.created_at).getTime();
      if (t > lastTs) lastTs = t;
    });
    return {
      email: u.email,
      signedUp: kstDayKey(u.created_at),
      decisions: uLogs.filter((l) => l.log_type === 'decision').length,
      distortions: uLogs.filter((l) => l.log_type === 'distortion').length,
      success: uLogs.filter((l) => l.log_type === 'success').length,
      checkinsMorning: uCk.filter((c) => c.type === 'morning').length,
      checkinsEvening: uCk.filter((c) => c.type === 'evening').length,
      actionPlansWritten: uItv.filter(hasAction).length,
      actionPlansCompleted: uItv.filter((i) => i.is_completed).length,
      autonomyScore: uItv.reduce((s, i) => s + (i.autonomy_score ?? 0), 0),
      reviews: uEv.filter((e) => e.event_name === REVIEW_EVENT).length,
      activeDays: activeDates.size,
      lastActivity: lastTs > 0 ? kstDateTime(new Date(lastTs).toISOString()) : null,
    };
  }).sort((a, b) =>
    (b.decisions + b.distortions + b.checkinsMorning + b.checkinsEvening) -
    (a.decisions + a.distortions + a.checkinsMorning + a.checkinsEvening));

  // ---- daily (최근 windowDays, 활동 있는 날만, 최신순) ----
  const minIdx = kstDayIndex(input.now.toISOString()) - (windowDays - 1);
  const inWin = (iso: string) => kstDayIndex(iso) >= minIdx;
  const map = new Map<string, DailyRow>();
  const dau = new Map<string, Set<string>>();
  const ensure = (k: string): DailyRow => {
    let r = map.get(k);
    if (!r) {
      r = { date: k, signups: 0, dau: 0, checkinsMorning: 0, checkinsEvening: 0,
        decisions: 0, distortions: 0, reviews: 0, actionPlansWritten: 0, actionPlansCompleted: 0 };
      map.set(k, r);
    }
    return r;
  };
  const addDau = (iso: string, uid: string) => {
    const k = kstDayKey(iso);
    let s = dau.get(k);
    if (!s) { s = new Set(); dau.set(k, s); }
    s.add(uid);
  };

  externalUsers.forEach((u) => { if (inWin(u.created_at)) ensure(kstDayKey(u.created_at)).signups++; });
  logs.forEach((l) => {
    if (!inWin(l.created_at)) return;
    const r = ensure(kstDayKey(l.created_at));
    if (l.log_type === 'decision') r.decisions++;
    else if (l.log_type === 'distortion') r.distortions++;
    addDau(l.created_at, l.user_id);
  });
  checkins.forEach((c) => {
    if (!inWin(c.created_at)) return;
    const r = ensure(kstDayKey(c.created_at));
    if (c.type === 'morning') r.checkinsMorning++;
    else if (c.type === 'evening') r.checkinsEvening++;
    addDau(c.created_at, c.user_id);
  });
  events.forEach((e) => {
    if (!inWin(e.created_at)) return;
    if (e.event_name === REVIEW_EVENT) ensure(kstDayKey(e.created_at)).reviews++;
    addDau(e.created_at, e.user_id as string);
  });
  itv.forEach((i) => {
    if (hasAction(i) && inWin(i.created_at)) ensure(kstDayKey(i.created_at)).actionPlansWritten++;
    if (i.is_completed && i.completed_at && inWin(i.completed_at)) ensure(kstDayKey(i.completed_at)).actionPlansCompleted++;
  });
  dau.forEach((s, k) => { ensure(k).dau = s.size; });

  const daily = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));

  // dailySeries — 최근 windowDays 연속(빈 날 0), ascending (차트용)
  const todayIdx = kstDayIndex(input.now.toISOString());
  const zeroRow = (date: string): DailyRow => ({
    date, signups: 0, dau: 0, checkinsMorning: 0, checkinsEvening: 0,
    decisions: 0, distortions: 0, reviews: 0, actionPlansWritten: 0, actionPlansCompleted: 0,
  });
  const dailySeries: DailyRow[] = [];
  for (let i = minIdx; i <= todayIdx; i++) {
    const key = dateKeyFromKstIndex(i);
    dailySeries.push(map.get(key) ?? zeroRow(key));
  }

  // signupCumulative — 전 기간 외부 가입 러닝 합, ascending
  const signupByDate = new Map<string, number>();
  externalUsers.forEach((u) => {
    const k = kstDayKey(u.created_at);
    signupByDate.set(k, (signupByDate.get(k) ?? 0) + 1);
  });
  let run = 0;
  const signupCumulative = Array.from(signupByDate.keys()).sort().map((date) => {
    run += signupByDate.get(date)!;
    return { date, total: run };
  });

  // weekly — KST 월요일 주차 버킷
  const wmap = new Map<string, { active: Set<string>; signups: number }>();
  const ensureW = (w: string) => {
    let r = wmap.get(w);
    if (!r) { r = { active: new Set<string>(), signups: 0 }; wmap.set(w, r); }
    return r;
  };
  logs.forEach((l) => ensureW(kstWeekMonday(l.created_at)).active.add(l.user_id));
  checkins.forEach((ck) => ensureW(kstWeekMonday(ck.created_at)).active.add(ck.user_id));
  events.forEach((e) => ensureW(kstWeekMonday(e.created_at)).active.add(e.user_id as string));
  externalUsers.forEach((u) => { ensureW(kstWeekMonday(u.created_at)).signups++; });
  const weekly = Array.from(wmap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({ week, activeUsers: v.active.size, newSignups: v.signups }));

  // timelines — 계정별 활동 시간 역순, 100개 cap
  const idToEmail = new Map(externalUsers.map((u) => [u.id, u.email]));
  const timelines: Record<string, TimelineItem[]> = {};
  externalUsers.forEach((u) => { timelines[u.email] = []; });
  const pushItem = (uid: string, item: TimelineItem) => {
    const email = idToEmail.get(uid);
    if (email) timelines[email].push(item);
  };
  logs.forEach((l) => {
    if (l.log_type === 'decision') pushItem(l.user_id, { at: l.created_at, kind: 'decision', text: (l.trigger ?? '').trim() || '결정 기록' });
    else if (l.log_type === 'distortion') pushItem(l.user_id, { at: l.created_at, kind: 'distortion', text: (l.trigger ?? '').trim() || '왜곡 기록' });
  });
  checkins.forEach((ck) => {
    const slot = ck.type === 'morning' ? '오전' : ck.type === 'evening' ? '저녁' : ck.type;
    const mood = (ck.mood_word ?? '').trim();
    pushItem(ck.user_id, { at: ck.created_at, kind: 'checkin', text: `${slot} 체크인${mood ? ` · ${mood}` : ''}` });
  });
  itv.forEach((i) => {
    if (hasAction(i)) pushItem(i.user_id, { at: i.created_at, kind: 'plan_written', text: '활동계획 작성' });
    if (i.is_completed && i.completed_at) pushItem(i.user_id, { at: i.completed_at, kind: 'plan_completed', text: '활동계획 완수' });
  });
  Object.keys(timelines).forEach((email) => {
    timelines[email] = timelines[email].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
  });

  return { cumulative, perUser, daily, dailySeries, signupCumulative, weekly, timelines };
}
