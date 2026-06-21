'use client';

import { useState } from 'react';

// /decision-test — 무료 '결정 스타일' 진단 (비공개 프리뷰).
//   - 자체 완결: 로그인·DB·외부 호출·외부 라이브러리 0. 어디서도 공개 퍼널에 링크하지 않음.
//   - 결과 = "왜곡 전면": 제목=결정 스타일 / 핵심 패턴(왜곡)을 표면에 작동 문장으로 / 강점·맹점 양면 / 90일 추적.
//   - 리서치 반영(v2): 정체성 서사 + 결정 상황별 양상 + 실행 통찰로 깊이 ↑(바넘 효과를 신뢰성 있게),
//     스포일러프리 공유 이미지 카드(Canvas) + 비교 훅으로 공유 유도(사회적 화폐·자기표현).
//   - 가드: 임상 라벨('파국화' 등)·효능·단정 회피, "경향"으로 서술(RM). 결과 미저장(코호트 오염 0).
//   - 편향 가드: 7문항 × 5선택지(유형 하나씩 전부) → 각 유형 정확히 7번 등장 = 완전 대칭.

type Distortion =
  | 'catastrophizing'
  | 'all_or_nothing'
  | 'emotional_reasoning'
  | 'personalization'
  | 'arbitrary_inference';

type Art = 'radar' | 'split' | 'pulse' | 'inward' | 'dart' | 'balance';

// 유형 아이콘 — 화면 SVG와 공유 카드 Canvas가 같은 소스를 공유.
const ART_PATHS: Record<Art, string> = {
  radar:
    '<circle cx="22" cy="26" r="2.5" fill="currentColor" stroke="none"/><path d="M28 26a6 6 0 0 0-6-6"/><path d="M34 26a12 12 0 0 0-12-12"/><path d="M22 26 38 12"/><circle cx="39" cy="11" r="2.5" fill="currentColor" stroke="none"/>',
  split: '<circle cx="24" cy="24" r="13"/><path d="M24 11v26"/>',
  pulse: '<path d="M6 24h7l4-11 6 22 4-13h9"/>',
  inward:
    '<circle cx="24" cy="24" r="2.5" fill="currentColor" stroke="none"/><path d="M24 8v7"/><path d="M21 12l3 3 3-3"/><path d="M24 40v-7"/><path d="M21 36l3-3 3 3"/><path d="M8 24h7"/><path d="M12 21l3 3-3 3"/><path d="M40 24h-7"/><path d="M36 21l-3 3 3 3"/>',
  dart: '<circle cx="33" cy="24" r="5"/><path d="M9 24h17"/><path d="M21 18l6 6-6 6"/>',
  balance:
    '<path d="M24 12v22"/><path d="M12 17h24"/><path d="M12 17v4"/><path d="M36 17v4"/><circle cx="12" cy="25" r="3.5"/><circle cx="36" cy="25" r="3.5"/><path d="M19 35h10"/>',
};

interface Archetype {
  title: string;
  tagline: string; // 한 줄 정체성(공유 표면)
  narrative: string; // 서사형 양면 서술
  pattern: string; // 핵심 패턴 = 왜곡을 일상 작동 문장으로
  strength: string;
  cost: string;
  contexts: { label: string; text: string }[]; // 결정 상황별 양상
  action: string; // 실행 통찰(캘리브레이션 다리)
  art: Art;
}

