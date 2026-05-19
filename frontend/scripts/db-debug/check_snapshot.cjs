const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSnapshot() {
  // Get the match ID for the suspended annotation
  const suspendedSessions = await prisma.matchAnnotationSession.findMany({
    where: {
      isActive: false,
      status: { in: ['IN_PROGRESS', 'ABANDONED'] },
    },
    include: {
      match: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log('\n📋 Suspended Sessions:');
  suspendedSessions.forEach((session, idx) => {
    console.log(`\n[${idx}] Session ID: ${session.id}`);
    console.log(`    Match: ${session.match.nickname || session.match.id}`);
    console.log(`    Status: ${session.status}`);
    console.log(`    IsActive: ${session.isActive}`);
    console.log(`    CreatedAt: ${session.createdAt}`);
    console.log(`    EndedAt: ${session.endedAt}`);

    if (session.matchStateSnapshot) {
      console.log(`    ✅ Has matchStateSnapshot: YES`);
      try {
        const parsed = JSON.parse(session.matchStateSnapshot);
        console.log(`       Sets: ${JSON.stringify(parsed.sets)}`);
        console.log(`       Games: ${JSON.stringify(parsed.games)}`);
        console.log(`       Points: ${JSON.stringify(parsed.points)}`);
        console.log(`       Server: ${parsed.server}`);
        console.log(`       PointsHistory count: ${parsed.pointsHistory?.length || 0}`);
      } catch (e) {
        console.log(`       ❌ Parse error: ${e.message}`);
        console.log(`       Raw: ${session.matchStateSnapshot.substring(0, 200)}...`);
      }
    } else {
      console.log(`    ❌ Has matchStateSnapshot: NO`);
    }

    if (session.finalStateSnapshot) {
      console.log(`    ✅ Has finalStateSnapshot: YES`);
    }
  });

  await prisma.$disconnect();
}

checkSnapshot().catch(console.error);
