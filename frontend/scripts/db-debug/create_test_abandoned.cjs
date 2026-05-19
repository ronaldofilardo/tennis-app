const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestMatchAndSession() {
  try {
    // Get play@email.com user
    const user = await prisma.user.findUnique({
      where: { email: 'play@email.com' },
      select: { id: true },
    });

    if (!user) {
      console.log('User play@email.com not found');
      return;
    }

    // Create a match
    const match = await prisma.match.create({
      data: {
        sportType: 'TENNIS',
        format: 'BEST_OF_3',
        courtType: 'HARD',
        playerP1: 'Test P1',
        playerP2: 'Test P2',
        createdByUserId: user.id,
        status: 'IN_PROGRESS',
        playersEmails: ['play@email.com'],
        apontadorEmail: 'play@email.com',
      },
      select: { id: true },
    });

    console.log('Created match:', match.id);

    // Create a session and mark as abandoned
    const session = await prisma.matchAnnotationSession.create({
      data: {
        matchId: match.id,
        annotatorUserId: user.id,
        isActive: false,
        status: 'ABANDONED',
        matchStateSnapshot: JSON.stringify({ sets: [] }),
      },
      select: {
        id: true,
        matchId: true,
        status: true,
        isActive: true,
      },
    });

    console.log('Created abandoned session:', session);

    // Now query suspended-sessions to verify it appears
    const suspended = await prisma.matchAnnotationSession.findMany({
      where: {
        annotator: { email: 'play@email.com' },
        isActive: false,
        status: { in: ['IN_PROGRESS', 'ABANDONED'] },
      },
      select: {
        id: true,
        status: true,
        isActive: true,
        matchId: true,
        match: { select: { playerP1: true, playerP2: true } },
      },
    });

    console.log('Suspended sessions found:', suspended.length);
    console.log(JSON.stringify(suspended, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMatchAndSession();
