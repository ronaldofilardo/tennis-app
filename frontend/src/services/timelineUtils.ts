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
    result = result.filter((p) => p.context && p.context.isBreakPoint === true);
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
