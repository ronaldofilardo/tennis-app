import React, { useState, useCallback, useEffect } from 'react';
import { httpClient } from '../config/httpClient';
import './MatchSetup.css';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { createLogger } from '../services/logger';
import type { MyAthlete } from '../components/MyAthleteDropdown';
import NewAthleteModal from '../components/NewAthleteModal';
import { savePendingMatch } from '../services/offlineDb';
import { ResumeScoreModal } from '../components/ResumeScoreModal';
import type { OngoingMatchSetup } from '../components/ResumeScoreModal';
import { LocateMatchModal } from '../components/LocateMatchModal';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { TennisFormat, MatchState, Player } from '../core/scoring/types';
import { useMatchSetupForm } from '../hooks/useMatchSetupForm';
import { MatchSetupProvider } from '../contexts/MatchSetup';
import MatchSetupForm from '../components/MatchSetupForm';
import { DetailsPanel } from '../design-system/DetailsPanel';

/**
 * Constrói um MatchState inicial a partir do placar inserido pelo usuário
 * para partidas que já estão em andamento.
 */
function buildInitialMatchState(setup: OngoingMatchSetup, format: string): MatchState {
  const config = TennisConfigFactory.getConfig(format as TennisFormat);

  let p1Sets = 0;
  let p2Sets = 0;
  for (const s of setup.completedSets) {
    if (s.winner === 'PLAYER_1') p1Sets++;
    else p2Sets++;
  }

  const currentSet = setup.completedSets.length + 1;
  const useTiebreakPoints = setup.currentGameIsTiebreak || setup.currentGameIsMatchTiebreak;

  const gamePoints: Record<Player, string | number> = {
    PLAYER_1: useTiebreakPoints
      ? Number(setup.currentGamePoints.PLAYER_1) || 0
      : String(setup.currentGamePoints.PLAYER_1) || '0',
    PLAYER_2: useTiebreakPoints
      ? Number(setup.currentGamePoints.PLAYER_2) || 0
      : String(setup.currentGamePoints.PLAYER_2) || '0',
  };

  return {
    sets: { PLAYER_1: p1Sets, PLAYER_2: p2Sets },
    currentSet,
    currentSetState: {
      games: setup.currentSetGames,
    },
    currentGame: {
      points: gamePoints,
      server: setup.server,
      isTiebreak: setup.currentGameIsTiebreak || setup.currentGameIsMatchTiebreak,
      isMatchTiebreak: setup.currentGameIsMatchTiebreak,
    },
    server: setup.server,
    isFinished: false,
    config,
    completedSets: setup.completedSets.map((s) => ({
      setNumber: s.setNumber,
      games: s.games,
      winner: s.winner,
      ...(s.tiebreakScore ? { tiebreakScore: s.tiebreakScore } : {}),
    })),
    startedAt: new Date().toISOString(),
  };
}

// Interface para as props, incluindo a função para voltar ao Dashboard
export interface CreatedMatchData {
  id: string;
  sportType: string;
  format: string;
  courtType?: 'GRASS' | 'CLAY' | 'HARD';
  players: { p1: string; p2: string };
  status?: string;
  createdAt?: string;
}

interface MatchSetupProps {
  onMatchCreated: (matchData: CreatedMatchData) => void;
  onBackToDashboard: () => void;
}

const log = createLogger('MatchSetup');

interface MatchSetupProps {
  onMatchCreated: (matchData: CreatedMatchData) => void;
  onBackToDashboard: () => void;
}

