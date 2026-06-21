import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatActionPlanForDisplay } from '@/lib/intervention/action-plan';
import { ReviewForm } from './review-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: PageProps) {
  const { id: logId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: log } = await supabase
    .from('logs')
    .select('id, trigger, thought, created_at, user_id')
    .eq('id', logId)
    .eq('user_id', user.id)
    .single();
  if (!log) redirect('/dashboard');

  const { data: intervention } = await supabase
    .from('intervention')
    .select(
      'id, socratic_questions, user_answers, final_action, is_completed, reevaluated_pain_score, review_dismissed_at'
    )
    .eq('log_id', logId)
    .single();
  if (!intervention || !intervention.is_completed) redirect('/dashboard');
  if (intervention.reevaluated_pain_score != null) redirect('/dashboard');
  if (intervention.review_dismissed_at != null) redirect('/dashboard');

  const questions: string[] = Array.isArray(intervention.socratic_questions)
    ? (intervention.socratic_questions as string[])
    : [];
  const answers: Record<string, string> =
    (intervention.user_answers as Record<string, string>) ?? {};

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header className="space-y-1">
        <p className="text-xs text-text-tertiary">다시 돌아보기</p>
        <h1 className="text-xl font-semibold text-text-primary">
          시간이 조금 지났네요. 이 문제를 지금 돌아보면 어떤가요?
        </h1>
      </header>

      <section className="rounded-2xl border border-background-tertiary bg-surface p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">그때 기록한 것</h2>
        <div className="space-y-1">
          <p className="text-xs text-text-tertiary">트리거</p>
          <p className="text-sm text-text-primary">{log.trigger}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-text-tertiary">자동 사고</p>
          <p className="text-sm text-text-primary whitespace-pre-wrap">{log.thought}</p>
        </div>
        {intervention.final_action && (
          <div className="space-y-1">
            <p className="text-xs text-text-tertiary">행동 계획</p>
            <p className="text-sm text-text-primary">
              {formatActionPlanForDisplay(intervention.final_action)}
            </p>
          </div>
        )}
      </section>

      {questions.length > 0 && (
        <section className="rounded-2xl border border-background-tertiary bg-surface p-5 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">내 답변</h2>
          <ul className="space-y-3">
            {questions.map((q, idx) => {
              const key = `q${idx + 1}`;
              const a = answers[key];
              if (!a) return null;
              return (
                <li key={key} className="space-y-1">
                  <p className="text-xs text-text-tertiary">{q}</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{a}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ReviewForm logId={logId} />
    </main>
  );
}
