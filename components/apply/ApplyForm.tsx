'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

// 폐쇄 베타 응모 폼 — /apply 페이지용.
// Migration 18: evangelist_applications.user_id NULL 허용 + anon INSERT 정책 추가.
// RLS 정합: 로그인 상태(authenticated)에서는 user_id=auth.uid() 로 INSERT,
//          비로그인(anon)에서는 user_id=null 로 INSERT.
// → 양쪽 모두 기존 RLS 정책(insert_own, insert_anon)을 만족.

const AGE_BANDS = [
  { value: 'under_20', label: '20세 미만' },
  { value: '20s', label: '20대' },
  { value: '30s', label: '30대' },
  { value: '40s', label: '40대' },
  { value: '50s', label: '50대' },
  { value: '60_plus', label: '60대 이상' },
] as const;

function readUtmFromUrl() {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') || null,
    utm_medium: p.get('utm_medium') || null,
    utm_campaign: p.get('utm_campaign') || null,
    utm_content: p.get('utm_content') || null,
    utm_term: p.get('utm_term') || null,
  };
}

export default function ApplyForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [q4, setQ4] = useState('');
  const [q5, setQ5] = useState('');
  const [ageBand, setAgeBand] = useState<string>('');
  const [contactEmail, setContactEmail] = useState('');
  const [consentReport, setConsentReport] = useState(false);
  const [consentAnalysis, setConsentAnalysis] = useState(false);
  const [consentContact, setConsentContact] = useState(false);

  useEffect(() => {
    // 세션 확인 — 로그인 사용자가 /apply 진입 시 user_id 자동 매핑
    // (이미 가입한 사용자도 응모 가능. RLS 정책 evangelist_applications_insert_own 통과)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        if (user.email) setContactEmail(user.email);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!consentReport || !consentAnalysis || !consentContact) {
      setSubmitError('동의 항목 3개 모두 체크해야 응모할 수 있습니다.');
      return;
    }
    if (!ageBand) {
      setSubmitError('연령대를 선택해주세요.');
      return;
    }

    setSubmitting(true);
    const utm = readUtmFromUrl();
    const { error } = await supabase.from('evangelist_applications').insert({
      // 로그인 상태면 user_id=auth.uid() (authenticated RLS 통과),
      // 비로그인이면 null (anon RLS 통과).
      user_id: currentUserId,
      q1_handling: q1.trim(),
      q2_self_tool: q2.trim(),
      q3_thinking: q3.trim(),
      q4_apps: q4.trim() || null,
      q5_recurring: q5.trim() || null,
      age_band: ageBand,
      consent_written_report: consentReport,
      consent_data_analysis: consentAnalysis,
      consent_contact: consentContact,
      contact_email: contactEmail.trim().toLowerCase(),
      ...utm,
    });

    if (error) {
      // 23505 = unique_violation → 이메일 중복 응모
      if (error.code === '23505') {
        setSubmitError(
          '이미 이 이메일로 검토 중인 응모가 있습니다. 결과는 입력하신 이메일로 안내드립니다.',
        );
      } else {
        setSubmitError(`응모 저장에 실패했습니다: ${error.message}`);
      }
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-surface border border-success rounded-2xl p-6">
        <h2 className="text-lg font-bold text-success mb-2">응모 접수됐습니다</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          검토 후 응모 시 입력하신 이메일로 결과를 안내드립니다. 이번 모집에 선발되지 않더라도
          다음 기수 또는 정식 출시 시 우선 안내드립니다.
        </p>
        <p className="text-xs text-text-tertiary mt-3 leading-snug">
          ※ 선발자에게는 가입 안내 메일이 별도 발송됩니다. 메일 수신 전에는 BlueBird 가입이 차단됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-background-tertiary rounded-2xl p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-text-primary">응모 폼</h2>
        <p className="text-xs text-text-secondary mt-0.5">사전 스크리닝 5문항 + 연령 + 동의 (5~8분)</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">
            <span className="text-[10px] text-text-tertiary mr-1">Q1</span>
            최근 마음에 걸리는 일을 어떻게 다루시는지 자유롭게 적어주세요. (3~5문장)
            <span className="text-danger ml-1">*</span>
          </label>
          <textarea
            required
            value={q1}
            onChange={(e) => setQ1(e.target.value)}
            placeholder="예: 일이 잘 안 풀리면 일단 노트에 상황을 정리해보는 편이에요..."
            className="w-full p-3 border border-background-tertiary rounded-lg text-sm min-h-[88px] focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">
            <span className="text-[10px] text-text-tertiary mr-1">Q2</span>
            본인을 알아가는 도구·방법 중 도움이 됐던 것 1개와 이유. 도구가 없었다면 "없음".
            <span className="text-danger ml-1">*</span>
          </label>
          <textarea
            required
            value={q2}
            onChange={(e) => setQ2(e.target.value)}
            placeholder="예: MBTI 검사 결과를 본 뒤 패턴이 좀 보이기 시작했어요..."
            className="w-full p-3 border border-background-tertiary rounded-lg text-sm min-h-[88px] focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">
            <span className="text-[10px] text-text-tertiary mr-1">Q3</span>
            평일에 생각을 많이 쓰는 시간이 하루 몇 시간 정도이고, 어떤 맥락인지 한 문장으로.
            <span className="text-danger ml-1">*</span>
          </label>
          <textarea
            required
            value={q3}
            onChange={(e) => setQ3(e.target.value)}
            placeholder="예: 평일 5~6시간, 주로 회의 준비나 분석 자료 만들 때."
            className="w-full p-3 border border-background-tertiary rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">
            <span className="text-[10px] text-text-tertiary mr-1">Q4</span>
            사고·감정·일상을 다루는 앱 경험 (이름 1~3개, 지금도 쓰는지). "없음"도 OK.
          </label>
          <textarea
            value={q4}
            onChange={(e) => setQ4(e.target.value)}
            placeholder="예: 노션 사용 중, 하루콩은 써봤는데 지금은 안 씀."
            className="w-full p-3 border border-background-tertiary rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">
            <span className="text-[10px] text-text-tertiary mr-1">Q5</span>
            최근 2주 동안 가장 자주 떠올린 어려운 상황 1가지 (선택, 1~2문장).
          </label>
          <textarea
            value={q5}
            onChange={(e) => setQ5(e.target.value)}
            placeholder="예: 한 달째 발표 자리만 오면 도망치고 싶어요."
            className="w-full p-3 border border-background-tertiary rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">
            연령대 <span className="text-danger ml-1">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {AGE_BANDS.map((band) => (
              <label
                key={band.value}
                className={`flex items-center justify-center px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                  ageBand === band.value
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-background-tertiary text-text-secondary hover:bg-background-secondary'
                }`}
              >
                <input
                  type="radio"
                  name="age_band"
                  value={band.value}
                  checked={ageBand === band.value}
                  onChange={() => setAgeBand(band.value)}
                  className="sr-only"
                />
                {band.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">
            연락받을 이메일 <span className="text-danger ml-1">*</span>
          </label>
          <input
            type="email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="example@email.com"
            className="w-full p-3 border border-background-tertiary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-[11px] text-text-tertiary mt-1">
            선발 시 이 이메일로 BlueBird 가입 안내가 발송됩니다. 평소 자주 확인하는 메일로 입력해주세요.
          </p>
        </div>

        <div className="bg-background-secondary border border-background-tertiary rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-text-primary mb-1">동의 항목 — 모두 체크해야 응모 가능</p>
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={consentReport}
              onChange={(e) => setConsentReport(e.target.checked)}
              className="mt-1 flex-shrink-0"
            />
            <span>
              (a) 2주간 BlueBird MVP 사용 + <strong>서면 리포트 작성</strong>에 참여 의사가 있습니다.
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={consentAnalysis}
              onChange={(e) => setConsentAnalysis(e.target.checked)}
              className="mt-1 flex-shrink-0"
            />
            <span>
              (b) 응모 답변과 서면 리포트의 <strong>분석 사용에 동의</strong>합니다. (분석 외 사용 금지,
              30일 후 원본 데이터 폐기, 코딩 결과만 보존)
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={consentContact}
              onChange={(e) => setConsentContact(e.target.checked)}
              className="mt-1 flex-shrink-0"
            />
            <span>
              (c) 위에 입력한 <strong>이메일로 운영자의 연락</strong>을 받는 것에 동의합니다.
            </span>
          </label>
        </div>

        {submitError && (
          <p className="text-sm text-danger bg-danger/5 border border-danger/30 rounded-lg p-2">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-3 bg-primary hover:bg-primary/90 disabled:bg-text-tertiary text-primary-fg font-semibold rounded-lg transition-colors"
        >
          {submitting ? '저장 중...' : '응모 제출'}
        </button>
      </form>
    </div>
  );
}
