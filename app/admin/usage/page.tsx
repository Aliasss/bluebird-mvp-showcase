import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { isAdminEmail } from '@/lib/auth/admin';
import { computeUsageMetrics, type RawIntervention } from '@/lib/admin/usage-metrics';
import UsageDashboard from './UsageDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: '사용 현황 | Admin' };

export default async function AdminUsagePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect('/');

  const service = createServiceRoleClient();

  const [usersRes, logsRes, checkinsRes, itvRes, eventsRes] = await Promise.all([
    service.auth.admin.listUsers(),
    service.from('logs').select('user_id, log_type, created_at, trigger'),
    service.from('checkins').select('user_id, type, created_at, mood_word'),
    service
      .from('intervention')
      .select('final_action, is_completed, autonomy_score, created_at, completed_at, logs!inner(user_id)'),
    service.from('analytics_events').select('user_id, event_name, created_at'),
  ]);

  const err =
    usersRes.error || logsRes.error || checkinsRes.error || itvRes.error || eventsRes.error;
  if (err) {
    return (
      <main className="min-h-screen bg-background p-6">
        <p className="max-w-3xl mx-auto text-sm text-danger">조회 실패: {err.message}</p>
      </main>
    );
  }

  // intervention: logs!inner(user_id) embedding → flat user_id
  const interventions: RawIntervention[] = (itvRes.data ?? []).map((row) => {
    const r = row as unknown as {
      final_action: string | null;
      is_completed: boolean;
      autonomy_score: number | null;
      created_at: string;
      completed_at: string | null;
      logs: { user_id: string } | { user_id: string }[];
    };
    const logsRel = Array.isArray(r.logs) ? r.logs[0] : r.logs;
    return {
      user_id: logsRel?.user_id ?? '',
      final_action: r.final_action,
      is_completed: r.is_completed,
      autonomy_score: r.autonomy_score,
      created_at: r.created_at,
      completed_at: r.completed_at,
    };
  });

  const metrics = computeUsageMetrics({
    now: new Date(),
    users: (usersRes.data?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
    })),
    logs: (logsRes.data ?? []) as { user_id: string; log_type: string | null; created_at: string; trigger: string | null }[],
    checkins: (checkinsRes.data ?? []) as { user_id: string; type: string; created_at: string; mood_word: string | null }[],
    interventions,
    events: (eventsRes.data ?? []) as { user_id: string | null; event_name: string; created_at: string }[],
  });

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-primary tracking-tight">Project Bluebird</Link>
            <span className="text-xs font-semibold uppercase tracking-widest text-warning">Admin</span>
          </div>
          <Link href="/admin/applications" className="text-xs text-text-tertiary hover:text-text-secondary">← 응모 검토</Link>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">사용 현황</h1>
          <p className="text-sm text-text-secondary mt-1">외부 베타 사용자 (내부 계정 제외)</p>
        </section>
        <UsageDashboard metrics={metrics} />
      </div>
    </main>
  );
}
