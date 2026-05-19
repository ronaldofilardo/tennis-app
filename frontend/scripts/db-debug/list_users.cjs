const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
    take: 20,
  });

  console.log(`📋 Total de usuários: ${users.length}\n`);
  users.forEach((user) => {
    console.log(`${user.email} | ${user.name} | Ativo: ${user.isActive}`);
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
