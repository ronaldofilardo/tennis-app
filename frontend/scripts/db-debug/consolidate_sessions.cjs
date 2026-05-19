const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function consolidateSessions() {
  try {
    // Buscar play@email.com user
    const user = await prisma.user.findUnique({
      where: { email: 'play@email.com' },
      select: { id: true },
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    // Buscar todas as sessions antes
    const allBefore = await prisma.matchAnnotationSession.findMany({
      where: { annotatorUserId: user.id },
      select: { id: true, matchId: true, status: true, isActive: true, createdAt: true },
    });

    console.log('Sessions ANTES:', allBefore.length);
    console.log(JSON.stringify(allBefore, null, 2));

    // Consolidar: marcar duplicatas como ABANDONED
    const matches = await prisma.match.findMany({
      where: { createdByUserId: user.id },
      select: { id: true },
    });

    let consolidated = 0;
    for (const match of matches) {
      const sessions = await prisma.matchAnnotationSession.findMany({
        where: { matchId: match.id, annotatorUserId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      if (sessions.length > 1) {
        const kept = sessions[0];
        const toAbandon = sessions.slice(1);

        await prisma.matchAnnotationSession.updateMany({
          where: { id: { in: toAbandon.map((s) => s.id) } },
          data: { status: 'ABANDONED', isActive: false, endedAt: new Date() },
        });

        await prisma.matchAnnotationSession.update({
          where: { id: kept.id },
          data: { isActive: true, status: 'IN_PROGRESS', matchStateSnapshot: null },
        });

        console.log(`Match ${match.id}: consolidado ${toAbandon.length} para manter 1`);
        consolidated += toAbandon.length;
      }
    }

    console.log(`\nTotal consolidadas: ${consolidated}`);

    // Buscar após consolidação
    const allAfter = await prisma.matchAnnotationSession.findMany({
      where: { annotatorUserId: user.id },
      select: { id: true, matchId: true, status: true, isActive: true },
    });

    console.log('\nSessions DEPOIS:', allAfter.length);
    console.log('Ativas:', allAfter.filter((s) => s.isActive).length);
    console.log(
      'ABANDONED:',
      allAfter.filter((s) => !s.isActive && s.status === 'ABANDONED').length,
    );
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

consolidateSessions();
