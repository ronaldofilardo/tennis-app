import React, { useState } from 'react';
import MatchStatsModal from '../components/MatchStatsModal';
import type { MatchStatsData as MatchStatsModalData } from '../components/MatchStatsModal';
import { API_URL } from '../config/api';
import './Dashboard.css';

type DashboardMatchPlayers = { p1: string; p2: string };
type DashboardMatch = {
  id: string | number;
  players?: DashboardMatchPlayers | string;
  sportType?: string;
  sport?: string;
  format?: string;
  nickname?: string | null;
  status?: string;
  score?: string;
  completedSets?: Array<{ setNumber: number; games: { PLAYER_1: number; PLAYER_2: number }; winner: string }>;
  visibleTo?: string;
};

interface DashboardProps {
  onNewMatchClick: () => void;
  onContinueMatch?: (match: DashboardMatch, initialState?: any) => void;
  onStartMatch?: (match: DashboardMatch) => void;
  matches: DashboardMatch[];
  loading: boolean;
  error: string | null;
  currentUser?: { role: 'annotator' | 'player'; email: string } | null;
  players?: Array<{ id: string; email?: string; name: string }>;
}

const Dashboard: React.FC<DashboardProps> = ({ onNewMatchClick, onContinueMatch, onStartMatch, matches, loading, error, currentUser }) => {
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<DashboardMatch | null>(null);
  const [matchStats, setMatchStats] = useState<MatchStatsModalData | null>(null);
  const [loadingMatchId, setLoadingMatchId] = useState<string | number | null>(null);
  const [matchStates, setMatchStates] = useState<Record<string, any>>({});

  const fetchMatchState = async (matchId: string | number) => {
    const res = await fetch(`${API_URL}/matches/${matchId}/state`);
    if (!res.ok) throw new Error('Falha ao buscar state');
    let data = null;
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      throw new Error('Resposta inválida do servidor (state)');
    }
    if (!data) throw new Error('Dados de state não encontrados');
    setSelectedMatch({ id: data.id, players: data.players, sportType: data.sportType, sport: data.sport, format: data.format, nickname: data.nickname || null, status: data.status, score: data.score, completedSets: data.completedSets, visibleTo: data.visibleTo });
  };

  const fetchMatchStats = async (matchId: string | number) => {
    const res = await fetch(`${API_URL}/matches/${matchId}/stats`);
    if (!res.ok) throw new Error('Falha ao buscar stats');
    let stats = null;
    try {
      const text = await res.text();
      stats = text ? JSON.parse(text) : null;
    } catch (e) {
      throw new Error('Resposta inválida do servidor (stats)');
    }
    if (!stats) throw new Error('Estatísticas não encontradas');
    setMatchStats(stats);
  };

  // Só mostra partidas em que o usuário é apontador ou está em playersEmails
  const canViewMatch = (match: any) => {
    if (!currentUser) return false;
    const email = currentUser.email;
    if (!email) return false;
    // Se for apontador
    if (match.apontadorEmail === email) return true;
    // Se estiver em playersEmails
    if (Array.isArray(match.playersEmails) && match.playersEmails.includes(email)) return true;
    return false;
  };

  const openStatsForMatch = async (matchId: string | number) => {
    setLoadingMatchId(matchId);
    try {
      await fetchMatchState(matchId);
      setIsStatsModalOpen(true);
      await fetchMatchStats(matchId);
    } catch (err) {
      console.error(err);
      alert('Não foi possível carregar as estatísticas.');
    } finally {
      setLoadingMatchId(null);
    }
  };

  const fetchMatchStateForContinue = async (matchId: string | number) => {
    const matchIdStr = matchId.toString();
    if (matchStates[matchIdStr]) return matchStates[matchIdStr];

    try {
      const res = await fetch(`${API_URL}/matches/${matchId}/state`);
      if (!res.ok) throw new Error('Falha ao buscar state');
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data) {
        setMatchStates(prev => ({ ...prev, [matchIdStr]: data }));
        return data;
      }
    } catch (error) {
      console.error('Erro ao buscar estado da partida:', error);
    }
    return null;
  };

  const modalPlayerNames = selectedMatch && typeof selectedMatch.players === 'object' ? selectedMatch.players as DashboardMatchPlayers : { p1: 'Jogador 1', p2: 'Jogador 2' };

  const FORMAT_LABELS: Record<string, string> = {
    BEST_OF_3: 'Melhor de 3 sets com vantagem, Set tie-break em todos os sets',
    BEST_OF_3_MATCH_TB: 'Melhor de 3 sets com vantagem, Match tie-break no 3º set',
    BEST_OF_5: 'Melhor de 5 sets com vantagem, Set tie-break em todos os sets',
    SINGLE_SET: 'Set único com vantagem, Set tie-break em 6-6',
    PRO_SET: 'Pro Set (8 games) com vantagem, Set tie-break em 8-8',
    MATCH_TIEBREAK: 'Match Tiebreak (10 pontos) sem vantagem, Primeiro a 10',
    SHORT_SET: 'Set curto (4 games) com vantagem, Tie-break em 4-4',
    NO_AD: 'Melhor de 3 sets método No-Ad (ponto decisivo em 40-40)',
    FAST4: 'Fast4 Tennis (4 games) método No-Ad, Tie-break em 3-3',
    SHORT_SET_NO_AD: 'Set curto (4 games) método No-Ad, Tie-break em 4-4',
    NO_LET_TENNIS: 'Melhor de 3 sets método No-Let (saque na rede está em jogo)'
  };

  return (
  <div className="dashboard" data-testid="dashboard">
      <header className="dashboard-header">
        <h2>Minhas Partidas</h2>
  <div className="dashboard-actions"><button onClick={onNewMatchClick} className="new-match-button">Nova Partida</button></div>
      </header>

      {loading && <p>Carregando partidas...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="match-list">
        {(Array.isArray(matches) ? matches : [])
          .filter((match) => canViewMatch(match))
          .map((match) => {
          const playersText = match.players && typeof match.players === 'object' ? `${match.players.p1} vs. ${match.players.p2}` : (match.players ?? '—');
          const canView = canViewMatch(match);
          // extrair último viewLog se houver (checagem segura)
          const possibleState = (match as unknown) as { matchState?: unknown };
          const rawMatchState = possibleState.matchState && typeof possibleState.matchState === 'object' ? possibleState.matchState as Record<string, unknown> : null;
          const maybeViewLog = rawMatchState ? rawMatchState['viewLog'] : null;
          const viewLog = Array.isArray(maybeViewLog) ? maybeViewLog as Array<Record<string, unknown>> : null;
          const lastView = viewLog && viewLog.length > 0 ? viewLog[viewLog.length - 1] : null;
          const lastStartedAt = lastView && typeof lastView['startedAt'] === 'string' ? String(lastView['startedAt']) : null;
          const lastEndedAt = lastView && typeof lastView['endedAt'] === 'string' ? String(lastView['endedAt']) : null;
          return (
            <div key={match.id} className="match-card" onClick={async () => {
              if (match.status === 'NOT_STARTED' && onStartMatch) {
                console.log(`[Dashboard] Iniciando partida NOT_STARTED: ${match.id}`);
                onStartMatch(match);
              } else if (match.status === 'IN_PROGRESS' && onContinueMatch) {
                console.log(`[Dashboard] Continuando partida IN_PROGRESS: ${match.id}`);
                const initialState = await fetchMatchStateForContinue(match.id);
                onContinueMatch(match, initialState);
              }
              // Removido: cliques em FINISHED agora só abrem stats via botão dedicado
            }}>
              <div className="match-card-header">
                <div className="match-card-sport">{(match.sportType || match.sport || 'Desporto').toUpperCase()}</div>
                <div className="match-actions">
                  <button
                    className="stats-button"
                    onClick={async (e) => { e.stopPropagation(); if (!canView) { alert('Você não tem permissão para ver o resultado desta partida.'); return; } await openStatsForMatch(match.id); }}
                    title={canView ? 'Abrir resultado' : 'Acesso restrito'}
                    disabled={!canView || (loadingMatchId !== null && loadingMatchId !== match.id)}
                  >{loadingMatchId === match.id ? 'Carregando...' : '📊 Abrir Resultado'}</button>
                </div>
              </div>

              {/* Meta row: nickname (left) and status (right) on same line */}
              <div className="match-card-meta-row">
                {match.nickname ? <div className="match-card-nickname-line">{match.nickname}</div> : <div className="match-card-nickname-line">&nbsp;</div>}
                <div className="match-card-status">{match.status || ''}</div>
              </div>
              <div className="match-card-players">{playersText}</div>
              {/* Linha AO VIVO para partidas em andamento */}
              {(() => {
                if (match.status !== 'IN_PROGRESS') return null;
                // Padrão já usado acima para extrair matchState
                const possibleState = (match as unknown) as { matchState?: unknown };
                const ms = possibleState.matchState && typeof possibleState.matchState === 'object' ? possibleState.matchState as Record<string, unknown> : null;
                if (!ms) return null;
                // Detecta tie-break
                const currentGame = (ms.currentGame && typeof ms.currentGame === 'object') ? ms.currentGame as Record<string, unknown> : null;
                const isTiebreak = currentGame ? Boolean(currentGame['isTiebreak']) : false;
                const isMatchTiebreak = currentGame ? Boolean(currentGame['isMatchTiebreak']) : false;
                // Parciais dos sets (ex: 7/6(7))
                const setsPartials: string[] = [];
                if (Array.isArray(ms.completedSets)) {
                  ms.completedSets.forEach((set) => {
                    if (set && typeof set === 'object') {
                      const s = set as Record<string, unknown>;
                      const games = s['games'] as Record<string, number> | undefined;
                      const tbs = s['tiebreakScore'] as Record<string, number> | undefined;
                      const g1 = games?.PLAYER_1 ?? 0;
                      const g2 = games?.PLAYER_2 ?? 0;
                      if (tbs) {
                        const tb1 = tbs.PLAYER_1 ?? 0;
                        const tb2 = tbs.PLAYER_2 ?? 0;
                        const winner = s['winner'] as string;
                        if (winner === 'PLAYER_1') {
                          setsPartials.push(`${g1}/${g2}(${tb1})`);
                        } else {
                          setsPartials.push(`${g2}/${g1}(${tb2})`);
                        }
                      } else {
                        setsPartials.push(`${g1}/${g2}`);
                      }
                    }
                  });
                }
                // Parcial do set atual (em andamento)
                const currentSetState = (ms.currentSetState && typeof ms.currentSetState === 'object') ? ms.currentSetState as Record<string, unknown> : null;
                const currentSetGames = currentSetState ? currentSetState['games'] as Record<string, number> | undefined : undefined;
                const currentGameObj = currentGame as Record<string, unknown> | null;
                const pointsObj = currentGameObj ? currentGameObj['points'] as Record<string, string> | undefined : undefined;
                if (currentSetState) {
                  const g1 = currentSetGames?.PLAYER_1 ?? 0;
                  const g2 = currentSetGames?.PLAYER_2 ?? 0;
                  const pointsObj = currentGameObj ? currentGameObj['points'] as Record<string, string> | undefined : undefined;
                  const p1 = pointsObj?.PLAYER_1 ?? '0';
                  const p2 = pointsObj?.PLAYER_2 ?? '0';
                  if (isTiebreak) {
                    setsPartials.push(`${g1}(${p1})/${g2}(${p2}) TB`);
                  } else {
                    setsPartials.push(`${g1}(${p1})/${g2}(${p2})`);
                  }
                }
                return (
                  <div className="status-line live-status dashboard-live-status" data-testid={`live-status-${match.id}`}>
                    <div className="live-status-content">
                      <span className="status-label" data-testid={`live-status-label-${match.id}`}>AO VIVO</span>
                      {isTiebreak && (
                        <span className="tiebreak-indicator-dashboard" data-testid={`live-status-tiebreak-${match.id}`}>
                          {isMatchTiebreak ? 'MATCH TIEBREAK' : 'TIEBREAK'}
                        </span>
                      )}
                      {(() => {
                        const setsObj = (ms.sets && typeof ms.sets === 'object') ? ms.sets as Record<string, number> : undefined;
                        const s1 = setsObj?.PLAYER_1 ?? 0;
                        const s2 = setsObj?.PLAYER_2 ?? 0;
                        const gamesTextLeft = currentSetGames?.PLAYER_1 ?? 0;
                        const gamesTextRight = currentSetGames?.PLAYER_2 ?? 0;
                        const pointsLeft = pointsObj?.PLAYER_1 ?? '0';
                        const pointsRight = pointsObj?.PLAYER_2 ?? '0';
                        return (
                          <>
                            <span className="live-status-item" data-testid={`live-status-sets-${match.id}`}>Sets: <b>{s1}-{s2}</b></span>
                            <span className="live-status-item" data-testid={`live-status-games-${match.id}`}>Games: <b>{gamesTextLeft}-{gamesTextRight}</b></span>
                            <span className="live-status-item" data-testid={`live-status-points-${match.id}`}>Pontos: <b>{pointsLeft}-{pointsRight}</b></span>
                          </>
                        );
                      })()}
                      {setsPartials.length > 0 && (
                        <span className="live-status-item sets-partials" data-testid={`live-status-partials-${match.id}`}>Parciais: {setsPartials.join(' | ')}</span>
                      )}
                    </div>
                  </div>
                );
              })()}
              <div className="match-card-score" data-testid={`match-card-score-${match.id}`}>{match.score || ''}</div>
              {/* Parciais detalhadas (exibe quando houver completedSets, em qualquer status) */}
              {(() => {
                const possibleState2 = (match as unknown) as { completedSets?: unknown; matchState?: unknown };
                // normalizedCompleted: try match.completedSets, then match.matchState.completedSets
                let normalized: Array<unknown> | undefined = undefined;
                if (Array.isArray(possibleState2.completedSets)) {
                  normalized = possibleState2.completedSets as Array<unknown>;
                } else if (typeof possibleState2.completedSets === 'string') {
                  try { normalized = JSON.parse(possibleState2.completedSets as string) as Array<unknown>; } catch { normalized = undefined; }
                }

                if ((!normalized || normalized.length === 0) && possibleState2.matchState && typeof possibleState2.matchState === 'object') {
                  const ms = possibleState2.matchState as Record<string, unknown>;
                  if (Array.isArray(ms['completedSets'])) normalized = ms['completedSets'] as Array<unknown>;
                  else if (typeof ms['completedSets'] === 'string') {
                    try { normalized = JSON.parse(ms['completedSets'] as string) as Array<unknown>; } catch { /* ignore */ }
                  }
                }

                // if still empty, nothing to render
                if (!normalized || normalized.length === 0) return null;

                const parts: string[] = [];
                normalized.forEach((set) => {
                  if (set && typeof set === 'object') {
                    const s = set as Record<string, unknown>;
                    const games = s['games'] as Record<string, number> | undefined;
                    const tbs = s['tiebreakScore'] as Record<string, number> | undefined;
                    const g1 = games?.PLAYER_1 ?? 0;
                    const g2 = games?.PLAYER_2 ?? 0;
                    if (tbs) {
                      const tb1 = tbs.PLAYER_1 ?? 0;
                      const tb2 = tbs.PLAYER_2 ?? 0;
                      const winner = s['winner'] as string;
                      if (winner === 'PLAYER_1') {
                        parts.push(`${g1}/${g2}(${tb1})`);
                      } else {
                        parts.push(`${g2}/${g1}(${tb2})`);
                      }
                    } else {
                      parts.push(`${g1}/${g2}`);
                    }
                  }
                });

                if (parts.length === 0) return null;
                return (
                  <div className="match-card-partials" data-testid={`match-card-partials-${match.id}`}>
                    Parciais: {parts.join(' • ')}
                  </div>
                );
              })()}
              {/* status is shown in the meta row */}
              <div className="match-card-footer">
                {match.nickname ? <div className="match-card-nickname-footer">{match.nickname}</div> : null}
                <div className="match-card-format">{match.format ? (FORMAT_LABELS[match.format] || match.format) : ''}</div>
                {/* Data de início e duração total da partida (preferir matchState.startedAt/endedAt) */}
                {(() => {
                  // tentar extrair matchState diretamente do objeto match
                  const possibleState = (match as unknown) as { matchState?: unknown };
                  const ms = possibleState.matchState && typeof possibleState.matchState === 'object' ? possibleState.matchState as Record<string, unknown> : null;
                  const started = ms && typeof ms['startedAt'] === 'string' ? String(ms['startedAt']) : (lastStartedAt || null);
                  const ended = ms && typeof ms['endedAt'] === 'string' ? String(ms['endedAt']) : (lastEndedAt || null);
                  let durationSec: number | null = null;
                  if (ms && typeof ms['durationSeconds'] === 'number') durationSec = Number(ms['durationSeconds']);
                  if (durationSec == null && started && ended) {
                    durationSec = Math.max(0, Math.floor((new Date(ended).getTime() - new Date(started).getTime())/1000));
                  }

                  if (!started && !durationSec) return null;

                  const startLabel = started ? new Date(started).toLocaleString() : '—';
                  const durLabel = durationSec != null ? new Date(durationSec * 1000).toISOString().substr(11,8) : '—';
                  return (
                    <div className="match-card-lastview">Início: {startLabel} • Tempo total: {durLabel}</div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

  <MatchStatsModal isOpen={isStatsModalOpen} onClose={() => setIsStatsModalOpen(false)} matchId={selectedMatch?.id?.toString() || ''} playerNames={modalPlayerNames} stats={matchStats} nickname={selectedMatch?.nickname || null} />
    </div>
  );
};

export default Dashboard;
