/**
 * 결정 루프 클라이언트 검증 이벤트 allowlist · PII 가드 (decision-pivot ⑤ · spec §D.2).
 * 순수 함수 — 네트워크/DB 없음.
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeDecisionEvent,
  CLIENT_DECISION_EVENTS,
} from '@/lib/analytics/decision-events';

describe('sanitizeDecisionEvent', () => {
  it('허용 이벤트(decision_report_viewed)는 빈 properties 로 통과', () => {
    expect(sanitizeDecisionEvent('decision_report_viewed', undefined)).toEqual({
      event: 'decision_report_viewed',
      properties: {},
    });
  });

  it('decision_record_started + from=report → 선순환 source 보존', () => {
    expect(sanitizeDecisionEvent('decision_record_started', 'report')).toEqual({
      event: 'decision_record_started',
      properties: { from: 'report' },
    });
  });

  it('from 이 allowlist 밖이면 무시(properties 비움)', () => {
    expect(sanitizeDecisionEvent('decision_record_started', 'evil')).toEqual({
      event: 'decision_record_started',
      properties: {},
    });
  });

  it('진입점 source(fab·onboarding·dashboard)는 보존 — 도달성 계측', () => {
    for (const from of ['fab', 'onboarding', 'dashboard'] as const) {
      expect(sanitizeDecisionEvent('decision_record_started', from)).toEqual({
        event: 'decision_record_started',
        properties: { from },
      });
    }
  });

  it('서버 전용 이벤트(decision_record_saved)는 거부(null)', () => {
    expect(sanitizeDecisionEvent('decision_record_saved', undefined)).toBeNull();
  });

  it('decision_review_completed(서버 전용)도 클라 경로로는 거부', () => {
    expect(sanitizeDecisionEvent('decision_review_completed', undefined)).toBeNull();
  });

  it('알 수 없는/위조 이벤트는 거부', () => {
    expect(sanitizeDecisionEvent('__proto__', undefined)).toBeNull();
    expect(sanitizeDecisionEvent(42, undefined)).toBeNull();
    expect(sanitizeDecisionEvent(null, undefined)).toBeNull();
  });

  it('PII 가드: from 이 결정 원문 같은 자유 텍스트면 통째로 드롭', () => {
    const result = sanitizeDecisionEvent('decision_record_started', '이직 제안을 수락할지');
    expect(result?.properties).toEqual({}); // 자유 텍스트는 properties 에 들어가지 않음
  });

  it('클라 허용 이벤트 목록은 6종(진입·트리아지·노출·열람 + 세션·미리보기 A/B)', () => {
    expect([...CLIENT_DECISION_EVENTS]).toEqual([
      'decision_record_started',
      'decision_triage_completed',
      'decision_analyze_shown',
      'decision_report_viewed',
      'session_started',
      'decision_preview_shown',
    ]);
  });

  // ── decision_triage_completed (decision-logic-v2 §11·AC-17 — 트랙 분기 유효성) ──
  describe('decision_triage_completed — 트랙 분기 계측(problem_type·q_count)', () => {
    it('problem_type=tame + q_count=1 → enum·정수만 통과', () => {
      expect(
        sanitizeDecisionEvent('decision_triage_completed', { problemType: 'tame', qCount: 1 }),
      ).toEqual({
        event: 'decision_triage_completed',
        properties: { problem_type: 'tame', q_count: 1 },
      });
    });

    it('problem_type=wild + q_count=2 → 통과', () => {
      expect(
        sanitizeDecisionEvent('decision_triage_completed', { problemType: 'wild', qCount: 2 }),
      ).toEqual({
        event: 'decision_triage_completed',
        properties: { problem_type: 'wild', q_count: 2 },
      });
    });

    it('PII 가드: problemType 이 결정 원문 같은 자유 텍스트면 problem_type 드롭', () => {
      const result = sanitizeDecisionEvent('decision_triage_completed', {
        problemType: '이직 제안을 수락할지',
        qCount: 1,
      });
      // 자유 텍스트는 enum allowlist 밖 → problem_type 미포함(q_count 만 통과).
      expect(result).toEqual({
        event: 'decision_triage_completed',
        properties: { q_count: 1 },
      });
    });

    it('허용 밖 problem_type(임의 enum)은 드롭', () => {
      const result = sanitizeDecisionEvent('decision_triage_completed', {
        problemType: 'reckless',
        qCount: 2,
      });
      expect(result?.properties).toEqual({ q_count: 2 });
    });

    it('q_count 범위 밖(0·3·비정수·문자열)은 드롭', () => {
      for (const bad of [0, 3, 1.5, '2', null, undefined]) {
        const result = sanitizeDecisionEvent('decision_triage_completed', {
          problemType: 'tame',
          qCount: bad,
        });
        expect(result?.properties).toEqual({ problem_type: 'tame' }); // q_count 미포함
      }
    });

    it('properties 전부 누락이어도 이벤트 자체는 통과(빈 properties)', () => {
      expect(sanitizeDecisionEvent('decision_triage_completed', {})).toEqual({
        event: 'decision_triage_completed',
        properties: {},
      });
    });

    it('from 은 triage 이벤트에 묻어와도 무시(이벤트별 키 게이트)', () => {
      const result = sanitizeDecisionEvent('decision_triage_completed', {
        from: 'report',
        problemType: 'wild',
        qCount: 2,
      });
      // from 은 decision_record_started 전용 — triage 에선 통과시키지 않는다.
      expect(result?.properties).toEqual({ problem_type: 'wild', q_count: 2 });
    });

    it('triage 이벤트에는 임의 추가 키를 받지 않는다(원문·자유키 차단)', () => {
      const result = sanitizeDecisionEvent('decision_triage_completed', {
        problemType: 'tame',
        qCount: 1,
        // 위조된 자유텍스트 키 — sanitizer 는 allowlist 키만 추출하므로 통과 안 함.
        decisionText: '회사를 그만둘지',
        reflection: '불안해서 못 자겠다',
      } as Record<string, unknown>);
      expect(result?.properties).toEqual({ problem_type: 'tame', q_count: 1 });
    });
  });

  // ── 복기 미리보기 A/B (session_started · decision_preview_shown) ──
  describe('session_started — 코호트 귀속(cohort enum 게이트)', () => {
    it('cohort=preview → properties.cohort 통과', () => {
      expect(sanitizeDecisionEvent('session_started', { cohort: 'preview' })).toEqual({
        event: 'session_started',
        properties: { cohort: 'preview' },
      });
    });

    it('cohort=control → 통과', () => {
      expect(sanitizeDecisionEvent('session_started', { cohort: 'control' })).toEqual({
        event: 'session_started',
        properties: { cohort: 'control' },
      });
    });

    it('잘못된 cohort(foo)는 드롭(빈 properties)', () => {
      expect(sanitizeDecisionEvent('session_started', { cohort: 'foo' })).toEqual({
        event: 'session_started',
        properties: {},
      });
    });

    it('cohort 누락이어도 이벤트 자체는 통과', () => {
      expect(sanitizeDecisionEvent('session_started', {})).toEqual({
        event: 'session_started',
        properties: {},
      });
    });

    it('PII 가드: cohort 가 자유텍스트면 드롭', () => {
      const result = sanitizeDecisionEvent('session_started', {
        cohort: '이직 제안을 수락할지',
      });
      expect(result?.properties).toEqual({});
    });

    it('session_started 에는 track 키를 받지 않는다(이벤트별 게이트)', () => {
      const result = sanitizeDecisionEvent('session_started', {
        cohort: 'preview',
        track: 'tame',
      });
      // track 은 decision_preview_shown 전용.
      expect(result?.properties).toEqual({ cohort: 'preview' });
    });
  });

  describe('decision_preview_shown — A/B 처치 도달(cohort + track enum 게이트)', () => {
    it('cohort=preview + track=tame → 둘 다 통과', () => {
      expect(
        sanitizeDecisionEvent('decision_preview_shown', { cohort: 'preview', track: 'tame' }),
      ).toEqual({
        event: 'decision_preview_shown',
        properties: { cohort: 'preview', track: 'tame' },
      });
    });

    it('track=wild 도 enum 게이트는 통과(값 자체는 ALLOWED_PROBLEM_TYPE)', () => {
      // 미리보기는 클라에서 tame 만 보내지만, sanitizer 게이트는 enum 만 검사한다.
      expect(
        sanitizeDecisionEvent('decision_preview_shown', { cohort: 'control', track: 'wild' }),
      ).toEqual({
        event: 'decision_preview_shown',
        properties: { cohort: 'control', track: 'wild' },
      });
    });

    it('허용 밖 track(임의 enum)은 드롭', () => {
      const result = sanitizeDecisionEvent('decision_preview_shown', {
        cohort: 'preview',
        track: 'reckless',
      });
      expect(result?.properties).toEqual({ cohort: 'preview' });
    });

    it('잘못된 cohort 는 드롭하되 유효 track 은 보존', () => {
      const result = sanitizeDecisionEvent('decision_preview_shown', {
        cohort: 'foo',
        track: 'tame',
      });
      expect(result?.properties).toEqual({ track: 'tame' });
    });

    it('PII 가드: 임의 자유키는 통째로 드롭', () => {
      const result = sanitizeDecisionEvent('decision_preview_shown', {
        cohort: 'preview',
        track: 'tame',
        decisionText: '회사를 그만둘지',
      } as Record<string, unknown>);
      expect(result?.properties).toEqual({ cohort: 'preview', track: 'tame' });
    });
  });
});
