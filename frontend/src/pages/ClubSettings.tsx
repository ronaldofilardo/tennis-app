// frontend/src/pages/ClubSettings.tsx
// Página de configurações do clube para GESTOR.
// Permite editar white-label (cores, logo, nome), e termos/políticas.

import React, { useState, useEffect, useCallback } from "react";
import httpClient from "../config/httpClient";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import { useToast } from "../components/Toast";
import PlanGate from "../components/PlanGate";
import type { ClubTheme } from "../config/themeProvider";
import { applyClubTheme } from "../config/themeProvider";

// === Tipos ===

interface ClubSettings {
  appName: string;
  logoUrl: string;
  inviteCode: string;
  allowedEmailDomains: string;
  defaultVisibility: string;
  defaultScoreMode: string;
  termsText: string;
  termsPdfUrl: string;
  themeConfig: ClubTheme | null;
}

const DEFAULT_COLORS: Required<ClubTheme["colors"]> = {
  courtBg: "#0a0f14",
  courtSurface: "#1a2a20",
  courtLines: "#f8fafc",
  courtNet: "#94a3b8",
  player1Color: "#22c55e",
  player1Glow: "rgba(34,197,94,0.3)",
  player2Color: "#3b82f6",
  player2Glow: "rgba(59,130,246,0.3)",
  accentGold: "#eab308",
  alertRed: "#ef4444",
  successGreen: "#22c55e",
  surfaceAccent: "rgba(255,255,255,0.06)",
  surfaceAccentDim: "rgba(255,255,255,0.03)",
  textPrimary: "#f8fafc",
  textSecondary: "#8fb8a4",
  textMuted: "#4a5e54",
  borderSubtle: "rgba(255,255,255,0.08)",
  borderDefault: "rgba(255,255,255,0.15)",
};

const COLOR_LABELS: Record<keyof ClubTheme["colors"], string> = {
  courtBg: "Fundo da Quadra",
  courtSurface: "Superfície da Quadra",
  courtLines: "Linhas da Quadra",
  courtNet: "Rede da Quadra",
  player1Color: "Cor Jogador 1",
  player1Glow: "Brilho Jogador 1",
  player2Color: "Cor Jogador 2",
  player2Glow: "Brilho Jogador 2",
  accentGold: "Dourado (Destaque)",
  alertRed: "Vermelho (Alertas)",
  successGreen: "Verde (Sucesso)",
  surfaceAccent: "Acento de Superfície",
  surfaceAccentDim: "Acento de Superfície (Dim)",
  textPrimary: "Texto Primário",
  textSecondary: "Texto Secundário",
  textMuted: "Texto Discreto",
  borderSubtle: "Borda Sutil",
  borderDefault: "Borda Padrão",
};

// === Componente ===

