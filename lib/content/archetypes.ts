import { DistortionType } from '@/types';

export type Archetype = {
  id: DistortionType;
  name: string;
  tagline: string;
  description: string;
};

export const ARCHETYPES: Record<DistortionType, Archetype> = {
  [DistortionType.CATASTROPHIZING]: {
    id: DistortionType.CATASTROPHIZING,
    name: '파국화형 시나리오 구축가',
    tagline: '최악을 먼저 계산하는 손실 추정자',
    description:
      '당신의 사고 시스템은 불확실한 상황을 마주할 때 가능한 모든 경로 중 가장 극단적인 손실 시나리오를 먼저 처리합니다. 이는 위험을 조기에 감지하려는 시스템 1의 생존 본능에서 비롯된 패턴입니다. 실제 발생 확률과 무관하게 최악의 결과를 기정사실로 처리하는 경향이 있어 현재의 고통이 실제 위험보다 과장되어 있을 가능성이 높습니다.',
  },
  [DistortionType.ALL_OR_NOTHING]: {
    id: DistortionType.ALL_OR_NOTHING,
    name: '완벽주의 이분법자',
    tagline: '중간 지대를 허용하지 않는 기준 설계자',
    description:
      '당신의 사고 시스템은 복잡한 현실을 성공과 실패, 두 개의 카테고리로 압축합니다. 이 이분법적 분류는 판단 속도를 높이지만 중간 지대에 존재하는 유의미한 성취 데이터를 손실로 처리하는 부작용을 낳습니다. 스펙트럼의 중간값을 인식하고 측정하는 훈련이 시스템 2 기동의 핵심 과제입니다.',
  },
  [DistortionType.EMOTIONAL_REASONING]: {
    id: DistortionType.EMOTIONAL_REASONING,
    name: '감정 기반 항법사',
    tagline: '느낌을 사실로 번역하는 내면 탐험가',
    description:
      '당신의 사고 시스템은 현재 감정 상태를 외부 현실의 증거로 처리합니다. "불안하다"는 신호가 "위험하다"는 사실 판단으로 직결되는 패턴입니다. 이는 내면 데이터에 민감한 고감도 처리 시스템의 특성이지만 감정(내부 신호)과 사실(외부 데이터)을 분리하지 못할 때 인지적 오류가 증폭됩니다.',
  },
  [DistortionType.PERSONALIZATION]: {
    id: DistortionType.PERSONALIZATION,
    name: '책임 과잉 수집가',
    tagline: '모든 원인을 자신에게서 찾는 귀인 추적자',
    description:
      '당신의 사고 시스템은 외부 사건의 원인을 분석할 때 환경 변수와 타인 변수를 과소평가하고 자신을 지나치게 큰 원인 변수로 처리합니다. 이는 통제감을 유지하려는 시스템 1의 시도이지만 실제 귀인 비율을 왜곡하여 불필요한 자기 비난을 생성합니다. 원인의 분산(variance)을 정량적으로 분해하는 습관이 핵심입니다.',
  },
  [DistortionType.ARBITRARY_INFERENCE]: {
    id: DistortionType.ARBITRARY_INFERENCE,
    name: '결론 선행 사고가',
    tagline: '증거보다 결론이 먼저인 직관의 소유자',
    description:
      '당신의 사고 시스템은 증거가 불충분한 상황에서도 부정적인 결론을 선제적으로 확정하는 패턴을 보입니다. 이는 빠른 의사결정을 위한 연상 기억의 활용이지만 반증 가능성을 배제한 채 결론을 고정함으로써 현실 인식을 왜곡합니다. 결론을 가설로 재분류하고 검증 데이터를 수집하는 프로세스가 필요합니다.',
  },
};
