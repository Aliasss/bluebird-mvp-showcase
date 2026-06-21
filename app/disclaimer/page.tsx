import Link from 'next/link';
import { AlertTriangle, Phone, Sparkles, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: '면책 안내 | BlueBird',
  description: 'BlueBird는 의료·치료 서비스가 아닙니다. 자가 인지 코칭 도구의 한계와 안전 자원 안내.',
};

export default function DisclaimerPage() {
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
            Disclaimer
          </p>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            면책 안내
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            BlueBird를 안전하게 이용하기 위한 안내입니다. 가입 전에 한 번 읽어주세요.
          </p>
          <p className="text-xs text-text-tertiary">최종 수정일: 2026년 6월 21일</p>
        </section>

        {/* 1. 의료 면책 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Sparkles className="text-primary mt-0.5 flex-shrink-0" size={22} strokeWidth={1.75} />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                BlueBird는 치료가 아닌 자가 인지 코칭 도구입니다
              </h2>
              <p className="text-sm text-text-tertiary">의료 서비스로 오인하지 않도록 명확히 합니다</p>
            </div>
          </div>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-2 list-disc pl-5">
            <li>
              BlueBird는{' '}
              <strong className="text-text-primary">
                식품의약품안전처(식약처) 의료기기 인허가를 받지 않았으며, 향후 받을 계획도 없는 일반
                웰니스 도구
              </strong>
              입니다. 디지털의료제품법(2025년 2월 시행) 상 의료기기 트랙을 명시적으로 따르지
              않습니다.
            </li>
            <li>
              BlueBird는 <strong className="text-text-primary">의료기기·의료 서비스가 아닙니다.</strong>{' '}
              정신과적 진단, 심리치료, 약물 처방을 대체하거나 그에 준하는 효과를 약속하지 않습니다.
            </li>
            <li>
              본 서비스에서 제공하는 인지 왜곡 분석·소크라테스 질문은 인지행동치료(CBT) 이론에 근거한{' '}
              <strong className="text-text-primary">자가 성찰 보조 도구</strong>이며, 임상적 판단이나
              치료 계획을 대체하지 않습니다.
            </li>
            <li>
              우울, 불안, 강박, PTSD, 양극성, 정신증 등{' '}
              <strong className="text-text-primary">진단 가능한 정신건강 어려움</strong>을 겪고
              계시다면 정신건강의학과 또는 임상심리 전문가의 도움을 우선 받으시길 강력히 권합니다.
            </li>
            <li>
              지속적·심각한 어려움이 있을 때 BlueBird만 사용하는 것은{' '}
              <strong className="text-text-primary">권장되지 않습니다.</strong> 전문가의 진료와 병행할
              때 도움이 될 수는 있으나, 이는 담당 전문가와 상의하여 결정하실 사항입니다.
            </li>
            <li>
              결정 기록 기능, 특히{' '}
              <strong className="text-text-primary">되돌리기 어려운 큰 결정</strong>에서 BlueBird는
              어떤 선택을 할지에 대한{' '}
              <strong className="text-text-primary">답·조언·권유를 제공하지 않습니다.</strong>{' '}
              생각의 구조를 스스로 정리하도록 돕는 도구이며, 결정과 그 결과의 책임은 전적으로 사용자
              본인에게 있습니다.
            </li>
          </ul>
        </article>

        {/* 2. 위기 자원 */}
        <article className="bg-danger/10 border border-danger/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-danger mt-0.5 flex-shrink-0" size={22} strokeWidth={1.75} />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-danger tracking-tight">
                위기 상황이라면 BlueBird를 잠시 닫고 전화해주세요
              </h2>
              <p className="text-sm text-danger">
                자살·자해 충동, 극심한 공황, 타인을 해치고 싶은 생각이 드신다면
              </p>
            </div>
          </div>
          <ul className="space-y-3">
            <li className="bg-surface rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">자살예방상담전화</p>
                <p className="text-xs text-text-tertiary">24시간 / 익명 / 무료</p>
              </div>
              <a
                href="tel:1393"
                className="inline-flex items-center gap-1.5 bg-danger text-white text-sm font-semibold px-4 py-2 rounded-xl"
              >
                <Phone size={14} strokeWidth={2.25} />
                1393
              </a>
            </li>
            <li className="bg-surface rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">정신건강위기상담전화</p>
                <p className="text-xs text-text-tertiary">24시간 / 익명 / 무료</p>
              </div>
              <a
                href="tel:1577-0199"
                className="inline-flex items-center gap-1.5 bg-danger text-white text-sm font-semibold px-4 py-2 rounded-xl"
              >
                <Phone size={14} strokeWidth={2.25} />
                1577-0199
              </a>
            </li>
          </ul>
          <Link
            href="/safety/resources"
            className="inline-block text-xs text-danger underline font-medium"
          >
            전체 정신건강 자원 보기 →
          </Link>
        </article>

        {/* 2-1. 위기 대응 한계 면책 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-warning mt-0.5 flex-shrink-0" size={22} strokeWidth={1.75} />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                위기 신호의 자동 인지·개입은 보장되지 않습니다
              </h2>
              <p className="text-sm text-text-tertiary">자동 시스템의 한계 명시</p>
            </div>
          </div>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-2 list-disc pl-5">
            <li>
              본 서비스는 사용자가 입력한 텍스트에서 위기 신호(자살·자해·타해 의도 등)를{' '}
              <strong className="text-text-primary">자동 인지·개입할 의무를 지지 않습니다.</strong>{' '}
              일부 키워드 기반 보조 안내가 작동할 수 있으나, 이는 안전 대책의 일부일 뿐 완전성을
              보장하지 않습니다.
            </li>
            <li>
              위기 상황의 인지 및 적절한 대응은{' '}
              <strong className="text-text-primary">사용자 본인 또는 보호자의 책임</strong>입니다. 어떤
              자동 시스템도 인간 전문가의 판단을 대체할 수 없으며, 본 서비스 또한 그러합니다.
            </li>
            <li>
              위기 신호가 감지되거나 본인이 위기를 자각한 경우{' '}
              <strong className="text-text-primary">즉시 본 서비스 사용을 중단하고</strong> 위 자살예방
              상담전화(1393) 또는 정신건강위기상담전화(1577-0199)로 연락해주세요.
            </li>
            <li>
              본 서비스는 위기 신호를{' '}
              <strong className="text-text-primary">놓친</strong> 경우, 위기 신호에{' '}
              <strong className="text-text-primary">적절히 대응하지 못한</strong> 경우 발생할 수 있는
              모든 결과에 대해 법령상 허용되는 최대한 책임을 제한합니다.
            </li>
          </ul>
        </article>

        {/* 3. AI 분석의 한계 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-primary mt-0.5 flex-shrink-0" size={22} strokeWidth={1.75} />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                AI 분석은 완벽하지 않습니다
              </h2>
              <p className="text-sm text-text-tertiary">한국어 자연어 처리 한계와 결과 해석 기준</p>
            </div>
          </div>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-2 list-disc pl-5">
            <li>
              인지 왜곡 분석은{' '}
              <strong className="text-text-primary">Google Gemini 모델</strong>을 통해 수행됩니다.
              완벽한 정확도를 보장하지 않으며, 사용자가 작성한 짧은 문장만으로는 충분한 신호가 없을 수
              있습니다.
            </li>
            <li>
              AI가 제시하는 왜곡 패턴·소크라테스 질문은{' '}
              <strong className="text-text-primary">참고 자료</strong>입니다. 결과를{' '}
              자신의 맥락에 맞게 해석하시고, 동의되지 않는 분석은 무시하셔도 됩니다.
            </li>
            <li>
              "뚜렷한 왜곡 패턴이 보이지 않아요"라는 결과가 나와도{' '}
              <strong className="text-text-primary">실제로는 왜곡이 있을 수 있습니다.</strong> 반대로
              패턴이 분석되어도 그것이 반드시 사실이라는 의미는 아닙니다.
            </li>
            <li>
              감정과 고통(0~10) 지표는{' '}
              <strong className="text-text-primary">사용자 본인의 자기보고</strong>입니다. AI가
              계산하거나 객관적으로 측정하지 않습니다. 패턴 리포트 또한 본인이 입력한 데이터를 바탕으로
              한 통계적 요약입니다.
            </li>
          </ul>
        </article>

        {/* 4. 사용자 책임 */}
        <article className="bg-surface rounded-2xl shadow-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-text-primary tracking-tight">사용자의 책임</h2>
          <ul className="text-sm text-text-secondary leading-relaxed space-y-2 list-disc pl-5">
            <li>BlueBird는 본인의 의지에 따라 자가 성찰 도구로 사용해주세요.</li>
            <li>
              본 서비스 사용으로 인해 발생할 수 있는 결정·행동의 책임은 사용자 본인에게 있습니다.
            </li>
            <li>
              위기 상황·진단 가능한 정신건강 어려움은 BlueBird 사용 여부와 별개로{' '}
              <strong className="text-text-primary">반드시 전문가에게 도움을 요청해주세요.</strong>
            </li>
            <li>
              미성년자(만 14세 미만)는 법정대리인의 동의 없이 가입할 수 없습니다. 해당 연령대는 부모님,
              학교 상담교사, 청소년상담1388의 도움을 우선 받으시길 권합니다.
            </li>
          </ul>
        </article>

        {/* 관련 문서 */}
        <nav className="border border-background-tertiary rounded-2xl p-6 space-y-3">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">관련 문서</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/privacy" className="text-primary font-medium hover:underline">
                개인정보 처리방침 →
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-primary font-medium hover:underline">
                이용약관 →
              </Link>
            </li>
            <li>
              <Link href="/our-philosophy" className="text-primary font-medium hover:underline">
                BlueBird의 철학과 근거 →
              </Link>
            </li>
            <li>
              <Link href="/safety/resources" className="text-primary font-medium hover:underline">
                정신건강 자원 →
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
