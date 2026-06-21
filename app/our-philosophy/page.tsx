'use client';

import { useRouter } from 'next/navigation';

/**
 * BlueBird Philosophy 페이지 — manual 톤 1:1 정렬.
 *
 * 설계 재정렬 §3 결정 ③:
 *   - manual 톤 (lib/content/technical-manual.ts:31-32 참조)
 *   - 통계 카드 grid 유지
 *   - gradient 전부 제거
 *   - 시적 비유·자연 메타포 0건
 *   - 한 섹션당 본문 1~2문장 + 통계 카드 1
 */

type Section = {
  number: string;
  title: string;
  subtitle: string;
  lead: string; // 결정 도구 리포지셔닝(③): 각 근거를 "이것이 결정을 어떻게 흔드는가"로 재해석하는 1줄.
  body: string;
  stat: { value: string; label: string; source: string };
};

const SECTIONS: Section[] = [
  {
    number: '01',
    title: '기질의 변동성',
    subtitle: '유전과 학습의 분포',
    lead: '같은 상황에서도 사람마다 결정이 갈리는 이유 — 그 일부는 타고나지만, 일부는 훈련으로 바꿀 수 있습니다.',
    body:
      '불안의 유전적 기여도는 30~60%로 보고됩니다. 나머지 40~70%는 인지적 반응 방식에 해당하며, 이 영역은 훈련 가능한 변수입니다. BlueBird는 후자를 다룹니다.',
    stat: {
      value: '30–60%',
      label: '불안 장애의 유전적 기여도',
      source: 'Smoller et al., NIH PMC7237282 (2019); 표준 합의 30~60% 정합',
    },
  },
  {
    number: '02',
    title: '손실 회피 본능',
    subtitle: '비대칭 가중치',
    lead: '잃을 것이 실제보다 무겁게 느껴질 때, 결정은 한쪽으로 기울어집니다.',
    body:
      '인간의 의사결정 시스템은 동일한 크기의 손실을 동일한 크기의 이익보다 약 2.25배 더 무겁게 평가합니다. 부정적 사건이 과대 표상되는 이유는 의지의 결함이 아니라 진화적 가중치 함수의 결과입니다.',
    stat: {
      value: '약 2.25배',
      label: '손실 가중치 (이득 대비)',
      source: 'Tversky & Kahneman (1992) Cumulative Prospect Theory (λ=2.25 산출); 개념 origin Kahneman & Tversky 1979',
    },
  },
  {
    number: '03',
    title: '이중 프로세스의 시간차',
    subtitle: '직관과 분석의 처리 속도',
    lead: '직관은 결정을 먼저 밀어붙이고, 검토는 한 박자 늦게 도착합니다 — 그 틈에서 결정이 흔들립니다.',
    body:
      '편도체 기반 정서 반응은 분석적 평가보다 수십~수백 배 빠릅니다. 시스템 1과 시스템 2의 처리 속도 차이는 결정을 다시 검토하는 일의 출발점입니다.',
    stat: {
      value: 'fast → slow',
      label: '정서 반응 → 분석 사고',
      source: 'LeDoux (1996), Kahneman (2011)',
    },
  },
  {
    number: '04',
    title: '인지 왜곡의 설명력',
    subtitle: '사회적 불안의 분산 분해',
    lead: '결정을 흔드는 건 상황 자체보다, 그 상황을 해석하는 생각 습관일 때가 많습니다.',
    body:
      '학생 표본 연구에서 사회적 상호작용 불안의 분산 중 약 46%가 인지 왜곡으로 설명되었습니다. 특히 파국화·독심술·과잉일반화가 주요 기여 인자로 보고됩니다. 환경 변수보다 개인 내부의 추론 규칙이 더 큰 비중을 차지합니다.',
    stat: { value: 'R² = .46', label: '인지 왜곡의 사회적 불안 설명 비율', source: 'Khan et al. (2021), JPPS' },
  },
  {
    number: '05',
    title: '정서조절 전략 분류',
    subtitle: '측정 가능한 출력',
    lead: '결정을 미루거나 피하는 방식도 하나의 습관 — 측정할 수 있으면 결과로 채점할 수 있습니다.',
    body:
      '회피·억제·반추처럼 단기엔 편하지만 장기엔 문제를 키우는 감정 대처 방식은 여러 심리적 어려움에서 일관된 영향력으로 보고됩니다. BlueBird는 이 대처 방식을 측정 가능한 출력으로 분류합니다.',
    stat: {
      value: '회피·억제·반추',
      label: '측정 가능한 정서조절 전략',
      source: 'Aldao, Nolen-Hoeksema, & Schweizer (2010), Clinical Psychology Review',
    },
  },
  {
    number: '06',
    title: '위험 회피 ≠ 손실 회피',
    subtitle: '관찰·훈련 초점의 재정의',
    lead: '불안한 결정을 흔드는 핵심은 손실 자체가 아니라, 결과가 불확실한 상황을 견디지 못하는 데 있습니다.',
    body:
      "불안이 강한 사람들의 회피적 결정에서 가장 강한 설명 변수는 손실 자체에 대한 민감도가 아니라 결과가 불확실한 상황에 대한 민감도입니다. 관찰·훈련의 초점은 '손실에 무뎌지는 것'이 아니라 '결과가 불확실한 상황을 견디는 능력 키우기'로 정의됩니다.",
    stat: {
      value: '위험 회피 ≠ 손실 회피',
      label: '관찰·훈련 초점의 재정의',
      source: 'Charpentier, Aylward, Roiser, & Robinson (2017), Biological Psychiatry, 81(12)',
    },
  },
  {
    number: '07',
    title: '환경 모델 보정',
    subtitle: '학습률 추정 편향',
    lead: '불안할수록 세상을 실제보다 더 예측 불가능하게 보고, 그 위에서 결정을 내립니다.',
    body:
      '특성 불안이 높을수록 안정적 환경에서도 결과 변동성을 과대 추정합니다. 인지 시스템이 실제 환경보다 더 예측 불가능한 모델을 보유합니다.',
    stat: {
      value: '환경 모델 ≠ 실제 환경',
      label: '학습률 추정 편향',
      source: "Browning, Behrens, Jocham, O'Reilly, & Bishop (2015), Nature Neuroscience",
    },
  },
  {
    number: '08',
    title: '회피의 9년 누적 곡선',
    subtitle: '회피의 누적 효과',
    lead: '피하는 결정을 반복하면, 그 선택은 9년 뒤의 삶까지 따라옵니다.',
    body:
      '회피로 반응하는 습관은 9년간 추적에서 불안이 처음 생기는 시점뿐 아니라 오래 지속되는 흐름까지 예측합니다. 단기적 불안 감소가 장기적으로 학습·성장 차단으로 누적됩니다 (예: 승진·발표·창의성·관계·장기 경력 회피).',
    stat: {
      value: '9년 종단',
      label: '회피의 누적 효과',
      source: 'Struijs, Lamers, Vroling, Roelofs, Spinhoven, & Penninx (2017), Psychiatry Research',
    },
  },
  {
    number: '09',
    title: '두 종류의 결정',
    subtitle: '결과로 채점되는 결정과 그렇지 않은 결정',
    lead: '같은 도구로 다룰 수 없는 결정이 있습니다 — 결과를 미리 가늠할 수 있는 결정과 나 자신을 바꿔놓는 결정은 접근이 달라야 합니다.',
    body:
      '리텔과 웨버는 정답 기준이 있는 "길들여진(tame)" 문제와 정식화 자체가 어렵고 답이 옳고/그름이 아니라 좋음/나쁨인 "고약한(wicked)" 문제를 구분했습니다. 러스 로버츠는 이를 결혼·출산·직업 전환 같은 개인의 큰 결정에 적용해 "야생의 문제(wild problems)"라 불렀고, L.A. 폴은 그런 결정이 겪어보기 전엔 알 수 없으며 결정 자체가 나의 선호와 정체성을 바꾼다고 논증했습니다. BlueBird는 되돌릴 수 있고 결과를 확인할 수 있는 결정만 결과로 맞춰보고, 되돌릴 수 없고 나를 바꾸는 결정에는 일부러 점수를 매기지 않습니다.',
    stat: {
      value: 'tame ↔ wild',
      label: '결과로 채점 가능 vs 원리적으로 불가능',
      source: 'Rittel & Webber (1973); Russ Roberts, Wild Problems (2022); L.A. Paul, Transformative Experience (2014)',
    },
  },
  {
    number: '10',
    title: '예측의 정확도는 훈련된다',
    subtitle: '확률 추론과 불안의 과대예측',
    lead: '불안은 위협이 일어날 가능성을 실제보다 크게 그리는데, 확률로 적어두고 결과와 맞춰보면 그 간격이 줄어듭니다.',
    body:
      '테틀록의 굿 저지먼트 프로젝트에서는 1시간 미만의 확률 추론 훈련만으로 예측 정확도(브라이어 점수)가 통제군 대비 6~11% 좋아졌고, 그 효과가 4년간 지속됐습니다. 불안은 위협과 후회를 체계적으로 크게 예측하는 경향이 있어, 확신도를 숫자로 적어두고 실제 결과와 빈도로 맞춰보면 "내 80% 확신이 실제로는 60%만 맞았다"가 데이터로 드러납니다. 다만 결과를 미리 알 수 없는 큰 결정에서는 숫자를 붙이는 것이 오히려 가짜 정밀이 될 수 있어, 이 방식은 결과를 확인할 수 있는 결정에만 적용합니다.',
    stat: {
      value: '−6~11%',
      label: '짧은 확률 추론 훈련의 정확도 개선(4년 지속)',
      source: 'Tetlock & Mellers, Good Judgment Project; Moore & Swift, 과신·확신도 연구',
    },
  },
  {
    number: '11',
    title: '실패를 미리 써보고, 밖에서 보기',
    subtitle: '사전부검과 외부 관점',
    lead: '"잘 되겠지"라는 낙관이 위험을 가릴 때, 미리 실패를 가정하고 비슷한 사례의 기준율을 보면 시야가 넓어집니다.',
    body:
      '클라인의 사전부검(premortem)은 "1년 뒤 이 결정이 실패했다"고 확정 과거형으로 가정하고 이유를 거꾸로 적게 하는 방법으로, 실패 원인 식별이 약 30% 늘어난다고 보고됩니다. 카너먼과 로발로의 외부 관점(outside view)은 "이번 건은 특별하다"는 내부 시선 대신 "비슷한 상황의 사람들은 보통 어땠나"라는 기준율(base rate)을 보게 합니다. BlueBird는 결정을 닫기 전에 이 두 질문을 넣어, 낙관과 과신이 만든 사각지대를 줄입니다.',
    stat: {
      value: '+약 30%',
      label: '사전부검의 실패 원인 식별 증가',
      source: 'Klein (2007); Mitchell, Russo & Pennington (1989); Kahneman & Lovallo (2003)',
    },
  },
];

