import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { isAdminEmail } from '@/lib/auth/admin';

// POST /api/admin/approve-user
// body: { userId: string, email: string }
// 동작: 응모(/apply) 거치지 않고 /auth/signup 만 한 사용자를 직접 승인.
//       selected_emails upsert (application_id=null, notes='direct signup approval').
// 운영자 재량 승인 — 응모 답변 없는 상태에서 승인하는 케이스.

export async function POST(request: Request) {
  // 호출자 cross-check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  let userId: string;
  let email: string;
  try {
    const body = await request.json();
    userId = body.userId;
    email = body.email;
    if (!userId || typeof userId !== 'string') {
      return new NextResponse('Missing userId', { status: 400 });
    }
    if (!email || typeof email !== 'string') {
      return new NextResponse('Missing email', { status: 400 });
    }
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  const service = createServiceRoleClient();

  // userId·email 일치 검증 (운영자가 잘못된 매핑 전송 방지)
  const { data: targetUser, error: userFetchError } = await service.auth.admin.getUserById(userId);
  if (userFetchError || !targetUser?.user) {
    return new NextResponse(`User not found: ${userFetchError?.message ?? 'unknown'}`, {
      status: 404,
    });
  }
  if ((targetUser.user.email ?? '').toLowerCase() !== email.toLowerCase()) {
    return new NextResponse('email/userId mismatch', { status: 422 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { error: insertError } = await service.from('selected_emails').upsert(
    {
      email: normalizedEmail,
      application_id: null,
      notes: 'direct signup approval (no /apply submission)',
      added_by: user.email ?? 'admin',
    },
    { onConflict: 'email' },
  );
  if (insertError) {
    return new NextResponse(`Whitelist insert failed: ${insertError.message}`, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: normalizedEmail });
}
