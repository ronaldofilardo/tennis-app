// backend/src/services/matchStatusService.js

/**
 * Serviço para gerenciar o status das partidas
 */
export class MatchStatusService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Atualiza o status da partida baseado no estado atual
   */
  async updateMatchStatus(matchId, matchState) {
    // Parse do matchState
    const state = JSON.parse(matchState);

    // Determina o status baseado no estado
    let status = "NOT_STARTED";

    // Se o sacador está definido ou há pontos no histórico, está em progresso
    if (
      state.server ||
      (Array.isArray(state.pointsHistory) && state.pointsHistory.length > 0)
    ) {
      status = "IN_PROGRESS";
    }

    // Só finaliza se isFinished for verdadeiro
    if (state.isFinished) {
      status = "FINISHED";
    }

    // Atualiza o status no banco
    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status,
        matchState,
        updatedAt: new Date(),
      },
    });

    return { status };
  }

  /**
   * Recupera o status atual da partida
   */
  async getMatchStatus(matchId) {
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
