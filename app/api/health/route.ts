import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Health check 엔드포인트 — UptimeRobot(또는 동등 서비스)이 5분 간격으로 ping.
//
// 목적:
//   1) Supabase Free tier의 *7일 무활동 자동 pause* 회피 — 정기 SELECT 1건으로 활성 상태 유지.
//   2) 서비스 가용성 모니터링 — 200/503 상태 코드로 외부 모니터에 신호.
//
// 응답 형태:
//   - 200 { ok: true, supabase: 'ok', ts }: 정상
//   - 503 { ok: false, supabase: 'error', error, ts }: Supabase 도달 불가
//
// 보안 고려:
//   - 인증 불필요 (외부 모니터가 익명으로 ping).
//   - 응답에 *민감 정보 노출 없음* — 테이블 row 카운트나 user 데이터를 surface하지 않는다.
//   - Supabase 연결만 확인하기 위해 RLS 영향 없는 metadata 쿼리 사용.
//

export const dynamic = 'force-dynamic'; // 캐시 회피 — 매 요청마다 실제 ping
export const maxDuration = 10;

export async function GET() {
  const ts = new Date().toISOString();
  try {
    const supabase = await createServerSupabaseClient();
    // logs 테이블 존재 여부만 가벼운 비용으로 확인 (count head=true → 실제 row 안 가져옴).
    // RLS 정책상 anon은 결과를 못 보지만 *연결·쿼리 파싱 자체*는 성공해야 200.
    // 인증 사용자 컨텍스트가 아니므로 count는 0이거나 NULL — 성공 신호는 error 부재.
    const { error } = await supabase
      .from('logs')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, supabase: 'error', error: error.message, ts },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, supabase: 'ok', ts }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json(
      { ok: false, supabase: 'error', error: message, ts },
      { status: 503 }
    );
  }
}
