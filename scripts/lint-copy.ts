#!/usr/bin/env tsx
/**
 * 카피 톤 가드 — 정적 UI 카피에 다음 두 부류의 표현이 들어가지 않도록 경고한다.
 *
 *   1) AI 출력 가드 패턴 확장 — `app/api/generate-questions/route.ts`의 COMFORT_LANGUAGE_PATTERNS에
 *      대응. 정서·위로 어휘는 BlueBird 분석가 톤과 충돌.
 *   2) 항해 메타포.
 *      P0 안전 가드 위반은 즉시 제거하되 검증 전까지 *부분 잔존*은 허용.
 *      따라서 본 스크립트는 *경고 수준*으로 시작 (PR 차단은 P2 C3에서 격상).
 *
 * 화이트리스트:
 *   - `lib/content/technical-manual.ts` — manual 톤 의도적 인용·정의 영역
 *   - `docs/**` — 문서·결정 아카이브
 *   - `tests/**` — 테스트 fixture·snapshot
 *   - `scripts/**` — 본 스크립트 자체 포함
 *   - `app/our-philosophy/page.tsx` — A1 재작성 진행 영역 (재작성 후 자동 통과)
 *   - `node_modules/**` `.next/**` — 외부·빌드 결과물
 *
 * 실행:
 *   npm run lint:copy        # 경고만 출력 (exit 0)
 *   npm run lint:copy -- --strict  # 위반 시 exit 1 (CI 차단용 — P2 C3 격상 시)
 */

import { promises as fs } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

// 카피 톤 위반 패턴 — 두 부류로 분리해 보고 시 식별 가능하도록 한다.
const COMFORT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /괜찮아요/g, label: '위로 어휘 "괜찮아요"' },
  { pattern: /괜찮아(?![가-힣])/g, label: '위로 어휘 "괜찮아"' },
  { pattern: /힘내(?:세요|요)?/g, label: '위로 어휘 "힘내"' },
  { pattern: /잘하고\s*있어/g, label: '위로 어휘 "잘하고 있어"' },
  { pattern: /응원(?:해요|합니다|드려요)?/g, label: '위로 어휘 "응원"' },
  // 만화 톤 회귀 가드 — 온보딩 작업(2026-05-01) 신규 추가.
  { pattern: /안녕[!?]/g, label: '캐릭터 친근체 "안녕!"' },
  { pattern: /함께\s*(?:해|들여다|가봐|시작)/g, label: '동반체 "함께"' },
  { pattern: /친구처럼/g, label: '친구체 "친구처럼"' },
  { pattern: /마음을\s*안아/g, label: '위로 "마음을 안아"' },
  // 푸시 알림 카피 톤 가드
  { pattern: /오늘\s*하루도/g, label: '응원체 "오늘 하루도"' },
  { pattern: /소중(?:한|해)/g, label: '정서 어휘 "소중"' },
  { pattern: /❤️/g, label: '정서 이모지 "❤️"' },
  { pattern: /🌟/g, label: '정서 이모지 "🌟"' },
];

const NAUTICAL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /항해(?!하지 않는다)/g, label: '항해 메타포 "항해"' },
  { pattern: /나침반/g, label: '항해 메타포 "나침반"' },
  { pattern: /(?<!짙은\s)안개(?!\s+지역|\s*등급)/g, label: '항해 메타포 "안개"' },
  { pattern: /별빛/g, label: '항해 메타포 "별빛"' },
  { pattern: /(?<![\w가-힣])바다(?![\w가-힣])/g, label: '항해 메타포 "바다"' },
  { pattern: /✦/g, label: '항해 메타포 글리프 "✦" (별)' },
  { pattern: /✧/g, label: '항해 메타포 글리프 "✧" (별)' },
  { pattern: /★/g, label: '항해 메타포 글리프 "★" (별)' },
  { pattern: /☆/g, label: '항해 메타포 글리프 "☆" (별)' },
];

// 의료기기 표현 — A3에서 메타에서 제거. 사용자 카피·이벤트명에서도 회피.
// "탐지"는 법률 검토 전이므로 제외.
// 라인 내에 "아닙니다·아니다·대체하지" 등 부정 명제가 함께 있으면 제외 (법적 면책 어휘).
const MEDICAL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /교정(?!\s*(?:효능|치료))/g, label: '의료기기 표현 "교정"' },
  { pattern: /진단(?!명|서)/g, label: '의료기기 표현 "진단"' },
  { pattern: /(?<!인지행동)치료(?!학|법)/g, label: '의료기기 표현 "치료"' },
  // /our-philosophy 콘텐츠 가독성 개선 spec(2026-05-10)에서 추가.
  // negation exempt: "병리적이지 않습니다" / "발병하지 않습니다" 등은 통과.
  { pattern: /병리적/g, label: '의료기기 표현 "병리적"' },
  { pattern: /정신병리/g, label: '의료기기 표현 "정신병리"' },
  { pattern: /발병/g, label: '의료기기 표현 "발병"' },
];

// 의료 어휘 라인 내 부정 명제 식별자 (예: "치료가 아닙니다" "진단을 대체하지 않습니다")
const MEDICAL_NEGATION_PATTERNS = [
  /아닙니다/, /아니다/, /대체하지/, /대체하지\s*않/,
];

