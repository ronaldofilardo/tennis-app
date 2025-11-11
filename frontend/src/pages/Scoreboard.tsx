import React, { useState, useMemo, useEffect } from 'react';
import './Scoreboard.css';
import { TennisScoring } from '../core/scoring/TennisScoring';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { MatchState, TennisFormat } from '../core/scoring/types';
import { API_URL } from '../config/api';

interface MatchData {
  id: string;
  sportType: string;
  format?: TennisFormat | string;
  players?: { p1: string; p2: string };
  status?: string;
  score?: string;
}

interface CompletedSet { setNumber: number; games: { PLAYER_1: number; PLAYER_2: number }; winner: 'PLAYER_1' | 'PLAYER_2'; }
interface ScoreboardProps {
  match: MatchData;
  onEndMatch: () => void;
  onMatchFinished?: (id: string, score: string, winner: string, completedSets: CompletedSet[]) => void;
  initialState?: Partial<MatchState>;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ match, onEndMatch, onMatchFinished, initialState }) => {
  // O 'cérebro' da pontuação é instanciado com o formato específico
  const scoringSystem = useMemo(() => {
    const system = new TennisScoring('PLAYER_1', (match.format as TennisFormat) || 'BEST_OF_3');
    // Habilitar sincronização se temos matchId
    if (match.id) {
      system.enableSync(match.id.toString());
    }
    return system;
  }, [match.format, match.id]);

  const [matchState, setMatchState] = useState<MatchState>(() => {
    if (initialState && initialState.sets && initialState.currentSetState && initialState.currentGame) {
      // Carregar estado salvo
      scoringSystem.loadState(initialState as MatchState);
      return scoringSystem.getState();
    }
    return scoringSystem.getState();
  });

  // Atualizar status da partida para IN_PROGRESS quando inicia
  useEffect(() => {
    const updateMatchStatus = async () => {
      if (match.id && !initialState) { // Só atualizar se for nova partida
        try {
          await fetch(`${API_URL}/matches/${match.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'IN_PROGRESS' })
          });
        } catch (error) {
          console.error('Erro ao atualizar status da partida:', error);
        }
      }
    };
    updateMatchStatus();
  }, [match.id, initialState]);

  const handleAddPoint = async (player: 'PLAYER_1' | 'PLAYER_2') => {
    const newState = await scoringSystem.addPointWithSync(player);
    setMatchState(newState);

    if (newState.isFinished) {
      // Atualizar status para FINISHED no backend
      try {
        await fetch(`${API_URL}/matches/${match.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'FINISHED',
            score: `${newState.sets.PLAYER_1}x${newState.sets.PLAYER_2}`,
            winner: newState.winner
          })
        });
      } catch (error) {
        console.error('Erro ao finalizar partida:', error);
      }

      const score = `${newState.sets.PLAYER_1}x${newState.sets.PLAYER_2}`;
      const winner = newState.winner || '';
      const completedSets = newState.completedSets || [];
      setTimeout(() => {
        alert(`Partida finalizada! Vencedor: ${winner}`);
        if (onMatchFinished) onMatchFinished(match.id, score, winner, completedSets as CompletedSet[]);
      }, 300);
    }
  };

  return (
    <div className="scoreboard" role="region" aria-label="scoreboard">
      <div className="scoreboard-header">
  <h3>{match.sportType} - {TennisConfigFactory.getFormatDisplayName(((match.format || 'BEST_OF_3') as TennisFormat))}</h3>
        <button onClick={onEndMatch} className="end-match-button">Encerrar Partida</button>
      </div>

      <div className="score-display">
        <div className="team">
          <div className="team-name">{match.players?.p1 || 'Jogador A'}</div>
          <div className="sets-score">{matchState.sets.PLAYER_1}</div>
          <div className="game-score">{matchState.currentGame.points.PLAYER_1}</div>
        </div>
        <div className="separator">vs</div>
        <div className="team">
          <div className="team-name">{match.players?.p2 || 'Jogador B'}</div>
          <div className="sets-score">{matchState.sets.PLAYER_2}</div>
          <div className="game-score">{matchState.currentGame.points.PLAYER_2}</div>
        </div>
      </div>

      <div className={`match-status ${matchState.isFinished ? 'finished' : 'in-progress'}`}>
        {matchState.isFinished ? (
          <div className="final-result">
            <span className="status-label">RESULTADO FINAL:</span>
            <span className="winner-highlight">
              {matchState.winner === 'PLAYER_1' ? (match.players?.p1 || 'Jogador A') : (match.players?.p2 || 'Jogador B')} VENCEU!
            </span>
            <span className="final-score">
              {matchState.sets.PLAYER_1} sets x {matchState.sets.PLAYER_2} sets
            </span>
          </div>
        ) : (
          <div className="live-status">
            <span className="status-label">AO VIVO:</span>
            <span className="status-detail">
              Sets: {matchState.sets.PLAYER_1}-{matchState.sets.PLAYER_2} |
              Games: {matchState.currentSetState.games.PLAYER_1}-{matchState.currentSetState.games.PLAYER_2} |
              Pontos: {matchState.currentGame.points.PLAYER_1}-{matchState.currentGame.points.PLAYER_2}
            </span>
          </div>
        )}
      </div>

      <div className="point-controls">
        <button className="point-button" onClick={() => handleAddPoint('PLAYER_1')} disabled={matchState.isFinished}>
          + Ponto {match.players?.p1 || 'Jogador A'}
        </button>
        <button className="point-button" onClick={() => handleAddPoint('PLAYER_2')} disabled={matchState.isFinished}>
          + Ponto {match.players?.p2 || 'Jogador B'}
        </button>
      </div>

      <div className="server-info">
        <span>Sacador: {matchState.server === 'PLAYER_1' ? (match.players?.p1 || 'Jogador A') : (match.players?.p2 || 'Jogador B')}</span>
      </div>

      {matchState.currentGame.isTiebreak && (
        <div className="tiebreak-info" data-testid="tiebreak-info">
          <span>🏆 {matchState.currentGame.isMatchTiebreak ? 'MATCH TIEBREAK' : 'TIEBREAK'}</span>
        </div>
      )}

      {matchState.completedSets && matchState.completedSets.length > 0 && (
        <div className="partials">
          <h4>Parciais</h4>
          <table className="partials-table">
            <thead>
              <tr>
                <th>Set</th>
                <th>{match.players?.p1 || 'Jogador A'}</th>
                <th>{match.players?.p2 || 'Jogador B'}</th>
                <th>Vencedor</th>
              </tr>
            </thead>
            <tbody>
              {matchState.completedSets.map(s => (
                <tr key={s.setNumber} className={s.winner === 'PLAYER_1' ? 'row-p1' : 'row-p2'}>
                  <td>{s.setNumber}</td>
                  <td>{s.games.PLAYER_1}</td>
                  <td>{s.games.PLAYER_2}</td>
                  <td>{s.winner === 'PLAYER_1' ? (match.players?.p1 || 'Jogador A') : (match.players?.p2 || 'Jogador B')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Scoreboard;
