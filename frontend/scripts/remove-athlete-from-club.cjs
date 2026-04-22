#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const cpf = '12345678901';
  const clubSlug = 'clube-teste';

  try {
    // 1. Encontrar o clube
    const club = await prisma.club.findUnique({
      where: { slug: clubSlug },
    });

    if (!club) {
      console.error(`❌ Clube com slug "${clubSlug}" não encontrado.`);
      process.exit(1);
    }

    console.log(`✅ Clube encontrado: ${club.name} (ID: ${club.id})`);

    // 2. Encontrar o atleta pelo CPF
    const athleteProfile = await prisma.athleteProfile.findUnique({
      where: { cpf },
      include: { user: true },
    });

    if (!athleteProfile) {
      console.error(`❌ Atleta com CPF "${cpf}" não encontrado.`);
      process.exit(1);
    }

    console.log(
      `✅ Atleta encontrado: ${athleteProfile.user.name} (ID: ${athleteProfile.user.id})`,
    );

    // 3. Remover a membership
    const membership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: athleteProfile.user.id,
          clubId: club.id,
        },
      },
    });

    if (!membership) {
      console.error(`❌ Atleta não é membro do clube "${clubSlug}".`);
      process.exit(1);
    }

    await prisma.clubMembership.delete({
      where: {
        userId_clubId: {
          userId: athleteProfile.user.id,
          clubId: club.id,
        },
      },
    });

    console.log(`✅ Atleta removido do clube com sucesso!`);
    console.log(`   CPF: ${cpf}`);
    console.log(`   Nome: ${athleteProfile.user.name}`);
    console.log(`   Clube: ${club.name}`);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
