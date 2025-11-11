import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import './MatchSetup.css';
import { useAuth } from '../contexts/AuthContext';

// Interface para as props, incluindo a função para voltar ao Dashboard
interface CreatedMatchData {
  id: string;
  sportType: string;
  format: string;
  players: { p1: string; p2: string };
  status?: string;
  createdAt?: string;
}

interface MatchSetupProps {
  onMatchCreated: (matchData: CreatedMatchData) => void;
  onBackToDashboard: () => void;
  players?: Array<{ id: string; name: string; email?: string }>; // accept PlayerMock shape
}

const MatchSetup: React.FC<MatchSetupProps> = ({ onBackToDashboard, onMatchCreated, players }) => {
  const { currentUser } = useAuth();
  const [sport, setSport] = useState('TENNIS');
  const [format, setFormat] = useState('BEST_OF_3');
  const [nickname, setNickname] = useState('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [visibleTo, setVisibleTo] = useState<'both' | string>('both');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Impede o recarregamento da página

    // Garantir que os jogadores estão definidos
    if (!player1 || !player2) {
      setError('Os nomes dos jogadores são obrigatórios.');
      return;
    }

    try {
      let visibleToValue = visibleTo;
      if (players && visibleTo !== 'both') {
        const selectedPlayer = players.find(p => p.id === visibleTo);
        if (selectedPlayer) {
          visibleToValue = selectedPlayer.email || visibleTo;
        }
      }

      setError(null);

      const response = await axios.post(`${API_URL}/matches`, {
        sportType: sport,
        format: format,
        players: { p1: player1 || 'Jogador 1', p2: player2 || 'Jogador 2' },
        nickname: nickname || null,
        visibleTo: visibleToValue || 'both',
        apontadorEmail: currentUser?.email || '',
      });

      // eslint-disable-next-line no-console
      console.log('axios.post retornou:', response.data);
      onMatchCreated(response.data as CreatedMatchData); // Navega para o placar com os dados da nova partida

    } catch (error) {
      console.error('Erro ao criar a partida:', error);
      alert('Falha ao criar a partida. Verifique o console do navegador e do backend.');
    }
  };
  return (
    <div className="match-setup">
      <header className="match-setup-header">
        <button onClick={onBackToDashboard} className="back-button">← Voltar</button>
        <h2>Nova Partida</h2>
      </header>
      {error && (
        <div className="form-error" style={{ color: 'red', margin: '8px 0' }}>{error}</div>
      )}
      <form className="setup-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="sport">Desporto</label>
          <select id="sport" name="sport" value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="TENNIS">Tênis</option>
            <option value="PADEL">Padel</option>
            <option value="BEACH_TENNIS">Beach Tennis</option>
          </select>
        </div>

        <div className="form-group">
          <label>Jogadores</label>
          <div className="player-inputs">
            {players && players.length > 0 ? (
              <>
                <select value={player1} onChange={e => setPlayer1(e.target.value)} data-testid="player1-input">
                  <option value="">Selecione Jogador 1</option>
                  {players.map((p: { id: string; name: string; email?: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <span>vs</span>
                <select value={player2} onChange={e => setPlayer2(e.target.value)} data-testid="player2-input">
                  <option value="">Selecione Jogador 2</option>
                  {players.map((p: { id: string; name: string; email?: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </>
            ) : (
              <>
                <input 
                  type="text" 
                  placeholder="Jogador 1 (ou Dupla 1)" 
                  value={player1}
                  onChange={(e) => setPlayer1(e.target.value)}
                  data-testid="player1-input"
                />
                <span>vs</span>
                <input 
                  type="text" 
                  placeholder="Jogador 2 (ou Dupla 2)" 
                  value={player2}
                  onChange={(e) => setPlayer2(e.target.value)}
                  data-testid="player2-input"
                />
              </>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Modo de jogo</label>
          <select id="format" name="format" value={format} onChange={(e) => setFormat(e.target.value)} data-testid="format-select">
            <option value="BEST_OF_3">Melhor de 3 sets com vantagem, Set tie-break em todos os sets</option>
            <option value="BEST_OF_3_MATCH_TB">Melhor de 3 sets com vantagem, Set tie-break em 6-6, Match tie-break no 3º set</option>
            <option value="BEST_OF_5">Melhor de 5 sets com vantagem, Set tie-break em todos os sets</option>
            <option value="SINGLE_SET">Set único com vantagem, Set tie-break em 6-6</option>
            <option value="PRO_SET">Pro Set (8 games) com vantagem, Set tie-break em 8-8</option>
            <option value="MATCH_TIEBREAK">Match Tiebreak (10 pontos) sem vantagem, Primeiro a 10</option>
            <option value="SHORT_SET">Set curto (4 games) com vantagem, Tie-break em 4-4</option>
            <option value="NO_AD">Melhor de 3 sets método No-Ad (ponto decisivo em 40-40), Set tie-break em 6-6</option>
            <option value="FAST4">Fast4 Tennis (4 games) método No-Ad, Tie-break em 3-3</option>
            <option value="SHORT_SET_NO_AD">Set curto (4 games) método No-Ad, Tie-break em 4-4</option>
            <option value="NO_LET_TENNIS">Melhor de 3 sets método No-Let (saque na rede está em jogo)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Apelido da partida (opcional)</label>
          <input
            type="text"
            placeholder="Ex: Desafio Amigos"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ fontSize: 12 }}>Visível para</label>
            <select value={visibleTo} onChange={e => setVisibleTo(e.target.value)}>
              <option value="both">Ambos</option>
              <option value={player1} disabled={!player1}>Jogador 1</option>
              <option value={player2} disabled={!player2}>Jogador 2</option>
            </select>
            <button type="submit" className="start-match-button">Iniciar Partida</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MatchSetup;