// 메타 회피 가드 — 파운더 자기분석 review(2026-05-10) §4.5 도출.
// CBT 도구를 학습한 사용자가 "나는 ○○를 정확히 인식했다"를 자기 정당화 자료로 쓰는 회피
// 패턴을 카피 단계에서 차단한다. 패턴은 narrow하게 — 단일 어휘만으론 false positive ↑.
// 부사+인지동사 조합을 require해 의도된 칭찬형 자기 정당화 어조만 매칭한다.
const META_AVOIDANCE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /(?:당신은|당신이)\s*(?:정확히|완벽하게|훌륭하게|이미)\s*(?:인식|이해|파악|발견|분석)/g,
    label: '메타 회피 칭찬 "당신은 정확히 인식"',
  },
  {
    pattern: /훌륭(?:한|하게|히)\s*(?:인식|분석|성찰|통찰|발견)/g,
    label: '메타 회피 칭찬 "훌륭한 인식"',
  },
  {
    pattern: /완벽(?:한|하게|히)\s*(?:인식|분석|파악|통찰)/g,
    label: '메타 회피 칭찬 "완벽한 인식"',
  },
];

const ALL_PATTERNS = [
  ...COMFORT_PATTERNS.map((p) => ({ ...p, category: 'comfort' as const })),
  ...NAUTICAL_PATTERNS.map((p) => ({ ...p, category: 'nautical' as const })),
  ...MEDICAL_PATTERNS.map((p) => ({ ...p, category: 'medical' as const })),
  ...META_AVOIDANCE_PATTERNS.map((p) => ({ ...p, category: 'meta_avoidance' as const })),
];

const TARGET_DIRS = ['app', 'components', 'lib'];
const TARGET_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

const WHITELIST_PATHS = [
  'lib/content/technical-manual.ts',
  'app/api/generate-questions/route.ts', // 가드 패턴 정의 영역
  'app/disclaimer/page.tsx', // 법적 면책 — "치료·진단" 의도적 사용
  'app/terms/page.tsx', // 법적 면책 — "치료·진단" 의도적 사용
  'app/safety/resources/page.tsx', // 위기 자원 안내 — 의료 어휘 의도적 사용
  'components/safety/SafetyNotice.tsx', // Crisis detection override — 무결성 우선
  'lib/ai/bluebird-protocol.ts', // AI 시스템 프롬프트 — 사용자 노출 카피 아님
  'lib/openai/gemini.ts', // AI 시스템 프롬프트 — 사용자 노출 카피 아님
  'scripts/lint-copy.ts', // 본 스크립트 — 패턴 정의 영역
];

const WHITELIST_DIRS = ['node_modules', '.next', '.git', 'docs', 'tests', 'scripts'];

type Hit = {
  file: string;
  line: number;
  col: number;
  category: 'comfort' | 'nautical' | 'medical' | 'meta_avoidance';
  label: string;
  excerpt: string;
};

async function walk(dir: string, hits: Hit[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);

    if (WHITELIST_DIRS.some((d) => rel === d || rel.startsWith(`${d}/`))) continue;
    if (WHITELIST_PATHS.includes(rel)) continue;

    if (entry.isDirectory()) {
      await walk(full, hits);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!TARGET_EXTS.has(path.extname(entry.name))) continue;

    const content = await fs.readFile(full, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 주석은 제외 — 카피가 아닌 설명이므로
      const trimmed = line.trimStart();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

      // 의료 어휘 라인이 부정 명제와 동반될 경우 (법적 면책) 의료 카테고리는 제외
      const lineIsMedicalNegation = MEDICAL_NEGATION_PATTERNS.some((p) => p.test(line));

      for (const { pattern, label, category } of ALL_PATTERNS) {
        if (category === 'medical' && lineIsMedicalNegation) continue;
        pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(line)) !== null) {
          hits.push({
            file: rel,
            line: i + 1,
            col: m.index + 1,
            category,
            label,
            excerpt: line.trim().slice(0, 120),
          });
          if (m.index === pattern.lastIndex) pattern.lastIndex++;
        }
      }
    }
  }
}

async function main() {
  const strict = process.argv.includes('--strict');
  const hits: Hit[] = [];

  for (const dir of TARGET_DIRS) {
    const full = path.join(ROOT, dir);
    try {
      await walk(full, hits);
    } catch (err) {
      // 디렉터리 없을 수 있음
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  if (hits.length === 0) {
    console.log('[lint-copy] OK — 카피 톤 위반 없음');
    return;
  }

  const byCategory: Record<string, Hit[]> = { comfort: [], nautical: [], medical: [], meta_avoidance: [] };
  for (const h of hits) byCategory[h.category].push(h);

  console.log(
    `[lint-copy] ${hits.length}건 발견 (위로 ${byCategory.comfort.length} · 항해 ${byCategory.nautical.length} · 의료 ${byCategory.medical.length} · 메타회피 ${byCategory.meta_avoidance.length})`,
  );
  console.log('');

  for (const cat of ['medical', 'meta_avoidance', 'comfort', 'nautical'] as const) {
    if (byCategory[cat].length === 0) continue;
    const heading =
      cat === 'medical' ? '의료기기 표현 (회피 필수)' :
      cat === 'meta_avoidance' ? '메타 회피 칭찬 (자기 정당화 자료화 회피)' :
      cat === 'comfort' ? '위로 어휘 (BlueBird 톤 위반)' :
      '항해 메타포 (B3 인터뷰 검증 대기 — 부분 잔존 허용)';
    console.log(`# ${heading}`);
    for (const h of byCategory[cat]) {
      console.log(`  ${h.file}:${h.line}:${h.col} [${h.label}] ${h.excerpt}`);
    }
    console.log('');
  }

  if (strict) {
    console.error('[lint-copy] --strict 모드: 위반으로 종료');
    process.exit(1);
  }

  console.log('[lint-copy] 경고 수준 — exit 0. 차단은 P2 C3 격상 시.');
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
