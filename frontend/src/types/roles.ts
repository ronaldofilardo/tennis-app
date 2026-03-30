// frontend/src/types/roles.ts
// Shared role labels and icons used across Admin, Gestor, and Athlete dashboards

export const ROLE_LABELS: Record<string, string> = {
  GESTOR: 'Gestor',
  COACH: 'Treinador',
  ATHLETE: 'Atleta',
  SPECTATOR: 'Espectador',
  ADMIN: 'Administrador',
};

export const ROLE_ICONS: Record<string, string> = {
  GESTOR: '👔',
  COACH: '🎯',
  ATHLETE: '🎾',
  SPECTATOR: '👁️',
  ADMIN: '🔑',
};
