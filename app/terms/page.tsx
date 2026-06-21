import Link from 'next/link';

export const metadata = {
  title: '이용약관 | BlueBird',
  description: 'BlueBird 서비스 이용약관.',
};

const SECTION_HEADER = 'text-base font-bold text-text-primary tracking-tight';

export default function TermsPage() {
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
            Terms of Service
          </p>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">이용약관</h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            BlueBird(이하 "서비스")는 1인 운영자가 관리하는 분석 도구입니다. 본 약관은
            서비스의 이용 조건을 정하며, 본 약관에서 "운영자"는 본 서비스를 운영·관리하는 개인을
            의미합니다. 서비스에 가입함으로써 본 약관에 동의하시는 것으로 간주됩니다.
          </p>
          <p className="text-xs text-text-tertiary">
            최종 수정일: 2026년 6월 6일 / 시행일: 2026년 6월 6일
          </p>
        </section>

        {/* 1. 서비스 정의 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className={SECTION_HEADER}>제1조 (서비스의 정의)</h2>
          <ol className="text-sm text-text-secondary leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>
              "서비스"란 BlueBird가 제공하는 인지행동치료(CBT) 이론 기반의 자가 인지 코칭 도구를
              의미합니다. 인지 왜곡 분석, 소크라테스 질문 생성, 패턴 리포트 등을 포함합니다.
              본 서비스는 이용자가 앞둔 결정의 예상 결과·확신도를 기록하고, 이후 실제 결과와
              대조하여 예측 정확도(캘리브레이션)를 성찰하도록 돕는 기능을 포함합니다. 본 기능은
              의사결정의 옳고 그름을 판정하거나 특정 선택을 권유하지 않으며, 어떠한 결과도
              보장하지 않습니다.
            </li>
            <li>
              "이용자"란 본 약관에 동의하고 서비스에 가입하여 이를 이용하는 자를 말합니다.{' '}
              <strong className="text-text-primary">
                베타 단계에서는 운영자가 모집 응모를 받아 선별한 자에 한해 이용 자격이 부여됩니다.
              </strong>
            </li>
            <li>
              본 서비스는{' '}
              <strong className="text-text-primary">
                의료기기·의료 서비스가 아니며, 진단·치료를 대체하지 않습니다.
              </strong>{' '}
              자세한 내용은{' '}
              <Link href="/disclaimer" className="text-primary underline">
                면책 안내
              </Link>
              를 참고해주세요.
            </li>
          </ol>
        </article>

        {/* 2. 가입 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className={SECTION_HEADER}>제2조 (회원가입 및 자격)</h2>
          <ol className="text-sm text-text-secondary leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>
              가입은 본인의 이메일 주소와 비밀번호를 통해 진행하며, 본 약관과 개인정보 처리방침에
              동의해야 합니다.
            </li>
            <li>
              만 14세 미만은 법정대리인의 동의 없이 가입할 수 없습니다. 법정대리인 동의 절차는 별도로
              제공되지 않으므로 만 14세 미만은 사실상 가입이 제한됩니다.
            </li>
            <li>
              타인의 개인정보를 도용한 가입, 1인이 다수의 계정을 부정 목적으로 운용하는 행위, 자동화된
              수단을 통한 가입은 금지됩니다.
            </li>
            <li>
              <strong className="text-text-primary">베타 단계 가입 절차</strong>: 베타 단계에서는
              모집 공고에 응모한 자 중 운영자가 선별한 자에게만 가입 링크가 발송됩니다. 본 약관에
              따른 가입은 운영자의 사전 승인을 전제로 합니다.
            </li>
          </ol>
        </article>

        {/* 3. 서비스 이용 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className={SECTION_HEADER}>제3조 (서비스 이용 및 금지 행위)</h2>
          <ol className="text-sm text-text-secondary leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>이용자는 본 서비스를 본인의 자가 성찰 목적으로 이용해야 합니다.</li>
            <li>
              다음 행위는 금지됩니다.
              <ul className="list-disc pl-5 space-y-1 mt-1.5">
                <li>타인을 비방·협박·차별하는 내용 입력</li>
                <li>타인의 개인정보·민감정보를 본인 동의 없이 입력</li>
                <li>음란·폭력·범죄 관련 콘텐츠 입력</li>
                <li>서비스의 정상적 운영을 방해하는 행위 (대량 자동화 요청, 부하 공격 등)</li>
                <li>서비스의 소스 코드·AI 분석 결과를 무단 복제·재배포하여 상업적 이익을 취하는 행위</li>
              </ul>
            </li>
            <li>
              운영자는 위 금지 행위가 확인될 경우 사전 고지 없이 해당 계정의 이용을 제한하거나 종료할 수
              있습니다.
            </li>
          </ol>
        </article>

        {/* 4. 책임의 한계 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className={SECTION_HEADER}>제4조 (책임의 한계)</h2>
          <ol className="text-sm text-text-secondary leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>
              운영자는 서비스가 의료적 효과나 특정 결과를 보장하지 않음을 명시하며, 이용자가 서비스 결과를
              참고하여 내린 결정·행동에 대한 직접적·간접적 손해에 대해 책임을 지지 않습니다.
            </li>
            <li>
              서비스에 사용되는 외부 AI 모델(Google Gemini)·인프라(Supabase, Vercel)의 장애·오류로 인한
              서비스 일시 중단·분석 지연·실패는 운영자의 통제 범위를 벗어날 수 있으며, 운영자는 이러한
              사유로 인한 손해에 대해 법령이 허용하는 범위 내에서 책임을 지지 않습니다.
            </li>
            <li>
              이용자가 서비스에 입력한 자동 사고·감정 데이터의 사실 여부와 그로 인한 결과에 대한 책임은
              이용자 본인에게 있습니다.
            </li>
            <li>
              위기 상황(자살·자해 충동 등)에서 본 서비스에만 의존하지 마시고{' '}
              <strong className="text-text-primary">
                자살예방상담전화 1393, 정신건강위기상담 1577-0199
              </strong>
              에 즉시 연락해주세요.
            </li>
            <li>
              단, 본 조의 면책은 운영자의 <strong className="text-text-primary">고의 또는
              중대한 과실</strong>로 인한 손해, 신체의 자유·생명에 관한 손해에는 적용되지 않으며,
              이 경우 운영자는 관련 법령이 정하는 바에 따라 책임을 부담합니다.
            </li>
          </ol>
        </article>

        {/* 5. 회원 탈퇴 및 해지 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className={SECTION_HEADER}>제5조 (회원 탈퇴 및 이용 계약 해지)</h2>
          <ol className="text-sm text-text-secondary leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>이용자는 마이 페이지(/me)에서 언제든 회원 탈퇴를 요청할 수 있습니다.</li>
            <li>
              탈퇴 시 데이터 처리 정책은{' '}
              <Link href="/privacy" className="text-primary underline">
                개인정보 처리방침 제3조
              </Link>
              를 따릅니다 (30일 유예 보관 후 영구 삭제 또는 즉시 삭제 옵션 선택).
            </li>
            <li>
              운영자는 이용자가 본 약관에 위반하는 경우 사전 고지 후(긴급한 경우 사후 고지) 해당 이용자의
              계약을 해지할 수 있습니다.
            </li>
          </ol>
        </article>

        {/* 6. 이용료 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className={SECTION_HEADER}>제6조 (이용료 및 청약철회)</h2>
          <ol className="text-sm text-text-secondary leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>
              본 베타 단계에서 서비스는 무료로 제공됩니다. 향후 유료 기능이 도입될 경우 별도의 약관과
              결제 동의 절차를 거쳐 적용되며, 기존 이용자가 이미 사용 중이던 무료 기능에는 소급
              적용되지 않습니다.
            </li>
            <li>
              유료 기능 도입 시{' '}
              <strong className="text-text-primary">
                「전자상거래 등에서의 소비자보호에 관한 법률」 제17조에 따른 청약철회 권리는 보장
              </strong>
              됩니다. 본 약관 또는 별도 안내(예:{' '}
              <Link href="/beta-incentive" className="text-primary underline">베타 완주자 혜택</Link>
              )가 있는 경우 그 약속 조건이 청약철회권에 우선하지 않습니다.
            </li>
            <li>
              베타 단계 핵심 기능(분석·재평가·매뉴얼 열람)은 베타 이용자에게 향후 유료화 후에도 동일한
              한도로 무료 유지됩니다. 단, 별도 안내한 사전 약속이 있는 경우 그 안내 조건을 따릅니다.
            </li>
          </ol>
        </article>

        {/* 7. 약관 변경 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className={SECTION_HEADER}>제7조 (약관의 변경)</h2>
          <ol className="text-sm text-text-secondary leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>
              운영자는 관련 법령 및 서비스 운영 정책 변경에 따라 본 약관을 개정할 수 있으며, 변경 시 시행일
              최소 7일 전에 서비스 내 공지 또는 가입 이메일로 안내합니다.
            </li>
            <li>
              이용자에게 불리한 중요 변경의 경우 시행일 최소 30일 전에 안내하며,{' '}
              <strong className="text-text-primary">별도 동의 절차를 거칩니다</strong>. 동의하지
              않는 이용자는 회원 탈퇴를 통해 이용 계약을 해지할 수 있으며, 동의 없이 변경된 조항이 그
              이용자에게 적용되지 않습니다.
            </li>
            <li>
              이용자가 변경된 약관에 동의하지 않을 경우 회원 탈퇴를 통해 이용 계약을 해지할 수 있습니다.
              변경 시행일 이후에도 서비스를 계속 이용하시면 변경된 약관에 동의하신 것으로 간주됩니다.
            </li>
            <li>
              <strong className="text-text-primary">개정 이력</strong>
              <ul className="list-disc pl-5 space-y-0.5 mt-1">
                <li>2026-06-06 — 결정 기록 수집·국외이전(Google Gemini) 범위 추가, 캘리브레이션 기능 정의 추가</li>
              </ul>
            </li>
          </ol>
        </article>

        {/* 8. 준거법 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-3">
          <h2 className={SECTION_HEADER}>제8조 (준거법 및 분쟁 해결)</h2>
          <ol className="text-sm text-text-secondary leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>본 약관의 해석 및 운영자와 이용자 간 분쟁에는 대한민국 법령이 적용됩니다.</li>
            <li>
              분쟁 발생 시 운영자와 이용자는 신의성실 원칙에 따라 우선 협의하여 해결하며, 협의가 어려울
              경우 「민사소송법」에 따른 관할 법원에 제소할 수 있습니다.
            </li>
          </ol>
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
              <Link href="/privacy" className="text-primary font-medium hover:underline">
                개인정보 처리방침 →
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
