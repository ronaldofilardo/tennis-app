import React, { useState, useEffect } from 'react';
import { httpClient } from '../config/httpClient';
import { createLogger } from '../services/logger';
import './AvailableMatchesForAnnotation.css';

const log = createLogger('AvailableMatchesForAnnotation');

interface AvailableMatch {
  id: string;
  publicMatchCode?: string | null;
  sportType: string;
  format: string;
  playerP1: string;
  playerP2: string;
  courtType?: string;
  scheduledAt?: string;
  venue?: { name: string };
  createdBy?: { name: string };
}

interface Props {
  onSelectMatch?: (matchId: string) => void;
}

export const AvailableMatchesForAnnotation: React.FC<Props> = ({ onSelectMatch }) => {
  const [matches, setMatches] = useState<AvailableMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      try {
        // Buscar partidas públicas abertas para anotação que ainda não começaram
        const res = await httpClient.get<AvailableMatch[]>(
          '/matches/discover?visibility=PUBLIC&openForAnnotation=true'
        );
        const availableMatches = Array.isArray(res.data) ? res.data : [];
        setMatches(availableMatches);
      } catch (err) {
        log.error('Erro ao carregar partidas disponíveis', err);
        setError('Erro ao carregar partidas disponíveis');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) return <div className="available-matches-loading">Carregando partidas...</div>;
  if (error) return <div className="available-matches-error">{error}</div>;
  if (matches.length === 0) return null;

  const formatScheduled = (date?: string): string => {
    if (!date) return 'Horário a definir';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Horário a definir';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMatchCode = (match: AvailableMatch): string => {
    return match.publicMatchCode || match.id.slice(0, 6).toUpperCase();
  };

  const SPORT_ICONS: Record<string, string> = {
    TENNIS: '🎾',
    PADEL: '🏓',
    BEACH_TENNIS: '🏖️',
  };

  return (
    <div className="available-matches-section">
      <h3>📋 Partidas Disponíveis para Anotar</h3>
      <div className="available-matches-grid">
        {matches.map((match) => (
          <div key={match.id} className="available-match-card">
            <div className="match-code-badge">{getMatchCode(match)}</div>
            <div className="match-info">
              <div className="match-players">
                <strong>{match.playerP1}</strong> vs <strong>{match.playerP2}</strong>
              </div>
              <div className="match-details">
                <span className="sport-badge" title={match.sportType}>
                  {SPORT_ICONS[match.sportType] || '🎾'} {match.sportType}
                </span>
                {match.courtType && <span className="court-badge">{match.courtType}</span>}
                {match.scheduledAt && (
                  <span className="time-badge" title={match.scheduledAt}>
                    🕐 {formatScheduled(match.scheduledAt)}
                  </span>
                )}
              </div>
              {match.createdBy && (
                <div className="match-creator">Criada por: <strong>{match.createdBy.name}</strong></div>
              )}
            </div>
            <button
              className="annotate-btn"
              onClick={() => onSelectMatch?.(match.id)}
              title="Anotar esta partida"
            >
              → Anotar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvailableMatchesForAnnotation;
