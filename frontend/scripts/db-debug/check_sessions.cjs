const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSessions() {
  try {
    const sessions = await prisma.matchAnnotationSession.findMany({
      select: {
        id: true,
        status: true,
        isActive: true,
        annotator: { select: { email: true } },
        match: { select: { id: true, status: true } },
        createdAt: true,
        startedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    console.log('Total sessions:', sessions.length);
    console.log(JSON.stringify(sessions, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();
