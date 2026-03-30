// frontend/src/services/subscriptionService.ts
// Serviço de gerenciamento de assinaturas (SaaS)

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Cache de conexão Prisma (serverless)
let prisma: PrismaClient;
if (globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });
  globalThis.__prisma = prisma;
}

// ============================================================
// Constantes de plano
// ============================================================

type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
type PlanType = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

interface PlanConfig {
  maxAthletes: number;
  price: Record<BillingCycle, number>;
  label: string;
}

export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  FREE: {
    maxAthletes: 10,
    price: { MONTHLY: 0, QUARTERLY: 0, YEARLY: 0 },
    label: 'Gratuito',
  },
  PREMIUM: {
    maxAthletes: 50,
    price: { MONTHLY: 299, QUARTERLY: 799, YEARLY: 2990 },
    label: 'Premium',
  },
  ENTERPRISE: {
    maxAthletes: 999999,
    price: { MONTHLY: 799, QUARTERLY: 2199, YEARLY: 7990 },
    label: 'Enterprise',
  },
};

function calculatePeriodEnd(startDate: Date, billingCycle: string): Date {
  const end = new Date(startDate);
  switch (billingCycle) {
    case 'QUARTERLY':
      end.setMonth(end.getMonth() + 3);
      break;
    case 'YEARLY':
      end.setFullYear(end.getFullYear() + 1);
      break;
    case 'MONTHLY':
    default:
      end.setMonth(end.getMonth() + 1);
      break;
  }
  return end;
}

// ============================================================
// CRUD de Subscription
// ============================================================

export async function createOrUpdateSubscription({
  clubId,
  planType,
  billingCycle = 'MONTHLY',
}: {
  clubId: string;
  planType: PlanType;
  billingCycle?: BillingCycle;
}): Promise<object> {
  const config = PLAN_CONFIG[planType as PlanType];
  if (!config) throw new Error(`INVALID_PLAN: ${planType}`);

  const now = new Date();
  const periodEnd = calculatePeriodEnd(now, billingCycle);

  const status = planType === 'FREE' ? 'ACTIVE' : 'TRIALING';

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
      status: planType === 'FREE' ? 'ACTIVE' : undefined,
      billingCycle,
      maxAthletes: config.maxAthletes,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      canceledAt: null,
    },
  });

  await prisma.club.update({
    where: { id: clubId },
    data: { planType },
  });

  return subscription;
}

export async function getSubscriptionWithUsage(clubId: string): Promise<object | null> {
  const club = (await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      name: true,
      planType: true,
      subscription: true,
    },
  })) as {
    id: string;
    name: string;
    planType: string;
    subscription: {
      maxAthletes?: number;
      currentPeriodEnd?: Date | null;
      planType?: string;
      status?: string;
      billingCycle?: string;
    } | null;
  } | null;

  if (!club) return null;

  const activeAthletes = await prisma.clubMembership.count({
    where: {
      clubId,
      status: 'ACTIVE',
      role: { in: ['ATHLETE', 'COACH'] },
    },
  });

  const totalMembers = await prisma.clubMembership.count({
    where: { clubId, status: 'ACTIVE' },
  });

  const config = PLAN_CONFIG[club.planType as PlanType] ?? PLAN_CONFIG.FREE;
  const maxAthletes = club.subscription?.maxAthletes ?? config.maxAthletes;

  let daysRemaining: number | null = null;
  if (club.subscription?.currentPeriodEnd) {
    const now = new Date();
    const end = new Date(club.subscription.currentPeriodEnd);
    daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return {
    subscription: club.subscription ?? {
      planType: club.planType,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
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

export async function getClubInvoices(
  clubId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<object[]> {
  return prisma.invoice.findMany({
    where: { clubId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function suspendClubMembers(clubId: string): Promise<number> {
  const result = await prisma.clubMembership.updateMany({
    where: {
      clubId,
      status: 'ACTIVE',
      role: { notIn: ['GESTOR', 'ADMIN'] },
    },
    data: { status: 'SUSPENDED' },
  });
  return result.count;
}

export async function reactivateClubMembers(clubId: string): Promise<number> {
  const result = await prisma.clubMembership.updateMany({
    where: {
      clubId,
      status: 'SUSPENDED',
    },
    data: { status: 'ACTIVE' },
  });
  return result.count;
}

export async function checkAndSuspendExpiredSubscriptions(): Promise<{
  checked: number;
  suspended: number;
  details: object[];
}> {
  const now = new Date();

  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      currentPeriodEnd: { lt: now },
      planType: { not: 'FREE' },
    },
    include: {
      club: { select: { id: true, name: true } },
    },
  });

  const details: object[] = [];

  for (const sub of expiredSubscriptions) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE' },
    });

    const membersSuspended = await suspendClubMembers(sub.clubId);

    details.push({
      clubId: sub.clubId,
      clubName: sub.club.name,
      planType: sub.planType,
      expiredAt: sub.currentPeriodEnd,
      membersSuspended,
    });
  }

  return {
    checked: expiredSubscriptions.length,
    suspended: details.filter((d) => (d as { membersSuspended: number }).membersSuspended > 0).length,
    details,
  };
}
