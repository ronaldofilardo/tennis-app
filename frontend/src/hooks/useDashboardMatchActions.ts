import { useState, useCallback } from 'react';
import type { MatchStatsData as MatchStatsModalData } from '../components/MatchStatsModal';
import { API_URL } from '../config/api';
import { resolvePlayerName } from '../data/players';
import { createLogger } from '../services/logger';

type DashboardMatchPlayers = { p1: string; p2: string };
type DashboardMatch = {
  id: string | number;
  players?: DashboardMatchPlayers | string;
  sportType?: string;
  sport?: string;
  format?: string;
  courtType?: 'GRASS' | 'CLAY' | 'HARD';
  nickname?: string | null;
  status?: string;
  score?: string;
  completedSets?: Array<{
    setNumber: number;
    games: { PLAYER_1: number; PLAYER_2: number };
    winner: string;
  }>;
  visibleTo?: string;
  matchState?: Record<string, unknown> | null;
};

interface UseDashboardMatchActionsReturn {
  isStatsModalOpen: boolean;
  setIsStatsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMatch: DashboardMatch | null;
  matchStats: MatchStatsModalData | null;
  loadingMatchId: string | number | null;
  matchStates: Record<string, unknown>;
  openStatsForMatch: (matchId: string | number) => Promise<void>;
  fetchMatchStateForContinue: (matchId: string | number) => Promise<unknown>;
  modalPlayerNames: { p1: string; p2: string };
}

export function useDashboardMatchActions(
  toastError: (msg: string, title: string) => void,
): UseDashboardMatchActionsReturn {
  const dashLog = createLogger('Dashboard');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<DashboardMatch | null>(null);
  const [matchStats, setMatchStats] = useState<MatchStatsModalData | null>(null);
  const [loadingMatchId, setLoadingMatchId] = useState<string | number | null>(null);
  const [matchStates, setMatchStates] = useState<Record<string, unknown>>({});

  const fetchMatchState = useCallback(async (matchId: string | number) => {
    const res = await fetch(`${API_URL}/matches/${matchId}/state`);
    if (!res.ok) throw new Error('Falha ao buscar state');
    let data = null;
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error('Resposta inválida do servidor (state)');
    }
    if (!data) throw new Error('Dados de state não encontrados');
    setSelectedMatch({
      id: data.id,
      players: data.players,
      sportType: data.sportType,
      sport: data.sport,
      format: data.format,
      courtType: data.courtType,
      nickname: data.nickname || null,
      status: data.status,
      score: data.score,
      completedSets: data.completedSets,
      visibleTo: data.visibleTo,
    });
  }, []);

  const fetchMatchStats = useCallback(async (matchId: string | number) => {
    const res = await fetch(`${API_URL}/matches/${matchId}/stats`);
    if (!res.ok) throw new Error('Falha ao buscar stats');
    let stats = null;
    try {
      const text = await res.text();
      stats = text ? JSON.parse(text) : null;
    } catch {
      throw new Error('Resposta inválida do servidor (stats)');
    }
    if (!stats) throw new Error('Estatísticas não encontradas');
    setMatchStats(stats);
  }, []);

  const openStatsForMatch = useCallback(
    async (matchId: string | number) => {
      setLoadingMatchId(matchId);
      try {
        await fetchMatchState(matchId);
        setIsStatsModalOpen(true);
        await fetchMatchStats(matchId);
      } catch (err) {
        dashLog.error('Erro ao carregar estatísticas', err);
        toastError('Não foi possível carregar as estatísticas.', 'Erro');
      } finally {
        setLoadingMatchId(null);
      }
    },
    [fetchMatchState, fetchMatchStats, toastError, dashLog],
  );

  const fetchMatchStateForContinue = useCallback(
    async (matchId: string | number) => {
      const matchIdStr = matchId.toString();
      if (matchStates[matchIdStr]) return matchStates[matchIdStr];

      try {
        const res = await fetch(`${API_URL}/matches/${matchId}/state`);
        if (!res.ok) throw new Error('Falha ao buscar state');
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (data) {
          setMatchStates((prev) => ({ ...prev, [matchIdStr]: data }));
          return data;
        }
      } catch {
        // silently fail
      }
      return null;
    },
    [matchStates],
  );

  const modalPlayerNames =
    selectedMatch && typeof selectedMatch.players === 'object'
      ? {
          p1: resolvePlayerName((selectedMatch.players as DashboardMatchPlayers).p1),
          p2: resolvePlayerName((selectedMatch.players as DashboardMatchPlayers).p2),
        }
      : { p1: 'Jogador 1', p2: 'Jogador 2' };

  return {
    isStatsModalOpen,
    setIsStatsModalOpen,
    selectedMatch,
    matchStats,
    loadingMatchId,
    matchStates,
    openStatsForMatch,
    fetchMatchStateForContinue,
    modalPlayerNames,
  };
}
