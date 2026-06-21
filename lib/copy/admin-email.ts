// 운영자가 선발자에게 보내는 안내 메일 본문 SSOT — 2026-05-18.
//
// 사용처: /admin/applications 카드의 "선발 안내 메일 보내기" 버튼.
// 운영자 본인의 메일 클라이언트(Gmail 등) 에서 발송 — 외부 SMTP 인프라 불요.
//
// ⚠️ mailto 길이 한계 (2026-06-09 버그 수정):
//   본문(~600자 한국어)을 mailto URL에 percent-encode 하면 4000자+ → 브라우저/OS의
//   mailto 길이 한계(약 2000자)를 초과해 클릭 시 *조용히 무반응*이 된다.
//   → 해결: mailto에는 제목만 담아(buildMailtoSubjectOnly) 메일앱을 열고,
//      본문(buildSelectionEmailBody/buildDirectApprovalEmailBody)은 클립보드로 복사.
//      운영자는 열린 메일 본문에 붙여넣기(⌘V)한다.
//
// 톤: 분석가적 + 친절. PIPA·legal review 정합 — 의료·치유 어휘 0, 과장 0.

import { SERVICE_CONTACT_EMAIL } from './contact';

const SIGNUP_URL = 'https://bluebird-mvp.vercel.app/auth/signup';

export const SELECTION_EMAIL_SUBJECT =
  '[BlueBird] MVP 에반젤리스트 선발 안내 — 가입 진행 요청';

/**
 * 응모 → 선발 흐름에서 사용. 응모 시 입력한 이메일과 동일하게 가입할 것을 강조.
 */
export function buildSelectionEmailBody(recipientEmail: string): string {
  return [
    `안녕하세요.`,
    ``,
    `BlueBird MVP 에반젤리스트로 선발되셨습니다.`,
    `입력해주신 답변을 검토한 결과, 함께 2주간 MVP를 사용하고 서면 리포트를 공유해주실 분으로 모셨습니다.`,
    ``,
    `[먼저 한 가지 안내드립니다]`,
    `BlueBird는 '심리 문제'에 집중하는 일반적인 심리 상담·명상 서비스와 달리 '개인의 의사결정'에 대한 문제의식에서 시작한 서비스입니다.`,
    `(1) 인지왜곡으로 인한 불안이 삶의 크고 작은 의사결정에 악영향을 미치는 것을 경계하며, 그러한 악영향을 해소함으로써 '의사결정의 주권'을 회복시키는 것이야말로 BlueBird가 지향하는 궁극적인 가치입니다.`,
    `(2) 또한, 의사결정의 대상이 되는 '문제'를 추상적인 언어가 아닌 구체화된 문장으로 분해합니다. 정답이 있는 문제와 정답이 없는 문제로 쪼개고, 각 문제를 대하는 사용자의 정보 처리 과정에 개입합니다.`,
    ``,
    `서비스를 이용하시는 동안 상시로 기능이 변경되거나 UI가 변화될 수 있습니다.`,
    `BlueBird는 아직 MVP 단계이며 틈틈이 서비스를 고도화하는 과정이므로 양해의 말씀 먼저 드립니다.`,
    ``,
    `[다음 단계]`,
    `1) 본 메일을 받으신 이메일(${recipientEmail})로 가입해주세요.`,
    `   가입 페이지: ${SIGNUP_URL}`,
    `2) 이메일 인증 후 바로 서비스 이용이 가능합니다.`,
    `3) 2주 사용 후 서면 리포트 양식을 별도로 안내드립니다.`,
    ``,
    `※ 다른 이메일로 가입하시면 서비스 진입이 차단됩니다. 반드시 이 메일을 받은 이메일과 동일하게 가입해주세요.`,
    ``,
    `문의·답신: ${SERVICE_CONTACT_EMAIL}`,
    ``,
    `감사합니다.`,
    `BlueBird MVP 운영자 드림`,
  ].join('\n');
}

/**
 * 응모 페이지 거치지 않고 가입만 한 사용자를 직접 승인했을 때 사용.
 * (운영자 재량 승인 케이스 — 가입 동의에 따른 환영 + 다음 단계 안내)
 */
export function buildDirectApprovalEmailBody(recipientEmail: string): string {
  return [
    `안녕하세요.`,
    ``,
    `BlueBird MVP 가입을 환영합니다.`,
    `폐쇄 베타 운영 기간이지만, 본 계정(${recipientEmail})에 대해 운영자 검토를 통해 서비스 이용 권한을 부여했습니다.`,
    ``,
    `[먼저 한 가지 안내드립니다]`,
    `그동안 BlueBird가 다뤄온 "불안한 생각"은 그대로 있습니다. 거기에 더해, 이제는 그 불안이 흔드는 "결정"까지 따라가 결과로 확인하는 쪽으로 넓어졌습니다.`,
    `"이 일을 그만둘까", "이 관계를 정리할까" 같은 결정을 적을 때 얼마나 확신하는지 함께 남겨 두면, 나중에 실제 결과와 맞춰 봅니다. 다만 되돌릴 수 없는 큰 결정은 일부러 점수 매기지 않아요. 없어진 기능은 없고, 쓸 수 있는 게 넓어졌다고 보시면 됩니다.`,
    ``,
    `[다음 단계]`,
    `1) 이미 가입된 상태이므로 로그인 후 바로 서비스 이용이 가능합니다.`,
    `   대시보드: https://bluebird-mvp.vercel.app/dashboard`,
    `2) 사용 중 의견이나 문의는 아래 이메일로 보내주세요.`,
    ``,
    `문의·답신: ${SERVICE_CONTACT_EMAIL}`,
    ``,
    `감사합니다.`,
    `BlueBird MVP 운영자 드림`,
  ].join('\n');
}

/**
 * 제목만 담은 짧은 mailto URL. 본문은 별도 클립보드 복사로 전달한다.
 * (본문을 URL에 넣으면 4000자+ → mailto 길이 한계 초과로 무반응이 되므로 분리.)
 * 수신자는 mailto 표준대로 literal 유지(@ 비인코딩), 제목만 percent-encode.
 */
export function buildMailtoSubjectOnly(recipientEmail: string): string {
  const subject = encodeURIComponent(SELECTION_EMAIL_SUBJECT);
  return `mailto:${recipientEmail}?subject=${subject}`;
}
