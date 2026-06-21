import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { isAdminEmail } from '@/lib/auth/admin';

// POST /api/admin/reject
// body: { applicationId: string }
// status='pending' → 'rejected'. selected_emails 변경 없음.

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

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

  const service = createServiceRoleClient();

  const { data: app, error: fetchError } = await service
    .from('evangelist_applications')
    .select('id, status')
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

  const { error: updateError } = await service
    .from('evangelist_applications')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (updateError) {
    return new NextResponse(`Status update failed: ${updateError.message}`, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