const ClubSettingsPage: React.FC = () => {
  const { activeClub } = useAuth();
  const navigation = useNavigation();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ClubSettings>({
    appName: "",
    logoUrl: "",
    inviteCode: "",
    allowedEmailDomains: "",
    defaultVisibility: "CLUB",
    defaultScoreMode: "MANUAL",
    termsText: "",
    termsPdfUrl: "",
    themeConfig: null,
  });
  const [colors, setColors] = useState<Record<string, string>>({ ...DEFAULT_COLORS });

  const clubId = activeClub?.clubId;
  const isGestor = activeClub?.role === "GESTOR";

  // === Fetch settings ===
  const fetchSettings = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const response = await httpClient.get<ClubSettings>(
        `/clubs/${clubId}/settings`,
      );
      const data = response.data;
      setSettings(data);
      if (data.themeConfig?.colors) {
        setColors({ ...DEFAULT_COLORS, ...data.themeConfig.colors });
      }
    } catch {
      toast.error("Erro ao carregar configurações.");
    } finally {
      setLoading(false);
    }
  }, [clubId, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // === Save settings ===
  const handleSave = async () => {
    if (!clubId) return;
    setSaving(true);
    try {
      const themeConfig: ClubTheme = {
        name: settings.appName || activeClub?.clubName || "Clube",
        colors: { ...colors } as ClubTheme["colors"],
        logoUrl: settings.logoUrl || undefined,
      };

      await httpClient.patch(`/clubs/${clubId}/settings`, {
        appName: settings.appName,
        logoUrl: settings.logoUrl,
        allowedEmailDomains: settings.allowedEmailDomains,
        defaultVisibility: settings.defaultVisibility,
        defaultScoreMode: settings.defaultScoreMode,
        termsText: settings.termsText,
        termsPdfUrl: settings.termsPdfUrl,
        themeConfig,
      });

      // Apply theme locally
      applyClubTheme(themeConfig);
      toast.success("Configurações salvas com sucesso!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar configurações";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // === Preview theme ===
  const handlePreview = () => {
    const previewTheme: ClubTheme = {
      name: settings.appName || "Preview",
      colors: { ...colors } as ClubTheme["colors"],
    };
    applyClubTheme(previewTheme);
    toast.success("Preview aplicado! Salve para manter.");
  };

  // === Color change handler ===
  const handleColorChange = (key: string, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  // === Guards ===
  if (!activeClub || !isGestor) {
    return (
      <div style={pageStyles.container}>
        <div style={pageStyles.empty}>
          <p>Acesso restrito a gestores do clube.</p>
          <button style={pageStyles.btnSecondary} onClick={() => navigation.navigateToDashboard()}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={pageStyles.container}>
        <div style={pageStyles.loading}>Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div style={pageStyles.container}>
      {/* Header */}
      <header style={pageStyles.header}>
        <div>
          <h2 style={pageStyles.title}>Configurações do Clube</h2>
          <span style={pageStyles.clubTag}>{activeClub.clubName}</span>
        </div>
        <div style={pageStyles.headerActions}>
          <button
            style={pageStyles.btnSecondary}
            onClick={() => navigation.replace("/gestor")}
          >
            ← Voltar ao Painel
          </button>
          <button
            style={pageStyles.btnPrimary}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </header>

      {/* General Settings */}
      <section style={pageStyles.section}>
        <h3 style={pageStyles.sectionTitle}>Informações Gerais</h3>
        <div style={pageStyles.formGrid}>
          <div style={pageStyles.formGroup}>
            <label style={pageStyles.label}>Nome do App</label>
            <input
              style={pageStyles.input}
              type="text"
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
              placeholder="Ex: MeuClube Tennis"
            />
          </div>
          <div style={pageStyles.formGroup}>
            <label style={pageStyles.label}>URL do Logo</label>
            <input
              style={pageStyles.input}
              type="url"
              value={settings.logoUrl}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div style={pageStyles.formGroup}>
            <label style={pageStyles.label}>Visibilidade Padrão</label>
            <select
              style={pageStyles.select}
              value={settings.defaultVisibility}
              onChange={(e) => setSettings({ ...settings, defaultVisibility: e.target.value })}
            >
              <option value="PUBLIC">Pública</option>
              <option value="CLUB">Apenas Clube</option>
              <option value="PLAYERS_ONLY">Apenas Jogadores</option>
            </select>
          </div>
          <div style={pageStyles.formGroup}>
            <label style={pageStyles.label}>Domínios de E-mail Permitidos</label>
            <input
              style={pageStyles.input}
              type="text"
              value={settings.allowedEmailDomains}
              onChange={(e) => setSettings({ ...settings, allowedEmailDomains: e.target.value })}
              placeholder="Ex: meuclube.com.br (separar por vírgula)"
            />
          </div>
        </div>
      </section>

      {/* Theme / Colors */}
      <section style={pageStyles.section}>
        <h3 style={pageStyles.sectionTitle}>
          Cores do Tema (White-Label)
        </h3>
        <PlanGate requiredFeature="custom_branding">
          <div style={pageStyles.colorGrid}>
            {Object.entries(COLOR_LABELS).map(([key, label]) => (
              <div key={key} style={pageStyles.colorItem}>
                <label style={pageStyles.colorLabel}>{label}</label>
                <div style={pageStyles.colorInputWrapper}>
                  <input
                    type="color"
                    value={colors[key]?.startsWith("rgba") ? "#888888" : (colors[key] || "#000000")}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    style={pageStyles.colorPicker}
                  />
                  <input
                    type="text"
                    value={colors[key] || ""}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    style={pageStyles.colorText}
                    placeholder="#hex ou rgba(...)"
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={pageStyles.previewActions}>
            <button style={pageStyles.btnSecondary} onClick={handlePreview}>
              Pré-visualizar Tema
            </button>
          </div>
        </PlanGate>
      </section>

      {/* Terms & Policies */}
      <section style={pageStyles.section}>
        <h3 style={pageStyles.sectionTitle}>Termos e Políticas</h3>
        <div style={pageStyles.formGroup}>
          <label style={pageStyles.label}>Texto dos Termos de Uso</label>
          <textarea
            style={pageStyles.textarea}
            value={settings.termsText}
            onChange={(e) => setSettings({ ...settings, termsText: e.target.value })}
            placeholder="Insira os termos de uso do clube..."
            rows={6}
          />
        </div>
        <div style={pageStyles.formGroup}>
          <label style={pageStyles.label}>URL do PDF dos Termos</label>
          <input
            style={pageStyles.input}
            type="url"
            value={settings.termsPdfUrl}
            onChange={(e) => setSettings({ ...settings, termsPdfUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </section>
    </div>
  );
};

// === Estilos inline ===
const pageStyles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "24px 16px",
    color: "var(--text-primary, #f8fafc)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    flexWrap: "wrap",
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  },
  clubTag: {
    fontSize: 13,
    color: "var(--text-secondary, #8fb8a4)",
    background: "rgba(255,255,255,0.06)",
    padding: "2px 10px",
    borderRadius: 12,
  },
  headerActions: {
    display: "flex",
    gap: 8,
  },
  section: {
    marginBottom: 36,
    padding: 24,
    background: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 20,
    margin: "0 0 20px 0",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-secondary, #8fb8a4)",
  },
  input: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "var(--text-primary, #f8fafc)",
    fontSize: 14,
    outline: "none",
  },
  select: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "var(--text-primary, #f8fafc)",
    fontSize: 14,
    outline: "none",
  },
  textarea: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "var(--text-primary, #f8fafc)",
    fontSize: 14,
    outline: "none",
    resize: "vertical" as const,
    fontFamily: "inherit",
  },
  colorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12,
  },
  colorItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  colorLabel: {
    fontSize: 12,
    color: "var(--text-secondary, #8fb8a4)",
  },
  colorInputWrapper: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  colorPicker: {
    width: 36,
    height: 36,
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    padding: 0,
  },
  colorText: {
    flex: 1,
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text-primary, #f8fafc)",
    fontSize: 13,
    fontFamily: "monospace",
    outline: "none",
  },
  previewActions: {
    marginTop: 16,
    display: "flex",
    gap: 8,
  },
  empty: {
    textAlign: "center",
    padding: "48px 24px",
  },
  loading: {
    textAlign: "center",
    padding: "48px 24px",
    color: "var(--text-secondary, #8fb8a4)",
  },
  btnPrimary: {
    padding: "8px 20px",
    background: "var(--accent-gold, #eab308)",
    color: "#000",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "8px 16px",
    background: "rgba(255,255,255,0.06)",
    color: "var(--text-primary, #f8fafc)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    fontWeight: 500,
    fontSize: 13,
    cursor: "pointer",
  },
};

export default ClubSettingsPage;
