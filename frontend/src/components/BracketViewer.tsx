// frontend/src/components/BracketViewer.tsx
// Visualização de bracket de torneio (eliminação simples) — Fase 3

import React, { useEffect, useState, useCallback } from 'react';
import { httpClient } from '../config/httpClient';
import './BracketViewer.css';

interface BracketMatch {
  id: string;
  playerP1: string;
  playerP2: string;
  player1Id?: string;
  player2Id?: string;
  roundNumber: number;
  bracketPosition: number;
  status: string;
  score?: {
    sets: Array<{ p1: number; p2: number }>;
  };
  winner?: string;
}

interface BracketViewerProps {
  tournamentId: string;
  categoryId?: string;
  /** Quando clica em uma partida */
  onMatchClick?: (match: BracketMatch) => void;
  /** Refresh automático (ms) */
  refreshInterval?: number;
}

interface RoundData {
  roundNumber: number;
  label: string;
  matches: BracketMatch[];
}

const BracketViewer: React.FC<BracketViewerProps> = ({
  tournamentId,
  categoryId,
  onMatchClick,
  refreshInterval = 30000,
}) => {
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBracket = useCallback(async () => {
    try {
      const response = await httpClient.get<{
        tournament: {
          matches: BracketMatch[];
        };
      }>(`/tournaments/${tournamentId}`);

      let matches = response.data.tournament?.matches || [];

      // Filtrar por categoria se fornecido
      if (categoryId) {
        matches = matches.filter(
          (m: BracketMatch & { categoryId?: string }) =>
            (m as BracketMatch & { categoryId?: string }).categoryId === categoryId,
        );
      }

      // Agrupar por rodada
      const roundsMap = new Map<number, BracketMatch[]>();
      for (const match of matches) {
        if (!match.roundNumber) continue;
        roundsMap.set(match.roundNumber, [...(roundsMap.get(match.roundNumber) ?? []), match]);
      }

      // Ordenar rodadas (decrescente — primeira rodada tem nº maior)
      const sortedRounds = Array.from(roundsMap.entries())
        .sort(([a], [b]) => b - a)
        .map(([roundNum, roundMatches], _idx, arr) => ({
          roundNumber: roundNum,
          label: getRoundLabel(roundNum, arr.length),
          matches: roundMatches.sort((a, b) => a.bracketPosition - b.bracketPosition),
        }));

      setRounds(sortedRounds);
      setError(null);
    } catch {
      setError('Erro ao carregar o chaveamento.');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, categoryId]);

  useEffect(() => {
    fetchBracket();
    if (refreshInterval > 0) {
      const interval = setInterval(fetchBracket, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchBracket, refreshInterval]);

  if (loading) {
    return <div className="bracket-loading">Carregando chaveamento...</div>;
  }

  if (error) {
    return <div className="bracket-error">{error}</div>;
  }

  if (rounds.length === 0) {
    return <div className="bracket-empty">Chaveamento ainda não foi gerado para este torneio.</div>;
  }

  return (
    <div className="bracket-viewer">
      <div className="bracket-container">
        {rounds.map((round) => (
          <div key={round.roundNumber} className="bracket-round">
            <div className="bracket-round-header">{round.label}</div>
            <div className="bracket-round-matches">
              {round.matches.map((match) => (
                <div
                  key={match.id}
                  className={`bracket-match ${match.status === 'FINISHED' ? 'finished' : ''} ${match.status === 'IN_PROGRESS' ? 'live' : ''}`}
                  onClick={() => onMatchClick?.(match)}
                  role="button"
                  tabIndex={0}
                >
                  <div
                    className={`bracket-player top ${match.winner === match.player1Id ? 'winner' : ''}`}
                  >
                    <span className="bracket-player-name">{match.playerP1 || 'A definir'}</span>
                    {match.score?.sets && (
                      <span className="bracket-score">
                        {match.score.sets.map((s) => s.p1).join(' ')}
                      </span>
                    )}
                  </div>
                  <div
                    className={`bracket-player bottom ${match.winner === match.player2Id ? 'winner' : ''}`}
                  >
                    <span className="bracket-player-name">{match.playerP2 || 'A definir'}</span>
                    {match.score?.sets && (
                      <span className="bracket-score">
                        {match.score.sets.map((s) => s.p2).join(' ')}
                      </span>
                    )}
                  </div>
                  {match.status === 'IN_PROGRESS' && (
                    <span className="bracket-live-badge">AO VIVO</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function getRoundLabel(roundNumber: number, totalRounds: number): string {
  if (roundNumber === 1) return 'Final';
  if (roundNumber === 2) return 'Semifinal';
  if (roundNumber === 3) return 'Quartas';
  if (roundNumber === 4) return 'Oitavas';

  // Rodadas de grupo (100+)
  if (roundNumber >= 100) {
    return `Grupo ${String.fromCharCode(65 + (roundNumber - 100))}`;
  }

  return `Rodada ${totalRounds - roundNumber + 1}`;
}

export default BracketViewer;
