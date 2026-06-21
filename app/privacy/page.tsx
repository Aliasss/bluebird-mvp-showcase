import Link from 'next/link';
import { Lock, Database, Globe, UserMinus, Mail } from 'lucide-react';
import { SERVICE_CONTACT_EMAIL, buildMailto } from '@/lib/copy/contact';

export const metadata = {
  title: '개인정보 처리방침 | BlueBird',
  description: 'BlueBird의 개인정보 수집·이용·제공·보유·파기 정책 (PIPA 기반).',
};

const SECTION_HEADER = 'text-base font-bold text-text-primary tracking-tight';
const TABLE_HEADER = 'text-xs font-semibold text-text-tertiary uppercase tracking-wide';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background border-b border-background-tertiary">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary tracking-tight">
            BlueBird
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm font-semibold text-primary-fg bg-primary px-4 py-2 rounded-xl"
          >
            시작하기
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* 타이틀 */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Privacy Policy
          </p>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            개인정보 처리방침
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            BlueBird(이하 "서비스")는 1인 운영자가 관리하는 분석 도구로서 「개인정보
            보호법」(PIPA) 및 관련 법령을 준수하여 이용자의 개인정보를 다음과 같이 처리합니다. 본
            방침에서 "운영자"는 본 서비스를 운영·관리하는 개인을 의미합니다.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            본 서비스는 베타 단계에서{' '}
            <strong className="text-text-primary">비공개 운영</strong>되며, 모집 공고에 응모한 자
            중 운영자가 선별한 자에게만 이용이 부여됩니다.
          </p>
          <p className="text-xs text-text-tertiary">최종 수정일: 2026년 6월 6일 / 시행일: 2026년 6월 6일</p>
        </section>

        {/* 1. 수집 항목·목적 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-5">
          <div className="flex items-start gap-3">
            <Database className="text-primary mt-0.5 flex-shrink-0" size={22} strokeWidth={1.75} />
            <h2 className={SECTION_HEADER}>1. 수집하는 개인정보 항목과 이용 목적</h2>
          </div>

          <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
            <div className="space-y-2">
              <p className={TABLE_HEADER}>가입 시 수집</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong className="text-text-primary">이메일 주소</strong> — 계정 식별, 로그인,
                  비밀번호 재설정, 서비스 공지
                </li>
                <li>
                  <strong className="text-text-primary">비밀번호</strong> — Supabase Auth가 단방향
                  해시 처리하여 저장. 운영자는 비밀번호 원문에 접근할 수 없습니다.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className={TABLE_HEADER}>서비스 이용 시 수집·생성</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong className="text-text-primary">자동 사고 기록</strong> (사건, 떠오른 생각,
                  감정, 고통 0~10) — 인지 왜곡 분석 및 본인의 패턴 리포트 생성에 이용
                </li>
                <li>
                  <strong className="text-text-primary">재평가·체크인 기록</strong> — 시간 경과에 따른
                  변화 추적
                </li>
                <li>
                  <strong className="text-text-primary">분석 결과</strong> (분석된 왜곡 유형, 트리거
                  카테고리, AI가 생성한 소크라테스 질문) — 본인의 패턴 리포트에 이용
                </li>
                <li>
                  <strong className="text-text-primary">서비스 이용 로그</strong> (접속 시간, 분석
                  요청 빈도 등 — 익명 통계 수준) — 서비스 품질 개선
                </li>
                <li>
                  <strong className="text-text-primary">분석 품질 메트릭</strong> (분석 성공·재시도·파싱
                  실패·질문 폴백 발동 등의 이벤트와 user_id) — 운영자가 자체 운영하는 Supabase
                  테이블에 저장되며, 사일런트 실패를 빠르게 감지·수정해 분석 품질을 개선하기 위한
                  내부 운영 목적으로만 사용됩니다. 외부에 공유되지 않습니다. 본 메트릭의 보유 기간은
                  §3 보유 기간 정책을 동일하게 적용합니다 (탈퇴 후 30일 유예 후 영구 삭제).
                </li>
                <li>
                  <strong className="text-text-primary">결정 기록</strong> (결정 내용, 고려한 선택지,
                  예상 결과, 확신도 0~100, 검토 예정일, 복기 시 입력한 실제 결과, 예측-결과
                  캘리브레이션 산출값) — 의사결정의 예측·복기 및 본인의 캘리브레이션 리포트 생성에
                  이용. 결정 내용에는 직업·재무·관계 등 본인의 구체적 상황이 포함될 수 있으므로,
                  타인의 신원정보나 본인의 민감정보(건강·금융 식별정보 등)는 입력하지 않으시길
                  권장합니다.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className={TABLE_HEADER}>선택 동의 시</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong className="text-text-primary">마케팅 정보 수신 동의 여부</strong> — 서비스
                  업데이트, 신규 기능 소개, 이벤트 안내 발송. 동의는 언제든 철회할 수 있으며 철회해도
                  서비스 이용에는 영향이 없습니다.
                </li>
              </ul>
            </div>
          </div>
        </article>

        {/* 2. 제3자 제공·처리 위탁 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-5">
          <div className="flex items-start gap-3">
            <Globe className="text-primary mt-0.5 flex-shrink-0" size={22} strokeWidth={1.75} />
            <h2 className={SECTION_HEADER}>2. 제3자 제공 및 처리 위탁</h2>
          </div>

          <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
            <div className="bg-background rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                제3자 제공
              </p>
              <p>
                운영자는 이용자의 개인정보를{' '}
                <strong className="text-text-primary">제3자에게 판매·제공하지 않습니다.</strong> 단,
                법령에 따른 수사·재판 절차에서 적법한 절차를 거쳐 요청받은 경우에 한하여 제공합니다.
              </p>
            </div>

            <div className="space-y-2">
              <p className={TABLE_HEADER}>처리 위탁 (서비스 운영을 위한 필수 위탁)</p>
              <ul className="space-y-3">
                <li className="border border-background-tertiary rounded-xl p-4 space-y-1.5">
                  <p className="text-sm font-semibold text-text-primary">Supabase, Inc. (미국)</p>
                  <p className="text-xs text-text-tertiary">위탁 항목: 계정·인증·데이터베이스 호스팅</p>
                  <p className="text-xs text-text-tertiary">
                    저장 리전: AWS ap-northeast-2 (서울) 등 운영자 설정에 따름
                  </p>
                </li>
                <li className="border border-background-tertiary rounded-xl p-4 space-y-1.5">
                  <p className="text-sm font-semibold text-text-primary">Vercel, Inc. (미국)</p>
                  <p className="text-xs text-text-tertiary">
                    위탁 항목: 웹 호스팅·접속 로그·익명 사용 분석 (Vercel Analytics)
                  </p>
                </li>
                <li className="border border-background-tertiary rounded-xl p-4 space-y-1.5">
                  <p className="text-sm font-semibold text-text-primary">Google LLC (미국) — Gemini API</p>
                  <p className="text-xs text-text-tertiary">
                    위탁 항목: 자동 사고 기록 및 결정 기록(결정 내용·선택지·예상 결과 등) 텍스트의 인지 왜곡 분석
                  </p>
                  <p className="text-xs text-danger">
                    ⚠️ 사용자가 입력한 사건·생각·감정 텍스트 및 결정 기록 텍스트(결정 내용·선택지·예상
                    결과)는 분석을 위해 Google Gemini API(미국)로 전송됩니다. 결정 내용에
                    재무·계약·소송 등 구체 정보가 포함될 수 있으므로, 민감 정보(타인 신원,
                    의료·금융 식별정보 등)는 입력하지 않으시길 권합니다.
                  </p>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className={TABLE_HEADER}>위탁 기간 및 재위탁</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong className="text-text-primary">위탁 기간</strong>: 회원 가입 기간 동안. 회원
                  탈퇴 시 §3 보유 기간 정책에 따라 처리.
                </li>
                <li>
                  <strong className="text-text-primary">재위탁</strong>: 위탁사가 자체 인프라 운영
                  목적으로 일부 사용할 수 있으며, 운영자는 위탁사의 약관(Supabase Privacy
                  Policy·Vercel Terms·Google API Terms 등)에 따른 데이터 처리 정책을 준수하는
                  한도에서 동의합니다.
                </li>
              </ul>
            </div>

            <p className="text-xs text-text-tertiary">
              일부 위탁 업체가 미국에 소재하므로 개인정보가{' '}
              <strong className="text-text-secondary">국외로 이전</strong>됩니다. 이용자는 가입 시
              이러한 국외 이전에 동의하시는 것으로 간주됩니다. 동의를 원치 않으실 경우 서비스 이용이
              제한될 수 있습니다.
            </p>
          </div>
        </article>

        {/* 3. 보유·파기 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-5">
          <div className="flex items-start gap-3">
            <UserMinus className="text-primary mt-0.5 flex-shrink-0" size={22} strokeWidth={1.75} />
            <h2 className={SECTION_HEADER}>3. 보유 기간 및 파기</h2>
          </div>

          <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-text-primary">서비스 이용 기간 동안</strong> 개인정보를
                보유합니다.
              </li>
              <li>
                <strong className="text-text-primary">회원 탈퇴 시 30일간 유예 보관 후 영구 삭제</strong>
                합니다. 이 유예 기간은 사용자가 실수로 탈퇴를 요청한 경우 복구를 가능하게 하기 위함이며,
                이 기간 동안 데이터는 암호화 보관되며 새로운 분석에 사용되지 않습니다.
              </li>
              <li>
                <strong className="text-text-primary">즉시 영구 삭제</strong>를 원하시는 경우 회원 탈퇴
                요청 시 "즉시 삭제" 옵션을 선택하시거나{' '}
                <a
                  href={buildMailto('[BlueBird] 개인정보 즉시 삭제 요청')}
                  className="text-primary underline"
                >
                  {SERVICE_CONTACT_EMAIL}
                </a>
                으로 요청해주시면 영업일 기준 7일 이내 처리합니다.
              </li>
              <li>
                30일 경과 후 영구 삭제는{' '}
                <strong className="text-text-primary">월 1회 정기 처리</strong>됩니다. 처리 전이라도
                Row Level Security로 본인 외 누구도 접근할 수 없으며, 새로운 분석에는 사용되지
                않습니다.
              </li>
              <li>
                결정 기록도 동일한 보유·파기 정책 및 데이터 내보내기 대상에 포함됩니다.
              </li>
              <li>
                법령(전자상거래법, 통신비밀보호법 등)에 따른 별도 보유 의무가 있는 경우 해당 법령이
                정하는 기간까지 보유 후 파기합니다.
              </li>
              <li>
                파기 방법: 전자적 파일은 복구·재생이 불가능한 방식으로 영구 삭제하며, 출력물이 있는 경우
                분쇄 또는 소각합니다.
              </li>
            </ul>
          </div>
        </article>

        {/* 4. 이용자의 권리 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-5">
          <div className="flex items-start gap-3">
            <Lock className="text-primary mt-0.5 flex-shrink-0" size={22} strokeWidth={1.75} />
            <h2 className={SECTION_HEADER}>4. 이용자의 권리</h2>
          </div>

          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-text-primary">개인정보 열람·수정</strong> — 마이 페이지(/me)
                에서 직접 조회·수정
              </li>
              <li>
                <strong className="text-text-primary">데이터 내보내기(이동권)</strong> — 마이 페이지에서
                JSON 형식으로 본인 데이터 일괄 다운로드
              </li>
              <li>
                <strong className="text-text-primary">처리 정지 요청·동의 철회</strong> — 마케팅 수신
                동의는 언제든 철회 가능
              </li>
              <li>
                <strong className="text-text-primary">회원 탈퇴(삭제권)</strong> — 마이 페이지에서 직접
                요청 가능
              </li>
            </ul>
            <p className="text-xs text-text-tertiary">
              상기 권리 행사에 어려움이 있으시면{' '}
              <a
                href={buildMailto('[BlueBird] 이용자 권리 행사 문의')}
                className="text-primary underline"
              >
                {SERVICE_CONTACT_EMAIL}
              </a>
              으로 문의해주세요. 영업일 기준 7일 이내 응답합니다.
            </p>
          </div>
        </article>

        {/* 5. 보호조치 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className={SECTION_HEADER}>5. 안전성 확보 조치</h2>
          <ul className="text-sm text-text-secondary leading-relaxed list-disc pl-5 space-y-1.5">
            <li>비밀번호: Supabase Auth에 의한 단방향 해시 저장 (bcrypt)</li>
            <li>전송 구간: HTTPS(TLS 1.2 이상) 암호화</li>
            <li>접근 제어: Row Level Security(RLS)로 본인 데이터만 조회 가능하도록 강제</li>
            <li>관리자 접근: 운영자(파운더 1인) 외 임의 열람 불가</li>
          </ul>
        </article>

        {/* 6. 책임자 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="text-primary mt-0.5 flex-shrink-0" size={22} strokeWidth={1.75} />
            <h2 className={SECTION_HEADER}>6. 개인정보 보호책임자</h2>
          </div>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-1">
            <li>책임자: BlueBird 운영자</li>
            <li>
              연락처:{' '}
              <a
                href={buildMailto('[BlueBird] 개인정보 보호책임자 문의')}
                className="text-primary underline"
              >
                {SERVICE_CONTACT_EMAIL}
              </a>{' '}
              <span className="text-text-tertiary">(영업일 7일 이내 응답)</span>
            </li>
          </ul>
          <p className="text-xs text-text-tertiary leading-relaxed">
            개인정보 침해에 대한 신고·상담이 필요하시면 다음 기관에 문의하실 수 있습니다.
            <br />
            개인정보분쟁조정위원회 1833-6972 / 개인정보침해신고센터 (한국인터넷진흥원) 118 / 대검찰청
            사이버범죄수사단 1301 / 경찰청 사이버수사국 182
          </p>
        </article>

        {/* 7. 변경 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className={SECTION_HEADER}>7. 처리방침 변경</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            본 처리방침이 변경될 경우 시행일 최소 7일 전에 서비스 내 공지사항 또는 가입 이메일을 통해
            안내드립니다. 중요한 변경(수집 항목 추가, 제3자 제공 신설 등)이 있을 경우 별도 동의를
            받습니다.
          </p>
        </article>

        {/* 관련 문서 */}
        <nav className="border border-background-tertiary rounded-2xl p-6 space-y-3">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">관련 문서</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/disclaimer" className="text-primary font-medium hover:underline">
                면책 안내 →
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-primary font-medium hover:underline">
                이용약관 →
              </Link>
            </li>
          </ul>
        </nav>

        <footer className="text-center pt-4 pb-12">
          <Link href="/" className="text-sm text-text-tertiary underline">
            홈으로
          </Link>
        </footer>
      </div>
    </main>
  );
}
