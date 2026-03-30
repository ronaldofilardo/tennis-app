// frontend/src/services/matchStatusService.ts

import type { PrismaClient, MatchStatus } from '@prisma/client';

/**
 * Serviço para gerenciar o status das partidas
 */
export class MatchStatusService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Atualiza o status da partida baseado no estado atual
   */
  async updateMatchStatus(matchId: string, matchState: string): Promise<{ status: string }> {
    const state = JSON.parse(matchState) as {
      server?: string;
      pointsHistory?: unknown[];
      isFinished?: boolean;
    };

    let status = 'NOT_STARTED';

    if (state.server || (Array.isArray(state.pointsHistory) && state.pointsHistory.length > 0)) {
      status = 'IN_PROGRESS';
    }

    if (state.isFinished) {
      status = 'FINISHED';
    }

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: status as MatchStatus,
        matchState,
        updatedAt: new Date(),
      },
    });

    return { status };
  }

  /**
   * Recupera o status atual da partida
   */
  async getMatchStatus(
    matchId: string,
  ): Promise<{ status: string; matchState: string | null } | null> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        status: true,
        matchState: true,
      },
    });
    return match;
  }
}