const MatchSetup: React.FC<MatchSetupProps> = ({ onBackToDashboard, onMatchCreated }) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const formState = useMatchSetupForm();

  // Modals e estados adicionais
  const [showNewAthleteModal, setShowNewAthleteModal] = useState(false);
  const [newAthleteFor, setNewAthleteFor] = useState<'p1' | 'p2' | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isLocateModalOpen, setIsLocateModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<{
    id: string;
    playerP1?: string;
    playerP2?: string;
  } | null>(null);
  const [pendingDuplicatePayload, setPendingDuplicatePayload] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rolar para o topo quando há erro
  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  // Definir valores padrão do formulário baseado no usuário
  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      formState.setters.setVisibility('PUBLIC');
      formState.setters.setOpenForAnnotation(true);
    }
    // Definir data padrão (hoje)
    const today = new Date().toISOString().split('T')[0];
    formState.setters.setScheduledDate(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Buscar sugestões de torneios/rodadas
  useEffect(() => {
    let cancelled = false;
    const fetchSuggestions = async () => {
      if (!formState.state.tournamentName) return;
      try {
        const params = `?tournamentName=${encodeURIComponent(formState.state.tournamentName)}`;
        const res = await httpClient.get<{ tournaments: string[]; rounds: string[] }>(
          `/matches/tournament-suggestions${params}`,
        );
        if (!cancelled) {
          formState.setters.setTournamentSuggestions(res.data.tournaments ?? []);
          formState.setters.setRoundSuggestions(res.data.rounds ?? []);
        }
      } catch {
        // Falha silenciosa
      }
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formState.state.tournamentName, formState.setters]);

  // Monta payload da partida
  const buildMatchPayload = useCallback(() => {
    const { state } = formState;
    const finalP1 = state.player1 || state.selectedAthlete1?.name;
    const finalP2 = state.player2 || state.selectedAthlete2?.name;

    if (!finalP1 || !finalP2) return null;

    return {
      sportType: state.sport,
      format: state.format,
      courtType: state.sport === 'TENNIS' ? state.courtType : undefined,
      players: { p1: finalP1, p2: finalP2 },
      nickname: state.nickname || null,
      visibility: state.visibility || 'PLAYERS_ONLY',
      visibleTo: 'both', // Legacy field
      apontadorEmail: currentUser?.email || '',
      player1Id: state.selectedAthlete1?.id,
      player2Id: state.selectedAthlete2?.id,
      openForAnnotation: state.openForAnnotation,
      scheduledAt:
        state.scheduledDate && state.scheduledTime
          ? new Date(`${state.scheduledDate}T${state.scheduledTime}`).toISOString()
          : null,
      tournamentName: state.tournamentName.trim() || null,
      roundName: state.roundName.trim() || null,
      bracketType: state.bracketType || null,
      temperature: state.temperature !== '' ? parseFloat(state.temperature) : null,
      humidity: state.humidity !== '' ? parseFloat(state.humidity) : null,
    };
  }, [formState, currentUser]);

  // Lidar com confirmação de resumir partida em andamento
  const handleResumeConfirm = useCallback(
    async (setup: OngoingMatchSetup): Promise<void> => {
      setIsResumeModalOpen(false);
      setError(null);

      try {
        setIsSubmitting(true);
        const matchPayload = buildMatchPayload();
        if (!matchPayload) {
          setError('Os nomes dos jogadores são obrigatórios.');
          return;
        }

        const response = await httpClient.post<CreatedMatchData>('/matches', matchPayload);
        const createdMatch = response.data;

        // Construir estado inicial para partida em andamento
        const config = TennisConfigFactory.getConfig(formState.state.format as TennisFormat);
        let p1Sets = 0;
        let p2Sets = 0;
        for (const s of setup.completedSets) {
          if (s.winner === 'PLAYER_1') p1Sets++;
          else p2Sets++;
        }

        const currentSet = setup.completedSets.length + 1;
        const useTiebreakPoints = setup.currentGameIsTiebreak || setup.currentGameIsMatchTiebreak;

        const gamePoints: Record<Player, string | number> = {
          PLAYER_1: useTiebreakPoints
            ? Number(setup.currentGamePoints.PLAYER_1) || 0
            : String(setup.currentGamePoints.PLAYER_1) || '0',
          PLAYER_2: useTiebreakPoints
            ? Number(setup.currentGamePoints.PLAYER_2) || 0
            : String(setup.currentGamePoints.PLAYER_2) || '0',
        };

        const initialState: MatchState = {
          sets: { PLAYER_1: p1Sets, PLAYER_2: p2Sets },
          currentSet,
          currentSetState: {
            games: setup.currentSetGames,
          },
          currentGame: {
            points: gamePoints,
            server: setup.server,
            isTiebreak: useTiebreakPoints,
            isMatchTiebreak: setup.currentGameIsMatchTiebreak,
          },
          server: setup.server,
          isFinished: false,
          config,
          completedSets: setup.completedSets.map((s) => ({
            setNumber: s.setNumber,
            games: s.games,
            winner: s.winner,
            ...(s.tiebreakScore ? { tiebreakScore: s.tiebreakScore } : {}),
          })),
          startedAt: new Date().toISOString(),
        };

        await httpClient.patch(`/matches/${createdMatch.id}/state`, {
          matchState: initialState,
        });

        log.info('Partida em andamento criada', { id: createdMatch.id });
        onMatchCreated({ ...createdMatch, status: 'IN_PROGRESS' });
      } catch (err) {
        log.error('Erro ao criar partida em andamento', err);
        toast.error(
          'Falha ao criar partida em andamento. Verifique o console.',
          'Erro ao criar partida',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [buildMatchPayload, formState.state.format, onMatchCreated, toast],
  );

  // Validação e submissão
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validar 6 campos obrigatórios
      const missingFields: string[] = [];

      if (!formState.state.sport) missingFields.push('Esporte');
      if (!formState.state.format) missingFields.push('Modo de Jogo');
      if (!formState.state.courtType) missingFields.push('Tipo de Quadra');
      if (!formState.state.selectedAthlete1) missingFields.push('Jogador 1');
      if (!formState.state.selectedAthlete2) missingFields.push('Jogador 2');
      if (!formState.state.scheduledDate) missingFields.push('Data');
      if (!formState.state.scheduledTime) missingFields.push('Horário');

      if (missingFields.length > 0) {
        const fieldList = missingFields.join(', ');
        setError(`Complete os campos obrigatórios: ${fieldList}`);
        return;
      }

      // Se for resumir partida, abrir modal
      if (formState.state.isResuming) {
        if (!navigator.onLine) {
          setError('Retomada de partida não está disponível no modo offline.');
          return;
        }
        setIsResumeModalOpen(true);
        return;
      }

      try {
        setIsSubmitting(true);
        const matchPayload = buildMatchPayload();
        if (!matchPayload) {
          setError('Os nomes dos jogadores são obrigatórios.');
          return;
        }

        // Suporte offline
        if (!navigator.onLine) {
          const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await savePendingMatch({
            tempId,
            matchData: matchPayload,
            syncStatus: 'PENDING',
            createdAt: Date.now(),
          });
          toast.success('Partida salva localmente. Será enviada ao reconectar.', 'Modo offline');
          onMatchCreated({
            id: tempId,
            sportType: formState.state.sport,
            format: formState.state.format,
            courtType: formState.state.courtType,
            players: {
              p1: matchPayload.players.p1,
              p2: matchPayload.players.p2,
            },
            status: 'NOT_STARTED',
          });
          return;
        }

        const response = await httpClient.post<CreatedMatchData>('/matches', matchPayload);
        log.info('Partida criada com sucesso', { id: response.data.id });
        onMatchCreated(response.data);
      } catch (err) {
        log.error('Erro ao criar a partida', err);
        const httpErr = err as {
          status?: number;
          data?: { code?: string; existing?: { id: string; playerP1?: string; playerP2?: string } };
        };

        if (httpErr?.status === 409 && httpErr?.data?.code === 'DUPLICATE_MATCH') {
          setDuplicateMatch(httpErr.data.existing ?? null);
          setPendingDuplicatePayload(matchPayload as unknown as Record<string, unknown>);
          setIsDuplicateModalOpen(true);
          return;
        }

        toast.error(
          'Falha ao criar a partida. Verifique o console do navegador.',
          'Erro ao criar partida',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState, buildMatchPayload, onMatchCreated, toast],
  );

  // Forçar criação em caso de duplicata
  const handleForceCreate = async () => {
    if (!pendingDuplicatePayload) return;
    setIsDuplicateModalOpen(false);
    try {
      setIsSubmitting(true);
      const response = await httpClient.post<CreatedMatchData>('/matches', {
        ...pendingDuplicatePayload,
        force: true,
      });
      onMatchCreated(response.data);
    } catch (err) {
      log.error('Erro ao forçar criação de partida', err);
      toast.error('Falha ao criar a partida.', 'Erro ao criar partida');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="match-setup">
      <header className="match-setup-header">
        <button onClick={onBackToDashboard} className="back-button">
          ← Voltar
        </button>
        <h2>Nova Partida</h2>
      </header>
      {error && <div className="form-error">{error}</div>}

      <DetailsPanel accentColor="green">
        <MatchSetupProvider value={formState}>
          <MatchSetupForm
            onCreateNewAthlete1={() => {
              setNewAthleteFor('p1');
              setShowNewAthleteModal(true);
            }}
            onCreateNewAthlete2={() => {
              setNewAthleteFor('p2');
              setShowNewAthleteModal(true);
            }}
            onLocateClick={() => setIsLocateModalOpen(true)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </MatchSetupProvider>
      </DetailsPanel>

      {/* Modal para criar novo atleta */}
      <NewAthleteModal
        isOpen={showNewAthleteModal}
        onClose={() => {
          setShowNewAthleteModal(false);
          setNewAthleteFor(null);
        }}
        onCreated={(athlete) => {
          if (newAthleteFor === 'p1') {
            formState.setters.setSelectedAthlete1(athlete);
            formState.setters.setPlayer1(athlete.name);
          } else if (newAthleteFor === 'p2') {
            formState.setters.setSelectedAthlete2(athlete);
            formState.setters.setPlayer2(athlete.name);
          }
          setShowNewAthleteModal(false);
          setNewAthleteFor(null);
        }}
      />

      {/* Modal de placar para partida em andamento */}
      <ResumeScoreModal
        isOpen={isResumeModalOpen}
        players={{
          p1: formState.state.player1 || formState.state.selectedAthlete1?.name || 'Jogador 1',
          p2: formState.state.player2 || formState.state.selectedAthlete2?.name || 'Jogador 2',
        }}
        format={formState.state.format}
        onConfirm={handleResumeConfirm}
        onCancel={() => setIsResumeModalOpen(false)}
      />

      {/* Modal para localizar partida pública */}
      <LocateMatchModal isOpen={isLocateModalOpen} onClose={() => setIsLocateModalOpen(false)} />

      {/* Modal de partida duplicada */}
      {isDuplicateModalOpen && duplicateMatch && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-modal-title"
        >
          <div className="modal-content">
            <h3 id="duplicate-modal-title">Partida já existe</h3>
            <p>
              Já existe uma partida entre <strong>{duplicateMatch.playerP1 ?? 'P1'}</strong> e{' '}
              <strong>{duplicateMatch.playerP2 ?? 'P2'}</strong> no horário informado.
            </p>
            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  setIsDuplicateModalOpen(false);
                  onMatchCreated(duplicateMatch as CreatedMatchData);
                }}
              >
                Ir para aquela partida
              </button>
              <button className="btn-secondary" onClick={handleForceCreate}>
                Criar mesmo assim
              </button>
              <button className="btn-ghost" onClick={() => setIsDuplicateModalOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchSetup;