const CITATIONS = [
  {
    category: '유전적 기질',
    data: '불안 장애의 유전적 기여도 (30–60%)',
    source: 'Smoller et al., NIH PMC7237282 (2019), "A Major Role for Common Genetic Variation in Anxiety Disorders"',
  },
  {
    category: '손실 회피',
    data: '손실 가중치 약 2.25배 (λ = 2.25)',
    source: 'Tversky & Kahneman (1992), "Advances in Prospect Theory: Cumulative Representation of Uncertainty"; 개념 origin Kahneman & Tversky (1979)',
  },
  {
    category: '이중 프로세스',
    data: '시스템 1(정서 반응)과 시스템 2(분석 사고)의 처리 속도 차이',
    source: 'LeDoux (1996), "The Emotional Brain" / Daniel Kahneman (2011), "Thinking, Fast and Slow"',
  },
  {
    category: '사회적 불안',
    data: '학생 표본에서 사회적 상호작용 불안의 인지 왜곡 설명력 (R² = .46)',
    source: 'Khan, S., et al. (2021), "Cognitive Distortions and Social Interaction Anxiety", JPPS',
  },
  {
    category: '주의 증후군',
    data: 'CAS와 반추의 상관관계',
    source: 'Adrian Wells (2009), "Metacognitive Therapy for Anxiety and Depression"',
  },
  {
    category: '정서조절 전략',
    data: '부적응적 정서조절 전략(회피·억제·반추)의 일관된 효과크기',
    source: 'Aldao, Nolen-Hoeksema, & Schweizer (2010), "Emotion-regulation strategies across psychopathology", Clinical Psychology Review',
  },
  {
    category: '위험 회피 ≠ 손실 회피',
    data: '불안이 강한 사람들의 회피적 의사결정 — 결과 불확실성 민감도',
    source: 'Charpentier, Aylward, Roiser, & Robinson (2017), Biological Psychiatry, 81(12)',
  },
  {
    category: '환경 모델 보정',
    data: '특성 불안과 학습률 추정 편향',
    source: "Browning, Behrens, Jocham, O'Reilly, & Bishop (2015), \"Anxious individuals have difficulty learning the causal statistics of aversive environments\", Nature Neuroscience",
  },
  {
    category: '회피의 9년 곡선',
    data: '회피 대처 양식의 장기 지속 경과 예측 (9년 종단)',
    source: 'Struijs, Lamers, Vroling, Roelofs, Spinhoven, & Penninx (2017), Psychiatry Research',
  },
  {
    category: '두 종류의 결정 (tame/wild)',
    data: '정답 기준이 있는 길들여진 문제와 결과를 미리 알 수 없고 결정이 나를 바꾸는 야생의 문제 구분',
    source: 'Rittel, H. & Webber, M. (1973), "Dilemmas in a General Theory of Planning", Policy Sciences; Russ Roberts (2022), "Wild Problems"; L.A. Paul (2014), "Transformative Experience"',
  },
  {
    category: '예측 정확도 훈련 / 과신',
    data: '짧은 확률 추론 훈련의 예측 정확도(브라이어 점수) 개선 −6~11%, 4년 지속; 불안의 위협 과대예측',
    source: 'Tetlock & Mellers, Good Judgment Project (Cambridge/Judgment and Decision Making); Moore & Swift, overconfidence/calibration (UC Berkeley)',
  },
  {
    category: '사전부검 / 외부 관점',
    data: '사전부검의 실패 원인 식별 +약 30%; 외부 관점·기준율(base rate)을 통한 과신·계획오류 완화',
    source: 'Klein, G. (2007), HBR; Mitchell, Russo & Pennington (1989), prospective hindsight; Lovallo & Kahneman (2003), "Delusions of Success"',
  },
];

