#!/usr/bin/env node
/**
 * Script para testar se o endpoint /matches/my-completed retorna
 * partidas com status NOT_STARTED, IN_PROGRESS e FINISHED
 *
 * USAGE: node scripts/test-dashboard-history.cjs [email]
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

async function testHistoryEndpoint() {
  try {
    const email = process.argv[2] || 'play@email.com';

    console.log(`\n📋 Testando endpoint /matches/my-completed para: ${email}`);

    // 1. Encontrar o usuário
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      console.log(`❌ Usuário não encontrado: ${email}`);
      return;
    }

    console.log(`✅ Usuário encontrado: ${user.email}`);

    // 2. Buscar o athleteProfile associado
    const profile = await prisma.athleteProfile.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    console.log(
      `${profile ? '✅' : '⚠️'} AthleteProfile: ${profile ? 'encontrado' : 'não encontrado'}`,
    );

    // 3. Simular a query do endpoint /matches/my-completed
    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'FINISHED'] },
        OR: [
          { createdByUserId: user.id },
          ...(profile ? [{ player1Id: profile.id }, { player2Id: profile.id }] : []),
          { playersEmails: { has: email } },
        ],
      },
      select: {
        id: true,
        status: true,
        sportType: true,
        playerP1: true,
        playerP2: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            annotationSessions: {
              where: { status: 'COMPLETED' },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    console.log(`\n📊 Partidas encontradas: ${matches.length}`);
    console.log('─'.repeat(80));

    // Agrupar por status
    const byStatus = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      FINISHED: [],
    };

    matches.forEach((m) => {
      byStatus[m.status].push(m);
    });

    // Exibir por status
    Object.entries(byStatus).forEach(([status, items]) => {
      console.log(`\n${status} (${items.length} partidas)`);
      items.forEach((m) => {
        const date = new Date(m.updatedAt).toLocaleDateString('pt-BR');
        const annotations = m._count.annotationSessions;
        console.log(
          `  • ${m.playerP1} vs ${m.playerP2} [${m.sportType}] - ${date} (${annotations} anotações)`,
        );
      });
    });

    // Resumo
    console.log('\n' + '─'.repeat(80));
    console.log(`📈 Resumo:`);
    console.log(`  • NOT_STARTED (criadas): ${byStatus.NOT_STARTED.length}`);
    console.log(`  • IN_PROGRESS (iniciadas): ${byStatus.IN_PROGRESS.length}`);
    console.log(`  • FINISHED (finalizadas): ${byStatus.FINISHED.length}`);
    console.log(`  • TOTAL: ${matches.length}`);

    // 4. Verificar sessões suspensas
    console.log(`\n🔴 Verificando Anotações Suspensas...`);

    const suspendedSessions = await prisma.matchAnnotationSession.findMany({
      where: {
        annotator: {
          email: email,
        },
        isActive: false,
        status: { in: ['IN_PROGRESS', 'ABANDONED'] },
      },
      select: {
        id: true,
        matchId: true,
        status: true,
        match: {
          select: {
            id: true,
            playerP1: true,
            playerP2: true,
            status: true,
          },
        },
      },
    });

    console.log(`  • Sessões suspensas: ${suspendedSessions.length}`);
    if (suspendedSessions.length > 0) {
      suspendedSessions.forEach((s) => {
        console.log(`    - ${s.match.playerP1} vs ${s.match.playerP2} (${s.status})`);
      });
    }

    console.log('\n✅ Teste concluído com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testHistoryEndpoint();
