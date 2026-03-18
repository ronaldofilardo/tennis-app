// frontend/src/services/subscriptionService.js
// Serviço de gerenciamento de assinaturas (SaaS)
// Lógica de negócio para criação, verificação e enforcement de subscriptions.

import { PrismaClient } from "@prisma/client";

// Cache de conexão Prisma (serverless)
let prisma;
if (typeof globalThis !== "undefined" && globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });
  if (typeof globalThis !== "undefined") {
    globalThis.__prisma = prisma;
  }
}

// ============================================================
// Constantes de plano
// ============================================================

export const PLAN_CONFIG = {
  FREE: {
    maxAthletes: 10,
    price: { MONTHLY: 0, QUARTERLY: 0, YEARLY: 0 },
    label: "Gratuito",
  },
  PREMIUM: {
    maxAthletes: 50,
    price: { MONTHLY: 299, QUARTERLY: 799, YEARLY: 2990 },
    label: "Premium",
  },
  ENTERPRISE: {
    maxAthletes: 999999,
    price: { MONTHLY: 799, QUARTERLY: 2199, YEARLY: 7990 },
    label: "Enterprise",
  },
};

/**
 * Calcula a data de fim do período com base no ciclo de billing.
 * @param {Date} startDate
 * @param {string} billingCycle — MONTHLY, QUARTERLY, YEARLY
 * @returns {Date}
 */
function calculatePeriodEnd(startDate, billingCycle) {
  const end = new Date(startDate);
  switch (billingCycle) {
    case "QUARTERLY":
      end.setMonth(end.getMonth() + 3);
      break;
    case "YEARLY":
      end.setFullYear(end.getFullYear() + 1);
      break;
    case "MONTHLY":
    default:
      end.setMonth(end.getMonth() + 1);
      break;
  }
  return end;
}

// ============================================================
// CRUD de Subscription
// ============================================================

/**
 * Cria ou atualiza a subscription de um clube.
 * Se o clube já tem subscription, atualiza. Senão, cria.
 * @param {{ clubId: string, planType: string, billingCycle?: string }} data
 * @returns {Promise<object>}
 */
export async function createOrUpdateSubscription({
  clubId,
  planType,
  billingCycle = "MONTHLY",
}) {
  const config = PLAN_CONFIG[planType];
  if (!config) throw new Error(`INVALID_PLAN: ${planType}`);

  const now = new Date();
  const periodEnd = calculatePeriodEnd(now, billingCycle);

  // FREE não precisa de pagamento — ativa imediatamente
  const status = planType === "FREE" ? "ACTIVE" : "TRIALING";

  const subscription = await prisma.subscription.upsert({
    where: { clubId },
    create: {
      clubId,
      planType,
      status,
      billingCycle,
      maxAthletes: config.maxAthletes,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      planType,
      status: planType === "FREE" ? "ACTIVE" : undefined,
      billingCycle,
      maxAthletes: config.maxAthletes,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      canceledAt: null,
    },
  });

  // Atualizar planType no Club também
  await prisma.club.update({
    where: { id: clubId },
    data: { planType },
  });

  return subscription;
}

/**
 * Busca subscription do clube com informações de uso.
 * @param {string} clubId
 * @returns {Promise<object|null>}
 */
export async function getSubscriptionWithUsage(clubId) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      name: true,
      planType: true,
      subscription: true,
    },
  });

  if (!club) return null;

  // Contar atletas ativos
  const activeAthletes = await prisma.clubMembership.count({
    where: {
      clubId,
      status: "ACTIVE",
      role: { in: ["ATHLETE", "COACH"] },
    },
  });

  const totalMembers = await prisma.clubMembership.count({
    where: { clubId, status: "ACTIVE" },
  });

  const config = PLAN_CONFIG[club.planType] || PLAN_CONFIG.FREE;
  const maxAthletes = club.subscription?.maxAthletes || config.maxAthletes;

  // Calcular dias restantes
  let daysRemaining = null;
  if (club.subscription?.currentPeriodEnd) {
    const now = new Date();
    const end = new Date(club.subscription.currentPeriodEnd);
    daysRemaining = Math.max(
      0,
      Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );
  }

  return {
    subscription: club.subscription || {
      planType: club.planType,
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      maxAthletes,
    },
    usage: {
      activeAthletes,
      totalMembers,
      maxAthletes,
      athletePercentage: Math.round((activeAthletes / maxAthletes) * 100),
      daysRemaining,
    },
    plan: {
      type: club.planType,
      label: config.label,
      price: config.price,
    },
  };
}

