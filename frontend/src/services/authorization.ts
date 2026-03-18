// frontend/src/services/authorization.ts
// === AREA 5: Segurança e Permissões — RBAC (Role Based Access Control) ===
// Funções utilitárias de autorização. Hoje retornam true, mas a chamada
// deve existir no fluxo de addPoint, undo, viewStats etc.
// Quando as regras de clube forem ativadas, basta alterar a lógica aqui.

/**
 * Roles possíveis no sistema.
 * Futuro: pode incluir 'coach', 'admin', 'club_owner', 'spectator'.
 */
export type UserRole =
  | "annotator"
  | "player"
  | "coach"
  | "admin"
  | "club_owner"
  | "spectator"
  | "ATHLETE"
  | "GESTOR"
  | "ADMIN"
  | "COACH"
  | "SPECTATOR";

/**
 * Representa um usuário autenticado para verificação de permissão.
 */
export interface AuthUser {
  email: string;
  role: UserRole;
  clubId?: string;
  /** globalId do AthleteProfile — usado para verificar auto-anotação */
  globalId?: string;
  id?: string;
}

/**
 * Representa os dados mínimos de uma partida para verificação de permissão.
 */
export interface MatchPermissionData {
  id: string;
  apontadorEmail?: string | null;
  playersEmails?: string[];
  visibleTo?: string;
  clubId?: string;
  status?: string;
  /** globalId do AthleteProfile do jogador 1 */
  player1GlobalId?: string | null;
  /** globalId do AthleteProfile do jogador 2 */
  player2GlobalId?: string | null;
  /** userId do jogador 1 (fallback) */
  player1UserId?: string | null;
  /** userId do jogador 2 (fallback) */
  player2UserId?: string | null;
}

// === Funções de Autorização ===

/**
 * Verifica se o usuário pode editar/pontuar uma partida.
 * Regras (futuras):
 * - annotator: pode pontuar se é o apontador designado
 * - player: pode pontuar se é participante e não há apontador
 * - admin/club_owner: pode editar qualquer partida do clube
 *
 * Hoje: retorna true (habilitado para todos).
 */
export function canEditMatch(
  user: AuthUser | null,
  match: MatchPermissionData,
): boolean {
  if (!user) return false;

  // Partida finalizada não pode ser editada
  if (match.status === "FINISHED") return false;

  // Admin e club_owner podem tudo (dentro do clube)
  if (user.role === "admin" || user.role === "club_owner") {
    // Futuro: verificar se match.clubId === user.clubId
    return true;
  }

  // Apontador designado pode sempre editar
  if (user.role === "annotator" && match.apontadorEmail === user.email) {
    return true;
  }

  // Jogador participante pode editar se não tem apontador
  if (user.role === "player") {
    const isParticipant = match.playersEmails?.includes(user.email);
    const hasAnnotator = !!match.apontadorEmail;
    return isParticipant === true && !hasAnnotator;
  }

  // Futuro: aplicar regras de clube aqui
  return true; // Permissão padrão aberta (fase atual)
}

/**
 * Verifica se o usuário pode visualizar estatísticas de uma partida.
 * Regras (futuras):
 * - Partidas públicas: todos podem ver
 * - Partidas privadas: apenas participantes e membros do clube
 *
 * Hoje: retorna true.
 */
export function canViewStats(
  user: AuthUser | null,
  match: MatchPermissionData,
): boolean {
  if (!user) return false;

  // Admin e club_owner podem ver tudo
  if (user.role === "admin" || user.role === "club_owner") return true;

  // Verificar visibilidade
  if (match.visibleTo === "both") return true;

  // Se visibleTo é um email específico, verificar
  if (match.visibleTo && match.visibleTo !== "both") {
    return match.visibleTo === user.email;
  }

  return true; // Permissão padrão aberta
}

/**
 * Verifica se o usuário pode desfazer o último ponto.
 * Regras (futuras): apenas quem pontuou pode desfazer dentro de X segundos.
 *
 * Hoje: mesmo que canEditMatch.
 */
export function canUndoPoint(
  user: AuthUser | null,
  match: MatchPermissionData,
): boolean {
  return canEditMatch(user, match);
}

/**
 * Verifica se o usuário pode excluir uma partida.
 * Regras: apenas o criador ou admin/club_owner.
 *
 * Hoje: retorna true para admin/annotator.
 */
export function canDeleteMatch(
  user: AuthUser | null,
  match: MatchPermissionData,
): boolean {
  if (!user) return false;

  if (user.role === "admin" || user.role === "club_owner") return true;
  if (user.role === "annotator" && match.apontadorEmail === user.email)
    return true;

  return false;
}

/**
 * Verifica se o usuário pode criar partidas.
 * Hoje: annotator e admin podem.
 */
export function canCreateMatch(user: AuthUser | null): boolean {
  if (!user) return false;
  return ["annotator", "admin", "club_owner", "coach", "ADMIN", "GESTOR", "COACH"].includes(user.role);
}

/**
 * Verifica se um usuário é participante (jogador) de uma partida.
 * Usa globalId (preferencial), userId ou email como fallback.
 */
export function isMatchParticipant(
  user: AuthUser,
  match: MatchPermissionData,
): boolean {
  // Verificação por globalId (mais confiável — identidade global)
  if (user.globalId) {
    if (
      user.globalId === match.player1GlobalId ||
      user.globalId === match.player2GlobalId
    ) {
      return true;
    }
  }
  // Fallback: userId
  if (user.id) {
    if (
      user.id === match.player1UserId ||
      user.id === match.player2UserId
    ) {
      return true;
    }
  }
  // Fallback legado: email em playersEmails
  if (user.email && Array.isArray(match.playersEmails)) {
    return match.playersEmails.includes(user.email);
  }
  return false;
}

/**
 * Verifica se o usuário pode anotar uma partida como marcador.
 * Regra central: participante da partida NÃO pode ser seu próprio anotador.
 * Um atleta pode anotar partidas de terceiros (não as suas).
 */
export function canAnnotateMatch(
  user: AuthUser | null,
  match: MatchPermissionData,
): boolean {
  if (!user) return false;
  if (match.status === "FINISHED") return false;

  // Admin e gestor sempre podem
  if (["admin", "club_owner", "ADMIN", "GESTOR"].includes(user.role)) return true;

  // Participante da partida NÃO pode ser seu anotador
  if (isMatchParticipant(user, match)) return false;

  // Anotador designado pode
  if (match.apontadorEmail && match.apontadorEmail === user.email) return true;

  // Qualquer usuário não-participante pode anotar (coach, annotator, atleta de outro jogo)
  return true;
}

export default {
  canEditMatch,
  canViewStats,
  canUndoPoint,
  canDeleteMatch,
  canCreateMatch,
  canAnnotateMatch,
  isMatchParticipant,
};
