import type { User } from '@supabase/supabase-js';

export type PostLoginAction =
  | { kind: 'proceed' }
  | { kind: 'recover'; scheduledAt: string }
  | { kind: 'expired' };

export function getDeletionScheduledAt(user: User | null | undefined): string | null {
  const raw = user?.user_metadata?.deletion_scheduled_at;
  return typeof raw === 'string' ? raw : null;
}

export function evaluateDeletionState(
  user: User | null | undefined,
  now: Date = new Date()
): PostLoginAction {
  const scheduledAtRaw = getDeletionScheduledAt(user);
  if (!scheduledAtRaw) return { kind: 'proceed' };

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) return { kind: 'proceed' };

  if (scheduledAt.getTime() <= now.getTime()) {
    return { kind: 'expired' };
  }

  return { kind: 'recover', scheduledAt: scheduledAt.toISOString() };
}
