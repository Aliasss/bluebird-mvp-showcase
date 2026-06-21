import { describe, it, expect } from 'vitest';
import {
  buildMailtoSubjectOnly,
  buildSelectionEmailBody,
  buildDirectApprovalEmailBody,
  SELECTION_EMAIL_SUBJECT,
} from '@/lib/copy/admin-email';
import { SERVICE_CONTACT_EMAIL } from '@/lib/copy/contact';

describe('buildMailtoSubjectOnly — mailto 길이 한계 회피 (제목만)', () => {
  const url = buildMailtoSubjectOnly('tester@example.com');

  it('mailto URL이 안전 길이(<300자) 이내 — 브라우저/OS mailto 한계 회피', () => {
    // 회귀 가드: 본문을 URL에 넣으면 4000자+ → 브라우저가 조용히 무반응.
    expect(url.length).toBeLessThan(300);
  });

  it('본문(&body=)을 포함하지 않는다 (본문은 클립보드로 전달)', () => {
    expect(url).not.toContain('&body=');
  });

  it('수신자와 제목을 담는다', () => {
    expect(url).toContain('tester@example.com');
    expect(url).toContain(encodeURIComponent(SELECTION_EMAIL_SUBJECT));
  });
});

describe('이메일 본문 빌더 — 클립보드용, 핵심 내용 보존', () => {
  it('선발 본문은 가입 URL·수신자·문의처를 포함', () => {
    const body = buildSelectionEmailBody('tester@example.com');
    expect(body).toContain('tester@example.com');
    expect(body).toContain('https://bluebird-mvp.vercel.app/auth/signup');
    expect(body).toContain(SERVICE_CONTACT_EMAIL);
  });

  it('직접 승인 본문은 수신자·문의처를 포함', () => {
    const body = buildDirectApprovalEmailBody('tester@example.com');
    expect(body).toContain('tester@example.com');
    expect(body).toContain(SERVICE_CONTACT_EMAIL);
  });
});
