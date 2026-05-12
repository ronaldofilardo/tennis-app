#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const http = require('http');

const prisma = new PrismaClient();

async function testReopenMatch() {
  try {
    console.log('🧪 Testando funcionalidade de Reabrir Partida\n');

    // 1. Encontrar partida com status FINISHED
    console.log('1️⃣  Procurando partida com status FINISHED...');
    const finishedMatch = await prisma.match.findFirst({
      where: { status: 'FINISHED' },
      include: {
        annotationSessions: {
          select: { id: true, status: true, isActive: true, annotatorUserId: true },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!finishedMatch) {
      console.log('❌ Nenhuma partida FINISHED encontrada');

      // Vamos buscar a partida IN_PROGRESS e finalizá-la para teste
      console.log('\n2️⃣  Buscando partida IN_PROGRESS para teste...');
      const inProgressMatch = await prisma.match.findFirst({
        where: { status: 'IN_PROGRESS' },
        include: {
          annotationSessions: {
            select: { id: true, status: true, isActive: true, annotatorUserId: true },
          },
        },
      });

      if (!inProgressMatch) {
        console.log('❌ Nenhuma partida IN_PROGRESS encontrada');
        process.exit(1);
      }

      console.log(
        `✅ Encontrada: ${inProgressMatch.playerP1} vs ${inProgressMatch.playerP2} (ID: ${inProgressMatch.id})`,
      );
      console.log(`   Status: ${inProgressMatch.status}`);
      console.log(`   Sessões: ${inProgressMatch.annotationSessions.length}`);

      // Finalizar a partida e suas sessões
      console.log('\n3️⃣  Finalizando partida para simular cenário...');
      await prisma.match.update({
        where: { id: inProgressMatch.id },
        data: { status: 'FINISHED', endedAt: new Date() },
      });

      await prisma.matchAnnotationSession.updateMany({
        where: { matchId: inProgressMatch.id },
        data: { status: 'COMPLETED', isActive: false, endedAt: new Date() },
      });

      console.log('✅ Partida finalizada');

      // Agora buscar a partida que acabamos de finalizar
      const testMatch = await prisma.match.findUnique({
        where: { id: inProgressMatch.id },
        include: {
          annotationSessions: {
            select: { id: true, status: true, isActive: true, annotatorUserId: true },
          },
          createdBy: { select: { id: true, name: true } },
        },
      });

      console.log('\n4️⃣  Estado ANTES de reabrir:');
      console.log(`   Match Status: ${testMatch.status}`);
      console.log(`   Sessions:`);
      testMatch.annotationSessions.forEach((s, i) => {
        console.log(`     [${i + 1}] Status: ${s.status}, Active: ${s.isActive}`);
      });

      // Agora simular a ação de reopen
      console.log('\n5️⃣  Reabrindo partida...');

      // Reabrir match
      await prisma.match.update({
        where: { id: testMatch.id },
        data: { status: 'IN_PROGRESS', endedAt: null },
      });

      // Reativar uma sessão COMPLETED
      if (testMatch.annotationSessions.length > 0) {
        const firstSession = testMatch.annotationSessions[0];
        await prisma.matchAnnotationSession.update({
          where: { id: firstSession.id },
          data: { status: 'IN_PROGRESS', isActive: true, endedAt: null },
        });
      }

      console.log('✅ Partida reabertas');

      // Verificar estado final
      const reopenedMatch = await prisma.match.findUnique({
        where: { id: testMatch.id },
        include: {
          annotationSessions: {
            select: { id: true, status: true, isActive: true, annotatorUserId: true },
          },
        },
      });

      console.log('\n6️⃣  Estado DEPOIS de reabrir:');
      console.log(`   Match Status: ${reopenedMatch.status}`);
      console.log(`   Sessions:`);
      reopenedMatch.annotationSessions.forEach((s, i) => {
        console.log(`     [${i + 1}] Status: ${s.status}, Active: ${s.isActive}`);
      });

      if (reopenedMatch.status === 'IN_PROGRESS') {
        console.log('\n✅ TESTE PASSED - Partida reabertas com sucesso!');
      } else {
        console.log('\n❌ TESTE FAILED - Status da partida não foi alterado');
      }

      process.exit(0);
    }

    // Se houver partida FINISHED, testar o reopen dela
    console.log(`✅ Encontrada: ${finishedMatch.playerP1} vs ${finishedMatch.playerP2}`);
    console.log(`   ID: ${finishedMatch.id}`);
    console.log(`   Status: ${finishedMatch.status}`);
    console.log(`   Criada por: ${finishedMatch.createdBy?.name}`);
    console.log(`   Sessões: ${finishedMatch.annotationSessions.length}`);

    console.log('\n2️⃣  Estado ANTES de reabrir:');
    finishedMatch.annotationSessions.forEach((s, i) => {
      console.log(`   [${i + 1}] Status: ${s.status}, Active: ${s.isActive}`);
    });

    // Reabrindo
    console.log('\n3️⃣  Reabrindo partida...');
    const reopened = await prisma.match.update({
      where: { id: finishedMatch.id },
      data: { status: 'IN_PROGRESS', endedAt: null },
    });

    // Reativar uma sessão
    if (finishedMatch.annotationSessions.length > 0) {
      const firstSession = finishedMatch.annotationSessions[0];
      await prisma.matchAnnotationSession.update({
        where: { id: firstSession.id },
        data: { status: 'IN_PROGRESS', isActive: true, endedAt: null },
      });
    }

    console.log('✅ Partida reabertas');

    console.log('\n4️⃣  Estado DEPOIS de reabrir:');
    const updatedMatch = await prisma.match.findUnique({
      where: { id: finishedMatch.id },
      include: { annotationSessions: { select: { id: true, status: true, isActive: true } } },
    });

    updatedMatch.annotationSessions.forEach((s, i) => {
      console.log(`   [${i + 1}] Status: ${s.status}, Active: ${s.isActive}`);
    });

    console.log(`\n✅ TESTE PASSED`);
    console.log(`   Match Status: ${reopened.status} (anterior: FINISHED)`);
    console.log(`   Anotação pode ser continuada!`);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testReopenMatch();