export default function OurPhilosophyPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-background">
      {/* 헤더 내비게이션 */}
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-[17px] font-extrabold tracking-tight text-primary"
          >
            BlueBird
          </button>
          <button
            onClick={() => router.push('/auth/signup')}
            className="text-sm font-semibold text-primary-fg bg-primary px-4 py-2 rounded-ctrl touch-manipulation active:scale-95 transition-transform hover:bg-primary-dark"
          >
            시작하기
          </button>
        </div>
      </header>

      {/* 히어로 — gradient 제거, manual 톤 정렬 */}
      <section className="bg-surface border-b border-background-tertiary">
        <div className="max-w-2xl mx-auto px-6 py-12 sm:py-16 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
            BlueBird Philosophy
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-text-primary tracking-tight">
            좋은 결정인지 나쁜 결정인지는 의지로 아는 게 아니라
            <br />
            <span className="text-primary">결과로 확인하는 것</span>입니다.
          </h1>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            BlueBird는 사용자가 내린 결정과 그때의 확신도를 미리 적어두었다가 실제 결과와 맞춰, 예측 정확도·복기 완료율을 시계열로 기록합니다. 본 페이지는 그 설계가 근거하는 연구 결과를 요약합니다.
          </p>
        </div>
      </section>

      {/* 섹션들 */}
      <div className="max-w-2xl mx-auto px-6 py-10 sm:py-12 space-y-6">
        {SECTIONS.map((section) => (
          <article
            key={section.number}
            className="bg-surface border border-background-tertiary rounded-card overflow-hidden"
          >
            {/* 섹션 헤더 */}
            <div className="px-6 pt-6 pb-4 border-b border-background-tertiary">
              <div className="flex items-start gap-4">
                <span className="text-xs font-bold text-primary bg-primary bg-opacity-5 px-2 py-1 rounded-md mt-0.5 flex-shrink-0">
                  {section.number}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-text-primary tracking-tight">{section.title}</h2>
                  <p className="text-sm text-text-tertiary mt-0.5">{section.subtitle}</p>
                </div>
              </div>
            </div>

            {/* 통계 카드 grid — gradient 제거, 분석가 톤 */}
            <div className="px-6 py-5 bg-background-secondary border-b border-background-tertiary">
              <div className="flex items-baseline gap-4">
                <p className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex-shrink-0">
                  {section.stat.value}
                </p>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-text-secondary leading-tight">
                    {section.stat.label}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">{section.stat.source}</p>
                </div>
              </div>
            </div>

            {/* 본문 — 결정 리프레임 리드 1줄 + 근거 1~2 문장 */}
            <div className="px-6 py-5 space-y-2">
              <p className="text-sm sm:text-base font-semibold text-text-primary leading-relaxed">
                {section.lead}
              </p>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                {section.body}
              </p>
            </div>
          </article>
        ))}

        {/* CTA — gradient 제거, 분석가 톤 */}
        <div className="bg-surface border border-primary border-opacity-30 rounded-2xl p-6 sm:p-8 space-y-4">
          <h3 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
            첫 결정 기록으로 자신의 예측 정확도를 측정해보세요
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            누적된 결정 기록은 예측 정확도·과신 경향·복기 완료율로 정리되어, 본인의 결정 방식을 객관화하는 자료가 됩니다.
          </p>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => router.push('/auth/signup')}
              className="w-full bg-primary text-primary-fg text-base font-semibold py-[17px] px-6 rounded-2xl touch-manipulation active:scale-95 transition-transform hover:bg-primary-dark"
            >
              가입하기
            </button>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full text-sm text-text-secondary hover:text-primary transition-colors py-2"
            >
              이미 계정이 있어요
            </button>
          </div>
        </div>

        {/* 출처 */}
        <div className="border border-background-tertiary rounded-card p-6 space-y-4 bg-surface">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">참고 문헌</p>
          <div className="space-y-3">
            {CITATIONS.map((c, i) => (
              <div key={i} className="space-y-0.5">
                <p className="text-xs font-medium text-text-primary">{c.category}</p>
                <p className="text-xs text-text-secondary">{c.data}</p>
                <p className="text-xs text-text-tertiary italic">{c.source}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 법적 공시 */}
        <section className="rounded-2xl border border-background-tertiary bg-background-secondary p-6 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">BlueBird 이용 안내</h2>
          <ul className="text-xs text-text-secondary space-y-2 list-disc pl-4">
            <li>BlueBird는 의료·치료 서비스가 아니며, 본 페이지의 연구 인용은 학술적 배경 정보일 뿐 본 서비스의 효과 보장 또는 임상적 효능 주장이 아닙니다. 진단·처방·치료를 대체하지 않습니다.</li>
            <li>지속적·심각한 어려움이 있으시면 전문가(정신건강의학과, 심리상담)의 도움을 받으시길 권해드립니다.</li>
            <li>위기 상황에서는 자살예방상담전화 1393, 정신건강위기상담 1577-0199로 연락하실 수 있습니다.</li>
            <li>작성하시는 내용은 AI 모델로 분석됩니다. 실명·연락처 등 민감 정보는 적지 않으시길 권합니다.</li>
          </ul>
          <a href="/safety/resources" className="inline-block text-xs text-primary underline">
            전체 자원 보기 →
          </a>
        </section>
      </div>
    </main>
  );
}
