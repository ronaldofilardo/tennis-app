import { useReducer } from 'react';
import type { Athlete } from '../types/athlete';

export interface MatchSetupFormState {
  sport: string;
  format: string;
  courtType: string | null;
  nickname: string;
  player1: string;
  player2: string;
  selectedAthlete1: Athlete | null;
  selectedAthlete2: Athlete | null;
  visibility: 'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY' | null;
  visibleTo: string;
  error: string | null;
  isResuming: boolean;
  isResumeModalOpen: boolean;
  isLocateModalOpen: boolean;
  openForAnnotation: boolean;
  scheduledDate: string;
  scheduledTime: string;
  tournamentName: string;
  roundName: string;
  bracketType: string;
  tournamentSuggestions: string[];
  roundSuggestions: string[];
  duplicateMatch: { id: string; playerP1?: string; playerP2?: string } | null;
  isDuplicateModalOpen: boolean;
  pendingDuplicatePayload: Record<string, unknown> | null;
  temperature: string;
  humidity: string;
}

export interface UseMatchSetupFormReturn {
  state: MatchSetupFormState;
  setters: {
    setSport: (value: string) => void;
    setFormat: (value: string) => void;
    setCourtType: (value: string | null) => void;
    setNickname: (value: string) => void;
    setPlayer1: (value: string) => void;
    setPlayer2: (value: string) => void;
    setSelectedAthlete1: (value: Athlete | null) => void;
    setSelectedAthlete2: (value: Athlete | null) => void;
    setVisibility: (value: MatchSetupFormState['visibility']) => void;
    setVisibleTo: (value: string) => void;
    setError: (value: string | null) => void;
    setIsResuming: (value: boolean) => void;
    setIsResumeModalOpen: (value: boolean) => void;
    setIsLocateModalOpen: (value: boolean) => void;
    setOpenForAnnotation: (value: boolean) => void;
    setScheduledDate: (value: string) => void;
    setScheduledTime: (value: string) => void;
    setTournamentName: (value: string) => void;
    setRoundName: (value: string) => void;
    setBracketType: (value: string) => void;
    setTournamentSuggestions: (value: string[]) => void;
    setRoundSuggestions: (value: string[]) => void;
    setDuplicateMatch: (value: MatchSetupFormState['duplicateMatch']) => void;
    setIsDuplicateModalOpen: (value: boolean) => void;
    setPendingDuplicatePayload: (value: Record<string, unknown> | null) => void;
    setTemperature: (value: string) => void;
    setHumidity: (value: string) => void;
    reset: () => void;
  };
  errors: Record<string, string | null>;
  canSubmit: () => boolean;
  getMissingRequiredFields: () => string[];
}

export type MatchSetupFormAction =
  | { type: 'setSport'; payload: string }
  | { type: 'setFormat'; payload: string }
  | { type: 'setCourtType'; payload: string | null }
  | { type: 'setNickname'; payload: string }
  | { type: 'setPlayer1'; payload: string }
  | { type: 'setPlayer2'; payload: string }
  | { type: 'setSelectedAthlete1'; payload: Athlete | null }
  | { type: 'setSelectedAthlete2'; payload: Athlete | null }
  | { type: 'setVisibility'; payload: MatchSetupFormState['visibility'] }
  | { type: 'setVisibleTo'; payload: string }
  | { type: 'setError'; payload: string | null }
  | { type: 'setIsResuming'; payload: boolean }
  | { type: 'setIsResumeModalOpen'; payload: boolean }
  | { type: 'setIsLocateModalOpen'; payload: boolean }
  | { type: 'setOpenForAnnotation'; payload: boolean }
  | { type: 'setScheduledDate'; payload: string }
  | { type: 'setScheduledTime'; payload: string }
  | { type: 'setTournamentName'; payload: string }
  | { type: 'setRoundName'; payload: string }
  | { type: 'setBracketType'; payload: string }
  | { type: 'setTournamentSuggestions'; payload: string[] }
  | { type: 'setRoundSuggestions'; payload: string[] }
  | { type: 'setDuplicateMatch'; payload: MatchSetupFormState['duplicateMatch'] }
  | { type: 'setIsDuplicateModalOpen'; payload: boolean }
  | { type: 'setPendingDuplicatePayload'; payload: Record<string, unknown> | null }
  | { type: 'setTemperature'; payload: string }
  | { type: 'setHumidity'; payload: string }
  | { type: 'reset' };

