// 비회원 체험용 샘플 3개 케이스를 실제 analyze + questions API로 처리하여
// 정적 JSON으로 저장. 무결성 원칙: 데모 가공 절대 X. 출력 그대로 캐시.
//
// 실행: npx tsx scripts/generate-sample-cases.ts
// 결과: lib/content/sample-cases.json (수동 검토 후 lib/content/sample-cases.ts로 박음)

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  analyzeDistortionsWithGemini,
  generateSocraticQuestionsWithGemini,
} from '@/lib/openai/gemini';

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
  } catch {}
}

loadEnvLocal();

interface SampleInput {
  id: string;
  shortLabel: string; // 카드 라벨 (랜딩 카피 일치)
  trigger: string;
  thought: string;
}

const SAMPLES: SampleInput[] = [
  {
    id: 'presentation-mistake',
    shortLabel: '발표에서 실수한 뒤 "나는 항상 이런다"는 생각이 들 때',
    trigger: '오늘 회의에서 발표 중 한 부분에서 잠깐 말이 막혔다.',
    thought:
      '나는 항상 이런 식이고, 사람들이 분명 무능하다고 생각했을 거야.',
  },
  {
    id: 'friend-late-reply',
    shortLabel: '친구 답장이 늦어서 "날 싫어하나"라는 생각이 들 때',
    trigger: '친구에게 메시지를 보냈는데 두 시간째 답장이 없다.',
    thought:
      '나를 싫어하는 게 분명해. 내가 뭔가 잘못 말했나 봐.',
  },
  {
    id: 'project-doom',
    shortLabel: '잘 될 것 같았는데 "어차피 망할 것 같다"는 느낌이 들 때',
    trigger:
      '준비한 프로젝트 발표가 내일이고 지금까지 동료 반응은 좋았다.',
    thought: '지금까지 잘 됐지만 어차피 막판에 망할 것 같다.',
  },
];

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY가 없습니다.');
    process.exit(1);
  }

  const out: Array<Record<string, unknown>> = [];

  for (const s of SAMPLES) {
    console.log(`\n────── ${s.id} ──────`);
    const t0 = Date.now();
    const analysis = await analyzeDistortionsWithGemini({
      trigger: s.trigger,
      thought: s.thought,
    });
    console.log(`analyze ${Date.now() - t0}ms — distortions: ${analysis.distortions.length}`);
    if (analysis.distortions.length === 0) {
      console.error(`❌ ${s.id}: 0개 distortion. 입력 재검토 필요.`);
      process.exit(1);
    }
    for (const d of analysis.distortions) {
      console.log(`  - ${d.type} (${(d.intensity * 100).toFixed(0)}%) "${d.segment}"`);
    }

    const tq = Date.now();
    const questions = await generateSocraticQuestionsWithGemini({
      trigger: s.trigger,
      thought: s.thought,
      distortions: analysis.distortions,
      frameType: analysis.frame_type,
      referencePoint: analysis.reference_point,
      probabilityEstimate: analysis.probability_estimate,
      casSignal: analysis.cas_signal,
      system2QuestionSeed: analysis.system2_question_seed,
      decenteringPrompt: analysis.decentering_prompt,
    });
    console.log(`questions ${Date.now() - tq}ms — count: ${questions.length}`);
    if (questions.length !== 3) {
      console.error(`❌ ${s.id}: questions가 3개 아님. 재시도 필요.`);
      process.exit(1);
    }
    questions.forEach((q, i) => console.log(`  ${i + 1}. ${q.slice(0, 80)}...`));

    out.push({
      id: s.id,
      shortLabel: s.shortLabel,
      trigger: s.trigger,
      thought: s.thought,
      analysis: {
        distortions: analysis.distortions,
        frame_type: analysis.frame_type,
        reference_point: analysis.reference_point,
        probability_estimate: analysis.probability_estimate,
        loss_aversion_signal: analysis.loss_aversion_signal,
        cas_signal: analysis.cas_signal,
        system2_question_seed: analysis.system2_question_seed,
        decentering_prompt: analysis.decentering_prompt,
        trigger_category: analysis.trigger_category,
      },
      questions,
    });
  }

  const outPath = join(process.cwd(), 'lib/content/sample-cases.generated.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`\n✅ ${outPath} 저장됨. ${out.length}개 케이스.`);
}

run().catch((err) => {
  console.error('실행 오류:', err);
  process.exit(1);
});
