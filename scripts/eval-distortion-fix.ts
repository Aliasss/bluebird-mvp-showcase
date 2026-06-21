// 라이브 Gemini API 호출로 분석/질문 fix 검증.
//   분석:
//     - 알빈 false negative 케이스: 1+개 보고되어야 함 (특히 임의적 추론)
//     - 회귀 케이스 3개: 빈 배열로 유지되어야 함 (오탐 X)
//   질문:
//     - 각 케이스에서 정확히 3개의 질문이 LLM으로부터 생성되어야 함
//     - 디폴트 폴백 문장과 일치하면 폴백 발동 = 실패
//     - 케이스별 questions가 서로 달라야 함 (다양성 확인)
//
// 실행: tsx scripts/eval-distortion-fix.ts (.env.local 자동 로드됨)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  analyzeDistortionsWithGemini,
  generateSocraticQuestionsWithGemini,
} from '@/lib/openai/gemini';
import { DistortionTypeKorean } from '@/types';

const FALLBACK_QUESTIONS = new Set([
  '이 상황이 실제로 최악으로 전개될 확률을 0~100%로 추정하면 몇 %인가요?',
  '지금 생각을 뒷받침하는 객관적 증거와 반대 증거를 각각 3가지씩 적어볼 수 있나요?',
  '같은 상황을 겪는 친구에게 조언한다면, 어떤 대안 해석을 제시하시겠어요?',
]);

// .env.local 수동 로드 (Next.js 외부 실행 환경)
function loadEnvLocal() {
  try {
    const text = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local 없으면 환경변수에 의존
  }
}

loadEnvLocal();

interface Case {
  name: string;
  trigger: string;
  thought: string;
  expectAtLeastOne: boolean;
}

const CASES: Case[] = [
  {
    name: 'alvin-false-negative',
    trigger: '빠르게 해야 하는 일이 있는데 생각보다 복잡도가 높고 어렵다.',
    thought: '잘 해낼 수 있을지 모르겠고 이로 인해 조직장이 실망할까 두렵다.',
    expectAtLeastOne: true,
  },
  {
    name: 'gf-conflict-2026-04-28',
    trigger: '여자친구가 나 때문에 울었다.',
    thought:
      '여자친구가 날 떠날까봐 두렵다. 혼자 사는 게 맞는건가 싶은 생각도 들고 그렇게 되는게 불안하기도 하다.',
    expectAtLeastOne: true,
  },
  {
    name: 'catastrophizing-presentation',
    trigger: '내일 임원 보고가 있다.',
    thought: '내일 보고에서 한 번이라도 막히면 내 평판이 완전히 끝난다.',
    expectAtLeastOne: true,
  },
  {
    name: 'personalization-team-kpi',
    trigger: '팀 KPI가 목표치에 미달했다.',
    thought: '내가 제대로 못 해서 팀 전체가 망쳤다.',
    expectAtLeastOne: true,
  },
  // 회귀 — eval-cases.ts에서 expectedDistortions: [] 케이스
  {
    name: 'low-distortion-neutral',
    trigger: '회의 중 예상 밖 질문이 나왔다.',
    thought: '당황했지만 다음 회의 전엔 예상 질문 5개를 미리 준비하자.',
    expectAtLeastOne: false,
  },
  {
    name: 'boundary-low-distortion-1',
    trigger: '운동을 3일 연속 빠졌다.',
    thought: '3일 쉬었으니 다시 시작해야 한다. 다음 주부터 다시 루틴을 잡아보자.',
    expectAtLeastOne: false,
  },
];

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY 환경변수가 없습니다.');
    process.exit(1);
  }

  let passCount = 0;
  let failCount = 0;
  // 케이스별 questions 모음 — 케이스간 다양성 확인용
  const allCaseQuestions: Array<{ name: string; questions: string[] }> = [];

  for (const c of CASES) {
    const t0 = Date.now();
    const analysis = await analyzeDistortionsWithGemini({
      trigger: c.trigger,
      thought: c.thought,
    });
    const analysisMs = Date.now() - t0;

    const distortions = analysis.distortions;
    const distortionPassed = c.expectAtLeastOne
      ? distortions.length >= 1
      : distortions.length === 0;

    // 질문 생성 — 분석에 distortion이 있는 케이스만 의미 있음
    let questions: string[] = [];
    let questionsMs = 0;
    if (distortions.length > 0) {
      const tq = Date.now();
      questions = await generateSocraticQuestionsWithGemini({
        trigger: c.trigger,
        thought: c.thought,
        distortions,
        frameType: analysis.frame_type,
        referencePoint: analysis.reference_point,
        probabilityEstimate: analysis.probability_estimate,
        casSignal: analysis.cas_signal,
        system2QuestionSeed: analysis.system2_question_seed,
        decenteringPrompt: analysis.decentering_prompt,
      });
      questionsMs = Date.now() - tq;
      allCaseQuestions.push({ name: c.name, questions });
    }

    const fallbackHits = questions.filter((q) => FALLBACK_QUESTIONS.has(q.trim())).length;
    const questionsPassed =
      distortions.length === 0 ||
      (questions.length === 3 && fallbackHits === 0);

    const passed = distortionPassed && questionsPassed;
    const verdict = passed ? '✅ PASS' : '❌ FAIL';
    if (passed) passCount++;
    else failCount++;

    console.log('\n────────────────────────────────────────');
    console.log(`${verdict}  ${c.name}  (analyze ${analysisMs}ms, questions ${questionsMs}ms)`);
    console.log(`기대: distortions ${c.expectAtLeastOne ? '≥1개' : '=0개'}`);
    console.log(`결과: distortions ${distortions.length}개`);
    if (distortions.length > 0) {
      for (const d of distortions) {
        console.log(
          `  - ${DistortionTypeKorean[d.type]} (${(d.intensity * 100).toFixed(0)}%) — "${d.segment}"`
        );
      }
    }
    if (questions.length > 0) {
      console.log(`questions ${questions.length}개${fallbackHits > 0 ? ` (⚠️ 디폴트 폴백 ${fallbackHits}개 포함)` : ''}`);
      questions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
    }
    console.log(`frame: ${analysis.frame_type} · category: ${analysis.trigger_category ?? '?'}`);
  }

  // 케이스간 다양성 — 어떤 두 케이스가 정확히 같은 questions 세트면 fail
  if (allCaseQuestions.length >= 2) {
    console.log('\n────────────────────────────────────────');
    console.log('케이스간 다양성 검사');
    let collisions = 0;
    for (let i = 0; i < allCaseQuestions.length; i++) {
      for (let j = i + 1; j < allCaseQuestions.length; j++) {
        const a = allCaseQuestions[i].questions.join('|');
        const b = allCaseQuestions[j].questions.join('|');
        if (a === b) {
          console.log(`❌ ${allCaseQuestions[i].name} === ${allCaseQuestions[j].name} (동일 세트)`);
          collisions++;
        }
      }
    }
    if (collisions === 0) {
      console.log('✅ 모든 케이스가 서로 다른 questions 세트를 가짐');
    } else {
      failCount += collisions;
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log(`총 ${CASES.length}개 케이스 — PASS ${passCount} · FAIL ${failCount}`);
  process.exit(failCount === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('실행 중 오류:', err);
  process.exit(1);
});
