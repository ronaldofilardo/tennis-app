import { useReducer } from 'react';

export interface MatchSetupFormState {
  sport: string;
  format: string;
  courtType: string | null;
  nickname: string;
  player1: string;
  player2: string;
  selectedAthlete1: any;
  selectedAthlete2: any;
  visibility: 'PUBLIC' | 'CLUB' | 'PLAYERS_ONLY' | null;
  visibleTo: string;
  error: string | null;
  isResuming: boolean;
  isResumeModalOpen: boolean;
  isLocateModalOpen: boolean;
  openForAnnotation: boolean;
  scheduledDate: string;
  scheduledTime: string;
  duplicateMatch: { id: string; playerP1?: string; playerP2?: string } | null;
  isDuplicateModalOpen: boolean;
  pendingDuplicatePayload: Record<string, unknown> | null;
  temperature: string;
  humidity: string;
}

export type MatchSetupFormAction =
  | { type: 'setSport'; payload: string }
  | { type: 'setFormat'; payload: string }
  | { type: 'setCourtType'; payload: string | null }
  | { type: 'setNickname'; payload: string }
  | { type: 'setPlayer1'; payload: string }
  | { type: 'setPlayer2'; payload: string }
  | { type: 'setSelectedAthlete1'; payload: any }
  | { type: 'setSelectedAthlete2'; payload: any }
  | { type: 'setVisibility'; payload: any }
  | { type: 'setVisibleTo'; payload: string }
  | { type: 'setError'; payload: string | null }
  | { type: 'setIsResuming'; payload: boolean }
  | { type: 'setIsResumeModalOpen'; payload: boolean }
  | { type: 'setIsLocateModalOpen'; payload: boolean }
  | { type: 'setOpenForAnnotation'; payload: boolean }
  | { type: 'setScheduledDate'; payload: string }
  | { type: 'setScheduledTime'; payload: string }
  | { type: 'setDuplicateMatch'; payload: any }
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
  duplicateMatch: null,
  isDuplicateModalOpen: false,
  pendingDuplicatePayload: null,
  temperature: '',
  humidity: '',
};

export function useMatchSetupForm() {
  const [state, dispatch] = useReducer(formReducer, initialState);
  return { state, dispatch };
}
