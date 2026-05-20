import React from 'react';
import AthleteSearchInput from '../components/AthleteSearchInput';
import type { AthleteResult } from '../components/AthleteSearchInput';

interface MatchSetupFormFieldsProps {
  sport: string;
  setSport: (value: string) => void;
  format: string;
  setFormat: (value: string) => void;
  courtType: 'GRASS' | 'CLAY' | 'HARD';
  setCourtType: (value: 'GRASS' | 'CLAY' | 'HARD') => void;
  nickname: string;
  setNickname: (value: string) => void;
  player1: string;
  setPlayer1: (value: string) => void;
  player2: string;
  setPlayer2: (value: string) => void;
  selectedAthlete1: AthleteResult | null;
  setSelectedAthlete1: (value: AthleteResult | null) => void;
  selectedAthlete2: AthleteResult | null;
  setSelectedAthlete2: (value: AthleteResult | null) => void;
  visibility: 'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY';
  setVisibility: (value: 'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY') => void;
  isResuming: boolean;
  setIsResuming: (value: boolean) => void;
  openForAnnotation: boolean;
  setOpenForAnnotation: (value: boolean) => void;
  scheduledDate: string;
  setScheduledDate: (value: string) => void;
  scheduledTime: string;
  setScheduledTime: (value: string) => void;
  tournamentName: string;
  setTournamentName: (value: string) => void;
  roundName: string;
  setRoundName: (value: string) => void;
  bracketType: 'ELIMINATION' | 'GROUPS' | 'SWISS';
  setBracketType: (value: 'ELIMINATION' | 'GROUPS' | 'SWISS') => void;
  temperature: string;
  setTemperature: (value: string) => void;
  humidity: string;
  setHumidity: (value: string) => void;
  tournamentSuggestions: string[];
  setShowTournamentSuggestions: (value: boolean) => void;
  showTournamentSuggestions: boolean;
  tournamentInputRef: React.RefObject<HTMLInputElement>;
  roundSuggestions: string[];
  setShowRoundSuggestions: (value: boolean) => void;
  showRoundSuggestions: boolean;
  roundInputRef: React.RefObject<HTMLInputElement>;
  currentUserId?: string;
  onSetError: (error: string | null) => void;
  onLocateClick: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const MatchSetupFormFields: React.FC<MatchSetupFormFieldsProps> = ({
  sport,
  setSport,
  format,
  setFormat,
  courtType,
  setCourtType,
  nickname,
  setNickname,
  player1,
  setPlayer1,
  player2,
  setPlayer2,
  selectedAthlete1,
  setSelectedAthlete1,
  selectedAthlete2,
  setSelectedAthlete2,
  visibility,
  setVisibility,
  isResuming,
  setIsResuming,
  openForAnnotation,
  setOpenForAnnotation,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  tournamentName,
  setTournamentName,
  roundName,
  setRoundName,
  bracketType,
  setBracketType,
  temperature,
  setTemperature,
  humidity,
  setHumidity,
  tournamentSuggestions,
  setShowTournamentSuggestions,
  showTournamentSuggestions,
  tournamentInputRef,
  roundSuggestions,
  setShowRoundSuggestions,
  showRoundSuggestions,
  roundInputRef,
  currentUserId,
  onSetError,
  onLocateClick,
  onSubmit,
  isSubmitting,
}) => (
  <form className="match-setup-form" onSubmit={onSubmit}>
    <div className="form-group">
      <label>Esporte</label>
      <select value={sport} onChange={(e) => setSport(e.target.value)}>
        <option value="TENNIS">🎾 Tênis</option>
      </select>
    </div>

    {sport === 'TENNIS' && (
      <div className="form-group">
        <label>Tipo de quadra</label>
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
          excludeUserId={currentUserId}
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
          excludeUserId={currentUserId}
          excludeAthleteId={selectedAthlete1?.id}
        />
      </div>
    </div>

    <div className="form-group">
      <label>Modo de jogo</label>
      <select id="format" name="format" value={format} onChange={(e) => setFormat(e.target.value)}>
        <option value="BEST_OF_3">Melhor de 3 sets com vantagem, Set tie-break em todos</option>
        <option value="BEST_OF_3_MATCH_TB">
          Melhor de 3 sets com vantagem, Match tie-break no 3º
        </option>
        <option value="BEST_OF_5">Melhor de 5 sets com vantagem, Set tie-break em todos</option>
        <option value="SINGLE_SET">Set único com vantagem, Set tie-break em 6-6</option>
        <option value="PRO_SET">Pro Set (8 games) com vantagem, Set tie-break em 8-8</option>
        <option value="MATCH_TIEBREAK">Match Tiebreak (10 pontos) sem vantagem</option>
        <option value="SHORT_SET">Set curto (4 games) com vantagem, Tie-break em 4-4</option>
        <option value="NO_AD">Melhor de 3 sets No-Ad, Set tie-break em 6-6</option>
        <option value="FAST4">Fast4 Tennis (4 games) No-Ad, Tie-break em 3-3</option>
        <option value="SHORT_SET_NO_AD">Set curto (4 games) No-Ad, Tie-break em 4-4</option>
        <option value="NO_LET_TENNIS">Melhor de 3 sets No-Let (saque na rede em jogo)</option>
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
      <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
        <option value="PUBLIC">🌐 Pública (todos podem ver)</option>
        <option value="CLUB">🏢 Clube (apenas membros do clube)</option>
        <option value="PLAYERS_ONLY">🔒 Apenas Jogadores</option>
      </select>
    </div>

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
          Após clicar em &ldquo;Iniciar Partida&rdquo;, você poderá inserir o placar atual.
        </p>
      )}
    </div>

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
        <p className="resume-check-hint">A partida aparecerá no painel como disponível.</p>
      )}
    </div>

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
            onSetError(null);
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
            onSetError(null);
          }}
          aria-label="Horário da partida"
        />
      </div>
    </div>

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
        />
        {showTournamentSuggestions && tournamentSuggestions.length > 0 && (
          <ul className="combobox-suggestions" role="listbox">
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
        />
        {showRoundSuggestions && roundSuggestions.length > 0 && (
          <ul className="combobox-suggestions" role="listbox">
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
        onChange={(e) => setBracketType(e.target.value as any)}
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
        />
      </div>
    </div>

    <div className="form-actions">
      <button type="button" className="locate-button" onClick={onLocateClick}>
        🔍 Localizar Partida
      </button>
      <button type="submit" className="start-match-button" disabled={isSubmitting}>
        Iniciar
      </button>
    </div>
  </form>
);
