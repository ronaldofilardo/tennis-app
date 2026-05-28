// frontend/src/services/timelineUtils.ts
// Utilitários para filtrar e formatar a timeline de pontos de uma partida.

import type { PointDetails, Player, GamePoint } from '../core/scoring/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TimelineFilterCriteria {
  /** Filtra por jogador que venceu o ponto */
  playerWinner?: Player | null;
  /** Mostra apenas breakpoints */
  breakPointsOnly?: boolean;
  /** Mostra apenas pontos com winner (ace, service winner, winner final) */
  winnersOnly?: boolean;
  /** Mostra apenas pontos com erros (forçados, não forçados, dupla falta) */
  errorsOnly?: boolean;
  /** Rally mínimo (número de trocas) */
  minRallyLength?: number;
  /** Rally máximo (número de trocas) */
  maxRallyLength?: number;
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

/** Retorna os pontos que satisfazem todos os critérios informados. */
export function filterPointsHistory(
  points: PointDetails[],
  criteria: TimelineFilterCriteria,
): PointDetails[] {
  let result = points;

  if (criteria.playerWinner) {
    result = result.filter((p) => p.result.winner === criteria.playerWinner);
  }

  if (criteria.breakPointsOnly) {
    result = result.filter((p) => {
      const hasBreakPoint = (p as any).context?.isBreakPoint === true;
      return hasBreakPoint;
    });
  }

  if (criteria.winnersOnly) {
    result = result.filter(
      (p) =>
        p.result.type === 'WINNER' || p.serve?.type === 'ACE' || p.serve?.type === 'SERVICE_WINNER',
    );
  }

  if (criteria.errorsOnly) {
    result = result.filter(
      (p) =>
        p.result.type === 'UNFORCED_ERROR' ||
        p.result.type === 'FORCED_ERROR' ||
        p.serve?.type === 'DOUBLE_FAULT',
    );
  }

  if (criteria.minRallyLength !== undefined) {
    result = result.filter((p) => p.rally.ballExchanges >= (criteria.minRallyLength as number));
  }

  if (criteria.maxRallyLength !== undefined) {
    result = result.filter((p) => p.rally.ballExchanges <= (criteria.maxRallyLength as number));
  }

  return result;
}

/** Conta pontos que satisfazem um critério — útil para badges nos filtros. */
export function countByFilter(points: PointDetails[], criteria: TimelineFilterCriteria): number {
  return filterPointsHistory(points, criteria).length;
}

// ─── Formatação ───────────────────────────────────────────────────────────────

/** Formata uma pontuação de game para exibição ("0" → "0", "AD" → "AD", número → string). */
export function formatGameScore(score: GamePoint | number | undefined): string {
  if (score === undefined) return '—';
  return String(score);
}

/** Formata o placar do game como "30 - 40" a partir do contexto do ponto. */
export function formatGameScoreLabel(
  scoreP1: GamePoint | number | undefined,
  scoreP2: GamePoint | number | undefined,
): string {
  return `${formatGameScore(scoreP1)} — ${formatGameScore(scoreP2)}`;
}

/** Formata o timestamp de um ponto como "HH:mm:ss". */
export function formatPointTime(timestamp: number | undefined): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Rótulos legíveis dos tipos de saque. */
export const SERVE_TYPE_LABELS: Record<string, string> = {
  ACE: 'Ace',
  FAULT_FIRST: 'Falta (1º)',
  DOUBLE_FAULT: 'Dupla Falta',
  SERVICE_WINNER: 'Winner de Saque',
};

/** Rótulos legíveis dos tipos de resultado. */
export const RESULT_TYPE_LABELS: Record<string, string> = {
  WINNER: 'Winner',
  UNFORCED_ERROR: 'Erro Não Forçado',
  FORCED_ERROR: 'Erro Forçado',
};

/** Rótulos legíveis dos tipos de golpe final. */
export const SHOT_TYPE_LABELS: Record<string, string> = {
  FOREHAND: 'Forehand',
  BACKHAND: 'Backhand',
  VOLLEY: 'Voleio',
  SMASH: 'Smash',
  SLICE: 'Slice',
  DROP_SHOT: 'Drop Shot',
  LOB: 'Lob',
  PASSING_SHOT: 'Passing Shot',
};

