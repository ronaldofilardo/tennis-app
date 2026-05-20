import React, { useState, useCallback, useEffect, useRef } from 'react';
import { httpClient } from '../config/httpClient';
import './MatchSetup.css';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { createLogger } from '../services/logger';
import AthleteSearchInput from '../components/AthleteSearchInput';
import type { AthleteResult } from '../components/AthleteSearchInput';
import { savePendingMatch } from '../services/offlineDb';
import { ResumeScoreModal } from '../components/ResumeScoreModal';
import type { OngoingMatchSetup } from '../components/ResumeScoreModal';
import AvailableMatchesForAnnotation from '../components/AvailableMatchesForAnnotation';
import { LocateMatchModal } from '../components/LocateMatchModal';
import { MatchSetupFormFields } from '../components/MatchSetupFormFields';
import { TennisConfigFactory } from '../core/scoring/TennisConfigFactory';
import type { TennisFormat, MatchState, Player } from '../core/scoring/types';

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

const MatchSetup: React.FC<MatchSetupProps> = ({ onBackToDashboard, onMatchCreated }) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [sport, setSport] = useState('TENNIS');
  const [format, setFormat] = useState('BEST_OF_3');
  const [courtType, setCourtType] = useState<'GRASS' | 'CLAY' | 'HARD'>('HARD');
  const [nickname, setNickname] = useState('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [selectedAthlete1, setSelectedAthlete1] = useState<AthleteResult | null>(null);
  const [selectedAthlete2, setSelectedAthlete2] = useState<AthleteResult | null>(null);
  // ADMIN creates public matches by default; other users create private
  const [visibility, setVisibility] = useState<'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY'>(
    currentUser?.role === 'ADMIN' ? 'PUBLIC' : 'PLAYERS_ONLY',
  );
  const [visibleTo, setVisibleTo] = useState<'both' | string>('both'); // Legacy
  const [error, setError] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isLocateModalOpen, setIsLocateModalOpen] = useState(false);
  // ADMIN creates matches open for annotation by default
  const [openForAnnotation, setOpenForAnnotation] = useState(currentUser?.role === 'ADMIN');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duplicateMatch, setDuplicateMatch] = useState<{
    id: string;
    playerP1?: string;
    playerP2?: string;
  } | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [pendingDuplicatePayload, setPendingDuplicatePayload] = useState<Record<
    string,
    unknown
  > | null>(null);

  // ─── Novos campos de metadados ────────────────────────────────────────────
  const [tournamentName, setTournamentName] = useState('');
  const [roundName, setRoundName] = useState('');
  const [bracketType, setBracketType] = useState<'ELIMINATION' | 'GROUPS' | 'SWISS'>('ELIMINATION');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [tournamentSuggestions, setTournamentSuggestions] = useState<string[]>([]);
  const [roundSuggestions, setRoundSuggestions] = useState<string[]>([]);
  const [showTournamentSuggestions, setShowTournamentSuggestions] = useState(false);
  const [showRoundSuggestions, setShowRoundSuggestions] = useState(false);
  const tournamentInputRef = useRef<HTMLInputElement>(null);
  const roundInputRef = useRef<HTMLInputElement>(null);

  // Buscar sugestões de torneios/rodadas ao abrir ou digitar
  useEffect(() => {
    let cancelled = false;
    const fetchSuggestions = async () => {
      try {
        const params = tournamentName
          ? `?tournamentName=${encodeURIComponent(tournamentName)}`
          : '';
        const res = await httpClient.get<{ tournaments: string[]; rounds: string[] }>(
          `/matches/tournament-suggestions${params}`,
        );
        if (!cancelled) {
          setTournamentSuggestions(res.data.tournaments ?? []);
          setRoundSuggestions(res.data.rounds ?? []);
        }
      } catch {
        // Falha silenciosa — sugestões são nice-to-have
      }
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tournamentName]);

  // Monta o payload base da partida a partir do estado do formulário
  const buildMatchPayload = useCallback(
    (finalP1: string, finalP2: string) => ({
      sportType: sport,
      format: format,
      courtType: sport === 'TENNIS' ? courtType : undefined,
      players: { p1: finalP1, p2: finalP2 },
      nickname: nickname || null,
      visibility: visibility || 'PLAYERS_ONLY',
      visibleTo: visibleTo || 'both',
      apontadorEmail: currentUser?.email || '',
      player1Id: selectedAthlete1?.id,
      player2Id: selectedAthlete2?.id,
      openForAnnotation,
      scheduledAt:
        scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
          : null,
      // Novos metadados
      tournamentName: tournamentName.trim() || null,
      roundName: roundName.trim() || null,
      bracketType: bracketType || null,
      temperature: temperature !== '' ? parseFloat(temperature) : null,
      humidity: humidity !== '' ? parseFloat(humidity) : null,
    }),
    [
      sport,
      format,
      courtType,
      nickname,
      visibility,
      visibleTo,
      currentUser,
      selectedAthlete1,
      selectedAthlete2,
      openForAnnotation,
      scheduledDate,
      scheduledTime,
      tournamentName,
      roundName,
      bracketType,
      temperature,
      humidity,
    ],
  );

  // Lida com confirmação do modal de retomada de partida
  const handleResumeConfirm = useCallback(
    async (setup: OngoingMatchSetup): Promise<void> => {
      setIsResumeModalOpen(false);

      const finalP1 = player1 || selectedAthlete1?.name;
      const finalP2 = player2 || selectedAthlete2?.name;
      if (!finalP1 || !finalP2) return;

      setError(null);

      try {
        const matchPayload = buildMatchPayload(finalP1, finalP2);
        const response = await httpClient.post<CreatedMatchData>('/matches', matchPayload);
        const createdMatch = response.data;

        // Constrói e envia o estado inicial da partida em andamento
        const initialState = buildInitialMatchState(setup, format);
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
      }
    },
    [
      player1,
      player2,
      selectedAthlete1,
      selectedAthlete2,
      buildMatchPayload,
      format,
      onMatchCreated,
      toast,
    ],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Impede o recarregamento da página

    // Garantir que os jogadores estão definidos
    const finalP1 = player1 || selectedAthlete1?.name;
    const finalP2 = player2 || selectedAthlete2?.name;

    if (!finalP1 || !finalP2) {
      setError('Os nomes dos jogadores são obrigatórios.');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setError('Data e horário da partida são obrigatórios.');
      return;
    }

    // Partida em andamento: abre modal para inserir placar antes de criar
    if (isResuming) {
      if (!navigator.onLine) {
        toast.warning('Retomada de partida não está disponível no modo offline.', 'Modo offline');
        return;
      }
      setIsResumeModalOpen(true);
      return;
    }

    try {
      // visibleTo já é o email do jogador (valor do select)
      const visibleToValue = visibleTo;

      setError(null);

      const matchPayload = {
        sportType: sport,
        format: format,
        courtType: sport === 'TENNIS' ? courtType : undefined,
        players: { p1: finalP1, p2: finalP2 },
        nickname: nickname || null,
        visibility: visibility || 'PLAYERS_ONLY',
        visibleTo: visibleToValue || 'both', // Legado
        apontadorEmail: currentUser?.email || '',
        // Novos campos multi-tenancy
        player1Id: selectedAthlete1?.id,
        player2Id: selectedAthlete2?.id,
        openForAnnotation,
        scheduledAt:
          scheduledDate && scheduledTime
            ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
            : null,
        // Novos metadados
        tournamentName: tournamentName.trim() || null,
        roundName: roundName.trim() || null,
        bracketType: bracketType || null,
        temperature: temperature !== '' ? parseFloat(temperature) : null,
        humidity: humidity !== '' ? parseFloat(humidity) : null,
      };

      // ── Suporte offline ───────────────────────────────────────────────────
      if (!navigator.onLine) {
        const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await savePendingMatch({
          tempId,
          matchData: matchPayload,
          syncStatus: 'PENDING',
          createdAt: Date.now(),
        });
        toast.success('Partida salva localmente. Será enviada ao reconectar.', 'Modo offline');
        // Criar objeto local para navegar ao placar sem ID do servidor
        onMatchCreated({
          id: tempId,
          sportType: sport,
          format: format,
          courtType: sport === 'TENNIS' ? courtType : undefined,
          players: { p1: finalP1, p2: finalP2 },
          status: 'NOT_STARTED',
        });
        return;
      }

      const response = await httpClient.post<CreatedMatchData>('/matches', matchPayload);

      log.info('Partida criada com sucesso', {
        id: response.data.id,
      });
      onMatchCreated(response.data); // Navega para o placar com os dados da nova partida
    } catch (error) {
      log.error('Erro ao criar a partida', error);
      const httpErr = error as {
        status?: number;
        data?: { code?: string; existing?: { id: string; playerP1?: string; playerP2?: string } };
      };
      if (httpErr?.status === 409 && httpErr?.data?.code === 'DUPLICATE_MATCH') {
        setDuplicateMatch(httpErr.data.existing ?? null);
        // NOTE: matchPayload é criado localmente e seu tipo não exporta compatibilidade
        // direta com Record<string, unknown>. O estado de duplicata armazena o payload
        // genérico para exibição — não é reutilizado para operações críticas.
        setPendingDuplicatePayload(matchPayload as unknown as Record<string, unknown>);
        setIsDuplicateModalOpen(true);
        return;
      }
      toast.error(
        'Falha ao criar a partida. Verifique o console do navegador e do backend.',
        'Erro ao criar partida',
      );
    }
  };

  const handleForceCreate = async () => {
    if (!pendingDuplicatePayload) return;
    setIsDuplicateModalOpen(false);
    try {
      const response = await httpClient.post<CreatedMatchData>('/matches', {
        ...pendingDuplicatePayload,
        force: true,
      });
      onMatchCreated(response.data);
    } catch (err) {
      log.error('Erro ao forçar criação de partida', err);
      toast.error('Falha ao criar a partida.', 'Erro ao criar partida');
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
      <AvailableMatchesForAnnotation />
      <MatchSetupFormFields
        sport={sport}
        setSport={setSport}
        format={format}
        setFormat={setFormat}
        courtType={courtType}
        setCourtType={setCourtType}
        nickname={nickname}
        setNickname={setNickname}
        player1={player1}
        setPlayer1={setPlayer1}
        player2={player2}
        setPlayer2={setPlayer2}
        selectedAthlete1={selectedAthlete1}
        setSelectedAthlete1={setSelectedAthlete1}
        selectedAthlete2={selectedAthlete2}
        setSelectedAthlete2={setSelectedAthlete2}
        visibility={visibility}
        setVisibility={setVisibility}
        isResuming={isResuming}
        setIsResuming={setIsResuming}
        openForAnnotation={openForAnnotation}
        setOpenForAnnotation={setOpenForAnnotation}
        scheduledDate={scheduledDate}
        setScheduledDate={setScheduledDate}
        scheduledTime={scheduledTime}
        setScheduledTime={setScheduledTime}
        tournamentName={tournamentName}
        setTournamentName={setTournamentName}
        roundName={roundName}
        setRoundName={setRoundName}
        bracketType={bracketType}
        setBracketType={setBracketType}
        temperature={temperature}
        setTemperature={setTemperature}
        humidity={humidity}
        setHumidity={setHumidity}
        tournamentSuggestions={tournamentSuggestions}
        setShowTournamentSuggestions={setShowTournamentSuggestions}
        showTournamentSuggestions={showTournamentSuggestions}
        tournamentInputRef={tournamentInputRef}
        roundSuggestions={roundSuggestions}
        setShowRoundSuggestions={setShowRoundSuggestions}
        showRoundSuggestions={showRoundSuggestions}
        roundInputRef={roundInputRef}
        currentUserId={currentUser?.id}
        onSetError={setError}
        onLocateClick={() => setIsLocateModalOpen(true)}
        onSubmit={handleSubmit}
        isSubmitting={false}
      />

      {/* Modal de placar para partida em andamento */}
      <ResumeScoreModal
        isOpen={isResumeModalOpen}
        players={{
          p1: player1 || selectedAthlete1?.name || 'Jogador 1',
          p2: player2 || selectedAthlete2?.name || 'Jogador 2',
        }}
        format={format}
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
