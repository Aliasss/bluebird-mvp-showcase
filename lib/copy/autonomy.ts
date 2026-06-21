// 자율성 지수·고통 변화량 관련 카피 단일 출처 (SSOT).
// 2026-05-16 검토 — 4 사용처 (dashboard/insights/action/me) 동일 텍스트
// 하드코딩 → 본 파일 import. 향후 변경 시 1곳만 수정.
//
// 분석가 톤 정합 (lib/copy + lint-copy 카피 가드 통과). 학술 인용은 매뉴얼·
// /our-philosophy에 별도 surface — tooltip은 즉시 이해되는 짧은 설명만.

export const AUTONOMY_SCORE_TOOLTIP =
  '검증 답변과 노트 작성으로 행사한 자율성 누적 점수. 자세한 근거는 매뉴얼 참조.';

export const DELTA_PAIN_WEEKLY_TOOLTIP =
  '재평가에서 고통 변화량만 양수로 누적. 음수(고통 증가)는 0으로 처리.';