function formReducer(
  state: MatchSetupFormState,
  action: MatchSetupFormAction,
): MatchSetupFormState {
  switch (action.type) {
    case 'setSport':
      return { ...state, sport: action.payload };
    case 'setFormat':
      return { ...state, format: action.payload };
    case 'setCourtType':
      return { ...state, courtType: action.payload };
    case 'setNickname':
      return { ...state, nickname: action.payload };
    case 'setPlayer1':
      return { ...state, player1: action.payload };
    case 'setPlayer2':
      return { ...state, player2: action.payload };
    case 'setSelectedAthlete1':
      return { ...state, selectedAthlete1: action.payload };
    case 'setSelectedAthlete2':
      return { ...state, selectedAthlete2: action.payload };
    case 'setVisibility':
      return { ...state, visibility: action.payload };
    case 'setVisibleTo':
      return { ...state, visibleTo: action.payload };
    case 'setError':
      return { ...state, error: action.payload };
    case 'setIsResuming':
      return { ...state, isResuming: action.payload };
    case 'setIsResumeModalOpen':
      return { ...state, isResumeModalOpen: action.payload };
    case 'setIsLocateModalOpen':
      return { ...state, isLocateModalOpen: action.payload };
    case 'setOpenForAnnotation':
      return { ...state, openForAnnotation: action.payload };
    case 'setScheduledDate':
      return { ...state, scheduledDate: action.payload };
    case 'setScheduledTime':
      return { ...state, scheduledTime: action.payload };
    case 'setTournamentName':
      return { ...state, tournamentName: action.payload };
    case 'setRoundName':
      return { ...state, roundName: action.payload };
    case 'setBracketType':
      return { ...state, bracketType: action.payload };
    case 'setTournamentSuggestions':
      return { ...state, tournamentSuggestions: action.payload };
    case 'setRoundSuggestions':
      return { ...state, roundSuggestions: action.payload };
    case 'setDuplicateMatch':
      return { ...state, duplicateMatch: action.payload };
    case 'setIsDuplicateModalOpen':
      return { ...state, isDuplicateModalOpen: action.payload };
    case 'setPendingDuplicatePayload':
      return { ...state, pendingDuplicatePayload: action.payload };
    case 'setTemperature':
      return { ...state, temperature: action.payload };
    case 'setHumidity':
      return { ...state, humidity: action.payload };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

const initialState: MatchSetupFormState = {
  sport: 'TENNIS',
  format: 'BEST_OF_3',
  courtType: 'HARD',
  nickname: '',
  player1: '',
  player2: '',
  selectedAthlete1: null,
  selectedAthlete2: null,
  visibility: null,
  visibleTo: 'both',
  error: null,
  isResuming: false,
  isResumeModalOpen: false,
  isLocateModalOpen: false,
  openForAnnotation: false,
  scheduledDate: '',
  scheduledTime: '',
  tournamentName: '',
  roundName: '',
  bracketType: '',
  tournamentSuggestions: [],
  roundSuggestions: [],
  duplicateMatch: null,
  isDuplicateModalOpen: false,
  pendingDuplicatePayload: null,
  temperature: '',
  humidity: '',
};

export function useMatchSetupForm(): UseMatchSetupFormReturn {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const setters = {
    setSport: (value: string) => dispatch({ type: 'setSport', payload: value }),
    setFormat: (value: string) => dispatch({ type: 'setFormat', payload: value }),
    setCourtType: (value: string | null) => dispatch({ type: 'setCourtType', payload: value }),
    setNickname: (value: string) => dispatch({ type: 'setNickname', payload: value }),
    setPlayer1: (value: string) => dispatch({ type: 'setPlayer1', payload: value }),
    setPlayer2: (value: string) => dispatch({ type: 'setPlayer2', payload: value }),
    setSelectedAthlete1: (value: Athlete | null) =>
      dispatch({ type: 'setSelectedAthlete1', payload: value }),
    setSelectedAthlete2: (value: Athlete | null) =>
      dispatch({ type: 'setSelectedAthlete2', payload: value }),
    setVisibility: (value: MatchSetupFormState['visibility']) =>
      dispatch({ type: 'setVisibility', payload: value }),
    setVisibleTo: (value: string) => dispatch({ type: 'setVisibleTo', payload: value }),
    setError: (value: string | null) => dispatch({ type: 'setError', payload: value }),
    setIsResuming: (value: boolean) => dispatch({ type: 'setIsResuming', payload: value }),
    setIsResumeModalOpen: (value: boolean) =>
      dispatch({ type: 'setIsResumeModalOpen', payload: value }),
    setIsLocateModalOpen: (value: boolean) =>
      dispatch({ type: 'setIsLocateModalOpen', payload: value }),
    setOpenForAnnotation: (value: boolean) =>
      dispatch({ type: 'setOpenForAnnotation', payload: value }),
    setScheduledDate: (value: string) => dispatch({ type: 'setScheduledDate', payload: value }),
    setScheduledTime: (value: string) => dispatch({ type: 'setScheduledTime', payload: value }),
    setTournamentName: (value: string) => dispatch({ type: 'setTournamentName', payload: value }),
    setRoundName: (value: string) => dispatch({ type: 'setRoundName', payload: value }),
    setBracketType: (value: string) => dispatch({ type: 'setBracketType', payload: value }),
    setTournamentSuggestions: (value: string[]) =>
      dispatch({ type: 'setTournamentSuggestions', payload: value }),
    setRoundSuggestions: (value: string[]) =>
      dispatch({ type: 'setRoundSuggestions', payload: value }),
    setDuplicateMatch: (value: MatchSetupFormState['duplicateMatch']) =>
      dispatch({ type: 'setDuplicateMatch', payload: value }),
    setIsDuplicateModalOpen: (value: boolean) =>
      dispatch({ type: 'setIsDuplicateModalOpen', payload: value }),
    setPendingDuplicatePayload: (value: Record<string, unknown> | null) =>
      dispatch({ type: 'setPendingDuplicatePayload', payload: value }),
    setTemperature: (value: string) => dispatch({ type: 'setTemperature', payload: value }),
    setHumidity: (value: string) => dispatch({ type: 'setHumidity', payload: value }),
    reset: () => dispatch({ type: 'reset' }),
  };

  const errors = {
    sport: state.sport ? null : 'Sport is required',
    format: state.format ? null : 'Format is required',
    courtType: state.courtType ? null : 'Court type is required',
    player1: !state.selectedAthlete1 ? null : null,
    player2: !state.selectedAthlete2 ? null : null,
    scheduledDate: state.scheduledDate ? null : 'Date is required',
    scheduledTime: state.scheduledTime ? null : 'Time is required',
  };

  // 6 campos obrigatórios para criar partida
  const requiredFields = {
    sport: state.sport,
    courtType: state.courtType,
    athlete1: state.selectedAthlete1,
    athlete2: state.selectedAthlete2,
    date: state.scheduledDate,
    time: state.scheduledTime,
  };

  const canSubmit = () => {
    return (
      !!requiredFields.sport &&
      !!requiredFields.courtType &&
      !!requiredFields.athlete1 &&
      !!requiredFields.athlete2 &&
      !!requiredFields.date &&
      !!requiredFields.time
    );
  };

  const getMissingRequiredFields = () => {
    const missing: string[] = [];
    if (!requiredFields.sport) missing.push('Esporte');
    if (!requiredFields.courtType) missing.push('Tipo de Quadra');
    if (!requiredFields.athlete1) missing.push('Jogador 1');
    if (!requiredFields.athlete2) missing.push('Jogador 2');
    if (!requiredFields.date) missing.push('Data');
    if (!requiredFields.time) missing.push('Horário');
    return missing;
  };

  return { state, setters, errors, canSubmit, getMissingRequiredFields };
}
