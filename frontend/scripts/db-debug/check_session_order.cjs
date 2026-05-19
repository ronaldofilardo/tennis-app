const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const sessions = await prisma.matchAnnotationSession.findMany({
    where: { matchId: 'cmpcqzh6v0001hppk81ztbdba' },
    select: {
      id: true,
      isActive: true,
      status: true,
      createdAt: true,
      endedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('📋 Sessions (newest first):');
  sessions.forEach((s, i) => {
    const timestamp = new Date(s.createdAt).toLocaleString();
    console.log(
      `[${i}] ID: ${s.id.substring(0, 15)}... | Active: ${s.isActive} | Status: ${s.status} | Created: ${timestamp}`,
    );
  });
  process.exit(0);
})();
