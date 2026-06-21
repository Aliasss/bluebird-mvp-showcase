export type ManualSubItem = {
  label: string;
  text: string;
};

export type ManualSubSection = {
  id: string;
  title: string;
  body: string;
  items?: ManualSubItem[];
  debuggingQuestion?: string;
};

export type ManualPageSection = {
  id: string;
  navLabel: string;
  title: string;
  intro: string;
  subSections?: ManualSubSection[];
};

export const MANUAL_HEADER = {
  title: 'Bluebird Technical Manual',
  subtitle: '인지 운영 체제와 자율성 탈환을 위한 정밀 지침서',
} as const;

export const MANUAL_PREFACE = {
  id: 'preface',
  navLabel: '서문',
  paragraphs: [
    '인간의 정신은 수만 년에 걸친 진화의 결과물이지만 우리의 하드웨어는 현대 사회가 요구하는 복잡한 정보 처리 능력을 갖추도록 설계되지 않았습니다. 인류의 조상들이 초원에서 포식자를 피하기 위해 발달시킨 즉각적이고 생존 지향적인 사고 체계는 오늘날의 복잡한 인간관계와 비즈니스 환경에서는 오히려 불안과 인지적 왜곡을 양산하는 원인이 됩니다.',
    'Project Bluebird는 당신의 정신을 치료의 대상이 아닌 최적화의 대상으로 간주합니다. 우리가 겪는 대부분의 심리적 고통은 외부 환경의 부조리가 아니라 내부 데이터 처리 장치에서 발생하는 시스템 오류(Systemic Error)에서 기인합니다. 이 매뉴얼을 통해 당신은 자신의 사고 과정을 객관화하고 시스템의 주도권을 시스템 1(직관)에서 시스템 2(분석)로 탈환하는 법을 학습하게 될 것입니다.',
  ],
} as const;

