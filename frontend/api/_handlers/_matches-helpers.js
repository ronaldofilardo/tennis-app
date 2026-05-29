// frontend/api/_handlers/_matches-helpers.js
// Funções auxiliares compartilhadas pelo handler de partidas

import prisma from '../_lib/prisma.js';

/**
 * Gera (ou atualiza) o comparativo de anotações para uma partida.
 * Agrega todas as sessões COMPLETED e compara ponto-a-ponto.
 */
export async function generateComparison(matchId) {
  const sessions = await prisma.matchAnnotationSession.findMany({
    where: { matchId, status: 'COMPLETED' },
    select: {
      id: true,
      annotatorUserId: true,
      finalStateSnapshot: true,
      annotator: { select: { id: true, name: true } },
    },
  });

  if (sessions.length < 2) return null;

  const sessionData = sessions
    .map((s) => {
      try {
        const state = s.finalStateSnapshot ? JSON.parse(s.finalStateSnapshot) : null;
        const history = state?.pointsHistory || [];
        return {
          sessionId: s.id,
          annotatorId: s.annotatorUserId,
          annotatorName: s.annotator?.name || s.annotatorUserId,
          history,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const maxLen = Math.max(...sessionData.map((s) => s.history.length), 0);
  const points = [];
  for (let i = 0; i < maxLen; i++) {
    const bySession = {};
    let consensus = true;
    let firstWinner = null;
    for (const sd of sessionData) {
      const pt = sd.history[i] || null;
      bySession[sd.annotatorId] = pt;
      if (pt) {
        if (firstWinner === null) firstWinner = pt.winner;
        else if (pt.winner !== firstWinner) consensus = false;
      }
    }
    points.push({ index: i, consensus, sessions: bySession });
  }

  const payload = {
    sessions: sessionData.map((s) => ({
      id: s.sessionId,
      annotatorId: s.annotatorId,
      name: s.annotatorName,
    })),
    points,
  };

  const existing = await prisma.matchAnnotationComparison.findFirst({ where: { matchId } });
  if (existing) {
    return prisma.matchAnnotationComparison.update({
      where: { id: existing.id },
      data: { payload, status: 'PUBLISHED', updatedAt: new Date() },
    });
  }
  return prisma.matchAnnotationComparison.create({
    data: { matchId, payload, status: 'PUBLISHED' },
  });
}

/**
 * Cria MatchDashboardShare para todos os stakeholders de uma partida.
 */
export async function createDashboardShares(matchId) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      createdByUserId: true,
      player1: { select: { userId: true, clubId: true } },
      player2: { select: { userId: true, clubId: true } },
      homeClubId: true,
      awayClubId: true,
      clubId: true,
    },
  });
  if (!match) return;

  const sharesData = [];
  const addedUsers = new Set();
  const addedClubs = new Set();

  const addUser = (userId) => {
    if (userId && !addedUsers.has(userId)) {
      addedUsers.add(userId);
      sharesData.push({ matchId, targetUserId: userId, shareType: 'ANNOTATION' });
    }
  };
  const addClub = (clubId) => {
    if (clubId && !addedClubs.has(clubId)) {
      addedClubs.add(clubId);
      sharesData.push({ matchId, targetClubId: clubId, shareType: 'ANNOTATION' });
    }
  };

  addUser(match.createdByUserId);
  addUser(match.player1?.userId);
  addUser(match.player2?.userId);
  addClub(match.clubId);
  addClub(match.homeClubId);
  addClub(match.awayClubId);

  if (sharesData.length > 0) {
    await prisma.matchDashboardShare.createMany({ data: sharesData, skipDuplicates: true });
  }
}

export function parsePath(url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const seg = parts[2] || null;
  const sub = parts[3] || null;
  const subId = parts[4] || null;
  const action = parts[5] || null;
  const isVisible = seg === 'visible';
  const isOpenForAnnotation = seg === 'open-for-annotation';
  const isDiscover = seg === 'discover';
  const isMyShares = seg === 'my-shares';
  const isAnnotatedForMe = seg === 'annotated-for-me';
  const isAnnotatedByMe = seg === 'annotated-by-me';
  const isMyCompleted = seg === 'my-completed';
  const isTournamentSuggestions = seg === 'tournament-suggestions';
  const isSuspendedSessions = seg === 'suspended-sessions';
  const isSpecialSeg =
    isVisible ||
    isOpenForAnnotation ||
    isDiscover ||
    isMyShares ||
    isAnnotatedForMe ||
    isAnnotatedByMe ||
    isMyCompleted ||
    isTournamentSuggestions ||
    isSuspendedSessions;
  const id = !isSpecialSeg ? seg : null;
  const isMetadata = sub === 'metadata';
  const isClaim = sub === 'claim';
  return {
    id,
    sub,
    subId,
    action,
    isVisible,
    isOpenForAnnotation,
    isDiscover,
    isMyShares,
    isAnnotatedForMe,
    isAnnotatedByMe,
    isMyCompleted,
    isSuspendedSessions,
    isMetadata,
    isClaim,
    isTournamentSuggestions,
  };
}