/**
 * Busca invoices do clube.
 * @param {string} clubId
 * @param {{ limit?: number, offset?: number }} options
 * @returns {Promise<object[]>}
 */
export async function getClubInvoices(clubId, { limit = 20, offset = 0 } = {}) {
  return prisma.invoice.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

// ============================================================
// Enforcement — Suspensão e Reativação
// ============================================================

/**
 * Suspende todos os membros de um clube (exceto GESTOR).
 * Usado quando a subscription vence ou é cancelada.
 * @param {string} clubId
 * @returns {Promise<number>} Número de membros suspensos
 */
export async function suspendClubMembers(clubId) {
  const result = await prisma.clubMembership.updateMany({
    where: {
      clubId,
      status: "ACTIVE",
      role: { notIn: ["GESTOR", "ADMIN"] }, // GESTOR nunca é suspenso
    },
    data: { status: "SUSPENDED" },
  });

  return result.count;
}

/**
 * Reativa membros suspensos de um clube.
 * Usado quando o pagamento é confirmado.
 * @param {string} clubId
 * @returns {Promise<number>} Número de membros reativados
 */
export async function reactivateClubMembers(clubId) {
  const result = await prisma.clubMembership.updateMany({
    where: {
      clubId,
      status: "SUSPENDED",
    },
    data: { status: "ACTIVE" },
  });

  return result.count;
}

/**
 * Contagem rápida de atletas ativos no clube.
 * @param {string} clubId
 * @returns {Promise<number>}
 */
export async function countActiveAthletes(clubId) {
  return prisma.clubMembership.count({
    where: {
      clubId,
      status: "ACTIVE",
      role: { in: ["ATHLETE", "COACH"] },
    },
  });
}

/**
 * Verifica todas as subscriptions e suspende clubes inadimplentes.
 * Preparado para ser chamado por um cron job.
 * @returns {Promise<{ checked: number, suspended: number, details: object[] }>}
 */
export async function checkAndSuspendExpiredSubscriptions() {
  const now = new Date();

  // Buscar subscriptions ativas que já venceram
  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { lt: now },
      planType: { not: "FREE" }, // FREE nunca expira
    },
    include: {
      club: { select: { id: true, name: true } },
    },
  });

  const details = [];

  for (const sub of expiredSubscriptions) {
    // Marcar subscription como PAST_DUE
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "PAST_DUE" },
    });

    // Suspender membros do clube
    const suspendedCount = await suspendClubMembers(sub.clubId);

    details.push({
      clubId: sub.clubId,
      clubName: sub.club.name,
      planType: sub.planType,
      expiredAt: sub.currentPeriodEnd,
      membersSuspended: suspendedCount,
    });
  }

  return {
    checked: expiredSubscriptions.length,
    suspended: details.filter((d) => d.membersSuspended > 0).length,
    details,
  };
}

/**
 * Gera código de convite único para o clube.
 * @param {string} clubId
 * @returns {Promise<string>} Código de 6 caracteres alfanumérico
 */
export async function generateInviteCode(clubId) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sem I, O, 0, 1 para evitar ambiguidade
  let code;
  let exists = true;

  // Gerar código único
  while (exists) {
    code = Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join("");

    exists = !!(await prisma.club.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    }));
  }

  await prisma.club.update({
    where: { id: clubId },
    data: { inviteCode: code },
  });

  return code;
}

/**
 * Busca clube por código de convite.
 * @param {string} inviteCode
 * @returns {Promise<object|null>}
 */
export async function findClubByInviteCode(inviteCode) {
  return prisma.club.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
    select: {
      id: true,
      name: true,
      slug: true,
      planType: true,
      billingModel: true,
    },
  });
}
