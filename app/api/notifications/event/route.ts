import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logging/server-logger';

const EVENT_TYPES = [
  'p2_shown',
  'p2_clicked_enable',
  'p2_clicked_later',
  'p3_shown',
  'p3_clicked_enable',
  'p3_dismissed',
  'permission_granted',
  'permission_denied',
  'subscribed',
  'unsubscribed',
  'push_clicked',
] as const;

const schema = z.object({
  type: z.enum(EVENT_TYPES),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력 형식이 올바르지 않습니다.' },
        { status: 400 },
      );
    }
    const { type, metadata } = parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // 측정 이벤트는 인증 없으면 silent drop (200 반환) — 클라이언트가 silently swallow하도록
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const { error } = await supabase
      .from('notification_events')
      .insert({ user_id: user.id, event_type: type, metadata: metadata ?? null });

    if (error) {
      logServerError('api/notifications/event', error);
      return NextResponse.json({ error: '이벤트 기록 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logServerError('api/notifications/event', error);
    return NextResponse.json({ error: '처리 중 오류' }, { status: 500 });
  }
}
