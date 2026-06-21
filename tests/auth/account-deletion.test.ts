import { describe, it, expect } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  evaluateDeletionState,
  getDeletionScheduledAt,
} from '@/lib/auth/deletion-state';

function makeUser(metadata: Record<string, unknown> | undefined): User {
  return {
    id: 'u1',
    app_metadata: {},
    user_metadata: metadata ?? {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  } as unknown as User;
}

describe('getDeletionScheduledAt', () => {
  it('returns null when user is null', () => {
    expect(getDeletionScheduledAt(null)).toBeNull();
  });

  it('returns null when metadata has no deletion_scheduled_at', () => {
    expect(getDeletionScheduledAt(makeUser({}))).toBeNull();
  });

  it('returns the timestamp when metadata has it', () => {
    const ts = '2026-05-26T00:00:00Z';
    expect(getDeletionScheduledAt(makeUser({ deletion_scheduled_at: ts }))).toBe(ts);
  });

  it('returns null when metadata value is not a string', () => {
    expect(getDeletionScheduledAt(makeUser({ deletion_scheduled_at: 123 }))).toBeNull();
  });
});

describe('evaluateDeletionState', () => {
  const now = new Date('2026-04-26T12:00:00Z');

  it('proceeds when no deletion is scheduled', () => {
    expect(evaluateDeletionState(makeUser({}), now)).toEqual({ kind: 'proceed' });
  });

  it('proceeds when user is null', () => {
    expect(evaluateDeletionState(null, now)).toEqual({ kind: 'proceed' });
  });

  it('proceeds when scheduled timestamp is invalid', () => {
    expect(
      evaluateDeletionState(makeUser({ deletion_scheduled_at: 'not-a-date' }), now)
    ).toEqual({ kind: 'proceed' });
  });

  it('returns recover with iso timestamp when scheduled in the future', () => {
    const future = '2026-05-26T12:00:00Z';
    const result = evaluateDeletionState(
      makeUser({ deletion_scheduled_at: future }),
      now
    );
    expect(result).toEqual({
      kind: 'recover',
      scheduledAt: new Date(future).toISOString(),
    });
  });

  it('returns expired when scheduled timestamp is in the past', () => {
    const past = '2026-04-25T12:00:00Z';
    const result = evaluateDeletionState(
      makeUser({ deletion_scheduled_at: past }),
      now
    );
    expect(result).toEqual({ kind: 'expired' });
  });

  it('returns expired when scheduled timestamp is exactly now', () => {
    const exact = now.toISOString();
    const result = evaluateDeletionState(
      makeUser({ deletion_scheduled_at: exact }),
      now
    );
    expect(result).toEqual({ kind: 'expired' });
  });
});
