// frontend/src/hooks/useSubscription.ts
// Hook para acessar informações de subscription do clube ativo.
// Fornece dados de plano, quota, e feature-gating no frontend.

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import httpClient from "../config/httpClient";

// Limites por plano (espelha o backend)
export const PLAN_LIMITS = {
  FREE: {
    maxAthletes: 10,
    features: ["basic_scoring", "basic_stats"],
    label: "Gratuito",
  },
  PREMIUM: {
    maxAthletes: 50,
    features: [
      "basic_scoring",
      "basic_stats",
      "advanced_stats",
      "tournaments",
      "custom_branding",
    ],
    label: "Premium",
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
    label: "Enterprise",
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
export type Feature = (typeof PLAN_LIMITS)[PlanType]["features"][number];

export interface SubscriptionUsage {
  activeAthletes: number;
  totalMembers: number;
  maxAthletes: number;
  athletePercentage: number;
  daysRemaining: number | null;
}

export interface SubscriptionData {
  subscription: {
    planType: PlanType;
    status: string;
    billingCycle: string;
    maxAthletes: number;
    currentPeriodEnd?: string;
  };
  usage: SubscriptionUsage;
  plan: {
    type: PlanType;
    label: string;
    price: Record<string, number>;
  };
}

interface UseSubscriptionReturn {
  data: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Convenience getters
  planType: PlanType;
  planLabel: string;
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  isFree: boolean;
  isPremium: boolean;
  isEnterprise: boolean;

  // Feature gating
  hasFeature: (feature: Feature) => boolean;
  canAddAthlete: boolean;
  athleteUsage: { current: number; max: number; percentage: number } | null;
  daysRemaining: number | null;
}

/**
 * Hook para acessar e gerenciar dados de subscription do clube ativo.
 * Busca dados da API `/clubs/:clubId/subscription` automaticamente.
 */
export function useSubscription(): UseSubscriptionReturn {
  const { currentUser, activeClub } = useAuth();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clubId = activeClub?.clubId;

  const fetchSubscription = useCallback(async () => {
    if (!clubId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await httpClient.get<SubscriptionData>(
        `/clubs/${clubId}/subscription`,
      );
      setData(response.data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao carregar dados da assinatura";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Derive plan info from auth context or fetched data
  const planType: PlanType =
    (data?.plan?.type as PlanType) ||
    (currentUser?.planType as PlanType) ||
    "FREE";

  const subscriptionStatus =
    data?.subscription?.status ||
    currentUser?.subscriptionStatus ||
    "ACTIVE";

  const planConfig = PLAN_LIMITS[planType] || PLAN_LIMITS.FREE;

  const hasFeature = useCallback(
    (feature: Feature) => {
      return (planConfig.features as readonly string[]).includes(feature);
    },
    [planConfig],
  );

  return {
    data,
    loading,
    error,
    refresh: fetchSubscription,

    planType,
    planLabel: planConfig.label,
    isActive: subscriptionStatus === "ACTIVE" || subscriptionStatus === "TRIALING",
    isPastDue: subscriptionStatus === "PAST_DUE",
    isCanceled: subscriptionStatus === "CANCELED",
    isFree: planType === "FREE",
    isPremium: planType === "PREMIUM",
    isEnterprise: planType === "ENTERPRISE",

    hasFeature,
    canAddAthlete: data?.usage
      ? data.usage.activeAthletes < data.usage.maxAthletes
      : true,
    athleteUsage: data?.usage
      ? {
          current: data.usage.activeAthletes,
          max: data.usage.maxAthletes,
          percentage: data.usage.athletePercentage,
        }
      : null,
    daysRemaining: data?.usage?.daysRemaining ?? null,
  };
}
