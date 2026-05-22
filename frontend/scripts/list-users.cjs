const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    take: 5,
    select: { email: true },
  });
  console.log('Usuários encontrados:');
  users.forEach((u) => console.log(`  - ${u.email}`));
  await prisma.$disconnect();
})();
