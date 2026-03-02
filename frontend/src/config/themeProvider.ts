// frontend/src/config/themeProvider.ts
// === AREA 4: UI Theming — Carregamento dinâmico de tema por clube ===
// Permite que cada clube aplique suas cores e marca via JSON,
// sem alterar o CSS compilado.

/**
 * Configuração de tema de um clube (White Label).
 * Futuro: será carregado do backend por `clubId`.
 */
export interface ClubTheme {
  /** Nome do clube */
  name: string;
  /** Cores primárias */
  colors: {
    courtBg?: string;
    courtSurface?: string;
    courtLines?: string;
    courtNet?: string;
    player1Color?: string;
    player1Glow?: string;
    player2Color?: string;
    player2Glow?: string;
    accentGold?: string;
    alertRed?: string;
    successGreen?: string;
    surfaceAccent?: string;
    surfaceAccentDim?: string;
    textPrimary?: string;
    textSecondary?: string;
    textMuted?: string;
    borderSubtle?: string;
    borderDefault?: string;
  };
  /** Logo URL do clube (futuro) */
  logoUrl?: string;
  /** Fonte personalizada (futuro) */
  fontFamily?: string;
  /** Tipo de quadra padrão do clube */
  defaultCourtType?: "GRASS" | "CLAY" | "HARD";
}

/** Mapa de CSS variable name para propriedade do ClubTheme. */
const CSS_VAR_MAP: Record<string, keyof ClubTheme["colors"]> = {
  "--court-bg": "courtBg",
  "--court-surface": "courtSurface",
  "--court-lines": "courtLines",
  "--court-net": "courtNet",
  "--player1-color": "player1Color",
  "--player1-glow": "player1Glow",
  "--player2-color": "player2Color",
  "--player2-glow": "player2Glow",
  "--accent-gold": "accentGold",
  "--alert-red": "alertRed",
  "--success-green": "successGreen",
  "--surface-accent": "surfaceAccent",
  "--surface-accent-dim": "surfaceAccentDim",
  "--text-primary": "textPrimary",
  "--text-secondary": "textSecondary",
  "--text-muted": "textMuted",
  "--border-subtle": "borderSubtle",
  "--border-default": "borderDefault",
};

/**
 * Aplica um tema de clube ao documento.
 * Sobrescreve as CSS custom properties definidas em scoreboard-tokens.css.
 */
export function applyClubTheme(theme: ClubTheme): void {
  const root = document.documentElement;

  // Aplica cores
  for (const [cssVar, themeKey] of Object.entries(CSS_VAR_MAP)) {
    const value = theme.colors[themeKey];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }

  // Aplica fonte personalizada
  if (theme.fontFamily) {
    root.style.setProperty("--font-main", theme.fontFamily);
  }
}

/**
 * Remove tema de clube, restaurando os tokens padrão do CSS.
 */
export function resetTheme(): void {
  const root = document.documentElement;

  for (const cssVar of Object.keys(CSS_VAR_MAP)) {
    root.style.removeProperty(cssVar);
  }
  root.style.removeProperty("--font-main");
}

/**
 * Tema padrão do RacketApp (quando nenhum clube está ativo).
 */
export const DEFAULT_THEME: ClubTheme = {
  name: "RacketApp",
  colors: {
    courtBg: "#071912",
    courtSurface: "#0d2b1a",
    courtLines: "#1a4828",
    courtNet: "#266038",
    player1Color: "#3b82f6",
    player2Color: "#f97316",
    successGreen: "#22c55e",
    textPrimary: "#f8fafc",
    textSecondary: "#8fb8a4",
  },
};

/**
 * Carrega tema do clube via API.
 * Faz GET /api/clubs/:clubSlug/theme usando o httpClient.
 * Fallback para tema padrão em caso de erro.
 */
export async function loadClubTheme(clubIdOrSlug: string): Promise<ClubTheme> {
  try {
    // Importar dinamicamente para evitar dependência circular
    const { default: httpClient } = await import("./httpClient");
    const response = await httpClient.get<{
      theme: ClubTheme;
      clubId: string;
    }>(`/clubs/${clubIdOrSlug}/theme`, { skipAuthHeaders: true });
    return response.data.theme || DEFAULT_THEME;
  } catch {
    // Se falhar, usar tema padrão sem impactar UX
    return DEFAULT_THEME;
  }
}

export default { applyClubTheme, resetTheme, loadClubTheme, DEFAULT_THEME };
