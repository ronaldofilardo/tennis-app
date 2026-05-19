const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSuspendedSessions() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'play@email.com' },
      select: { id: true },
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    // Buscar sessões suspensas (ABANDONED com isActive = false)
    const suspended = await prisma.matchAnnotationSession.findMany({
      where: {
        annotatorUserId: user.id,
        status: 'ABANDONED',
        isActive: false,
      },
      include: {
        match: { select: { id: true, playerP1: true, playerP2: true, status: true } },
        annotator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('\nSessões Suspensas (ABANDONED + isActive=false):');
    console.log(`Total: ${suspended.length}\n`);

    suspended.forEach((s, i) => {
      console.log(`[${i + 1}] Session ID: ${s.id}`);
      console.log(`    Match ID: ${s.matchId}`);
      console.log(`    Players: ${s.match.playerA} vs ${s.match.playerB}`);
      console.log(`    Match Status: ${s.match.status}`);
      console.log(`    isActive: ${s.isActive}, status: ${s.status}`);
      console.log(`    createdAt: ${s.createdAt.toISOString()}`);
      console.log();
    });

    // Também verificar se há duplicatas do mesmo matchId
    const matchIds = suspended.map((s) => s.matchId);
    const unique = new Set(matchIds);
    console.log(`\nMatch IDs únicos: ${unique.size}`);
    console.log(`Duplicatas encontradas: ${suspended.length - unique.size}`);

    if (suspended.length - unique.size > 0) {
      console.log('\n⚠️ Ainda há duplicatas!');
      for (const matchId of unique) {
        const forMatch = suspended.filter((s) => s.matchId === matchId);
        if (forMatch.length > 1) {
          console.log(`  Match ${matchId}: ${forMatch.length} sessions`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuspendedSessions();
