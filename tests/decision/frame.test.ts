import { describe, it, expect } from 'vitest';
import { selectMirrorBack, buildTameFrame, buildWildFrame } from '@/lib/decision/frame';

/**
 * decision_frame 빌드·미러백 선택 순수 로직 — spec §3 (미러백) / AC-13 고정.
 *
 * 미러백 = 사용자 원문 1~2개를 **그대로 인용**. 평가·요약·추천·칭찬 0(순수 반영).
 * 우선순위(tame): worstCase → oneYearHorizon → 채워진 것 중 가장 긴 것.
 * 자유텍스트가 모두 비면 사실 진술 폴백(확신도·검토기한)으로 대체(빈 배열 반환 → 호출부 폴백).
 */
describe('selectMirrorBack — tame 원문 인용 선택 (AC-13)', () => {
  it('worstCase 만 있으면 그것 1개를 원문 그대로', () => {
    const quotes = selectMirrorBack('tame', { worstCase: '이직했다가 후회할까 봐' });
    expect(quotes).toEqual(['이직했다가 후회할까 봐']);
  });

  it('worstCase + oneYearHorizon → 우선순위대로 2개', () => {
    const quotes = selectMirrorBack('tame', {
      worstCase: '최악의 경우',
      oneYearHorizon: '1년 뒤엔 별일 아닐 듯',
    });
    expect(quotes).toEqual(['최악의 경우', '1년 뒤엔 별일 아닐 듯']);
  });

  it('worstCase 없으면 oneYearHorizon 먼저, 그다음 가장 긴 것', () => {
    const quotes = selectMirrorBack('tame', {
      oneYearHorizon: '1년 뒤',
      premortem: '아주 긴 사전부검 문장이 여기에 들어간다 길다',
      ifThen: '짧음',
    });
    expect(quotes).toEqual(['1년 뒤', '아주 긴 사전부검 문장이 여기에 들어간다 길다']);
  });

  it('최대 2개만 인용한다', () => {
    const quotes = selectMirrorBack('tame', {
      worstCase: 'a',
      oneYearHorizon: 'b',
      premortem: 'c',
      ifThen: 'd',
    });
    expect(quotes).toHaveLength(2);
    expect(quotes).toEqual(['a', 'b']);
  });

  it('공백·빈 문자열은 무시한다', () => {
    const quotes = selectMirrorBack('tame', { worstCase: '   ', oneYearHorizon: '실제 내용' });
    expect(quotes).toEqual(['실제 내용']);
  });

  it('자유텍스트가 모두 비면 빈 배열 → 호출부가 사실 진술로 폴백', () => {
    expect(selectMirrorBack('tame', { baseRateOutOf10: 3 })).toEqual([]);
    expect(selectMirrorBack('tame', {})).toEqual([]);
  });

  it('인용은 원문 그대로 — 어떤 평가·요약·접두어도 붙이지 않는다', () => {
    const raw = '나는 이 선택이 두렵다';
    const quotes = selectMirrorBack('tame', { worstCase: raw });
    expect(quotes[0]).toBe(raw); // 가공 0
  });
});

describe('selectMirrorBack — wild 원문 인용 선택', () => {
  it('identity → revelation 우선순위', () => {
    const quotes = selectMirrorBack('wild', {
      identity: '용기 있는 사람이 되고 싶다',
      revelation: '직접 겪어 알고 싶다',
    });
    expect(quotes).toEqual(['용기 있는 사람이 되고 싶다', '직접 겪어 알고 싶다']);
  });

  it('identity 없으면 revelation 먼저, 그다음 가장 긴 자유텍스트로 보충', () => {
    const quotes = selectMirrorBack('wild', {
      revelation: '겪어 알고 싶다',
      anticipatedRegret: '안 하면 더 후회할 것 같다는 긴 문장이 여기에 들어간다',
      reversibleStep: '짧게',
    });
    expect(quotes).toEqual([
      '겪어 알고 싶다',
      '안 하면 더 후회할 것 같다는 긴 문장이 여기에 들어간다',
    ]);
  });

  it('자유텍스트가 모두 비면 빈 배열 → 호출부 폴백 (호출부는 자유텍스트만 전달)', () => {
    expect(selectMirrorBack('wild', {})).toEqual([]);
  });
});

describe('buildWildFrame — 부분 저장·비점수 게이트', () => {
  it('빈 입력은 키를 만들지 않는다(부분 저장)', () => {
    const frame = buildWildFrame({
      identity: '용기 있는 사람',
      valuesToProtect: '',
      revelation: '   ',
    });
    expect(frame).toEqual({
      version: 1,
      track: 'wild',
      wild: { identity: '용기 있는 사람' },
    });
  });

  it('acceptUnknown enum 은 점수가 아니라 수용 체크 — 보존한다', () => {
    const frame = buildWildFrame({ acceptUnknown: 'partly' });
    expect(frame.wild).toEqual({ acceptUnknown: 'partly' });
  });

  it('triage 답을 frame.triage 로 병합한다', () => {
    const frame = buildWildFrame(
      { identity: 'x' },
      { reversible: 'no', identityShift: 'yes' },
    );
    expect(frame.triage).toEqual({ reversible: 'no', identityShift: 'yes' });
  });

  it('확신도·base-rate·예측 점수·review 키를 절대 만들지 않는다(쐐기·§6.4 보존)', () => {
    const frame = buildWildFrame({
      identity: '되고 싶은 나',
      anticipatedRegret: '안 하면 후회',
      reversibleStep: '작은 한 걸음',
      revelation: '발견하러 간다',
      acceptUnknown: 'yes',
    });
    const wild = frame.wild as Record<string, unknown>;
    // 점수화 키 없음.
    expect(wild).not.toHaveProperty('confidence');
    expect(wild).not.toHaveProperty('baseRateOutOf10');
    // 복기 마커는 기록 시점에 부재 — isDecisionReviewed=false 보장.
    expect(wild).not.toHaveProperty('review');
  });
});

describe('buildTameFrame — 부분 저장·트랙 키 게이트', () => {
  it('빈 입력은 키를 만들지 않는다(부분 저장)', () => {
    const frame = buildTameFrame({
      worstCase: '최악',
      preventOrRecover: '',
      costOfInaction: '   ',
      baseRateOutOf10: undefined,
    });
    expect(frame).toEqual({
      version: 1,
      track: 'tame',
      tame: { worstCase: '최악' },
    });
  });

  it('baseRateOutOf10 숫자 0 은 유효값으로 보존한다(0명도 의미 있음)', () => {
    const frame = buildTameFrame({ baseRateOutOf10: 0 });
    expect(frame.tame).toEqual({ baseRateOutOf10: 0 });
  });

  it('triage 답을 frame.triage 로 병합한다', () => {
    const frame = buildTameFrame(
      { worstCase: 'x' },
      { reversible: 'no', identityShift: 'no' },
    );
    expect(frame.triage).toEqual({ reversible: 'no', identityShift: 'no' });
  });
});
