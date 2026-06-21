import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { isAdminEmail } from '@/lib/auth/admin';
import ApplicationCard, { type Application } from './ApplicationCard';
import PendingUserCard, { type PendingUser } from './PendingUserCard';

// 어드민 응모 검토 페이지 — 2026-05-18.
//
// 3중 게이트:
//   (1) proxy.ts /admin 보호 + admin email 검사 (선제 차단)
//   (2) server component 본문에서 user.email cross-check (이중 안전)
//   (3) API 라우트에서도 cross-check (실제 액션 시점)
//
// 데이터 조회 (모두 service_role, RLS 우회):
//   - evangelist_applications: 모든 응모
//   - auth.users − selected_emails: 가입 대기자 (응모 안 한 채 가입만)

export const dynamic = 'force-dynamic';
export const metadata = {
  title: '응모 검토 | Admin',
};

const STATUS_LABEL: Record<Application['status'], string> = {
  pending: '대기',
  selected: '선발',
  rejected: '미선발',
  withdrawn: '철회',
};

export default async function AdminApplicationsPage() {
  // 이중 게이트
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect('/');
  }

  const service = createServiceRoleClient();

  // 1) 응모 목록
  const { data: applications, error: appsError } = await service
    .from('evangelist_applications')
    .select('*')
    .order('created_at', { ascending: false });

  // 2) 가입 대기자 = auth.users − selected_emails
  const [{ data: usersData, error: usersError }, { data: whitelist, error: whitelistError }] =
    await Promise.all([
      service.auth.admin.listUsers(),
      service.from('selected_emails').select('email'),
    ]);

  if (appsError || usersError || whitelistError) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-2 text-sm">
          {appsError && <p className="text-danger">응모 조회 실패: {appsError.message}</p>}
          {usersError && <p className="text-danger">사용자 조회 실패: {usersError.message}</p>}
          {whitelistError && (
            <p className="text-danger">화이트리스트 조회 실패: {whitelistError.message}</p>
          )}
        </div>
      </main>
    );
  }

  const apps = (applications ?? []) as Application[];
  const whitelistedEmails = new Set(
    (whitelist ?? []).map((w) => (w.email ?? '').toLowerCase()),
  );

  // 가입 대기자: email 있고, 미화이트리스트, 본인 제외
  const pendingUsers: PendingUser[] = (usersData?.users ?? [])
    .filter((u) => {
      const email = (u.email ?? '').toLowerCase();
      return email && !whitelistedEmails.has(email);
    })
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      createdAt: u.created_at,
      emailConfirmed: !!u.email_confirmed_at,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 통계
  const stats = {
    pending: apps.filter((a) => a.status === 'pending').length,
    selected: apps.filter((a) => a.status === 'selected').length,
    rejected: apps.filter((a) => a.status === 'rejected').length,
    withdrawn: apps.filter((a) => a.status === 'withdrawn').length,
    pendingUsers: pendingUsers.length,
  };

  // 응모 정렬: pending 우선, 그 다음 최신순
  const sortedApps = [...apps].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-primary tracking-tight">
              Project Bluebird
            </Link>
            <span className="text-xs font-semibold uppercase tracking-widest text-warning">
              Admin
            </span>
          </div>
          <Link href="/dashboard" className="text-xs text-text-tertiary hover:text-text-secondary">
            ← 서비스로
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">응모·가입 검토</h1>
          <p className="text-sm text-text-secondary mt-1">
            로그인 운영자: <span className="font-semibold">{user.email}</span>
          </p>
        </section>

        <section className="grid grid-cols-5 gap-2">
          <StatCard label="응모 대기" value={stats.pending} color="warning" />
          <StatCard label="선발" value={stats.selected} color="success" />
          <StatCard label="미선발" value={stats.rejected} color="text-tertiary" />
          <StatCard label="철회" value={stats.withdrawn} color="text-tertiary" />
          <StatCard label="가입 대기" value={stats.pendingUsers} color="warning" />
        </section>

        {/* 섹션 1: 응모 검토 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">
              ① 응모 검토 ({apps.length})
            </h2>
            <span className="text-xs text-text-tertiary">/apply 폼 작성자</span>
          </div>
          {sortedApps.length === 0 ? (
            <EmptyState text="아직 접수된 응모가 없습니다." />
          ) : (
            sortedApps.map((app) => (
              <ApplicationCard key={app.id} app={app} statusLabel={STATUS_LABEL[app.status]} />
            ))
          )}
        </section>

        {/* 섹션 2: 가입 대기자 (응모 X, 가입만 한 사용자) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">
              ② 가입 대기자 ({pendingUsers.length})
            </h2>
            <span className="text-xs text-text-tertiary">응모 없이 가입만 한 사용자</span>
          </div>
          {pendingUsers.length === 0 ? (
            <EmptyState text="가입 대기자가 없습니다." />
          ) : (
            <>
              <p className="text-xs text-text-tertiary bg-warning/5 border border-warning/30 rounded-lg px-3 py-2 leading-snug">
                ⚠️ 본 목록은 응모 답변이 없습니다. 운영자 재량 승인이며,
                <strong> /apply 응모를 거치도록 안내하는 것이 원칙</strong>입니다.
              </p>
              {pendingUsers.map((u) => (
                <PendingUserCard key={u.id} user={u} />
              ))}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'warning' | 'success' | 'text-tertiary';
}) {
  const colorClass =
    color === 'warning'
      ? 'text-warning'
      : color === 'success'
        ? 'text-success'
        : 'text-text-tertiary';
  return (
    <div className="bg-surface border border-background-tertiary rounded-2xl p-3 text-center">
      <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
      <p className="text-[10px] text-text-secondary mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-surface border border-background-tertiary rounded-2xl p-8 text-center text-sm text-text-secondary">
      {text}
    </div>
  );
}