const ARCHETYPES: Record<Distortion, Archetype> = {
  catastrophizing: {
    title: '위협 선반영형',
    tagline: '위험을 가장 먼저 보는 사람',
    narrative:
      '당신은 큰 결정을 앞두면 남들이 놓치는 위험 신호를 먼저 잡아냅니다. 그 덕에 준비가 빠르고 신중하죠. 다만 불안이 높아질 때는 그 위험을 실제보다 크게 그려, 충분히 해볼 만한 선택도 미루는 쪽으로 기웁니다.',
    pattern: '불안이 높을 때, 최악의 결과를 먼저 그립니다.',
    strength: '리스크를 남보다 먼저 포착',
    cost: '확신을 과소평가해 기회를 놓침',
    contexts: [
      { label: '일', text: '실패 시나리오를 먼저 떠올려 대비는 탄탄하지만, 시작이 늦어지기 쉬워요.' },
      { label: '관계', text: '갈등의 최악을 미리 그려, 먼저 거리를 두기도 합니다.' },
      { label: '돈', text: '손실 가능성을 크게 봐 안전을 택하지만, 기회를 놓칠 때가 있어요.' },
    ],
    action:
      '다음 큰 결정에서 ‘최악이 일어날 확률’을 숫자로 적어두세요. 90일 뒤 실제와 맞춰보면, 당신의 예측이 얼마나 비관 쪽이었는지 데이터로 보입니다.',
    art: 'radar',
  },
  all_or_nothing: {
    title: '경계 설계형',
    tagline: '기준이 분명한 사람',
    narrative:
      '당신은 결정을 ‘된다 / 안 된다’로 명확히 가릅니다. 그래서 망설임이 적고 빠르게 움직이죠. 다만 많은 선택지가 그 사이 어딘가에 있는데, 중간을 잘 두지 않아 쓸 만한 절충안을 놓칠 때가 있습니다.',
    pattern: '결정을 ‘되거나 / 안 되거나’로 가르고, 중간을 잘 두지 않습니다.',
    strength: '기준이 분명해 빠르게 정함',
    cost: '절충안과 회색지대를 놓침',
    contexts: [
      { label: '일', text: '완성 아니면 실패로 봐 추진력은 강하지만, 단계적 전략을 놓치기도.' },
      { label: '관계', text: '좋은 사람 / 아닌 사람으로 빠르게 나눠, 회복할 관계를 일찍 접기도.' },
      { label: '돈', text: '전부 아니면 전무로 봐, 부분·단계적 선택을 잘 안 둡니다.' },
    ],
    action:
      '다음 결정에서 ‘0과 100 사이’ 선택지를 하나만 더 적어보세요. 그 중간안이 실제로 어땠는지 추적하면 흑백 판단의 비용이 보입니다.',
    art: 'split',
  },
  emotional_reasoning: {
    title: '직감 신뢰형',
    tagline: '신호를 빠르게 읽는 사람',
    narrative:
      '당신은 직관이 빠르고 몰입이 강합니다. 분위기와 신호를 남보다 예민하게 읽죠. 다만 ‘그렇게 느껴진다’가 ‘그게 사실이다’로 바로 이어질 때, 감정이 근거를 덮어 판단이 흔들리기 쉽습니다.',
    pattern: '그렇게 느껴지면, 그게 사실일 거라고 여깁니다.',
    strength: '직관이 빠르고 몰입이 강함',
    cost: '감정이 근거를 덮어 오판하기 쉬움',
    contexts: [
      { label: '일', text: '직관으로 빠르게 방향을 잡지만, 컨디션 나쁜 날의 판단까지 사실로 믿기도.' },
      { label: '관계', text: '상대의 기류를 빨리 읽지만, 내 기분을 상대 마음으로 오해하기도.' },
      { label: '돈', text: '느낌이 좋으면 밀어붙이고, 불안하면 급히 빼기도 합니다.' },
    ],
    action:
      '결정할 때 ‘지금 느낌’과 ‘실제 근거’를 한 줄씩 따로 적어두세요. 90일 뒤 어느 쪽이 맞았는지 보면, 직감을 언제 믿을지가 또렷해집니다.',
    art: 'pulse',
  },
  personalization: {
    title: '책임 과수용형',
    tagline: '책임을 먼저 지는 사람',
    narrative:
      '당신은 책임감이 강하고 문제를 빠르게 개선합니다. 일이 틀어지면 가장 먼저 자신을 돌아보죠. 다만 통제 밖의 요인까지 ‘내 탓’으로 떠안을 때, 필요 이상으로 지치고 다음 결정이 무거워집니다.',
    pattern: '일이 틀어지면, 원인을 주로 ‘내 탓’으로 돌립니다.',
    strength: '책임감이 강하고 개선이 빠름',
    cost: '통제 밖 요인까지 떠안아 지침',
    contexts: [
      { label: '일', text: '팀의 실수도 내 몫으로 떠안아 신뢰를 얻지만, 번아웃이 빨리 옵니다.' },
      { label: '관계', text: '원인을 내 쪽에서 먼저 찾아 관계를 지키지만, 자책이 쌓이기도.' },
      { label: '돈', text: '손실을 전적으로 내 판단 탓으로 봐, 다음 결정이 위축되기도.' },
    ],
    action:
      '결정이 틀어졌을 때 ‘내가 통제할 수 있던 것 / 없던 것’을 나눠 적어보세요. 90일 추적하면, 실제 원인 중 내 몫이 얼마였는지 보입니다.',
    art: 'inward',
  },
  arbitrary_inference: {
    title: '속단 추론형',
    tagline: '결론이 빠른 사람',
    narrative:
      '당신은 결정이 빠르고 추진력이 강합니다. 망설이는 사이 기회가 사라지는 걸 잘 알죠. 다만 근거가 충분히 모이기 전에 결론을 확정할 때, 적은 단서로 단정해 빗나가기 쉽습니다.',
    pattern: '근거가 적어도, 결론을 빠르게 확정합니다.',
    strength: '결정이 빠르고 추진력이 강함',
    cost: '증거가 부족한 단정으로 빗나감',
    contexts: [
      { label: '일', text: '빠르게 결정해 속도를 내지만, 검증 전 확신이 어긋나기도.' },
      { label: '관계', text: '짧은 신호로 상대 마음을 단정해 오해를 만들기도.' },
      { label: '돈', text: '근거보다 직관으로 빨리 들어가, 확인 전 손실을 보기도.' },
    ],
    action:
      '결정 전 ‘이 결론을 뒤집을 증거 한 가지’를 적어보세요. 90일 뒤 맞춰보면, 당신의 속단이 언제 맞고 언제 빗나가는지 보입니다.',
    art: 'dart',
  },
};

