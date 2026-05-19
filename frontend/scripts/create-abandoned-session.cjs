#!/usr/bin/env node
/**
 * Script para criar uma MatchAnnotationSession com status ABANDONED
 * para teste da seção "🔴 Anotações Suspensas"
 */

const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://localhost/racket_dev',
    },
  },
});

async function main() {
  try {
    // 0. Listar todos os usuários
    const allUsers = await prisma.user.findMany({
      take: 10,
    });

    console.log('\n📋 Usuários no banco:');
    allUsers.forEach((u) => {
      console.log(`   - ${u.email} (${u.name}) ID: ${u.id}`);
    });

    // 1. Encontrar o usuário "Atleta Play"
    const athlete = await prisma.user.findUnique({
      where: { email: 'play@email.com' },
    });

    if (!athlete) {
      console.log('❌ Usuário "Atleta Play" não encontrado');
      return;
    }

    console.log(`✅ Usuário encontrado: ${athlete.name} (${athlete.id})`);

    // 2. Encontrar o primeiro match que não é de teste
    const match = await prisma.match.findFirst({
      where: {
        createdByUserId: athlete.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!match) {
      console.log('❌ Nenhuma partida encontrada para esse usuário');
      return;
    }

    console.log(`✅ Match encontrado: ${match.playerP1} vs ${match.playerP2} (${match.id})`);

    // 3. Verificar se já existe sessão ABANDONED para esse match
    const existingSession = await prisma.matchAnnotationSession.findFirst({
      where: {
        matchId: match.id,
        annotatorUserId: athlete.id,
        status: 'ABANDONED',
      },
    });

    if (existingSession) {
      console.log(`⚠️  Sessão ABANDONED já existe: ${existingSession.id}`);
      return;
    }

    // 4. Criar MatchAnnotationSession com status ABANDONED
    const session = await prisma.matchAnnotationSession.create({
      data: {
        matchId: match.id,
        annotatorUserId: athlete.id,
        status: 'ABANDONED',
        isActive: false,
        startedAt: new Date(Date.now() - 3600000), // 1 hora atrás
        endedAt: new Date(Date.now() - 1800000), // 30 min atrás
        createdAt: new Date(Date.now() - 3600000),
      },
    });

    console.log(`✅ MatchAnnotationSession criada com status ABANDONED:`);
    console.log(`   ID: ${session.id}`);
    console.log(`   Match: ${match.id}`);
    console.log(`   Annotator: ${athlete.email}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Started: ${session.startedAt}`);
    console.log(`   Ended: ${session.endedAt}`);
  } catch (error) {
    console.error('❌ Erro ao criar sessão:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
