import type { AthleteStats } from '../components/AthleteHeader';
import { resolvePlayerName } from '../data/players';

type DashboardMatchPlayers = { p1: string; p2: string };

/** Estado da partida retornado pela API — estrutura parcialmente tipada */
interface DashboardMatchState {
  winner?: string;
  matchWinner?: string;
  startedAt?: string;
  endedAt?: string;
}

type DashboardMatch = {
  id: string | number;
  players?: DashboardMatchPlayers | string;
  status?: string;
  matchState?: DashboardMatchState | null;
  [key: string]: unknown;
};

export function computeAthleteStats(visibleMatches: DashboardMatch[], email: string): AthleteStats {
  const finished = visibleMatches.filter((m) => m.status === 'FINISHED');

  let wins = 0;
  let losses = 0;

  finished.forEach((match) => {
    const ms = match.matchState;
    if (!ms || typeof ms !== 'object') return;
    const winner = ms.winner ?? ms.matchWinner;
    const players =
      match.players && typeof match.players === 'object'
        ? (match.players as DashboardMatchPlayers)
        : null;
    if (!winner || !players) return;

    const isP1 = resolvePlayerName(players.p1) === resolvePlayerName(email) || players.p1 === email;
    if ((winner === 'PLAYER_1' && isP1) || (winner === 'PLAYER_2' && !isP1)) {
      wins++;
    } else {
      losses++;
    }
  });

  const totalMatches = finished.length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  let currentStreak = 0;
  let streakType: 'win' | 'loss' = 'win';

  const sortedFinished = [...finished].sort((a, b) => {
    const aMs = a.matchState;
    const bMs = b.matchState;
    const aDate = aMs?.endedAt ?? aMs?.startedAt ?? '';
    const bDate = bMs?.endedAt ?? bMs?.startedAt ?? '';
    return bDate.localeCompare(aDate);
  });

  for (const match of sortedFinished) {
    const ms = match.matchState;
    if (!ms) break;
    const winner = ms.winner ?? ms.matchWinner;
    const players =
      match.players && typeof match.players === 'object'
        ? (match.players as DashboardMatchPlayers)
        : null;
    if (!winner || !players) break;

    const isP1 = players.p1 === email;
    const isWin = (winner === 'PLAYER_1' && isP1) || (winner === 'PLAYER_2' && !isP1);

    if (currentStreak === 0) {
      streakType = isWin ? 'win' : 'loss';
      currentStreak = 1;
    } else if ((isWin && streakType === 'win') || (!isWin && streakType === 'loss')) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    wins,
    losses,
    totalMatches,
    winRate,
    currentStreak,
    streakType,
  };
}
