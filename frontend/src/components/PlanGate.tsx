// frontend/src/components/PlanGate.tsx
// Componente de feature-gating por plano.
// Esconde conteúdo ou mostra upgrade prompt baseado no plano do clube.

import React from "react";
import type { ReactNode } from "react";
import {
  useSubscription,
  PLAN_LIMITS,
  type PlanType,
  type Feature,
} from "../hooks/useSubscription";

interface PlanGateProps {
  /** Feature requerida para exibir o conteúdo */
  requiredFeature?: Feature;
  /** Plano mínimo requerido (alternativa a requiredFeature) */
  requiredPlan?: PlanType;
  /** Conteúdo a ser exibido quando o plano permite */
  children: ReactNode;
  /** Conteúdo alternativo quando o plano não permite (fallback) */
  fallback?: ReactNode;
  /** Se true, esconde completamente ao invés de mostrar fallback */
  hideIfBlocked?: boolean;
}

const PLAN_ORDER: PlanType[] = ["FREE", "PREMIUM", "ENTERPRISE"];

function meetsMinPlan(current: PlanType, required: PlanType): boolean {
  return PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(required);
}

/**
 * Componente que controla a visibilidade baseado no plano do clube.
 *
 * Uso com feature:
 * ```tsx
 * <PlanGate requiredFeature="advanced_stats">
 *   <AdvancedStatsPanel />
 * </PlanGate>
 * ```
 *
 * Uso com plano mínimo:
 * ```tsx
 * <PlanGate requiredPlan="PREMIUM">
 *   <TournamentManager />
 * </PlanGate>
 * ```
 */
export const PlanGate: React.FC<PlanGateProps> = ({
  requiredFeature,
  requiredPlan,
  children,
  fallback,
  hideIfBlocked = false,
}) => {
  const { planType, hasFeature, planLabel } = useSubscription();

  let isAllowed = true;

  if (requiredFeature) {
    isAllowed = hasFeature(requiredFeature);
  } else if (requiredPlan) {
    isAllowed = meetsMinPlan(planType, requiredPlan);
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  if (hideIfBlocked) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Fallback padrão: mensagem de upgrade
  const targetPlan = requiredPlan || "PREMIUM";

  return (
    <div className="plan-gate-blocked" style={styles.container}>
      <div style={styles.icon}>🔒</div>
      <div style={styles.title}>Recurso do Plano {PLAN_LIMITS[targetPlan]?.label || targetPlan}</div>
      <div style={styles.description}>
        Seu plano atual ({planLabel}) não inclui este recurso.
        Faça upgrade para o plano {PLAN_LIMITS[targetPlan]?.label || targetPlan} para desbloquear.
      </div>
      <button style={styles.upgradeButton}>
        Fazer Upgrade
      </button>
    </div>
  );
};

/**
 * Hook helper para verificação inline de features.
 * Útil quando não se quer usar o componente PlanGate.
 *
 * ```tsx
 * const canUseTournaments = usePlanCheck("tournaments");
 * ```
 */
export function usePlanCheck(feature: Feature): boolean {
  const { hasFeature } = useSubscription();
  return hasFeature(feature);
}

/**
 * Hook para verificar plano mínimo.
 *
 * ```tsx
 * const isPremiumOrAbove = useMinPlan("PREMIUM");
 * ```
 */
export function useMinPlan(requiredPlan: PlanType): boolean {
  const { planType } = useSubscription();
  return meetsMinPlan(planType, requiredPlan);
}

// === Estilos inline (sem CSS externo necessário) ===
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    background: "rgba(255,255,255,0.03)",
    border: "1px dashed rgba(255,255,255,0.15)",
    borderRadius: 12,
    textAlign: "center",
    gap: 12,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary, #f8fafc)",
  },
  description: {
    fontSize: 13,
    color: "var(--text-secondary, #8fb8a4)",
    maxWidth: 360,
    lineHeight: 1.5,
  },
  upgradeButton: {
    marginTop: 8,
    padding: "8px 20px",
    background: "var(--accent-gold, #eab308)",
    color: "#000",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
};

export default PlanGate;
