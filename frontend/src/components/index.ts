/**
 * Barrel file para componentes.
 *
 * Organização:
 * - `./ui/`       → Componentes base genéricos (Toast, Loading, ErrorBoundary, etc.)
 * - `./scoreboard/` → Componentes do placar ao vivo
 * - `./*`         → Componentes de domínio/negócio
 */

// Re-exportar todos os componentes UI base
export * from './ui';
