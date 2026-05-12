// frontend/src/components/CreatorEndMatchPanel.tsx
// Painel para criador encerrar manualmente uma partida.
// Exibe apenas se usuário atual for o criador.

import React, { useState } from 'react';
import { httpClient } from '../config/httpClient';

interface CreatorEndMatchPanelProps {
  matchId: string;
  isCreator: boolean;
  matchStatus: string;
  onMatchEnded?: () => void;
}

const CreatorEndMatchPanel: React.FC<CreatorEndMatchPanelProps> = ({
  matchId,
  isCreator,
  matchStatus,
  onMatchEnded,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);

  const canEnd = isCreator && matchStatus !== 'FINISHED';

  const handleEndMatch = async (winner?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const payload = {
        action: 'endMatch',
        ...(winner && { winner }),
      };
      const response = await httpClient.patch(`/matches/${matchId}`, payload);
      if (!response.ok) {
        throw new Error(`Erro ao encerrar partida: ${response.status}`);
      }
      setIsOpen(false);
      setShowWinnerModal(false);
      setSelectedWinner(null);
      if (onMatchEnded) {
        onMatchEnded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao encerrar partida');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canEnd) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        className="cursor-pointer rounded-md border-none bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700"
        onClick={() => setIsOpen(true)}
        title="Apenas o criador da partida pode encerrar"
      >
        🛑 Encerrar Partida
      </button>
    );
  }

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="rounded-lg bg-slate-900 p-6 text-slate-200 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Encerrar Partida?</h3>

        {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

        <p className="mb-6 text-sm text-slate-400">
          Ao encerrar, a partida será marcada como finalizada e todas as sessões de anotação serão
          encerradas.
        </p>

        {!showWinnerModal ? (
          <div className="flex gap-3">
            <button
              onClick={() => setShowWinnerModal(true)}
              disabled={isLoading}
              className="flex-1 cursor-pointer rounded-md border-none bg-orange-600 p-2 text-white hover:bg-orange-700 disabled:cursor-wait"
            >
              {isLoading ? 'Encerrando...' : 'Indicar Vencedor'}
            </button>
            <button
              onClick={() => handleEndMatch()}
              disabled={isLoading}
              className="flex-1 cursor-pointer rounded-md border-none bg-red-600 p-2 text-white hover:bg-red-700 disabled:cursor-wait"
            >
              {isLoading ? 'Encerrando...' : 'Encerrar Sem Vencedor'}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowWinnerModal(false);
              }}
              disabled={isLoading}
              className="flex-1 cursor-pointer rounded-md border border-slate-500 bg-transparent p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-wait"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-slate-400">Selecione o vencedor:</p>
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setSelectedWinner('PLAYER_1')}
                className={`flex-1 rounded-md border-none p-2 ${
                  selectedWinner === 'PLAYER_1'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Jogador 1
              </button>
              <button
                onClick={() => setSelectedWinner('PLAYER_2')}
                className={`flex-1 rounded-md border-none p-2 ${
                  selectedWinner === 'PLAYER_2'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Jogador 2
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleEndMatch(selectedWinner ?? undefined)}
                disabled={isLoading || !selectedWinner}
                className="flex-1 cursor-pointer rounded-md border-none bg-green-600 p-2 text-white hover:bg-green-700 disabled:cursor-wait disabled:opacity-50"
              >
                {isLoading ? 'Confirmando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setShowWinnerModal(false)}
                disabled={isLoading}
                className="flex-1 cursor-pointer rounded-md border border-slate-500 bg-transparent p-2 text-slate-300 hover:bg-slate-800 disabled:cursor-wait"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorEndMatchPanel;
