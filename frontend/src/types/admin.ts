// frontend/src/types/admin.ts
// Tipos e constantes compartilhados do AdminDashboard

export interface ByPlanCount {
  plan: string;
  count: number;
}

export interface ByRoleCount {
  role: string;
  count: number;
}

export interface TopClub {
  id: string;
  name: string;
  slug: string;
  planType: string;
  createdAt: string;
  memberCount: number;
}

export interface RecentClub {
  id: string;
  name: string;
  slug: string;
  planType: string;
  createdAt: string;
  memberCount: number;
}

export interface AdminStats {
  totalUsers: number;
  totalClubs: number;
  newUsersThisMonth: number;
  newClubsThisMonth: number;
  activeUsersLastWeek: number;
  clubsByPlan: ByPlanCount[];
  membershipsByRole: ByRoleCount[];
  topClubsByMembers: TopClub[];
  recentClubs: RecentClub[];
}

export interface AdminClub {
  id: string;
  name: string;
  slug: string;
  planType: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  matchCount: number;
  tournamentCount: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  platformRole: string;
  primaryClub: string | null;
  createdAt: string;
  updatedAt: string;
  clubCount: number;
  matchCount: number;
}

export interface PaginatedClubs {
  clubs: AdminClub[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedUsers {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminMatch {
  id: string;
  playerP1: string;
  playerP2: string;
  status: string;
  score: string | null;
  winner: string | null;
  visibility: string;
  clubName: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface PaginatedMatches {
  matches: AdminMatch[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateClubForm {
  name: string;
  slug: string;
  planType: string;
  gestorName: string;
  gestorEmail: string;
  gestorPassword: string;
  alsoCoach: boolean;
}

export type AdminTabType = 'overview' | 'clubs' | 'users' | 'matches';

export const PAGE_SIZE = 20;

export const INITIAL_CREATE_FORM: CreateClubForm = {
  name: '',
  slug: '',
  planType: 'FREE',
  gestorName: '',
  gestorEmail: '',
  gestorPassword: '',
  alsoCoach: false,
};

export { ROLE_LABELS, ROLE_ICONS } from './roles';

export const PLAN_LABELS: Record<string, string> = {
  FREE: 'Gratuito',
  PREMIUM: 'Premium',
  ENTERPRISE: 'Enterprise',
};

export const PLAN_COLORS: Record<string, string> = {
  FREE: 'plan-free',
  PREMIUM: 'plan-premium',
  ENTERPRISE: 'plan-enterprise',
};

export const MATCH_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Não iniciada',
  IN_PROGRESS: 'Em andamento',
  FINISHED: 'Finalizada',
};

export const MATCH_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'ms-not-started',
  IN_PROGRESS: 'ms-in-progress',
  FINISHED: 'ms-finished',
};

export const PLATFORM_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SCORER: 'Anotador',
  INDEPENDENT_ATHLETE: 'Atleta Avulso',
  SPECTATOR: 'Espectador',
  MEMBER: 'Membro',
};

export const PLATFORM_ROLE_COLORS: Record<string, string> = {
  ADMIN: 'pr-admin',
  SCORER: 'pr-scorer',
  INDEPENDENT_ATHLETE: 'pr-independent',
  SPECTATOR: 'pr-spectator',
  MEMBER: 'pr-member',
};

export const CLUB_INDEPENDENT_ROLES = new Set(['SCORER', 'INDEPENDENT_ATHLETE', 'SPECTATOR']);
