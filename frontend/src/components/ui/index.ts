/**
 * Componentes base de UI reutilizáveis.
 *
 * Convenção: novos componentes genéricos de interface (botões, modais,
 * indicadores, banners) devem ser criados DENTRO desta pasta.
 *
 * Componentes de domínio/negócio (ex: MatchStatsModal, BracketViewer)
 * ficam na raiz de `src/components/` ou em subpastas por feature.
 */

export { default as ErrorBoundary } from '../ErrorBoundary';
export { default as LoadingIndicator } from '../LoadingIndicator';
export { ToastProvider, useToast } from '../Toast';
export type { ToastType, ToastMessage } from '../Toast';
export { default as OfflineBanner } from '../OfflineBanner';
export { default as FilterChips } from '../FilterChips';
export { default as FloatingActionButton } from '../FloatingActionButton';
export { default as BottomTabBar } from '../BottomTabBar';
export { default as PlanGate, usePlanCheck, useMinPlan } from '../PlanGate';
