// frontend/src/services/authorization.ts
// === AREA 5: Segurança e Permissões — RBAC (Role Based Access Control) ===
// Funções utilitárias de autorização alinhadas com o enum UserRole do Prisma.

/**
 * Roles possíveis no sistema — alinhadas com enum UserRole do Prisma.
 */
export type UserRole = "ADMIN" | "GESTOR" | "COACH" | "ATHLETE" | "SPECTATOR";

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
 * - ADMIN/GESTOR: pode editar qualquer partida do clube
 * - COACH: pode editar se é o apontador designado
 * - ATHLETE: pode pontuar se é participante e não há apontador
 * - SPECTATOR: nunca pode editar
 */
export function canEditMatch(
  user: AuthUser | null,
  match: MatchPermissionData,
): boolean {
  if (!user) return false;

  // Partida finalizada não pode ser editada
  if (match.status === "FINISHED") return false;

  // SPECTATOR nunca edita
  if (user.role === "SPECTATOR") return false;

  // ADMIN e GESTOR podem tudo (dentro do clube)
  if (user.role === "ADMIN" || user.role === "GESTOR") {
    return true;
  }

  // Apontador designado pode sempre editar
  if (match.apontadorEmail === user.email) {
    return true;
  }

  // COACH pode editar partidas do seu clube
  if (user.role === "COACH") {
    return true;
  }

  // ATHLETE participante pode editar se não tem apontador
  if (user.role === "ATHLETE") {
    const isParticipant = isMatchParticipant(user, match);
    const hasAnnotator = !!match.apontadorEmail;
    return isParticipant && !hasAnnotator;
  }

  return false;
}

/**
 * Verifica se o usuário pode visualizar estatísticas de uma partida.
 * - Partidas públicas: todos podem ver
 * - Partidas privadas: apenas participantes e membros do clube
 */
export function canViewStats(
  user: AuthUser | null,
  match: MatchPermissionData,
): boolean {
  if (!user) return false;

  // ADMIN e GESTOR podem ver tudo
  if (user.role === "ADMIN" || user.role === "GESTOR") return true;

  // Verificar visibilidade
  if (match.visibleTo === "both") return true;

  // Se visibleTo é um email específico, verificar
  if (match.visibleTo && match.visibleTo !== "both") {
    return match.visibleTo === user.email;
  }

  return true;
}

/**
 * Verifica se o usuário pode desfazer o último ponto.
 * Mesmo critério de canEditMatch.
 */
export function canUndoPoint(
  user: AuthUser | null,
  match: MatchPermissionData,
): boolean {
  return canEditMatch(user, match);
}

/**
 * Verifica se o usuário pode excluir uma partida.
 * Regras: apenas ADMIN/GESTOR ou o apontador designado.
 */
export function canDeleteMatch(
  user: AuthUser | null,
  match: MatchPermissionData,
): boolean {
  if (!user) return false;

  if (user.role === "ADMIN" || user.role === "GESTOR") return true;
  if (match.apontadorEmail === user.email) return true;

  return false;
}

/**
 * Verifica se o usuário pode criar partidas.
 * ADMIN, GESTOR e COACH podem criar.
 */
export function canCreateMatch(user: AuthUser | null): boolean {
  if (!user) return false;
  return ["ADMIN", "GESTOR", "COACH"].includes(user.role);
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
    if (user.id === match.player1UserId || user.id === match.player2UserId) {
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
 */
export function canAnnotateMatch(
  user: AuthUser | null,
  match: MatchPermissionData,
): boolean {
  if (!user) return false;
  if (match.status === "FINISHED") return false;

  // SPECTATOR nunca anota
  if (user.role === "SPECTATOR") return false;

  // ADMIN e GESTOR sempre podem
  if (user.role === "ADMIN" || user.role === "GESTOR") return true;

  // Participante da partida NÃO pode ser seu anotador
  if (isMatchParticipant(user, match)) return false;

  // Anotador designado pode
  if (match.apontadorEmail && match.apontadorEmail === user.email) return true;

  // Qualquer usuário não-participante pode anotar (COACH, ATHLETE de outro jogo)
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