const BALANCED: Archetype = {
  title: '균형 조율형',
  tagline: '치우치지 않는 사람',
  narrative:
    '당신은 특정 습관에 크게 쏠리지 않고 균형을 잡는 편입니다. 그래서 큰 실수가 적고 안정적이죠. 다만 신호가 옅은 만큼 자기 패턴을 덜 자각해, 어떤 상황에서 미세하게 흔들리는지는 잘 안 보입니다.',
  pattern: '특정 습관에 크게 치우치지 않고, 균형을 잡는 편입니다.',
  strength: '과한 편향이 적어 안정적',
  cost: '신호가 옅어 자기 패턴을 덜 자각',
  contexts: [
    { label: '일', text: '여러 관점을 고루 보지만, 결정적 순간의 미세한 편향은 놓치기 쉬워요.' },
    { label: '관계', text: '균형 있게 대응하지만, 자신의 작은 패턴은 덜 의식합니다.' },
    { label: '돈', text: '과하지 않게 판단하지만, 어떤 결정에서 쏠리는지는 기록으로만 드러납니다.' },
  ],
  action:
    '결정마다 확신도를 적어두고 90일 추적해보세요. 평소엔 안 보이던 당신의 미세한 편향이 데이터로 드러납니다.',
  art: 'balance',
};

interface Question {
  scenario: string;
  options: { label: string; d: Distortion }[];
}

