import { redirect } from 'next/navigation';

// 결정 패턴은 /insights 허브의 '결정 패턴' 탭으로 통합됨(2026-06-09).
//   기존 북마크·외부 링크 보존을 위해 허브로 리다이렉트한다.
export default function DecisionPatternsRedirect() {
  redirect('/insights?view=decision');
}
