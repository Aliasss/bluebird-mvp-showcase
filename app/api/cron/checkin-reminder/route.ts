import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { sendCheckinReminder } from '@/lib/notifications/send';
import { recordServerEvent } from '@/lib/notifications/events';
import { logServerError } from '@/lib/logging/server-logger';

/**
 * 21:00 KST 데일리 체크인 리마인더 cron 진입점.
 *
 * **Vercel Cron은 GET 요청을 보낸다** — POST만 export하면 405가 반사되어
 * 핸들러 코드가 한 번도 실행되지 않는다 (2026-05-12 production 사고 원인).
 * GET·POST 모두 동일 로직으로 분기 (POST는 수동 curl 검증용 보존).
 *
 * Bearer 인증: Vercel cron은 Authorization: Bearer $CRON_SECRET 자동 첨부.
 * 수동 호출도 동일 헤더 필요.
 */

interface RpcRow {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function handleCron(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc(
      'users_without_today_evening_checkin_with_push',
    );

    if (error) {
      logServerError('api/cron/checkin-reminder.rpc', error);
      return NextResponse.json({ error: 'RPC 실패' }, { status: 500 });
    }

    const targets: RpcRow[] = data ?? [];

    const results = await Promise.allSettled(
      targets.map((t) =>
        sendCheckinReminder(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          t.user_id,
        ),
      ),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - sent;

    // 측정 이벤트 적재 — 발송 결과별로 분기. 실패해도 cron 자체 응답엔 영향 없음.
    await Promise.allSettled(
      results.map((r, i) => {
        const userId = targets[i].user_id;
        if (r.status === 'fulfilled') {
          const eventType =
            r.value.status === 'gone' ? 'push_gone' : 'push_sent';
          return recordServerEvent(supabase, userId, eventType);
        }
        return recordServerEvent(supabase, userId, 'push_failed', {
          error: String(r.reason),
        });
      }),
    );

    if (failed > 0) {
      const sample = results
        .filter((r) => r.status === 'rejected')
        .slice(0, 3);
      sample.forEach((r) => {
        if (r.status === 'rejected')
          logServerError('api/cron/checkin-reminder.send', r.reason);
      });
    }

    console.log(
      `[cron/checkin-reminder] method=${request.method} sent=${sent} total=${targets.length} failed=${failed}`,
    );

    return NextResponse.json(
      { sent, total: targets.length, failed },
      { status: 200 },
    );
  } catch (error) {
    logServerError('api/cron/checkin-reminder', error);
    return NextResponse.json({ error: 'Cron 처리 실패' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
