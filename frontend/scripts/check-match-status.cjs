const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const matches = await prisma.match.findMany({
    select: {
      status: true,
    },
  });

  const byStatus = {};
  matches.forEach((m) => {
    if (!byStatus[m.status]) {
      byStatus[m.status] = 0;
    }
    byStatus[m.status]++;
  });

  console.log('Status de partidas no banco:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`  - ${status}: ${count} partidas`);
  });

  console.log(`\nTotal: ${matches.length} partidas`);
  await prisma.$disconnect();
})();
