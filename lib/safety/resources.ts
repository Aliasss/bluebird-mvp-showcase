import type { SafetyResource } from './types';

/**
 * 한국 내 공인 정신건강·위기 상담 자원.
 * 번호는 2026-04 기준. 매년 검증 필요.
 */
export const SAFETY_RESOURCES: SafetyResource[] = [
  {
    id: 'suicide-prevention-1393',
    name: '자살예방상담전화',
    phone: '1393',
    description: '자살 위기에 있는 분과 가족·지인 모두 이용 가능한 전문 상담',
    availability: '24시간',
    tags: ['suicide', 'general'],
  },
  {
    id: 'mental-health-1577-0199',
    name: '정신건강위기상담',
    phone: '1577-0199',
    description: '정신건강복지센터 연계 24시간 상담',
    availability: '24시간',
    tags: ['general'],
  },
  {
    id: 'youth-1388',
    name: '청소년전화',
    phone: '1388',
    webUrl: 'https://www.1388.go.kr/',
    description: '청소년 위기·정서 상담, 온라인 채팅 상담 병행',
    availability: '24시간',
    tags: ['youth', 'suicide', 'sms'],
  },
  {
    id: 'women-1366',
    name: '여성긴급전화',
    phone: '1366',
    description: '폭력·위기 상황 여성 상담',
    availability: '24시간',
    tags: ['women'],
  },
  {
    id: 'life-line-sms',
    name: '생명의전화 문자상담',
    sms: '1588-9191',
    webUrl: 'https://www.lifeline.or.kr',
    description: '전화 통화가 어려울 때 문자/온라인 상담',
    availability: '10:00~22:00',
    tags: ['suicide', 'sms'],
  },
];

export function getCriticalResources(): SafetyResource[] {
  return SAFETY_RESOURCES.filter((r) => r.tags.includes('suicide') || r.tags.includes('general'));
}