const QUESTIONS: Question[] = [
  {
    scenario: '큰 결정을 앞두고 잠이 안 올 때, 머릿속에 가장 자주 떠오르는 건?',
    options: [
      { label: '“이게 잘못되면 다 무너질 거야”', d: 'catastrophizing' },
      { label: '“성공 아니면 실패, 둘 중 하나야”', d: 'all_or_nothing' },
      { label: '“왠지 느낌이 안 좋아”', d: 'emotional_reasoning' },
      { label: '“결국 내가 잘못해서 이렇게 됐어”', d: 'personalization' },
      { label: '“어차피 결론은 뻔해” (근거는 없지만)', d: 'arbitrary_inference' },
    ],
  },
  {
    scenario: '정보가 부족한 채로 결정해야 할 때, 당신의 기본값은?',
    options: [
      { label: '일단 빠르게 결론을 정한다', d: 'arbitrary_inference' },
      { label: '최악의 시나리오부터 점검한다', d: 'catastrophizing' },
      { label: '지금 드는 직감을 따른다', d: 'emotional_reasoning' },
      { label: '되는 쪽 / 안 되는 쪽으로 딱 나눈다', d: 'all_or_nothing' },
      { label: '잘 안 되면 내 탓이 될까 그것부터 걱정된다', d: 'personalization' },
    ],
  },
  {
    scenario: '내린 결정이 틀어졌을 때, 가장 먼저 드는 생각은?',
    options: [
      { label: '“내가 더 잘했어야 했는데”', d: 'personalization' },
      { label: '“거봐, 이럴 줄 알았어”', d: 'catastrophizing' },
      { label: '“역시 이건 완전 실패야”', d: 'all_or_nothing' },
      { label: '“처음부터 느낌이 안 좋았어”', d: 'emotional_reasoning' },
      { label: '“볼 것도 없이 망한 거야” (근거 없이)', d: 'arbitrary_inference' },
    ],
  },
  {
    scenario: '상대의 애매한 반응(짧은 답·읽고 지나침)을 받으면?',
    options: [
      { label: '근거는 없지만 ‘나한테 화났구나’ 확신', d: 'arbitrary_inference' },
      { label: '내가 뭘 잘못했나 먼저 돌아본다', d: 'personalization' },
      { label: '기분이 그러니, 분위기가 나쁜 게 맞다', d: 'emotional_reasoning' },
      { label: '관계가 끝나는 그림까지 상상이 뻗는다', d: 'catastrophizing' },
      { label: '이 관계는 좋거나 끝이거나로 본다', d: 'all_or_nothing' },
    ],
  },
  {
    scenario: '새로운 기회(이직·프로젝트)를 검토할 때, 당신은?',
    options: [
      { label: '잘 안 될 위험부터 크게 본다', d: 'catastrophizing' },
      { label: '확실한 근거 없이도 빠르게 판단한다', d: 'arbitrary_inference' },
      { label: '완전히 좋거나 완전히 별로거나로 본다', d: 'all_or_nothing' },
      { label: '끌리는 느낌이면 맞다고 본다', d: 'emotional_reasoning' },
      { label: '잘 안 되면 다 내 탓이 될까 망설인다', d: 'personalization' },
    ],
  },
  {
    scenario: '계획대로 안 풀린 하루, 당신의 결론은?',
    options: [
      { label: '“내 탓이 크다”', d: 'personalization' },
      { label: '“오늘은 완전히 망했다”', d: 'all_or_nothing' },
      { label: '“이대로 다 무너질 것 같다”', d: 'catastrophizing' },
      { label: '“딱 봐도 답이 나온다” (근거 없이)', d: 'arbitrary_inference' },
      { label: '“기분이 바닥인 걸 보니 진짜 망한 하루야”', d: 'emotional_reasoning' },
    ],
  },
  {
    scenario: '중요한 선택 직전, 당신을 가장 많이 흔드는 건?',
    options: [
      { label: '일어날 수 있는 최악의 그림', d: 'catastrophizing' },
      { label: '지금 이 순간의 느낌', d: 'emotional_reasoning' },
      { label: '‘모 아니면 도’라는 압박', d: 'all_or_nothing' },
      { label: '빨리 결론내고 싶은 조급함', d: 'arbitrary_inference' },
      { label: '“내가 또 그르칠 것 같다”는 자책', d: 'personalization' },
    ],
  },
];

const EMPTY_SCORES: Record<Distortion, number> = {
  catastrophizing: 0,
  all_or_nothing: 0,
  emotional_reasoning: 0,
  personalization: 0,
  arbitrary_inference: 0,
};

function resolveArchetype(scores: Record<Distortion, number>): Archetype {
  const entries = Object.entries(scores) as [Distortion, number][];
  let topKey: Distortion | null = null;
  let top = -1;
  let tie = false;
  for (const [k, v] of entries) {
    if (v > top) {
      top = v;
      topKey = k;
      tie = false;
    } else if (v === top) {
      tie = true;
    }
  }
  if (topKey === null || top <= 0 || tie) return BALANCED;
  return ARCHETYPES[topKey];
}

