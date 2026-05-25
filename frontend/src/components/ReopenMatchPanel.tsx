import React, { useState } from 'react';
import { httpClient } from '../config/httpClient';
import './ReopenMatchPanel.css';

interface ReopenMatchPanelProps {
  matchId: string;
  isCreator: boolean;
  hasActiveSession: boolean;
  onReopened: () => void;
}

const ReopenMatchPanel: React.FC<ReopenMatchPanelProps> = ({
  matchId,
  isCreator,
  hasActiveSession,
  onReopened,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReopen = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await httpClient.patch(`/matches/${matchId}`, {
        action: 'reopenMatch',
      });

      if (!response.ok) {
        throw new Error(`Falha ao reabrir: ${response.status}`);
      }

      onReopened();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reabrir partida');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isCreator && !hasActiveSession) {
    return null;
  }

  return (
    <div className="reopen-match-panel">
      <div className="reopen-content">
        <h2>Partida Encerrada</h2>
        <p>
          {hasActiveSession
            ? 'Ainda há anotação em andamento que pode ser retomada.'
            : 'A partida foi finalizada, mas você pode continuar a anotação.'}
        </p>

        {error && <div className="reopen-error">{error}</div>}

        <div className="reopen-actions">
          <button
            className="reopen-btn reopen-btn-primary"
            onClick={handleReopen}
            disabled={isLoading}
          >
            {isLoading ? 'Reabrindo...' : 'Continuar Anotação'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReopenMatchPanel;