export const MANUAL_SECTIONS: ManualPageSection[] = [
  {
    id: 'core-01',
    navLabel: '이중 프로세스 이론',
    title: '1. 사고 아키텍처: 이중 프로세스 이론 (Dual Process Theory)',
    intro:
      '다니엘 카너먼이 정의한 이중 프로세스 이론은 우리가 세상을 인식하고 판단하는 두 가지 근본적인 경로를 설명합니다. 이 두 시스템의 상호작용과 갈등을 이해하는 것이 인지 디버깅의 핵심입니다.',
    subSections: [
      {
        id: 'core-01-s1',
        title: '1.1 시스템 1 (The Automatic Pilot)',
        body: '시스템 1은 우리가 의식하지 않아도 24시간 백그라운드에서 작동하는 자동 조종 장치입니다. 직관적이고 즉각적이며 감정 중심적이고 무엇보다 인지적 에너지를 거의 소모하지 않습니다.',
        items: [
          { label: '학술 출처', text: 'Kahneman, D. (2011). Thinking, Fast and Slow, Part I~II. 본 시스템 분류는 본인이 약 30년간 수행한 직관적 판단·휴리스틱 연구의 통합 결과입니다.' },
          { label: '작동 원리', text: '연상 기억을 활용하여 패턴을 신속하게 인식합니다.' },
          { label: '장점', text: '긴급 상황에서 생존 가능성을 높이며 일상적인 단순 반복 작업을 효율적으로 처리합니다.' },
          { label: '단점', text: '통계적 사고에 취약하며 논리적 인과관계보다 일관성 있는 이야기를 선호하여 인지 왜곡을 빈번하게 생성합니다.' },
          { label: 'Bluebird 분석', text: '당신이 느끼는 근거 없는 공포와 즉각적인 자기 비난은 시스템 1이 불완전한 데이터를 바탕으로 내린 성급한 결론입니다.' },
        ],
      },
      {
        id: 'core-01-s2',
        title: '1.2 시스템 2 (The Rational Captain)',
        body: '시스템 2는 의도적인 주의 집중과 노력을 기울여야만 활성화되는 분석적 제어기입니다. 논리적 추론, 복잡한 계산, 통계적 판단을 담당합니다.',
        items: [
          { label: '작동 원리', text: '규칙 기반의 직렬 처리를 통해 정보를 분석합니다.' },
          { label: '장점', text: '시스템 1의 직관적 오류를 모니터링하고 수정할 수 있는 유일한 도구입니다.' },
          { label: '단점', text: '작동 속도가 느리고 막대한 정신적 에너지(포도당)를 소모합니다. 뇌는 본능적으로 에너지를 아끼려 하기 때문에 시스템 2를 최대한 끄고 있으려 합니다 (Cognitive Miser: 인지적 구두쇠).' },
          { label: 'Bluebird 분석', text: '우리의 모든 개입은 시스템 1의 자동적 루프를 차단(Circuit Breaking)하고 잠들어 있는 시스템 2를 강제로 기동시켜 데이터의 무결성을 검토하게 하는 데 목적이 있습니다.' },
        ],
      },
    ],
  },
  {
    id: 'dyn-02',
    navLabel: '전망이론',
    title: '2. 의사결정의 수학적 모델: 전망이론 (Prospect Theory)',
    intro:
      '우리가 왜 특정한 상황에서 비합리적으로 고통스러워하는지 그리고 왜 낮은 확률의 불행에 집착하는지는 전망이론을 통해 수학적으로 설명될 수 있습니다. 본 이론으로 카너먼은 2002년 노벨 경제학상을 수상했습니다.',
    subSections: [
      {
        id: 'dyn-02-s1',
        title: '2.1 준거점 의존성 (Reference Point Dependence)',
        body: '인간의 가치 판단은 절대적인 수치가 아니라 주관적으로 설정된 기준점 즉 준거점을 중심으로 이루어집니다.',
        items: [
          { label: '고통의 원천', text: '당신이 현재 불행하다고 느끼는 이유는 객관적인 상황이 나빠서가 아니라 당신의 준거점이 비현실적으로 높은 곳(완벽한 나, 타인과의 비교, 과거의 영광)에 고착되어 있기 때문입니다.' },
          { label: '디버깅 전략', text: 'Bluebird는 당신이 무의식적으로 설정한 준거점을 찾아내어 현재의 데이터에 기반한 합리적 위치로 재조정(Re-anchoring)합니다.' },
        ],
      },
      {
        id: 'dyn-02-s2',
        title: '2.2 손실 회피 (Loss Aversion)',
        body: '인간은 이득에서 얻는 기쁨보다 손실에서 느끼는 고통을 약 2.25배 더 강력하게 인지합니다.',
        items: [
          { label: '학술 정수 λ ≈ 2.25', text: '본 비대칭 계수는 Kahneman & Tversky (1979) Econometrica 논문에서 실험적으로 도출된 값입니다. 같은 크기의 이득보다 손실에 약 2.25배 더 민감하게 반응한다는 의미이며, 이후 다수 후속 연구에서 일관되게 재현되었습니다.' },
          { label: '시스템 오류', text: '이러한 비대칭성 때문에 우리는 작은 부정적인 신호에도 과도하게 민감하게 반응하며 이는 파국화(Catastrophizing)의 강력한 엔진이 됩니다.' },
          { label: '시각화 지표', text: '가치 함수 곡선에서 당신의 심리적 위치가 얼마나 가파른 손실 영역에 위치해 있는지 시각화함으로써 당신이 느끼는 고통이 실제 손실 규모보다 과장되어 있음을 증명합니다.' },
        ],
      },
      {
        id: 'dyn-02-s3',
        title: '2.3 확률 가중치와 파국화 (Probability Weighting)',
        body: '인간의 뇌는 객관적 확률을 있는 그대로 받아들이지 못하고 주관적으로 왜곡합니다. 특히 발생 가능성이 매우 낮은 극단적인 부정적 사건에 과도한 가중치를 부여합니다.',
        items: [
          { label: '파국화의 메커니즘', text: '시스템 1은 0.01%의 위험을 마치 50%의 위험처럼 인식하여 공포 신호를 보냅니다.' },
          { label: '데이터 보정', text: 'Bluebird는 당신의 주관적 확률을 베이지안 업데이트(Bayesian Update)와 객관적 통계 데이터(Base Rate)를 통해 재보정하여 당신의 불안이 통계적으로 얼마나 타당하지 않은지 증명합니다.' },
        ],
      },
    ],
  },
  {
    id: 'dbug-03',
    navLabel: '인지 오류 분류',
    title: '3. 인지 오류 분류: 시스템 에러 디버깅',
    intro:
      '당신의 사고 로그에서 반복적으로 나타나는 주요 소프트웨어 에러들을 정의합니다. 에러에 이름을 붙이는 행위 자체가 이미 시스템 2의 개입을 시작하는 것입니다. 본 5종 분류는 인지치료의 창시자 아론 벡(Aaron Beck)이 정의한 인지 왜곡 분류 체계를 따릅니다.',
    subSections: [
      {
        id: 'dbug-03-s1',
        title: '3.1 임의적 추론 (Arbitrary Inference): 근거 부족 결론 에러',
        body: '결론을 뒷받침할 만한 확실한 근거가 없거나, 오히려 반대되는 증거가 있음에도 불구하고 부정적인 결론을 미리 확정 지어버리는 인지적 오류입니다.',
        items: [
          { label: '마음 읽기 (Mind Reading)', text: '상대의 속마음을 다 안다는 듯이 "나를 무시하는 게 분명해"라고 단정 짓는 것입니다.' },
          { label: '점쟁이 오류 (Fortune Telling)', text: '미래를 다 안다는 듯이 "이번에도 보나 마나 실패할 거야"라고 예언하는 것입니다.' },
        ],
        debuggingQuestion: '"지금 내리고 있는 그 결론은 사실인가요, 아니면 뇌가 빠르게 만들어낸 가설인가요?"',
      },
      {
        id: 'dbug-03-s2',
        title: '3.2 파국화 (Catastrophizing): 최악이라는 시나리오 에러',
        body: '작은 부정적 단서를 바탕으로 최악의 파멸적인 결론으로 논리적 비약을 하는 상태입니다.',
        items: [
          { label: '분석', text: '시스템 1이 미래의 불확실성을 감당하지 못해 가장 자극적인 손실 시나리오를 확정적 사실로 처리하는 오류입니다.' },
        ],
        debuggingQuestion: '"이 사건이 파멸로 이어지기 위해 필요한 중간 단계들의 객관적 확률은 각각 얼마인가?"',
      },
      {
        id: 'dbug-03-s3',
        title: '3.3 흑백논리 (Dichotomous Thinking): 데이터 이진화 에러',
        body: '현실의 복잡한 스펙트럼을 무시하고 성공 아니면 실패, 내 편 아니면 적이라는 두 가지 카테고리로만 분류하는 오류입니다.',
        items: [
          { label: '분석', text: '중간 지대의 유의미한 성취 데이터를 무시함으로써 심리적 엔트로피를 높이고 자아 존중감을 고갈시킵니다.' },
        ],
        debuggingQuestion: '"성공과 실패 사이의 회색 지대에 존재하는 데이터 3가지는 무엇인가?"',
      },
      {
        id: 'dbug-03-s4',
        title: '3.4 감정적 추론 (Emotional Reasoning): 데이터 타입 혼동 에러',
        body: '주관적인 감정(Feeling)을 객관적인 사실(Fact)로 오인하는 오류입니다.',
        items: [
          { label: '분석', text: '"내가 불안을 느끼기 때문에 이 상황은 위험하다"라는 논리는 데이터 타입이 다른 정보를 인과관계로 연결한 심각한 시스템 에러입니다.' },
        ],
        debuggingQuestion: '"내 불안이라는 감정을 배제했을 때 외부 상황에 존재하는 객관적 위험 데이터는 무엇인가?"',
      },
      {
        id: 'dbug-03-s5',
        title: '3.5 개인화 (Personalization): 귀인 오류',
        body: '자신과 무관하거나 통제할 수 없는 외부 사건을 전적으로 자신의 책임이나 가치 문제로 돌리는 오류입니다.',
        items: [
          { label: '분석', text: '환경적 변수와 타인의 변수를 무시하고 오직 자신이라는 변수만을 입력값으로 사용하는 논리적 협소함입니다.' },
        ],
        debuggingQuestion: '"이 사건에 영향을 준 외부 변수(타인, 타이밍, 환경) 5가지를 리스트업하라."',
      },
    ],
  },
  {
    id: 'meta-04',
    navLabel: '메타인지와 CAS',
    title: '4. 메타인지와 CAS: 인지적 통제권의 확보',
    intro:
      '단순히 생각을 바꾸는 것을 넘어 생각하는 방식(Process) 자체를 최적화해야 합니다. CAS(Cognitive Attentional Syndrome)는 메타인지 치료의 창시자 에이드리언 웰스(Adrian Wells)가 정의한 개념으로, 불안·우울이 내용이 아닌 처리 방식에 의해 유지된다는 핵심 명제를 담고 있습니다.',
    subSections: [
      {
        id: 'meta-04-s1',
        title: '4.1 인지적 주의 증후군 (CAS: Cognitive Attentional Syndrome)',
        body: '불안과 우울은 특정한 생각의 내용보다 그 생각을 처리하는 방식인 반추(Rumination)와 걱정(Worry)에 의해 유지됩니다.',
        items: [
          { label: '시스템 고착', text: '시스템 1이 위협 신호를 반복적으로 재생하며 시스템 2의 주의 자원을 독점하는 상태입니다.' },
          { label: 'Bluebird의 개입', text: '반추가 문제를 해결하는 데 도움이 되지 않는다는 데이터를 제시하여 주의 자원을 현재의 과업으로 강제 재배치합니다.' },
        ],
      },
      {
        id: 'meta-04-s2',
        title: '4.2 탈중심화 (Decentering): 관찰자 시점의 확립',
        body: '자신의 생각을 \'나 자신\'이 아닌 마음이라는 공간을 지나가는 일시적인 데이터(Event)로 인식하는 기술입니다.',
        items: [
          { label: '목표', text: '"나는 실패자다"라는 생각을 "나는 내가 실패자라는 생각을 하고 있다"로 변환하는 것입니다. 이 미세한 언어적 전환이 관리자 권한을 획득하는 핵심입니다.' },
        ],
      },
    ],
  },
  {
    id: 'goal-05',
    navLabel: '실존적 자율성',
    title: '5. 최종 목표: 실존적 자율성 (Existential Agency)',
    intro:
      'Project Bluebird의 지향점은 감정이 없는 로봇이 되는 것이 아닙니다. 자신의 인지 아키텍처를 명확히 이해하고 시스템 1의 자동적 반응에 휘둘리지 않으며 데이터와 논리에 기반하여 자신의 삶을 직접 선택하고 집행하는 상태입니다.',
    subSections: [
      {
        id: 'goal-05-s1',
        title: '5.1 부조리와 주체성',
        body: '알베르 카뮈가 말했듯 세상은 본질적으로 부조리하고 불확실합니다. 하지만 그 부조리함을 명확히 인식(Lucidity)하고 그럼에도 불구하고 자신의 의지로 선택을 내리는 것만이 인간의 유일한 존엄성이자 자율성입니다.',
      },
      {
        id: 'goal-05-s2',
        title: '5.2 자율성 인프라의 구축',
        body: 'Bluebird는 당신의 사고 과정을 투명하게 시각화하여 보여줌으로써 당신이 환경의 자극에 반응하는 객체가 아니라 환경을 분석하고 선택하는 주체가 되도록 돕습니다. 당신의 뇌는 당신의 명령을 수행하는 도구여야 합니다. 주도권을 탈환하십시오.',
      },
    ],
  },
  {
    id: 'sdt-06',
    navLabel: '자기결정성과 자율성 측정',
    title: '6. 자기결정성 이론과 자율성 측정: Self-Determination Theory',
    intro:
      '자율성(autonomy)은 외부 압력이 아닌 자신의 의지로 행동을 개시하고 표현하는 상태입니다. Project Bluebird는 사용자가 자기 사고를 디버깅하는 사이클에서 얼마나 자율적으로 행동했는지를 정량화하기 위해 자기결정성 이론을 측정 도구로 채택했습니다.',
    subSections: [
      {
        id: 'sdt-06-s1',
        title: '6.1 자기결정성 이론과 3대 기본 욕구',
        body: '인간 동기를 외재적 규제(External Regulation)에서 내재적 동기(Intrinsic Motivation)로 이어지는 스펙트럼으로 모델링한 이론입니다. Deci와 Ryan은 자율적 동기를 강화하기 위한 3대 기본 심리욕구를 제안했습니다.',
        items: [
          { label: '학술 출처', text: 'Deci, E. L., & Ryan, R. M. (2000). Psychological Inquiry, 11(4), 227-268. 보충: Ryan, R. M., & Deci, E. L. (2017). Self-Determination Theory: Basic Psychological Needs in Motivation, Development, and Wellness. Guilford Press.' },
          { label: 'Autonomy (자율성)', text: '자기 의지로 행동을 개시(initiation)하고 표현(expression)하는 능력입니다. 외부 보상·압력이 아닌 자신의 가치에서 출발한 행동입니다.' },
          { label: 'Competence (유능성)', text: '환경과 효과적으로 상호작용한다는 감각입니다.' },
          { label: 'Relatedness (관계성)', text: '타인과 의미 있게 연결되어 있다는 감각입니다.' },
          { label: 'Bluebird의 측정 범위', text: '3대 욕구 중 autonomy만 측정합니다. relatedness는 1인 도구라는 카테고리 정의와 충돌하며, competence는 자칫 유능감 부여형 게임화로 미끄러질 위험이 있어 의도적으로 비측정합니다.' },
        ],
      },
      {
        id: 'sdt-06-s2',
        title: '6.2 자율성 지수',
        body: '사용자가 1회 디버깅 사이클을 얼마나 적극적으로 통과했는가를 측정합니다. 게임화 카운터가 아니라 SDT autonomy 차원에 정렬된 정량 지표입니다.',
        items: [
          { label: 'Autonomy 매핑', text: '개시(initiation)는 소크라테스 질문에 직접 답한 횟수로, 표현(expression)은 완료 노트 작성 여부로 매핑됩니다. 점수는 오직 사용자 자기 행위에서만 누적됩니다.' },
          { label: 'Bluebird의 측정 범위', text: 'autonomy 차원만 측정합니다. 외부 보상이나 평가가 아닌 사용자가 직접 수행한 자기 검증·자기 표현 행위만 점수에 반영됩니다.' },
          { label: '한계효용 cap', text: '답변 횟수가 일정 수준을 넘어가면 한계효용 체감과 시간 비용을 반영해 cap을 둡니다. 학술적 정수가 아닌 운용 합의 값입니다.' },
        ],
      },
    ],
  },
  {
    id: 'dec-07',
    navLabel: '결정의 두 종류와 예측 맞춰보기',
    title: '7. 결정의 두 종류와 예측 맞춰보기',
    intro:
      '모든 결정을 같은 방식으로 다룰 수는 없습니다. 어떤 결정은 결과를 확인하고 예측과 맞춰볼 수 있지만, 어떤 결정은 결과를 미리 알 수 없고 결정 자체가 우리를 바꿔놓습니다. 이 장은 두 종류의 결정을 가르는 기준과, 각각에 맞는 사고 도구를 다룹니다. 핵심 메시지는 "예측 정확도를 높이는 것"과 "예측할 수 없음을 받아들이는 것"이 서로 다른 결정에 필요한 서로 다른 기술이라는 점입니다.',
    subSections: [
      {
        id: 'dec-07-s1',
        title: '7.1 길들여진 문제와 야생의 문제 (Tame vs Wild)',
        body: '호르스트 리텔과 멜빈 웨버(1973)는 정답 기준이 존재하고 알고리즘으로 풀 수 있는 "길들여진(tame)" 문제와, 정식화 자체가 어렵고 답이 옳고/그름이 아니라 좋음/나쁨이며 각 사례가 본질적으로 유일한 "고약한(wicked)" 문제를 구분했습니다. 러스 로버츠는 이를 결혼·출산·직업 전환·이주처럼 개인의 인생을 정의하는 결정에 적용해 "야생의 문제(wild problems)"라 불렀고, L.A. 폴은 그런 결정이 두 가지 의미에서 변혁적이라고 논증했습니다 — 겪어보기 전에는 "그게 어떤 것인지"를 알 수 없고, 겪고 나면 선호와 정체성 자체가 바뀝니다.',
        items: [
          { label: '학술 출처', text: 'Rittel, H. & Webber, M. (1973). "Dilemmas in a General Theory of Planning", Policy Sciences. / Russ Roberts (2022). Wild Problems: A Guide to the Decisions That Define Us. / L.A. Paul (2014). Transformative Experience, Oxford University Press.' },
          { label: '핵심 구분', text: '길들여진 문제는 반복되고 결과를 관측할 수 있어 빈도·기준율을 적용할 수 있습니다. 야생의 문제는 n=1이라 "비슷한 10명" 표본이 의미를 잃고, 결과를 원리적으로 미리 알 수 없습니다.' },
          { label: '왜 중요한가', text: '야생의 문제에 길들여진 도구(확률·기준율·점수)를 들이대면 알 수 없는 것에 숫자를 붙여 통제감을 위조하는 "가짜 정밀(false precision)"에 빠집니다. 이는 시스템 1이 불확실성을 견디지 못해 만들어내는 함정입니다.' },
          { label: 'Bluebird 적용', text: '되돌릴 수 있고 결과를 확인할 수 있는 결정은 결과로 맞춰보는 트랙으로, 되돌릴 수 없고 나를 바꾸는 결정은 일부러 점수를 매기지 않는 트랙으로 분기합니다. 후자에서는 정확도가 아니라 "어떤 가치를 체현하는가 / 되돌릴 수 있는가 / 어느 쪽을 더 후회할까"를 다룹니다.' },
        ],
        debuggingQuestion: '지금 이 결정은 나중에 결과를 확인하고 "맞았다/빗나갔다"라고 말할 수 있는 결정인가, 아니면 결과를 미리 알 수 없고 나 자신을 바꿔놓는 결정인가?',
      },
      {
        id: 'dec-07-s2',
        title: '7.2 예측 맞춰보기: 불안의 위협 과대예측 다루기',
        body: '필립 테틀록의 굿 저지먼트 프로젝트는 1시간 미만의 확률 추론 훈련만으로 예측 정확도(브라이어 점수)가 통제군 대비 6~11% 향상되고 그 효과가 4년간 지속됨을 보였습니다. 불안할 때 시스템 1은 위협과 후회가 일어날 가능성을 체계적으로 크게 예측합니다. 예측 맞춰보기(학술 용어로는 캘리브레이션·calibration)는 확신도를 숫자로 적어두었다가 실제 결과와 빈도로 맞춰, "내가 80%라 확신했던 일이 실제로는 60%만 일어났다"는 간격을 데이터로 비춰주는 작업입니다.',
        items: [
          { label: '학술 출처', text: 'Tetlock, P. & Mellers, B., Good Judgment Project (Developing Expert Political Judgment, Judgment and Decision Making). / Moore, D. & Swift, 과신·캘리브레이션 연구 (UC Berkeley). / Brier, G. (1950), proper scoring rule.' },
          { label: '작동 원리', text: '단순히 결과만 기록하는 것으로는 약합니다. 동력은 개인화된 빈도-대조 피드백과 반복 연습입니다(Morewedge 2015). 원점수보다 "내 70%는 실제로 몇 %였나"라는 해석이 사용자에게 더 유용합니다.' },
          { label: '근거 강도(정직 표기)', text: '확률 추론 훈련의 정확도 개선은 토너먼트 단위로 입증된 강한 근거입니다. 반면 편향을 "가르쳐서 자각시키는" 교육형 디바이어싱은 메타분석상 효과가 작고(g=0.26) 실생활 전이가 약합니다 — 그래서 가르치기보다 결정 시점의 강제 프롬프트(결정 위생)로 구현합니다.' },
          { label: '경계', text: '예측 맞춰보기는 분포는 알고 결과만 모르는 "불확실성"을 다루는 도구입니다. 분포·가치·미래 자아의 선호를 원리적으로 알 수 없는 야생의 문제(7.1)에서는 의도적으로 끕니다.' },
        ],
        debuggingQuestion: '나는 이 일이 일어날 가능성을 몇 %로 보고 있는가, 그리고 그 숫자는 실제 사실에 근거한 것인가 아니면 지금의 불안이 그려낸 것인가?',
      },
      {
        id: 'dec-07-s3',
        title: '7.3 사전부검과 외부 관점: 과신의 사각지대 줄이기',
        body: '게리 클라인의 사전부검(premortem)은 "1년 뒤 이 결정이 이미 실패했다"고 확정 과거형으로 가정한 뒤 그 이유를 거꾸로 적게 하는 방법입니다. 미래의 한 시점을 가정하면 위험이 더 구체적으로 떠오릅니다. 대니얼 카너먼과 댄 로발로의 외부 관점(outside view)은 "이번 건은 특별하다"는 내부 시선을 내려놓고 "비슷한 상황의 사람들은 보통 어땠나"라는 기준율(base rate)을 보게 합니다.',
        items: [
          { label: '학술 출처', text: 'Klein, G. (2007). "Performing a Project Premortem", Harvard Business Review. / Mitchell, Russo & Pennington (1989), prospective hindsight (전망적 사후판단). / Lovallo, D. & Kahneman, D. (2003). "Delusions of Success", HBR.' },
          { label: '사전부검 효과', text: '전망적 사후판단은 실패 원인 식별을 약 30% 늘린다고 보고됩니다(Mitchell et al. 1989). 떠오른 위험마다 "만약 ~하면, 그러면 ~한다"는 실행의도(Gollwitzer)를 붙이면 결정 후 번복을 줄일 수 있습니다.' },
          { label: '외부 관점', text: '계획오류와 과신은 가장 강건한 판단 편향 중 하나입니다. 기준율을 묻는 한 문항("비슷한 상황 10명 중 몇 명이 잘 됐나")이 자기예외화를 약화시킵니다.' },
          { label: '근거 강도(정직 표기)', text: '사전부검·외부 관점의 기저 기제는 근거가 견고하지만, 실무 틀 그 자체를 검증한 무작위 대조 실험(RCT)은 드뭅니다. 따라서 "검증된 기법"이 아니라 "근거 있는 기제를 쓰기 쉽게 묶은 절차"로 표현하는 것이 정확합니다.' },
        ],
        debuggingQuestion: '1년 뒤 이 결정이 실패했다고 가정하면, 가장 그럴듯한 이유 세 가지는 무엇이고 — 지금 그중 하나라도 줄일 방법이 있는가?',
      },
    ],
  },
];

// 기존 컴포넌트 호환용 (prospect value chart 섹션에서 사용)
export const PROSPECT_THEORY_CHART_NOTE =
  '전망 이론 가치 함수 — S-curve 시뮬레이션 (Prospect Theory Value Function)';
