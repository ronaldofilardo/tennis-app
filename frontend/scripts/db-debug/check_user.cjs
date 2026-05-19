const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user
  .findUnique({
    where: { id: 'cmpcjzxsr0000hpm06n0lfe88' },
    select: { id: true, email: true, name: true },
  })
  .then((u) => {
    console.log('User exists:', JSON.stringify(u));
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
