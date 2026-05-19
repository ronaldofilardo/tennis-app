const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'play@email.com' },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      platformRole: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (user) {
    console.log('✅ Usuário encontrado:');
    console.log(JSON.stringify(user, null, 2));
  } else {
    console.log('❌ Usuário não encontrado');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
