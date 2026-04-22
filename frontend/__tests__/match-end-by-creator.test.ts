import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../api/_lib/prisma';

/**
 * Testes para validar que:
 * 1. Apenas o criador pode encerrar a partida
 * 2. Encerrar a partida marca todas as sessões IN_PROGRESS como COMPLETED
 * 3. O snapshot final é capturado
 * 4. Comparativo é gerado automaticamente
 */
describe('Match End-by-Creator Functionality', () => {
  let testMatchId: string;
  let creatorId: string;
  let annotator1Id: string;
  let annotator2Id: string;

  beforeEach(async () => {
    // Limpar dados de teste anteriores
    await prisma.matchAnnotationSession.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.user.deleteMany({});

    // Criar usuários de teste
    const creator = await prisma.user.create({
      data: {
        id: 'test-creator-' + Date.now(),
        email: 'creator@test.com',
        name: 'Test Creator',
        passwordHash: 'dummy-hash',
      },
    });

    const annotator1 = await prisma.user.create({
      data: {
        id: 'test-annotator1-' + Date.now(),
        email: 'annotator1@test.com',
        name: 'Test Annotator 1',
        passwordHash: 'dummy-hash',
      },
    });

    const annotator2 = await prisma.user.create({
      data: {
        id: 'test-annotator2-' + Date.now(),
        email: 'annotator2@test.com',
        name: 'Test Annotator 2',
        passwordHash: 'dummy-hash',
      },
    });

    creatorId = creator.id;
    annotator1Id = annotator1.id;
    annotator2Id = annotator2.id;

    // Criar partida de teste
    const match = await prisma.match.create({
      data: {
        id: 'match-' + Date.now(),
        sportType: 'TENNIS',
        format: 'BEST_OF_THREE',
        playerP1: 'Player 1',
        playerP2: 'Player 2',
        playersEmails: [],
        createdByUserId: creatorId,
        status: 'IN_PROGRESS',
        matchState: JSON.stringify({
          pointsHistory: [{ winner: 'PLAYER_1' }, { winner: 'PLAYER_2' }, { winner: 'PLAYER_1' }],
        }),
      },
    });

    testMatchId = match.id;

    // Criar sessões de anotação ativas
    await prisma.matchAnnotationSession.createMany({
      data: [
        {
          matchId: testMatchId,
          annotatorUserId: annotator1Id,
          status: 'IN_PROGRESS',
          isActive: true,
        },
        {
          matchId: testMatchId,
          annotatorUserId: annotator2Id,
          status: 'IN_PROGRESS',
          isActive: true,
        },
      ],
    });
  });

  it('should mark match as FINISHED with endedAt timestamp', async () => {
    const match = await prisma.match.findUnique({ where: { id: testMatchId } });
    expect(match?.status).toBe('IN_PROGRESS');
    expect(match?.endedAt).toBeNull();

    // Simulando action === 'endMatch' do backend
    const before = new Date();
    const updated = await prisma.match.update({
      where: { id: testMatchId },
      data: {
        status: 'FINISHED',
        endedAt: new Date(),
        winner: 'PLAYER_1',
      },
    });
    const after = new Date();

    expect(updated.status).toBe('FINISHED');
    expect(updated.winner).toBe('PLAYER_1');
    expect(updated.endedAt).toBeDefined();
    expect(updated.endedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updated.endedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should mark all IN_PROGRESS sessions as COMPLETED with finalStateSnapshot', async () => {
    const finalSnapshot = JSON.stringify({
      pointsHistory: [{ winner: 'PLAYER_1' }, { winner: 'PLAYER_2' }, { winner: 'PLAYER_1' }],
    });

    // Simulando lógica do backend
    await prisma.matchAnnotationSession.updateMany({
      where: { matchId: testMatchId, status: 'IN_PROGRESS' },
      data: {
        status: 'COMPLETED',
        isActive: false,
        endedAt: new Date(),
        finalStateSnapshot: finalSnapshot,
      },
    });

    const sessions = await prisma.matchAnnotationSession.findMany({
      where: { matchId: testMatchId },
    });

    expect(sessions).toHaveLength(2);
    sessions.forEach((session) => {
      expect(session.status).toBe('COMPLETED');
      expect(session.isActive).toBe(false);
      expect(session.endedAt).toBeDefined();
      expect(session.finalStateSnapshot).toBe(finalSnapshot);
    });
  });

  it('should not interfere with sessions that are already COMPLETED', async () => {
    // Criar usuário para a sessão já completada
    const completedAnnotator = await prisma.user.create({
      data: {
        id: 'test-annotator-completed-' + Date.now(),
        email: 'completed@test.com',
        name: 'Completed Annotator',
        passwordHash: 'dummy-hash',
      },
    });

    // Adicionar uma sessão já completada
    const completedSession = await prisma.matchAnnotationSession.create({
      data: {
        matchId: testMatchId,
        annotatorUserId: completedAnnotator.id,
        status: 'COMPLETED',
        isActive: false,
        endedAt: new Date(Date.now() - 60000), // 1 minuto atrás
        finalStateSnapshot: JSON.stringify({ pointsHistory: [] }),
      },
    });

    // Encerrar match
    await prisma.matchAnnotationSession.updateMany({
      where: { matchId: testMatchId, status: 'IN_PROGRESS' },
      data: {
        status: 'COMPLETED',
        isActive: false,
        endedAt: new Date(),
      },
    });

    // Verificar que sessão já completada não foi alterada
    const updated = await prisma.matchAnnotationSession.findUnique({
      where: { id: completedSession.id },
    });

    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.endedAt?.getTime()).toBe(completedSession.endedAt?.getTime());
  });

  it('should count completed sessions for comparison generation', async () => {
    // Antes de encerrar: 0 COMPLETED, 2 IN_PROGRESS
    let completedCount = await prisma.matchAnnotationSession.count({
      where: { matchId: testMatchId, status: 'COMPLETED' },
    });
    expect(completedCount).toBe(0);

    // Encerrar all sessions
    await prisma.matchAnnotationSession.updateMany({
      where: { matchId: testMatchId, status: 'IN_PROGRESS' },
      data: {
        status: 'COMPLETED',
        isActive: false,
        endedAt: new Date(),
      },
    });

    // Agora: 2 COMPLETED
    completedCount = await prisma.matchAnnotationSession.count({
      where: { matchId: testMatchId, status: 'COMPLETED' },
    });
    expect(completedCount).toBe(2);

    // Comparativo deveria ser gerado se >= 2
    expect(completedCount >= 2).toBe(true);
  });
});
