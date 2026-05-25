// frontend/src/components/CreatorEndMatchPanel.tsx
// Painel para criador encerrar manualmente uma partida com fluxo sequencial de steps.
// Exibe apenas se usuário atual for o criador.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../config/httpClient';
import EndMatchStep1 from './EndMatchStep1';
import EndMatchStep2 from './EndMatchStep2';
import EndMatchConfirmation from './EndMatchConfirmation';
import './EndMatchModal.css';

interface CreatorEndMatchPanelProps {
  matchId: string;
  isCreator: boolean;
  matchStatus: string;
  onMatchEnded?: () => void;
  player1Name?: string;
  player2Name?: string;
}

type ModalStep = 'step1' | 'step2' | 'success';

const CreatorEndMatchPanel: React.FC<CreatorEndMatchPanelProps> = ({
  matchId,
  isCreator,
  matchStatus,
  onMatchEnded,
  player1Name = 'Jogador 1',
  player2Name = 'Jogador 2',
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ModalStep>('step1');
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [finalWinner, setFinalWinner] = useState<string | null>(null);

  const canEnd = isCreator && matchStatus !== 'FINISHED';

  const handleEndMatch = async (winner?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const payload = {
        action: 'endMatch',
        ...(winner && { winner }),
      };
      console.debug('[EndMatch] Iniciando com matchId:', matchId, 'winner:', winner);
      const response = await httpClient.patch(`/matches/${matchId}`, payload);
      console.debug('[EndMatch] Response status:', response.status, 'ok:', response.ok);
      if (!response.ok) {
        console.error('[EndMatch] Error response:', response.data);
        throw new Error(`Erro ao encerrar partida: ${response.status}`);
      }

      // Sucesso: mostrar tela de confirmação por um tempo e depois voltar ao dashboard
      setFinalWinner(winner || null);
      setStep('success');

      // Fechar modal após 2 segundos e voltar para dashboard
      setTimeout(() => {
        resetModal();
        if (onMatchEnded) {
          onMatchEnded();
        }
        // Navegar de volta para dashboard
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao encerrar partida');
      console.error('[EndMatch] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setIsOpen(false);
    setStep('step1');
    setSelectedWinner(null);
    setFinalWinner(null);
    setError(null);
  };

  const handleStep1Actions = {
    indicateWinner: () => {
      setStep('step2');
      setSelectedWinner(null);
    },
    endWithoutWinner: async () => {
      await handleEndMatch();
    },
    cancel: resetModal,
  };

  const handleStep2Actions = {
    selectWinner: (winner: 'PLAYER_1' | 'PLAYER_2') => {
      setSelectedWinner(winner);
    },
    confirm: async () => {
      if (selectedWinner) {
        await handleEndMatch(selectedWinner);
      }
    },
    back: () => {
      setStep('step1');
      setSelectedWinner(null);
    },
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
    <div className="end-match-modal-overlay">
      <div className="end-match-modal-content">
        {error && <div className="end-match-modal-error">{error}</div>}

        {step === 'step1' && (
          <EndMatchStep1
            isLoading={isLoading}
            onIndicateWinner={handleStep1Actions.indicateWinner}
            onEndWithoutWinner={handleStep1Actions.endWithoutWinner}
            onCancel={handleStep1Actions.cancel}
          />
        )}

        {step === 'step2' && (
          <EndMatchStep2
            selectedWinner={selectedWinner}
            isLoading={isLoading}
            onSelectWinner={handleStep2Actions.selectWinner}
            onConfirm={handleStep2Actions.confirm}
            onBack={handleStep2Actions.back}
            player1Name={player1Name}
            player2Name={player2Name}
          />
        )}

        {step === 'success' && <EndMatchConfirmation winner={finalWinner} />}
      </div>
    </div>
  );
};

export default CreatorEndMatchPanel;
