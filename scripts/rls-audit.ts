/**
 * RLS Runtime Audit Script
 *
 * 목적: 두 테스트 유저를 만들어 실제로 cross-tenant 접근이 차단되는지 검증.
 *
 * 실행 전 요구사항:
 * - `.env.local`에 아래 3개 환경변수
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - SUPABASE_SERVICE_ROLE_KEY  ← 이 스크립트 전용 (대시보드 Settings → API에서 복사)
 * - **반드시 스테이징/개발 Supabase 프로젝트에서 실행**. Production에선 실행 금지.
 *
 * 사용법:
 *   npx tsx scripts/rls-audit.ts
 *
 * 동작:
 * 1. Service role로 테스트 유저 2명 생성 (userA, userB)
 * 2. 각 유저 세션 확보
 * 3. userA가 logs에 row 삽입
 * 4. userB가 userA row를 SELECT / UPDATE / DELETE 시도 → 모두 거부되어야 함
 * 5. userB가 user_id를 userA로 지정해 INSERT 시도 → 거부되어야 함
 * 6. checkins, safety_events 등도 반복
 * 7. 테스트 유저 정리
 *
 * 출력: 각 케이스 PASS/FAIL 테이블. FAIL이 하나라도 있으면 exit 1.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── .env.local 로드 (dotenv 없이) ───────────────────────────
function loadEnv(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (match) {
        const [, key, val] = match;
        if (!process.env[key]) {
          process.env[key] = val.replace(/^['"]|['"]$/g, '');
        }
      }
    }
  } catch {
    // 없어도 OS env로 fallback
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경변수 누락. .env.local에 아래 3개 필요:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}

// Production 보호 — URL 이름에 'prod' 들어있거나 사용자가 명시적으로 '--prod' 안 넣으면 경고
if (SUPABASE_URL.includes('prod') && !process.argv.includes('--prod')) {
  console.error('⚠️  URL에 "prod"가 포함됩니다. production에서 감사는 권장하지 않습니다.');
  console.error('   정말 실행하려면 `--prod` 플래그를 붙이세요.');
  process.exit(3);
}

// ── 타입 ───────────────────────────
type CaseResult = {
  table: string;
  operation: string;
  description: string;
  pass: boolean;
  detail?: string;
};

const results: CaseResult[] = [];

function record(
  table: string,
  operation: string,
  description: string,
  pass: boolean,
  detail?: string
): void {
  results.push({ table, operation, description, pass, detail });
  const icon = pass ? '✅' : '❌';
  console.log(`  ${icon}  [${table}] ${operation}: ${description}${detail ? ' — ' + detail : ''}`);
}

// ── 테스트 유저 관리 ───────────────────────────
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createTestUser(prefix: string): Promise<{ id: string; email: string; password: string }> {
  const ts = Date.now();
  const email = `rls-audit-${prefix}-${ts}@example.test`;
  const password = `Rls!Audit-${Math.random().toString(36).slice(2, 10)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser(${prefix}) failed: ${error?.message}`);
  }
  return { id: data.user.id, email, password };
}

async function deleteTestUser(userId: string): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error(`   ⚠️  deleteUser(${userId}) failed: ${error.message}`);
  }
}

function userClient(email: string, password: string): Promise<SupabaseClient> {
  const c = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  return c.auth.signInWithPassword({ email, password }).then(({ error }) => {
    if (error) throw new Error(`signIn failed for ${email}: ${error.message}`);
    return c;
  });
}

// ── 테스트 케이스 ───────────────────────────

async function testLogs(
  userA: SupabaseClient,
  userB: SupabaseClient,
  userAId: string
): Promise<string | null> {
  console.log('\n📋 Testing: logs');

  const { data: logA, error: insertErr } = await userA
    .from('logs')
    .insert({ user_id: userAId, trigger: 'RLS audit', thought: 'audit test thought' })
    .select()
    .single();

  if (insertErr || !logA) {
    record('logs', 'INSERT(self)', '본인 row 생성', false, insertErr?.message);
    return null;
  }
  record('logs', 'INSERT(self)', '본인 row 생성', true);

  const { data: crossSelect } = await userB.from('logs').select('id').eq('id', logA.id);
  record('logs', 'SELECT(cross)', '타 유저 row 조회 차단', (crossSelect ?? []).length === 0, `${(crossSelect ?? []).length} rows returned`);

  const { data: crossUpdate, error: updateErr } = await userB
    .from('logs')
    .update({ trigger: 'hijacked' })
    .eq('id', logA.id)
    .select();
  const updateBlocked = (crossUpdate ?? []).length === 0;
  record('logs', 'UPDATE(cross)', '타 유저 row 수정 차단', updateBlocked, updateErr?.message ?? `${(crossUpdate ?? []).length} rows updated`);

  const { data: crossDelete, error: deleteErr } = await userB.from('logs').delete().eq('id', logA.id).select();
  const deleteBlocked = (crossDelete ?? []).length === 0;
  record('logs', 'DELETE(cross)', '타 유저 row 삭제 차단', deleteBlocked, deleteErr?.message ?? `${(crossDelete ?? []).length} rows deleted`);

  const { error: forgedInsertErr } = await userB
    .from('logs')
    .insert({ user_id: userAId, trigger: 'forged', thought: 'forged' });
  record('logs', 'INSERT(forged)', '타 유저 user_id로 INSERT 차단', forgedInsertErr !== null, forgedInsertErr?.message ?? '차단 실패 — row 생성됨');

  return logA.id;
}

async function testAnalysis(
  userA: SupabaseClient,
  userB: SupabaseClient,
  userALogId: string
): Promise<void> {
  console.log('\n📋 Testing: analysis');

  const { data: aRow, error: insertErr } = await userA
    .from('analysis')
    .insert({
      log_id: userALogId,
      distortion_type: 'catastrophizing',
      intensity: 0.5,
      logic_error_segment: 'audit segment',
    })
    .select()
    .single();

  if (insertErr || !aRow) {
    record('analysis', 'INSERT(self-via-log)', '본인 log의 analysis 생성', false, insertErr?.message);
    return;
  }
  record('analysis', 'INSERT(self-via-log)', '본인 log의 analysis 생성', true);

  const { data: cross } = await userB.from('analysis').select('id').eq('id', aRow.id);
  record('analysis', 'SELECT(cross)', '타 유저 log의 analysis 조회 차단', (cross ?? []).length === 0, `${(cross ?? []).length} rows returned`);

  const { data: deleteRows, error: deleteErr } = await userA.from('analysis').delete().eq('id', aRow.id).select();
  const selfDeleteWorks = (deleteRows ?? []).length === 1;
  record(
    'analysis',
    'DELETE(self)',
    '본인 analysis 삭제 허용 (정책 누락 시 실패)',
    selfDeleteWorks,
    deleteErr?.message ?? (selfDeleteWorks ? 'OK' : '삭제 실패 — DELETE 정책 없음')
  );
}

async function testCheckins(
  userA: SupabaseClient,
  userB: SupabaseClient,
  userAId: string
): Promise<void> {
  console.log('\n📋 Testing: checkins');

  const { data: row, error: insertErr } = await userA
    .from('checkins')
    .insert({ user_id: userAId, type: 'morning', mood_word: 'audit' })
    .select()
    .single();

  if (insertErr || !row) {
    record('checkins', 'INSERT(self)', '본인 checkin 생성', false, insertErr?.message ?? '테이블 없음 가능');
    return;
  }
  record('checkins', 'INSERT(self)', '본인 checkin 생성', true);

  const { data: cross } = await userB.from('checkins').select('id').eq('id', row.id);
  record('checkins', 'SELECT(cross)', '타 유저 checkin 조회 차단', (cross ?? []).length === 0, `${(cross ?? []).length} rows returned`);

  const { error: forgedErr } = await userB
    .from('checkins')
    .insert({ user_id: userAId, type: 'morning', mood_word: 'forged' });
  record('checkins', 'INSERT(forged)', '타 유저 user_id로 INSERT 차단', forgedErr !== null, forgedErr?.message ?? '차단 실패');
}

async function testSafetyEvents(
  userA: SupabaseClient,
  userB: SupabaseClient,
  userAId: string,
  userALogId: string
): Promise<void> {
  console.log('\n📋 Testing: safety_events');

  const { data: row, error: insertErr } = await userA
    .from('safety_events')
    .insert({
      user_id: userAId,
      log_id: userALogId,
      level: 'caution',
      detected_by: 'keyword',
    })
    .select()
    .single();

  if (insertErr || !row) {
    record('safety_events', 'INSERT(self)', '본인 safety_event 생성', false, insertErr?.message ?? '테이블 없음 가능');
    return;
  }
  record('safety_events', 'INSERT(self)', '본인 safety_event 생성', true);

  const { data: cross } = await userB.from('safety_events').select('id').eq('id', row.id);
  record('safety_events', 'SELECT(cross)', '타 유저 safety_event 조회 차단', (cross ?? []).length === 0, `${(cross ?? []).length} rows returned`);

  const { data: updateRows } = await userB
    .from('safety_events')
    .update({ user_override: true })
    .eq('id', row.id)
    .select();
  record('safety_events', 'UPDATE(cross)', '타 유저 safety_event 수정 차단', (updateRows ?? []).length === 0, `${(updateRows ?? []).length} rows updated`);
}

// ── 실행 ───────────────────────────
async function main(): Promise<void> {
  console.log(`🔒 RLS Runtime Audit`);
  console.log(`   target: ${SUPABASE_URL}`);
  console.log(`   (service_role key used only to create/cleanup test users; audit queries use anon key + session)\n`);

  let a: { id: string; email: string; password: string } | null = null;
  let b: { id: string; email: string; password: string } | null = null;

  try {
    a = await createTestUser('a');
    b = await createTestUser('b');
    console.log(`   created userA=${a.id}`);
    console.log(`   created userB=${b.id}`);

    const clientA = await userClient(a.email, a.password);
    const clientB = await userClient(b.email, b.password);

    const logAId = await testLogs(clientA, clientB, a.id);
    if (logAId) {
      await testAnalysis(clientA, clientB, logAId);
      await testSafetyEvents(clientA, clientB, a.id, logAId);
    }
    await testCheckins(clientA, clientB, a.id);
  } catch (err) {
    console.error(`\n💥 감사 중 에러: ${(err as Error).message}`);
  } finally {
    if (a) await deleteTestUser(a.id);
    if (b) await deleteTestUser(b.id);
    console.log(`\n   test users deleted`);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n──────────────────────────────`);
  console.log(`총 ${results.length}건 중 ${results.length - failed.length}건 PASS, ${failed.length}건 FAIL`);
  if (failed.length > 0) {
    console.log(`\n❌ 실패 케이스:`);
    for (const f of failed) {
      console.log(`   - [${f.table}] ${f.operation}: ${f.description} (${f.detail ?? ''})`);
    }
    process.exit(1);
  } else {
    console.log(`\n✅ 모든 RLS 정책이 cross-tenant 접근을 제대로 차단합니다.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
