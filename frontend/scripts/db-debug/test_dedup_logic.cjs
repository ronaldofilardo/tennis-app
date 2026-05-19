const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSuspendedLogic() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'play@email.com' },
      select: { id: true, email: true },
    });

    console.log('User:', user?.email);

    const suspendedSessions = await prisma.matchAnnotationSession.findMany({
      where: {
        annotator: {
          email: user.email,
        },
        isActive: false,
        status: { in: ['IN_PROGRESS', 'ABANDONED'] },
      },
      select: {
        id: true,
        matchId: true,
        match: {
          select: {
            id: true,
            playerP1: true,
            playerP2: true,
          },
        },
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('\nBefore deduplication:', suspendedSessions.length, 'sessions');
    suspendedSessions.forEach((s, i) => {
      console.log(`[${i}] Match: ${s.matchId}, Session: ${s.id}, Status: ${s.status}`);
    });

    // ─── Deduplication: Keep only the most recent session per matchId ───
    const deduplicatedByMatch = new Map();
    for (const session of suspendedSessions) {
      if (!deduplicatedByMatch.has(session.matchId)) {
        deduplicatedByMatch.set(session.matchId, session);
      }
    }

    console.log('\nAfter deduplication:', deduplicatedByMatch.size, 'matches');
    Array.from(deduplicatedByMatch.values()).forEach((s, i) => {
      console.log(`[${i}] Match: ${s.matchId}, Session: ${s.id}`);
    });

    const result = Array.from(deduplicatedByMatch.values()).map((session) => ({
      id: session.match.id,
      playerP1: session.match.playerP1,
      playerP2: session.match.playerP2,
      suspendedSessionId: session.id,
      suspendedAt: session.createdAt,
    }));

    console.log('\nFinal result:', result.length, 'items');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSuspendedLogic();