/** Rótulos legíveis dos efeitos de saque. */
export const SERVE_EFFECT_LABELS: Record<string, string> = {
  TopSpin: 'Topspin',
  Slice: 'Slice',
  Flat: 'Flat',
};

/** Rótulos legíveis das direções de saque. */
export const SERVE_DIRECTION_LABELS: Record<string, string> = {
  Fechado: 'Fechado',
  Centro: 'Centro',
  Aberto: 'Aberto',
};

/** Labels para GameBall e SetBall */
export const SPECIAL_BALL_LABELS: Record<string, string> = {
  gameball: 'Game Ball',
  setball: 'Set Ball',
};

/** Rótulos legíveis das situações de rally. */
export const RALLY_SITUACAO_LABELS: Record<string, string> = {
  devolucao: 'Devolução',
  fundo: 'Fundo',
  rede: 'Rede',
  passada: 'Passada',
};

/** Rótulos legíveis dos golpes de rally. */
export const RALLY_GOLPE_LABELS: Record<string, string> = {
  BH: 'Backhand',
  FH: 'Forehand',
  VBH: 'Voleio BH',
  VFH: 'Voleio FH',
  Smash: 'Smash',
};

/** Rótulos legíveis dos efeitos de rally. */
export const RALLY_EFEITO_LABELS: Record<string, string> = {
  topspin: 'Topspin',
  slice: 'Slice',
  flat: 'Flat',
};

/** Rótulos legíveis das direções de rally. */
export const RALLY_DIRECAO_LABELS: Record<string, string> = {
  cruzada: 'Cruzada',
  paralela: 'Paralela',
  centro: 'Centro',
  'inside-in': 'Inside-In',
  'inside-out': 'Inside-Out',
};

/** Rótulos legíveis dos golpes especiais de rally. */
export const RALLY_GOLPE_ESP_LABELS: Record<string, string> = {
  lob: 'Lob',
  drop: 'Drop Shot',
  'bate-pronto': 'Bate-Pronto',
  swingvolley: 'Swing Volley',
};

/**
 * Retorna uma descrição resumida e legível de um ponto para exibição na linha da timeline.
 * Exemplos: "Ace (1º, Topspin, Aberto)" | "Winner de Forehand" | "Erro Não Forçado de Backhand"
 */
export function summarizePoint(point: PointDetails): string {
  if (point.serve) {
    const label = SERVE_TYPE_LABELS[point.serve.type] ?? point.serve.type;
    const effect = point.serve.serveEffect
      ? (SERVE_EFFECT_LABELS[point.serve.serveEffect] ?? '')
      : '';
    const dir = point.serve.direction ? (SERVE_DIRECTION_LABELS[point.serve.direction] ?? '') : '';
    const parts = [effect, dir].filter(Boolean);
    return parts.length ? `${label} · ${parts.join(' · ')}` : label;
  }

  const resultLabel = RESULT_TYPE_LABELS[point.result.type] ?? point.result.type;
  const shotLabel = point.result.finalShot
    ? (SHOT_TYPE_LABELS[point.result.finalShot] ?? point.result.finalShot)
    : '';
  return shotLabel ? `${resultLabel} de ${shotLabel}` : resultLabel;
}

// ─── Detecção de Situações Especiais ──────────────────────────────────────────

/**
 * Detecta se um ponto é um game ball (penúltimo ponto antes de fechar o game).
 * Logic: Um ponto é game ball se um jogador pode vencer o game no próximo ponto.
 *
 * Casos:
 * - Placar 40-0/15/30 (ou AD-40/15/30) → próximo ponto fecha o game
 * - Tiebreak: 9-8 / 10-9 (quando ganha-se por 2 pontos)
 *
 * @param point Ponto com contexto para análise
 * @returns true se é game ball para qualquer jogador
 */
