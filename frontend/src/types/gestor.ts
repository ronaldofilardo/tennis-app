// frontend/src/types/gestor.ts
// Tipos e constantes compartilhados do GestorDashboard

export interface MatchesByStatus {
  status: string;
  count: number;
}

export interface TournamentsByStatus {
  status: string;
  count: number;
}

export interface RecentMatch {
  id: string;
  playerP1: string;
  playerP2: string;
  status: string;
  score: string | null;
  format: string;
  createdAt: string;
  visibility: string;
}

export interface GestorClubMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
}

export interface ClubStats {
  totalMembers: number;
  totalMatches: number;
  matchesByStatus: MatchesByStatus[];
  totalTournaments: number;
  tournamentsByStatus: TournamentsByStatus[];
  recentMatches: RecentMatch[];
  recentMembers: FullMember[];
}

export interface FullMember {
  id: string;
  userId: string | null;
  clubId: string;
  role: string;
  status: string;
  joinedAt: string;
  isGuest?: boolean;
  user: {
    id: string | null;
    email: string | null;
    name: string;
    avatarUrl?: string | null;
    athleteProfile?: {
      id: string;
      globalId: string;
      cpf?: string | null;
      birthDate?: string | null;
    } | null;
  };
}

export interface InvoiceRow {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt?: string | null;
  description?: string;
}

export type GestorTabType =
  | 'overview'
  | 'members'
  | 'matches'
  | 'tournaments'
  | 'rankings'
  | 'billing'
  | 'settings';

export { ROLE_LABELS, ROLE_ICONS } from './roles';

export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Não Iniciada',
  IN_PROGRESS: 'Em Andamento',
  FINISHED: 'Finalizada',
  PAUSED: 'Pausada',
};

export const MATCH_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'badge-neutral',
  IN_PROGRESS: 'badge-live',
  FINISHED: 'badge-finished',
  PAUSED: 'badge-paused',
};

export const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  REGISTRATION: 'Inscrições',
  IN_PROGRESS: 'Em Andamento',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

export const VISIBILITY_ICONS: Record<string, string> = {
  PUBLIC: '🌐',
  CLUB: '🏢',
  PLAYERS_ONLY: '🔒',
};

export const INVITE_ROLES = ['COACH', 'ATHLETE', 'SPECTATOR'];

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Vencida',
  CANCELED: 'Cancelada',
  REFUNDED: 'Reembolsada',
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-neutral',
  PAID: 'badge-finished',
  OVERDUE: 'badge-live',
  CANCELED: 'badge-paused',
  REFUNDED: 'badge-neutral',
};
