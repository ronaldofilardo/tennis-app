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
      <form className="setup-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="sport">Desporto</label>
          <select id="sport" name="sport" value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="TENNIS">Tênis</option>
            <option value="PADEL">Padel</option>
            <option value="BEACH_TENNIS">Beach Tennis</option>
          </select>
        </div>

        {sport === 'TENNIS' && (
          <div className="form-group">
            <label>Tipo de Quadra</label>
            <div className="court-type-selector">
              <button
                type="button"
                className={`court-type-btn clay${courtType === 'CLAY' ? 'active' : ''}`}
                onClick={() => setCourtType('CLAY')}
              >
                <span className="court-type-icon">🟤</span>
                <span className="court-type-name">Saibro</span>
                <span className="court-type-note">Roland Garros</span>
              </button>
              <button
                type="button"
                className={`court-type-btn hard${courtType === 'HARD' ? 'active' : ''}`}
                onClick={() => setCourtType('HARD')}
              >
                <span className="court-type-icon">🔵</span>
                <span className="court-type-name">Dura</span>
                <span className="court-type-note">US Open</span>
              </button>
              <button
                type="button"
                className={`court-type-btn grass${courtType === 'GRASS' ? 'active' : ''}`}
                onClick={() => setCourtType('GRASS')}
              >
                <span className="court-type-icon">🟢</span>
                <span className="court-type-name">Grama</span>
                <span className="court-type-note">Wimbledon</span>
              </button>
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Jogadores</label>
          <div className="player-inputs">
            <AthleteSearchInput
              id="player1-search"
              label="Jogador 1"
              placeholder="Buscar atleta..."
              value={selectedAthlete1}
              onSelect={(a) => {
                setSelectedAthlete1(a);
                if (a) setPlayer1(a.name);
              }}
              onQueryChange={(q) => {
                setPlayer1(q);
                if (selectedAthlete1 && q !== selectedAthlete1.name) {
                  setSelectedAthlete1(null);
                }
              }}
              excludeUserId={currentUser?.id}
              excludeAthleteId={selectedAthlete2?.id}
            />
            <span>vs</span>
            <AthleteSearchInput
              id="player2-search"
              label="Jogador 2"
              placeholder="Buscar atleta..."
              value={selectedAthlete2}
              onSelect={(a) => {
                setSelectedAthlete2(a);
                if (a) setPlayer2(a.name);
              }}
              onQueryChange={(q) => {
                setPlayer2(q);
                if (selectedAthlete2 && q !== selectedAthlete2.name) {
                  setSelectedAthlete2(null);
                }
              }}
              excludeUserId={currentUser?.id}
              excludeAthleteId={selectedAthlete1?.id}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Modo de jogo</label>
          <select
            id="format"
            name="format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            data-testid="format-select"
          >
            <option value="BEST_OF_3">
              Melhor de 3 sets com vantagem, Set tie-break em todos os sets
            </option>
            <option value="BEST_OF_3_MATCH_TB">
              Melhor de 3 sets com vantagem, Set tie-break em 6-6, Match tie-break no 3º set
            </option>
            <option value="BEST_OF_5">
              Melhor de 5 sets com vantagem, Set tie-break em todos os sets
            </option>
            <option value="SINGLE_SET">Set único com vantagem, Set tie-break em 6-6</option>
            <option value="PRO_SET">Pro Set (8 games) com vantagem, Set tie-break em 8-8</option>
            <option value="MATCH_TIEBREAK">
              Match Tiebreak (10 pontos) sem vantagem, Primeiro a 10
            </option>
            <option value="SHORT_SET">Set curto (4 games) com vantagem, Tie-break em 4-4</option>
            <option value="NO_AD">
              Melhor de 3 sets método No-Ad (ponto decisivo em 40-40), Set tie-break em 6-6
            </option>
            <option value="FAST4">Fast4 Tennis (4 games) método No-Ad, Tie-break em 3-3</option>
            <option value="SHORT_SET_NO_AD">
              Set curto (4 games) método No-Ad, Tie-break em 4-4
            </option>
            <option value="NO_LET_TENNIS">
              Melhor de 3 sets método No-Let (saque na rede está em jogo)
            </option>
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

        <div className="form-group">
          <label>Visibilidade da partida</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY')}
          >
            <option value="PUBLIC">🌐 Pública (todos podem ver)</option>
            <option value="CLUB">🏢 Clube (apenas membros do clube)</option>
            <option value="PLAYERS_ONLY">🔒 Apenas Jogadores</option>
          </select>
        </div>

        {/* Checkbox: Retomar jogo em andamento */}
        <div className="form-group resume-check-group">
          <label className="resume-check-label" htmlFor="resume-check">
            <input
              id="resume-check"
              type="checkbox"
              checked={isResuming}
              onChange={(e) => setIsResuming(e.target.checked)}
              className="resume-check-input"
            />
            <span>Retomar jogo em andamento</span>
          </label>
          {isResuming && (
            <p className="resume-check-hint">
              Após clicar em &ldquo;Iniciar Partida&rdquo;, você poderá inserir o placar atual antes
              de continuar.
            </p>
          )}
        </div>

        {/* Checkbox: Abrir para anotação por qualquer usuário */}
        <div className="form-group resume-check-group">
          <label className="resume-check-label" htmlFor="open-annotation-check">
            <input
              id="open-annotation-check"
              type="checkbox"
              checked={openForAnnotation}
              onChange={(e) => setOpenForAnnotation(e.target.checked)}
              className="resume-check-input"
            />
            <span>Abrir para anotação por qualquer usuário</span>
          </label>
          {openForAnnotation && (
            <p className="resume-check-hint">
              A partida aparecerá no painel de outros usuários como disponível para anotação.
            </p>
          )}
        </div>

        {/* Data, hora e local da partida */}
        <div className="form-group">
          <label>
            Data e horário <span className="required-mark">*</span>
          </label>
          <div className="match-datetime-row">
            <input
              id="scheduled-date"
              type="date"
              className="match-date-input"
              value={scheduledDate}
              onChange={(e) => {
                setScheduledDate(e.target.value);
                setError(null);
              }}
              aria-label="Data da partida"
            />
            <input
              id="scheduled-time"
              type="time"
              className="match-time-input"
              value={scheduledTime}
              onChange={(e) => {
                setScheduledTime(e.target.value);
                setError(null);
              }}
              aria-label="Horário da partida"
            />
          </div>
        </div>

        {/* ─── Metadados de Contexto ─────────────────────────────────────────── */}
        <div className="form-group form-group--combobox">
          <label htmlFor="tournament-name">
            Torneio <span className="form-optional">(opcional)</span>
          </label>
          <div className="combobox-wrapper">
            <input
              id="tournament-name"
              ref={tournamentInputRef}
              type="text"
              className="match-setup-input"
              placeholder="Ex: Copa Clube 2026"
              value={tournamentName}
              maxLength={200}
              autoComplete="off"
              onChange={(e) => setTournamentName(e.target.value)}
              onFocus={() => setShowTournamentSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTournamentSuggestions(false), 150)}
              aria-label="Nome do torneio"
              aria-autocomplete="list"
              aria-expanded={showTournamentSuggestions && tournamentSuggestions.length > 0}
            />
            {showTournamentSuggestions && tournamentSuggestions.length > 0 && (
              <ul className="combobox-suggestions" role="listbox" aria-label="Sugestões de torneio">
                {tournamentSuggestions
                  .filter((s) => s.toLowerCase().includes(tournamentName.toLowerCase()))
                  .map((s) => (
                    <li
                      key={s}
                      role="option"
                      className="combobox-suggestion-item"
                      onMouseDown={() => {
                        setTournamentName(s);
                        setShowTournamentSuggestions(false);
                        tournamentInputRef.current?.blur();
                      }}
                    >
                      {s}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        <div className="form-group form-group--combobox">
          <label htmlFor="round-name">
            Rodada <span className="form-optional">(opcional)</span>
          </label>
          <div className="combobox-wrapper">
            <input
              id="round-name"
              ref={roundInputRef}
              type="text"
              className="match-setup-input"
              placeholder="Ex: Oitavas, Semifinal, Final"
              value={roundName}
              maxLength={200}
              autoComplete="off"
              onChange={(e) => setRoundName(e.target.value)}
              onFocus={() => setShowRoundSuggestions(true)}
              onBlur={() => setTimeout(() => setShowRoundSuggestions(false), 150)}
              aria-label="Nome da rodada"
              aria-autocomplete="list"
              aria-expanded={showRoundSuggestions && roundSuggestions.length > 0}
            />
            {showRoundSuggestions && roundSuggestions.length > 0 && (
              <ul className="combobox-suggestions" role="listbox" aria-label="Sugestões de rodada">
                {roundSuggestions
                  .filter((s) => s.toLowerCase().includes(roundName.toLowerCase()))
                  .map((s) => (
                    <li
                      key={s}
                      role="option"
                      className="combobox-suggestion-item"
                      onMouseDown={() => {
                        setRoundName(s);
                        setShowRoundSuggestions(false);
                        roundInputRef.current?.blur();
                      }}
                    >
                      {s}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="bracket-type">
            Tipo de Chave <span className="form-optional">(opcional)</span>
          </label>
          <select
            id="bracket-type"
            value={bracketType}
            onChange={(e) => setBracketType(e.target.value as 'ELIMINATION' | 'GROUPS' | 'SWISS')}
            aria-label="Tipo de chave do torneio"
          >
            <option value="ELIMINATION">Eliminatória</option>
            <option value="GROUPS">Grupos</option>
            <option value="SWISS">Suíço</option>
          </select>
        </div>

        <div className="form-group match-conditions-row">
          <div className="match-condition-field">
            <label htmlFor="temperature">
              Temperatura (°C) <span className="form-optional">(opcional)</span>
            </label>
            <input
              id="temperature"
              type="number"
              className="match-setup-input"
              placeholder="Ex: 28"
              value={temperature}
              min={-50}
              max={60}
              step={0.1}
              onChange={(e) => setTemperature(e.target.value)}
              aria-label="Temperatura em graus Celsius"
            />
          </div>
          <div className="match-condition-field">
            <label htmlFor="humidity">
              Umidade — URA (%) <span className="form-optional">(opcional)</span>
            </label>
            <input
              id="humidity"
              type="number"
              className="match-setup-input"
              placeholder="Ex: 65"
              value={humidity}
              min={0}
              max={100}
              step={1}
              onChange={(e) => setHumidity(e.target.value)}
              aria-label="Umidade relativa do ar em porcentagem"
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="locate-button"
            onClick={() => setIsLocateModalOpen(true)}
          >
            🔍 Localizar Partida
          </button>
          <button type="submit" className="start-match-button">
            {isResuming
              ? 'Continuar →'
              : currentUser?.role === 'ADMIN'
                ? 'Registrar'
                : 'Iniciar Partida'}
          </button>
        </div>
      </form>

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
