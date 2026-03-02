// frontend/api/_lib/subscriptionMiddleware.js
// Middleware de enforcement de subscription — bloqueia ações se clube inadimplente.
// Garante que apenas clubes com assinatura ativa podem criar partidas, torneios e convidar membros.

import prisma from "./prisma.js";
import { corsHeaders, sendJson } from "./authMiddleware.js";

// ============================================================
// Limites por plano
// ============================================================

export const PLAN_LIMITS = {
  FREE: { maxAthletes: 10, features: ["basic_scoring", "basic_stats"] },
  PREMIUM: {
    maxAthletes: 50,
    features: [
      "basic_scoring",
      "basic_stats",
      "advanced_stats",
      "tournaments",
      "custom_branding",
    ],
  },
  ENTERPRISE: {
    maxAthletes: 999999,
    features: [
      "basic_scoring",
      "basic_stats",
      "advanced_stats",
      "tournaments",
      "custom_branding",
      "custom_domain",
      "api_access",
      "priority_support",
    ],
  },
};

/**
 * Retorna os limites do plano.
 * @param {string} planType — FREE, PREMIUM ou ENTERPRISE
 * @returns {{ maxAthletes: number, features: string[] }}
 */
export function getPlanLimits(planType) {
  return PLAN_LIMITS[planType] || PLAN_LIMITS.FREE;
}

// ============================================================
// Guards de subscription
// ============================================================

/**
 * Verifica se o clube tem uma assinatura ativa.
 * Clubes FREE sempre passam (sem necessidade de pagamento).
 * Retorna o contexto enriquecido com dados da subscription ou envia 402.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ userId: string, clubId?: string, role?: string }} ctx
 * @returns {Promise<{ subscriptionStatus: string, planType: string } | null>}
 */
export async function requireActiveSubscription(req, res, ctx) {
  // ADMIN bypassa
  if (ctx.role === "ADMIN") {
    return { subscriptionStatus: "ACTIVE", planType: "ENTERPRISE" };
  }

  // Sem clube = sem restrição de subscription (partida avulsa)
  if (!ctx.clubId) {
    return { subscriptionStatus: "ACTIVE", planType: "FREE" };
  }

  try {
    const club = await prisma.club.findUnique({
      where: { id: ctx.clubId },
      select: {
        planType: true,
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            planType: true,
          },
        },
      },
    });

    if (!club) {
      sendJson(res, 404, { error: "Club not found" });
      return null;
    }

    // Clubes FREE sem subscription explícita sempre passam
    if (club.planType === "FREE" && !club.subscription) {
      return { subscriptionStatus: "ACTIVE", planType: "FREE" };
    }

    // Se tem subscription, verificar status
    if (club.subscription) {
      const { status, currentPeriodEnd } = club.subscription;
      const now = new Date();

      // Subscription cancelada ou vencida
      if (status === "CANCELED") {
        sendJson(res, 402, {
          error: "Subscription canceled",
          message:
            "A assinatura do clube foi cancelada. Entre em contato com o gestor.",
          code: "SUBSCRIPTION_CANCELED",
        });
        return null;
      }

      if (status === "PAST_DUE" || (currentPeriodEnd && currentPeriodEnd < now)) {
        sendJson(res, 402, {
          error: "Subscription expired",
          message:
            "A assinatura do clube está vencida. O gestor precisa regularizar o pagamento.",
          code: "SUBSCRIPTION_EXPIRED",
        });
        return null;
      }
    }

    return {
      subscriptionStatus: club.subscription?.status || "ACTIVE",
      planType: club.subscription?.planType || club.planType,
    };
  } catch (err) {
    console.error("[subscriptionMiddleware] Error checking subscription:", err);
    // Em caso de erro, permitir passagem (fail-open para não bloquear)
    return { subscriptionStatus: "ACTIVE", planType: club?.planType || "FREE" };
  }
}

/**
 * Verifica se o clube ainda pode convidar atletas (quota não excedida).
 * Retorna true se pode convidar, ou envia 403 e retorna false.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ clubId?: string, role?: string }} ctx
 * @returns {Promise<boolean>}
 */
export async function requireAthleteQuota(req, res, ctx) {
  // ADMIN bypassa
  if (ctx.role === "ADMIN") return true;

  if (!ctx.clubId) return true;

  try {
    // Contar membros ativos no clube (ATHLETE + COACH)
    const activeCount = await prisma.clubMembership.count({
      where: {
        clubId: ctx.clubId,
        status: "ACTIVE",
        role: { in: ["ATHLETE", "COACH"] },
      },
    });

    // Buscar limite do plano
    const club = await prisma.club.findUnique({
      where: { id: ctx.clubId },
      select: {
        planType: true,
        subscription: {
          select: { maxAthletes: true, planType: true },
        },
      },
    });

    if (!club) {
      sendJson(res, 404, { error: "Club not found" });
      return false;
    }

    const maxAthletes =
      club.subscription?.maxAthletes ||
      getPlanLimits(club.planType).maxAthletes;

    if (activeCount >= maxAthletes) {
      sendJson(res, 403, {
        error: "Athlete limit reached",
        message: `O clube atingiu o limite de ${maxAthletes} atletas do plano ${club.subscription?.planType || club.planType}. Faça upgrade para adicionar mais.`,
        code: "ATHLETE_LIMIT_REACHED",
        current: activeCount,
        max: maxAthletes,
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error("[subscriptionMiddleware] Error checking quota:", err);
    // Fail-open
    return true;
  }
}

/**
 * Verifica se uma feature específica está disponível no plano do clube.
 * @param {string} clubId
 * @param {string} feature — ex: "advanced_stats", "tournaments", "custom_branding"
 * @returns {Promise<boolean>}
 */
export async function hasFeature(clubId, feature) {
  if (!clubId) return false;

  try {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        planType: true,
        subscription: { select: { planType: true } },
      },
    });

    if (!club) return false;

    const planType = club.subscription?.planType || club.planType;
    const limits = getPlanLimits(planType);
    return limits.features.includes(feature);
  } catch {
    return false;
  }
}
