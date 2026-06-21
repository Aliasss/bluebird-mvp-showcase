import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { isAdminEmail } from '@/lib/auth/admin';

// POST /api/admin/approve
// body: { applicationId: string }
// 동작:
//   1) 호출자 인증 + admin 이메일 cross-check
//   2) 응모 조회 + status='pending' 검증
//   3) selected_emails upsert (이메일 PK, 기존 있으면 application_id 갱신)
//   4) evangelist_applications.status='selected'
// 트랜잭션 보장: PostgreSQL 트랜잭션 미사용 (Supabase JS 단건 호출).
//   실패 시 부분 적용 가능 → 운영자가 UI 에서 재시도. 데이터 무결성 손상은 없음
//   (selected_emails upsert + status update 각각 idempotent).

export async function POST(request: Request) {
  // 1) 호출자 cross-check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // 2) body 파싱
  let applicationId: string;
  try {
    const body = await request.json();
    applicationId = body.applicationId;
    if (!applicationId || typeof applicationId !== 'string') {
      return new NextResponse('Missing applicationId', { status: 400 });
    }
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  // 3) service_role 처리
  const service = createServiceRoleClient();

  const { data: app, error: fetchError } = await service
    .from('evangelist_applications')
    .select('id, contact_email, status')
    .eq('id', applicationId)
    .single();
  if (fetchError || !app) {
    return new NextResponse(`Application not found: ${fetchError?.message ?? 'unknown'}`, {
      status: 404,
    });
  }
  if (app.status !== 'pending') {
    return new NextResponse(`Application already ${app.status}`, { status: 409 });
  }

  const normalizedEmail = (app.contact_email ?? '').trim().toLowerCase();
  if (!normalizedEmail) {
    return new NextResponse('Application has no contact_email', { status: 422 });
  }

  // selected_emails upsert
  const { error: insertError } = await service.from('selected_emails').upsert(
    {
      email: normalizedEmail,
      application_id: app.id,
      notes: 'admin UI approval',
      added_by: user.email ?? 'admin',
    },
    { onConflict: 'email' },
  );
  if (insertError) {
    return new NextResponse(`Whitelist insert failed: ${insertError.message}`, { status: 500 });
  }

  // status 갱신
  const { error: updateError } = await service
    .from('evangelist_applications')
    .update({ status: 'selected', updated_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (updateError) {
    return new NextResponse(`Status update failed: ${updateError.message}`, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: normalizedEmail });
}