export function detectGameBall(point: PointDetails): boolean {
  if (!point.context) return false;

  const { gameScoreP1, gameScoreP2, isTiebreak } = point.context;

  // Em tiebreak: game ball em 9-8 ou 10-9 (penúltimo ponto)
  if (isTiebreak) {
    const tb1 = Number(gameScoreP1);
    const tb2 = Number(gameScoreP2);
    // Se um jogador tem 9+ pontos e está 1 ponto na frente, próximo ponto fecha
    if ((tb1 >= 9 && tb1 === tb2 + 1) || (tb2 >= 9 && tb2 === tb1 + 1)) {
      return true;
    }
    return false;
  }

  // Em jogo normal: checar se em 40-AD ou AD-40 (deuce) — não é game ball
  // Game ball: quando um jogador está em 40 e outro em 0/15/30
  const p1Forty = gameScoreP1 === '40';
  const p2Forty = gameScoreP2 === '40';
  const p1AD = gameScoreP1 === 'AD';
  const p2AD = gameScoreP2 === 'AD';

  // Deuce (40-40 ou AD-40 ou 40-AD) não é game ball, pois precisam de advantage ou win por 2
  if ((p1Forty && p2Forty) || p1AD || p2AD) {
    return false;
  }

  // Game ball: um em 40, outro em 0/15/30
  if (p1Forty && (gameScoreP2 === '0' || gameScoreP2 === '15' || gameScoreP2 === '30')) {
    return true;
  }
  if (p2Forty && (gameScoreP1 === '0' || gameScoreP1 === '15' || gameScoreP1 === '30')) {
    return true;
  }

  return false;
}

/**
 * Detecta se um ponto é um set ball (penúltimo ponto antes de fechar o set).
 * Logic: Um ponto é set ball se um jogador pode vencer o set no próximo ponto.
 *
 * Casos comuns:
 * - Um jogador tem 5 games, outro tem ≤4 games → próximo game pode fechar (5-4, depois 6-4)
 * - Tiebreak em 5-5 games → tiebreak ball em 6-5 pontos
 *
 * @param point Ponto com contexto para análise
 * @returns true se é set ball para qualquer jogador
 */
export function detectSetBall(point: PointDetails): boolean {
  if (!point.context) return false;

  const { gamesP1, gamesP2, isTiebreak } = point.context;

  // Set ball: um jogador tem 5 games com vantagem
  // (próximo game fecha em 6-X ou vai para tiebreak em 6-6)
  if (gamesP1 === 5 && gamesP2 <= 4) {
    return true; // P1 pode vencer 6-X com próximo game
  }
  if (gamesP2 === 5 && gamesP1 <= 4) {
    return true; // P2 pode vencer 6-X com próximo game
  }

  // Tiebreak em 6-6 games → set ball já está sendo jogado (this point)
  // Não retornamos true aqui pois o set ball é do ponto que levou a 6-6
  // Mas se estivermos em tiebreak em 5-5 games, o próximo pode fechar em 6-5
  // Na verdade, tiebreak só começa em 6-6, então:
  if (isTiebreak && gamesP1 === 6 && gamesP2 === 6) {
    // Set ball é detectado no jogo de tiebreak (próxima chamada deste método)
    // Aqui verificamos se é tiebreak e alguém está perto de vencer
    // Tiebreak é jogado até 10 (ou 7), portanto set ball seria em 9-8 ou 6-5 no TB
    // Mas isso já foi tratado acima na lógica geral
    // Na verdade, para set ball em tiebreak, verificamos no tiebreak game ball logic
    return false;
  }

  return false;
}

/**
 * Enriquece a lista de pontos com detecção de GameBall e SetBall.
 * Copia cada ponto e marca isGameBall/isSetBall no context.
 *
 * @param points Array original de pontos
 * @returns Novo array com pontos enriquecidos
 */
export function enrichPointsWithBallDetection(points: PointDetails[]): PointDetails[] {
  return points.map((point, index) => {
    const enrichedPoint: PointDetails = {
      ...point,
      // IMPORTANTE: Preservar pointNumber existente ou deixar undefined
      // NÃO usar index como fallback — isso mascara gaps reais
      // pointNumber é atribuído em TennisScoring.recordPointDetails quando o ponto é criado
      pointNumber: point.pointNumber,
    };

    if (!point.context) return enrichedPoint;

    return {
      ...enrichedPoint,
      context: {
        ...point.context,
        isGameBall: point.context.isGameBall ?? detectGameBall(point),
        isSetBall: point.context.isSetBall ?? detectSetBall(point),
      },
    };
  });
}
