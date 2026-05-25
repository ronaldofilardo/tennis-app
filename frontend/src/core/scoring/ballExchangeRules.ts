/**
 * ballExchangeRules.ts
 * Lógica de validação automática para número de trocas de bolas por tipo de ponto.
 *
 * Regras:
 * - Ace, Dupla Falta, Service Winner, Returner Winner, Erro: sempre 1 bola
 * - Rally (winner após troca normal): usa contador do usuário ou revisa se discordar
 */

import type { PointDetails } from './types';

export interface BallExchangeValidation {
  expectedCount: number;
  isAutomatic: boolean;
  reason: string;
}

/**
 * Calcula o número esperado de trocas de bolas baseado no tipo de ponto.
 *
 * @param pointDetails - Detalhes do ponto com serve.type, result.type, etc.
 * @param userCount - Número de trocas contadas pelo usuário (padrão 0 = cálculo automático)
 * @returns Validação com expectedCount e motivo
 */
export function calculateDefaultBallExchanges(
  pointDetails: Partial<PointDetails>,
  userCount: number = 0,
): BallExchangeValidation {
  // Extrai tipo de saque e resultado
  const serveType = pointDetails.serve?.type;
  const resultType = pointDetails.result?.type;

  // Casos de saque direto (sem rally)
  if (serveType === 'ACE') {
    return {
      expectedCount: 1,
      isAutomatic: true,
      reason: 'Ace - saque direto',
    };
  }

  if (serveType === 'DOUBLE_FAULT') {
    return {
      expectedCount: 1,
      isAutomatic: true,
      reason: 'Dupla Falta - 2 saques errados',
    };
  }

  if (serveType === 'SERVICE_WINNER') {
    return {
      expectedCount: 1,
      isAutomatic: true,
      reason: 'Service Winner - saque venceu',
    };
  }

  // Rally iniciado após devolução
  // Returner Winner = devolvedor venceu rapidamente no ponto
  // Mas pode ter havido trocas (runner não é necessariamente 1)
  // Se o ponto for "winner" no resultado, pode ter trocas
  // Se for "erro", alguém errou durante o rally

  // Se usuário contou (userCount > 0), usar esse número se ≠ 1
  // Se for 1, retornar 1 (padrão para erro/returner winner rápido)
  if (resultType === 'WINNER' && userCount > 1) {
    return {
      expectedCount: userCount,
      isAutomatic: true,
      reason: `Winner após ${userCount} trocas de bola`,
    };
  }

  if (resultType === 'UNFORCED_ERROR' || resultType === 'FORCED_ERROR') {
    // Erro pode ter 1 ou mais trocas
    if (userCount >= 1) {
      return {
        expectedCount: userCount,
        isAutomatic: true,
        reason: `Erro após ${userCount} troca(s) de bola`,
      };
    }
    return {
      expectedCount: 1,
      isAutomatic: true,
      reason: 'Erro - contagem padrão 1 bola',
    };
  }

  // Fallback: padrão 1
  return {
    expectedCount: 1,
    isAutomatic: true,
    reason: 'Padrão: 1 bola',
  };
}

/**
 * Valida se o contador do usuário é congruente com o tipo de ponto.
 * Retorna true se deve questionar o usuário (discordância).
 *
 * @param pointDetails - Detalhes do ponto
 * @param userCount - Contador do usuário
 * @returns true se há discordância, false se congruente
 */
export function shouldConfirmBallExchanges(
  pointDetails: Partial<PointDetails>,
  userCount: number,
): boolean {
  const validation = calculateDefaultBallExchanges(pointDetails, userCount);
  // Se o esperado !== contador, questionar
  return validation.expectedCount !== userCount;
}

/**
 * Gera mensagem de confirmação para o usuário.
 *
 * @param pointDetails - Detalhes do ponto
 * @param userCount - Contador do usuário
 * @returns Mensagem descritiva
 */
export function getBallExchangeConfirmationMessage(
  pointDetails: Partial<PointDetails>,
  userCount: number,
): string {
  const validation = calculateDefaultBallExchanges(pointDetails, userCount);

  if (validation.expectedCount === userCount) {
    return `${validation.reason} - ${userCount} bola${userCount !== 1 ? 's' : ''}.`;
  }

  return (
    `O sistema detectou ${userCount} bola${userCount !== 1 ? 's' : ''}, ` +
    `mas baseado no tipo de ponto (${validation.reason.toLowerCase()}), ` +
    `o esperado seria ${validation.expectedCount} bola${validation.expectedCount !== 1 ? 's' : ''}. ` +
    `Confirma ${userCount} bola${userCount !== 1 ? 's' : ''}?`
  );
}

/**
 * Mapeia tipo de ponto para descrição legível para diagnóstico.
 */
export function getPointTypeDescription(pointDetails: Partial<PointDetails>): string {
  const serveType = pointDetails.serve?.type;
  const resultType = pointDetails.result?.type;

  if (serveType === 'ACE') return 'Ace';
  if (serveType === 'DOUBLE_FAULT') return 'Dupla Falta';
  if (serveType === 'SERVICE_WINNER') return 'Service Winner';

  if (resultType === 'WINNER') return 'Winner';
  if (resultType === 'UNFORCED_ERROR') return 'Erro Não-Forçado';
  if (resultType === 'FORCED_ERROR') return 'Erro Forçado';

  return 'Tipo desconhecido';
}