const SHARE_URL = 'https://bluebird-mvp.vercel.app/decision-test';
const SIGNUP_URL = 'https://bluebird-mvp.vercel.app/';

function ArtIcon({ kind, className }: { kind: Art; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-9 w-9 text-primary'}
    >
      <g dangerouslySetInnerHTML={{ __html: ART_PATHS[kind] }} />
    </svg>
  );
}

// ── 공유 이미지 카드 (Canvas, 외부 라이브러리 0) — 스포일러프리: 정체성+강점만, 약점/패턴 비노출 ──
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function splitLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lh: number): number {
  let cy = y;
  for (const ln of lines) {
    ctx.fillText(ln, x, cy);
    cy += lh;
  }
  return cy;
}

async function loadArtImage(kind: Art, color = '#2D6A4F'): Promise<HTMLImageElement | null> {
  try {
    const inner = ART_PATHS[kind].split('currentColor').join(color);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130" viewBox="0 0 48 48" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

// 스포일러프리 공유 카드 — 결과 화면과 같은 밀도(헤더 밴드 + 핵심 패턴 + 강점). 약점(맹점)은 비노출.
async function buildShareBlob(a: Archetype): Promise<Blob | null> {
  try {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    } catch {
      /* 폰트 미로딩 시 sans-serif 폴백 */
    }
    const FONT = 'Pretendard, -apple-system, sans-serif';
    const PAD = 80;
    const CW = W - PAD * 2;
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // 헤더 밴드
    const HEADER = 470;
    ctx.fillStyle = '#2D6A4F';
    ctx.fillRect(0, 0, W, HEADER);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `800 38px ${FONT}`;
    ctx.fillText('BlueBird', PAD, 58);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRectPath(ctx, PAD, 150, 132, 132, 32);
    ctx.fill();
    const icon = await loadArtImage(a.art, '#FFFFFF');
    if (icon) ctx.drawImage(icon, PAD + 26, 176, 80, 80);

    const tx = PAD + 164;
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = `600 32px ${FONT}`;
    ctx.fillText('나의 결정 스타일', tx, 168);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 72px ${FONT}`;
    ctx.fillText(a.title, tx, 210);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `500 38px ${FONT}`;
    drawLines(ctx, splitLines(ctx, a.tagline, CW), PAD, 334, 50);

    // 핵심 패턴 블록
    let y = HEADER + 54;
    ctx.font = `600 44px ${FONT}`;
    const patLines = splitLines(ctx, a.pattern, CW - 72);
    const blkH = 96 + patLines.length * 60 + 28;
    ctx.fillStyle = '#EAF2EE';
    roundRectPath(ctx, PAD, y, CW, blkH, 28);
    ctx.fill();
    ctx.fillStyle = '#2D6A4F';
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText('결정이 흔들리는 핵심 패턴', PAD + 36, y + 36);
    ctx.fillStyle = '#0F172A';
    ctx.font = `600 44px ${FONT}`;
    drawLines(ctx, patLines, PAD + 36, y + 92, 60);
    y += blkH + 50;

    // 강점
    ctx.fillStyle = '#2D6A4F';
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText('강점', PAD, y);
    y += 50;
    ctx.fillStyle = '#0F172A';
    ctx.font = `500 42px ${FONT}`;
    drawLines(ctx, splitLines(ctx, a.strength, CW), PAD, y, 56);

    // 푸터
    const by = H - 196;
    ctx.fillStyle = '#0F172A';
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText('너의 결정 스타일은?', PAD, by);
    ctx.fillStyle = '#2D6A4F';
    ctx.font = `500 32px ${FONT}`;
    ctx.fillText('bluebird-mvp.vercel.app/decision-test', PAD, by + 64);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } catch {
    return null;
  }
}

type ShareWithFiles = { files?: File[]; title?: string; text?: string; url?: string };

export default function HaesolTestPage() {
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<Distortion, number>>({ ...EMPTY_SCORES });
  const [toast, setToast] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const start = () => {
    setScores({ ...EMPTY_SCORES });
    setIdx(0);
    setStep('quiz');
  };

  const answer = (d: Distortion) => {
    setScores((prev) => ({ ...prev, [d]: prev[d] + 1 }));
    if (idx + 1 < QUESTIONS.length) setIdx(idx + 1);
    else setStep('result');
  };

  const restart = () => {
    setScores({ ...EMPTY_SCORES });
    setIdx(0);
    setToast(null);
    setStep('intro');
  };

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // 링크를 text 안에 직접 포함 — Web Share는 파일과 함께면 별도 url 필드를 무시하는
  // 플랫폼(iOS·카톡 등)이 많아, 링크가 같이 가려면 text에 넣어야 한다.
  const buildShareText = (a: Archetype) =>
    `내 결정 스타일은 ‘${a.title} — ${a.tagline}’.\n너의 결정 스타일은? ${SHARE_URL}`;

  const share = async (a: Archetype) => {
    if (sharing) return;
    setSharing(true);
    try {
      const text = buildShareText(a);
      const nav = navigator as Navigator & {
        share?: (d?: ShareWithFiles) => Promise<void>;
        canShare?: (d?: ShareWithFiles) => boolean;
      };

      const blob = await buildShareBlob(a);
      if (blob) {
        const file = new File([blob], 'bluebird-decision-style.png', { type: 'image/png' });
        // 1) 이미지 + 링크(text 포함) 네이티브 공유
        if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], text });
          return;
        }
        // 2) 이미지 다운로드 폴백 (데스크톱 등)
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'bluebird-decision-style.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        flashToast('결과 이미지를 저장했어요 · 링크는 “링크 복사”로');
        return;
      }

      // 3) 이미지 생성 불가 시: 텍스트+링크 공유/복사
      if (nav.share) {
        await nav.share({ title: 'BlueBird 결정 스타일 진단', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      flashToast('링크가 복사됐어요');
    } catch {
      // 사용자가 공유를 취소했거나 접근 불가 — 조용히 무시.
    } finally {
      setSharing(false);
    }
  };

  const copyLink = async (a: Archetype) => {
    try {
      await navigator.clipboard.writeText(buildShareText(a));
      flashToast('링크가 복사됐어요');
    } catch {
      flashToast('복사에 실패했어요');
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-8">
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-extrabold tracking-tight text-primary">BlueBird</span>
          <span className="rounded-full bg-background-secondary px-2.5 py-1 text-[10px] font-medium text-text-tertiary">
            비공개 프리뷰
          </span>
        </div>

        {step === 'intro' && (
          <div className="flex flex-1 flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">결정 스타일 진단</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-snug tracking-tight text-text-primary">
              당신은 불안할 때<br />
              어떤 결정을 내리나요?
            </h1>
            <p className="mt-4 text-base leading-relaxed text-text-secondary">
              7개의 짧은 질문으로, 당신의 결정 스타일과 그 결정이 흔들리는 핵심 패턴을 짚어 드려요. 1분이면 충분해요.
            </p>
            <button
              onClick={start}
              className="mt-8 w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-fg transition-transform active:scale-95"
            >
              시작하기
            </button>
          </div>
        )}

        {step === 'quiz' && (
          <div className="flex flex-1 flex-col pt-6">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-tertiary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(idx / QUESTIONS.length) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-text-tertiary">
              {idx + 1} / {QUESTIONS.length}
            </p>
            <h2 className="mt-6 text-xl font-bold leading-snug tracking-tight text-text-primary">
              {QUESTIONS[idx].scenario}
            </h2>
            <div className="mt-6 space-y-2.5">
              {QUESTIONS[idx].options.map((o) => (
                <button
                  key={o.label}
                  onClick={() => answer(o.d)}
                  className="w-full rounded-2xl border border-background-tertiary bg-surface px-5 py-3.5 text-left text-[15px] font-medium leading-snug text-text-primary transition-colors active:bg-primary-tint"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'result' &&
          (() => {
            const a = resolveArchetype(scores);
            return (
              <div className="flex flex-1 flex-col py-6">
                <div className="rounded-[20px] border border-background-tertiary bg-surface p-5">
                  {/* 히어로 */}
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-tint">
                      <ArtIcon kind={a.art} className="h-9 w-9 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-wide text-primary">나의 결정 스타일</p>
                      <p className="mt-0.5 text-2xl font-bold leading-tight tracking-tight text-text-primary">{a.title}</p>
                      <p className="mt-0.5 text-sm font-medium text-text-secondary">{a.tagline}</p>
                    </div>
                  </div>

                  {/* 정체성 서사 */}
                  <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">{a.narrative}</p>

                  {/* 핵심 패턴(왜곡 전면) */}
                  <div className="mt-4 rounded-2xl bg-primary-tint p-4">
                    <p className="text-xs font-semibold text-primary">결정이 흔들리는 핵심 패턴</p>
                    <p className="mt-1.5 text-base font-semibold leading-snug text-text-primary">{a.pattern}</p>
                  </div>

                  {/* 강점/맹점 */}
                  <div className="mt-3.5 flex gap-2.5">
                    <div className="flex-1 rounded-xl border border-background-tertiary bg-background p-3">
                      <p className="text-[11px] font-semibold text-primary">강점</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-text-primary">{a.strength}</p>
                    </div>
                    <div className="flex-1 rounded-xl border border-background-tertiary bg-background p-3">
                      <p className="text-[11px] font-semibold text-warning">맹점</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-text-primary">{a.cost}</p>
                    </div>
                  </div>

                  {/* 결정 상황별 */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-text-tertiary">이럴 때 이렇게 나타나요</p>
                    <div className="mt-2 space-y-2">
                      {a.contexts.map((c) => (
                        <div key={c.label} className="flex gap-2.5">
                          <span className="mt-0.5 flex-shrink-0 rounded-md bg-background-secondary px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                            {c.label}
                          </span>
                          <p className="text-[13px] leading-snug text-text-secondary">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 실행 통찰(캘리브레이션 다리) */}
                  <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs font-semibold text-primary">이렇게 시도해보세요</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-text-primary">{a.action}</p>
                  </div>

                  <p className="mt-4 text-right text-[11px] font-semibold text-primary">BlueBird</p>
                </div>

                {/* 가입 유도 (전환 다리) — 결과의 '90일 추적'을 실제 행동으로 */}
                <a
                  href={SIGNUP_URL}
                  className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-4 text-left text-primary-fg transition-transform active:scale-[0.98]"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold tracking-tight">BlueBird 시작하기</p>
                    <p className="mt-0.5 text-xs leading-snug text-white/80">이 예측이 실제로 맞았는지 직접 기록하고 맞춰보세요.</p>
                  </div>
                  <span aria-hidden className="flex-shrink-0 text-lg text-white/80">→</span>
                </a>

                {/* 비교 훅 */}
                <p className="mt-5 text-center text-sm text-text-secondary">
                  친구는 무슨 결정 스타일일까요? <span className="font-medium text-text-primary">공유해서 비교해보세요.</span>
                </p>

                <button
                  onClick={() => share(a)}
                  disabled={sharing}
                  className="mt-3 w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-fg transition-transform active:scale-95 disabled:opacity-60"
                >
                  {sharing ? '준비 중…' : '결과 이미지 공유'}
                </button>
                <button
                  onClick={() => copyLink(a)}
                  className="mt-2 w-full rounded-2xl border border-primary/40 px-6 py-3 text-sm font-semibold text-primary transition-colors active:bg-primary-tint"
                >
                  링크 복사
                </button>
                <button
                  onClick={restart}
                  className="mt-2.5 w-full rounded-2xl border border-background-tertiary px-6 py-3 text-sm font-medium text-text-secondary transition-colors active:bg-background-secondary"
                >
                  다시 하기
                </button>
                {toast && <p className="mt-3 text-center text-[12px] font-medium text-primary">{toast}</p>}
                <p className="mt-3 text-center text-[11px] text-text-tertiary">비공개 프리뷰 · 결과는 저장되지 않습니다</p>
              </div>
            );
          })()}
      </div>
    </main>
  );
}
