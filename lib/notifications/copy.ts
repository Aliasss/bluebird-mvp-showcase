/**
 * 알림 카피 단일 출처.
 * 본 파일의 export 외에 알림 문구를 코드 내에 인라인 작성 금지.
 * scripts/lint-copy.ts가 본 파일 export를 기준으로 검증.
 *
 * 톤: 분석/관찰 (BlueBird 정체성). 정서·응원·항해 메타포·이모지 금지.
 */

export const CHECKIN_REMINDER_PUSH = {
  title: '오늘 체크인 안 됐어요',
  body: '1분이면 한 줄 남길 수 있어요. 지난 7일과 비교 데이터가 쌓입니다.',
  // ?src=push: /checkin 진입 시 push_clicked 이벤트 기록 트리거
  url: '/checkin?src=push',
  tag: 'checkin-reminder',
} as const;

/**
 * 결정별 1회성 복기 리마인더 푸시(Task 8b).
 * review_at 도래 시 결정당 정확히 1회 발송. 중립/관찰 톤 — 압박·streak·점수·축하 없음.
 * url 의 <id> 는 발송 시점에 해당 결정 로그 id 로 치환된다.
 */
export const DECISION_REVIEW_REMINDER_PUSH = {
  title: '기록해둔 결정을 다시 볼 시간이에요',
  body: '예상과 실제가 어땠는지 확인해보세요.',
  tag: 'decision-review-reminder',
} as const;

export const ENABLE_PUSH_CARD = {
  title: '매일 21시, 체크인 안 한 날만 알려드릴게요',
  body: '오늘처럼 한 줄을 기록하면 데이터가 쌓입니다.',
  ctaPrimary: '지금 켜기',
  ctaSecondary: '나중에',
  toastGranted: '켰습니다. 21시에 안 했으면 알림이 와요.',
  toastDenied:
    '알림이 차단되었어요. 브라우저 설정에서 푸시를 허용해야 다시 켤 수 있어요.',
} as const;

export const ENABLE_PUSH_BANNER = {
  text: '21시 미체크인 알림 켜기 — Streak 보호',
  cta: '켜기',
} as const;

export const ME_TOGGLE_LABEL = '21시 체크인 알림';
