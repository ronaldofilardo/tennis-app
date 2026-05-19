const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllSessionsForMatch() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'play@email.com' },
      select: { id: true },
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    const matchId = 'cmpcqzh6v0001hppk81ztbdba';

    const allSessions = await prisma.matchAnnotationSession.findMany({
      where: {
        matchId,
        annotatorUserId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        isActive: true,
        createdAt: true,
        matchStateSnapshot: true,
      },
    });

    console.log(`\nTodas as sessões para match ${matchId}:`);
    console.log(`Total: ${allSessions.length}\n`);

    allSessions.forEach((s, i) => {
      console.log(`[${i + 1}] ID: ${s.id}`);
      console.log(`    status: ${s.status}, isActive: ${s.isActive}`);
      console.log(`    createdAt: ${s.createdAt.toISOString()}`);
      console.log(`    hasSnapshot: ${!!s.matchStateSnapshot}`);
      console.log();
    });

    // Buscar a query que o endpoint retorna
    console.log('\n--- Simulando GET /suspended-sessions ---');
    const suspended = await prisma.matchAnnotationSession.findMany({
      where: {
        annotatorUserId: user.id,
        status: 'ABANDONED',
        isActive: false,
      },
      include: {
        match: {
          select: { id: true, playerP1: true, playerP2: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Retornaría ao frontend: ${suspended.length} sessões suspensas`);
    suspended.forEach((s, i) => {
      console.log(`[${i + 1}] Match: ${s.matchId}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllSessionsForMatch();
