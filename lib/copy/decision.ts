// 결정 입력 화면 AI 전송·민감정보 안내 단일 출처 (SSOT).
// 배포게이트 ②-A (2026-06-06) — /decision 진입 화면 상시 노출.
// 분석가·가이드 톤 / 금지 어휘(진단·탐지·치료·교정·판정) 미사용.

export const DECISION_INPUT_NOTICE =
  '이 결정 내용은 인지 패턴 점검을 위해 AI 모델로 분석됩니다. 실명·연락처 등 본인이나 타인의 민감 정보는 적지 말아주세요. 상황은 익명화해 적어도 점검에는 충분합니다.';

// Wild(되돌리기 어려운 결정) 트랙 진입 역할 선언 — wild-values 스텝 상단 1회 노출.
// Wild 적극 구조화 1단계. BlueBird 는 답을 좁히지 않고 '생각의 구조'만 제공한다는 경계를
// 사용자에게 진입 시점에 명시(분석가 톤 / 위로·판정·의료기기 어휘 미사용).
export const WILD_ROLE_NOTICE =
  'BlueBird는 어떤 결정을 내릴지 답을 드리지 않아요. 당신이 이미 가진 답을 꺼내기 쉽게 생각의 구조만 정리해 드립니다.';

// Wild ② 자기분류 프레이밍 헤더 — '불안(불확실)' vs '진짜 후회'를 사용자가 *스스로* 가르도록
// 하는 사실·구조 진술. ⚠️ 시스템이 분류·판정하지 않는다(이건 불안입니다 류 금지). 위로 아님.
export const WILD_WORRY_SPLIT_HEADER =
  '망설임을 두 가지로 나눠볼게요. 결과를 몰라서 드는 불안과 정말 후회할 것 같은 건 다를 수 있어요.';

// 자기분류 두 칸 라벨(모두 선택·빈칸 허용). 사용자가 어느 칸에 적든 그대로 저장 — 판정 없음.
export const WILD_UNCERTAINTY_WORRY_LABEL = '결과를 미리 알 수 없어서 드는 불안은?';
export const WILD_ANTICIPATED_REGRET_LABEL = '결과와 상관없이 정말 후회할 것 같은 건?';

// 가짜 양자택일 깨기(선택·접이식) — '이게 정말 둘 중 하나인가?' 선택지 재구성 질문.
// Wild 적극 구조화 4단계. 답·대안을 제시하지 않고 질문만 — 사용자가 스스로 선택지를 다시 본다.
export const WILD_FALSE_DICHOTOMY_LABEL = '지금 떠올린 선택지가 전부일까요?';

// ── 복기 미리보기 카드 (preview-activation, tame 전용·노출군만) ──────────────────
// 봉인 직후 "검토일에 무엇을 보게 되는지"를 *예시*로 미리 보여 재방문 동기를 첫 세션에 형성.
// 분석가 톤 / 위로·의료·조언 어휘 미사용. 점수형 미리보기 아님 — 세 시나리오 *예시* 프레이밍.
// ⚠️ 실제 복기 카피(review/page.tsx DIRECTION_TEXT)를 그대로 쓰지 않고 '예시'용으로 각색.
export const DECISION_PREVIEW_HEADER = '검토일이 되면, 여기서 이런 걸 보게 돼요';
export const DECISION_PREVIEW_BETTER =
  '예상보다 잘 풀렸으면 — 불안이 실제보다 위협을 크게 그렸다고 보여드려요.';
export const DECISION_PREVIEW_ASEXPECTED =
  '예상과 비슷했으면 — 이번엔 예측과 실제가 가까웠다고 보여드려요.';
export const DECISION_PREVIEW_WORSE =
  '예상보다 안 좋았으면 — 이번엔 실제가 예측보다 무거웠다고 보여드려요.';
export const DECISION_PREVIEW_FOOT = '검토일에 다시 와서 결과를 적으면 위처럼 알려드려요.';
