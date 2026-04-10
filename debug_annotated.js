#!/usr/bin/env node
/**
 * Script de debug para verificar partidas anotadas
 * Uso: node debug_annotated.js
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'frontend/.env.development') });

const prisma = new PrismaClient();

async function debug() {
  try {
    console.log('\n=== DEBUG: PARTIDAS ANOTADAS ===\n');

    // Contar usuários
    const users = await prisma.user.findMany();
    console.log(`📊 Total de usuários: ${users.length}`);
    users.forEach((u) => console.log(`  - ${u.id}: ${u.email} (role: ${u.role})`));

    // Contar partidas
    const matches = await prisma.match.findMany();
    console.log(`\n🎾 Total de partidas: ${matches.length}`);

    // Contar sessões de anotação
    const sessions = await prisma.matchAnnotationSession.findMany();
    console.log(`\n📝 Total de sessões de anotação: ${sessions.length}`);

    if (sessions.length > 0) {
      console.log('\n📝 Detalhes das sessões:');
      sessions.slice(0, 5).forEach((s) => {
        console.log(`  - ID: ${s.id}`);
        console.log(`    • Match: ${s.matchId}`);
        console.log(`    • Annotator: ${s.annotatorUserId}`);
        console.log(`    • Status: ${s.status}`);
        console.log(`    • Ativo: ${s.isActive}`);
        console.log(`    • Encerrado em: ${s.endedAt}`);
      });
    } else {
      console.log('\n⚠️  Nenhuma sessão de anotação encontrada!');
    }

    // Procurar partidas com sessões completas
    const matchesWithSessions = await prisma.match.findMany({
      where: {
        annotationSessions: {
          some: {
            OR: [{ status: 'COMPLETED' }, { isActive: false, endedAt: { not: null } }],
          },
        },
      },
      select: { id: true, playerP1: true, playerP2: true, status: true },
    });

    console.log(
      `\n✅ Partidas com sessões completadas: ${matchesWithSessions.length}`,
    );
    matchesWithSessions.slice(0, 5).forEach((m) => {
      console.log(
        `  - ${m.id}: ${m.playerP1} vs ${m.playerP2} (status: ${m.status})`,
      );
    });

    // Dashboard shares
    const shares = await prisma.matchDashboardShare.findMany();
    console.log(`\n📤 Total de dashboard shares: ${shares.length}`);

    console.log('\n✅ Debug concluído\n');
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
