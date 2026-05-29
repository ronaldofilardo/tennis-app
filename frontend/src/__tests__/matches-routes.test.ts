import { describe, it, expect } from 'vitest';
import { endedSessionsFilter } from '../../api/_handlers/_matches-special-routes.js';
import { extractReportSnapshot } from '../../api/_handlers/_matches-sessions.js';

describe('matches route helpers', () => {
  it('includes completed or ended abandoned sessions in the annotation filter', () => {
    expect(endedSessionsFilter).toEqual({
      OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
    });
  });

  it('parses finalStateSnapshot when available', () => {
    const session = {
      finalStateSnapshot: JSON.stringify({ score: { sets: [1, 0] } }),
      matchStateSnapshot: null,
    };

    expect(extractReportSnapshot(session)).toEqual({ score: { sets: [1, 0] } });
  });

  it('falls back to matchStateSnapshot when finalStateSnapshot is absent', () => {
    const session = {
      finalStateSnapshot: null,
      matchStateSnapshot: JSON.stringify({ score: { sets: [2, 3] } }),
    };

    expect(extractReportSnapshot(session)).toEqual({ score: { sets: [2, 3] } });
  });

  it('returns null when snapshot JSON is invalid', () => {
    const session = {
      finalStateSnapshot: '{invalid}',
      matchStateSnapshot: '{also:invalid}',
    };

    expect(extractReportSnapshot(session)).toBeNull();
  });

  it('handles ABANDONED sessions with endedAt and matchStateSnapshot', () => {
    // Simulates the fixed behavior: ABANDONED sessions now have endedAt set
    const session = {
      status: 'ABANDONED',
      isActive: false,
      endedAt: new Date('2026-05-29T04:00:00Z'),
      finalStateSnapshot: null,
      matchStateSnapshot: JSON.stringify({ score: { sets: [1, 1], currentGame: ['0', '0'] } }),
    };

    expect(extractReportSnapshot(session)).toEqual({
      score: { sets: [1, 1], currentGame: ['0', '0'] },
    });
  });

  it('prioritizes finalStateSnapshot over matchStateSnapshot even when both exist', () => {
    const session = {
      finalStateSnapshot: JSON.stringify({ winner: 'p1' }),
      matchStateSnapshot: JSON.stringify({ winner: 'p2' }),
    };

    const result = extractReportSnapshot(session);
    expect(result.winner).toBe('p1');
  });
});
