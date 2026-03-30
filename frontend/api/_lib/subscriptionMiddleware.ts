// frontend/api/_lib/subscriptionMiddleware.ts
// Middleware de enforcement de subscription.

import type { ServerResponse } from 'node:http';
import prisma from './prisma.js';
import { corsHeaders, sendJson } from './authMiddleware.js';
import type { ApiRequest, UserContext } from './types.js';

export const PLAN_LIMITS: Record<string, { maxAthletes: number; features: string[] }> = {
  FREE: { maxAthletes: 10, features: ['basic_scoring', 'basic_stats'] },
  PREMIUM: {
    maxAthletes: 50,
    features: ['basic_scoring', 'basic_stats', 'advanced_stats', 'tournaments', 'custom_branding'],
  },
  ENTERPRISE: {
    maxAthletes: 999999,
    features: [
      'basic_scoring',
      'basic_stats',
      'advanced_stats',
      'tournaments',
      'custom_branding',
      'custom_domain',
      'api_access',
      'priority_support',
    ],
  },
};

export function getPlanLimits(planType: string): { maxAthletes: number; features: string[] } {
  return PLAN_LIMITS[planType] ?? PLAN_LIMITS.FREE;
}

export async function requireActiveSubscription(
  req: ApiRequest,
  res: ServerResponse,
  ctx: UserContext,
): Promise<{ subscriptionStatus: string; planType: string } | null> {
  if (ctx.role === 'ADMIN') {
    return { subscriptionStatus: 'ACTIVE', planType: 'ENTERPRISE' };
  }

  if (!ctx.clubId) {
    return { subscriptionStatus: 'ACTIVE', planType: 'FREE' };
  }

  let club: { planType: string; subscription: { status: string; currentPeriodEnd: Date | null; planType: string } | null } | null = null;

  try {
    club = await prisma.club.findUnique({
      where: { id: ctx.clubId },
      select: {
        planType: true,
        subscription: {
          select: { status: true, currentPeriodEnd: true, planType: true },
        },
      },
    });

    if (!club) {
      sendJson(res, 404, { error: 'Club not found' });
      return null;
    }

    if (club.planType === 'FREE' && !club.subscription) {
      return { subscriptionStatus: 'ACTIVE', planType: 'FREE' };
    }

    if (club.subscription) {
      const { status, currentPeriodEnd } = club.subscription;
      const now = new Date();

      if (status === 'CANCELED') {
        sendJson(res, 402, {
          error: 'Subscription canceled',
          message: 'A assinatura do clube foi cancelada. Entre em contato com o gestor.',
          code: 'SUBSCRIPTION_CANCELED',
        });
        return null;
      }

      if (status === 'PAST_DUE' || (currentPeriodEnd && currentPeriodEnd < now)) {
        sendJson(res, 402, {
          error: 'Subscription expired',
          message: 'A assinatura do clube está vencida. O gestor precisa regularizar o pagamento.',
          code: 'SUBSCRIPTION_EXPIRED',
        });
        return null;
      }
    }

    return {
      subscriptionStatus: club.subscription?.status ?? 'ACTIVE',
      planType: club.subscription?.planType ?? club.planType,
    };
  } catch (err) {
    console.error('[subscriptionMiddleware] Error checking subscription:', err);
    return { subscriptionStatus: 'ACTIVE', planType: club?.planType ?? 'FREE' };
  }
}

export async function requireAthleteQuota(
  req: ApiRequest,
  res: ServerResponse,
  ctx: UserContext,
): Promise<boolean> {
  if (ctx.role === 'ADMIN') return true;
  if (!ctx.clubId) return true;

  let club: { planType: string; subscription: { maxAthletes: number; planType: string } | null } | null = null;

  try {
    const activeCount = await prisma.clubMembership.count({
      where: {
        clubId: ctx.clubId,
        status: 'ACTIVE',
        role: { in: ['ATHLETE', 'COACH'] },
      },
    });

    club = await prisma.club.findUnique({
      where: { id: ctx.clubId },
      select: {
        planType: true,
        subscription: { select: { maxAthletes: true, planType: true } },
      },
    });

    if (!club) {
      sendJson(res, 404, { error: 'Club not found' });
      return false;
    }

    const maxAthletes = club.subscription?.maxAthletes ?? getPlanLimits(club.planType).maxAthletes;

    if (activeCount >= maxAthletes) {
      sendJson(res, 403, {
        error: 'Athlete limit reached',
        message: `O clube atingiu o limite de ${maxAthletes} atletas do plano ${club.subscription?.planType ?? club.planType}. Faça upgrade para adicionar mais.`,
        code: 'ATHLETE_LIMIT_REACHED',
        current: activeCount,
        max: maxAthletes,
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error('[subscriptionMiddleware] Error checking quota:', err);
    return true;
  }
}

export async function hasFeature(clubId: string | undefined, feature: string): Promise<boolean> {
  if (!clubId) return false;

  try {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { planType: true, subscription: { select: { planType: true } } },
    });

    if (!club) return false;

    const planType = club.subscription?.planType ?? club.planType;
    const limits = getPlanLimits(planType);
    return limits.features.includes(feature);
  } catch {
    return false;
  }
}

// Suprimir aviso de unused
void corsHeaders;
