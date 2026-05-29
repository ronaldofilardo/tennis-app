#!/usr/bin/env node
/**
 * migrate-colors.mjs — Migração de cores hardcoded para tokens CSS
 *
 * Substitui cores hardcoded (#hex, rgba()) pelos tokens definidos em src/index.css.
 * Também corrige `transition: all` → propriedades específicas (Fase 4).
 *
 * Uso:
 *   node scripts/migrate-colors.mjs              (dry-run: mostra mudanças sem escrever)
 *   node scripts/migrate-colors.mjs --write      (aplica mudanças nos arquivos)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const WRITE_MODE = process.argv.includes("--write");

// Arquivos/pastas excluídos da migração
const EXCLUDED_PATHS = [
  "index.css",
  "scoreboard-tokens",
  "node_modules",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
];

// ── Mapeamento hex → token ──────────────────────────────────────────────────────
// Ordenado do mais específico ao menos específico para evitar conflitos
const HEX_TOKEN_MAP = [
  // Backgrounds
  { hex: "#0f1117", token: "var(--clr-bg)" },
  { hex: "#0f172a", token: "var(--clr-bg)" },
  { hex: "#0f0f1a", token: "var(--clr-bg)" },
  { hex: "#1a1a1a", token: "var(--clr-bg)" },
  // Surfaces
  { hex: "#181d27", token: "var(--clr-surface)" },
  { hex: "#1e2535", token: "var(--clr-surface-2)" },
  // Text
  { hex: "#e8eaf0", token: "var(--clr-text)" },
  { hex: "#e2e8f0", token: "var(--clr-text)" },
  { hex: "#f8fafc", token: "var(--clr-text)" },
  { hex: "#f0f0f8", token: "var(--clr-text)" },
  // Text muted
  { hex: "#6b7280", token: "var(--clr-text-muted)" },
  { hex: "#64748b", token: "var(--clr-text-muted)" },
  // Text dim
  { hex: "#9ca3af", token: "var(--clr-text-dim)" },
  { hex: "#94a3b8", token: "var(--clr-text-dim)" },
  { hex: "#a0a0b8", token: "var(--clr-text-dim)" },
  { hex: "#7070a0", token: "var(--clr-text-dim)" },
  // Accent green (+ variants)
  { hex: "#22c55e", token: "var(--clr-accent)" },
  { hex: "#4ade80", token: "var(--clr-accent)" },
  { hex: "#34d399", token: "var(--clr-accent)" },
  // Grass green
  { hex: "#16a34a", token: "var(--clr-grass)" },
  // Blue (+ normalização de roxo/azul-claro → blue)
  { hex: "#3b82f6", token: "var(--clr-blue)" },
  { hex: "#60a5fa", token: "var(--clr-blue)" },
  { hex: "#63b3ed", token: "var(--clr-blue)" },
  { hex: "#1976d2", token: "var(--clr-blue)" },
  { hex: "#2196f3", token: "var(--clr-blue)" },
  { hex: "#a78bfa", token: "var(--clr-blue)" }, // roxo → normalizado para blue
  // Yellow (+ normalização de laranja → yellow)
  { hex: "#eab308", token: "var(--clr-yellow)" },
  { hex: "#ff9800", token: "var(--clr-yellow)" }, // laranja → normalizado para yellow
  // Live / Error red (+ variante Tailwind red-500)
  { hex: "#f43f5e", token: "var(--clr-live)" },
  { hex: "#ef4444", token: "var(--clr-live)" },
  // Clay (court surface)
  { hex: "#c4623a", token: "var(--clr-clay)" },
  // White text (cor: #fff → token de texto)
  { hex: "#ffffff", token: "var(--clr-white)", onlyInColorProp: false },
  { hex: "#fff", token: "var(--clr-white)", onlyInColorProp: false },
  // Near-black → bg
  { hex: "#1e1e1e", token: "var(--clr-bg)" },
  { hex: "#1f1f1f", token: "var(--clr-bg)" },
  { hex: "#1a1a1a", token: "var(--clr-bg)" },
  { hex: "#000000", token: "var(--clr-bg)", onlyInColorProp: false },
  // Dark navy → surface
  { hex: "#141c2e", token: "var(--clr-surface)" },
  { hex: "#1a1a2e", token: "var(--clr-surface)" },
  { hex: "#1e1e2e", token: "var(--clr-surface)" },
  { hex: "#0f1520", token: "var(--clr-bg)" },
  // Slate gray → text-muted / surface-2
  { hex: "#334155", token: "var(--clr-text-muted)" },
  { hex: "#374151", token: "var(--clr-text-muted)" },
  { hex: "#2d3748", token: "var(--clr-surface-2)" },
  // More blue variants → blue
  { hex: "#1d4ed8", token: "var(--clr-blue)" },
  { hex: "#1e40af", token: "var(--clr-blue)" },
  { hex: "#3182ce", token: "var(--clr-blue)" },
  { hex: "#4299e1", token: "var(--clr-blue)" },
  // Indigo/purple → blue (normalização)
  { hex: "#3b1e4e", token: "var(--clr-blue)" },
  { hex: "#1e3a5f", token: "var(--clr-blue)" },
  // More green variants → accent
  { hex: "#1aa84a", token: "var(--clr-accent)" },
  { hex: "#2ecc40", token: "var(--clr-accent)" },
  { hex: "#22dd55", token: "var(--clr-accent)" },
  // Dark forest green → grass
  { hex: "#14532d", token: "var(--clr-grass)" },
  { hex: "#15803d", token: "var(--clr-grass)" },
  { hex: "#166534", token: "var(--clr-grass)" },
  // Short hex grays (3-digit)
  { hex: "#000", token: "var(--clr-bg)" },
  { hex: "#111", token: "var(--clr-bg)" },
  { hex: "#222", token: "var(--clr-bg)" },
  { hex: "#333", token: "var(--clr-bg)" },
  { hex: "#444", token: "var(--clr-surface)" },
  { hex: "#555", token: "var(--clr-surface-2)" },
  { hex: "#666", token: "var(--clr-text-muted)" },
  { hex: "#777", token: "var(--clr-text-dim)" },
  { hex: "#888", token: "var(--clr-text-dim)" },
  { hex: "#999", token: "var(--clr-text-dim)" },
  { hex: "#aaa", token: "var(--clr-text-dim)" },
  { hex: "#bbb", token: "var(--clr-text-dim)" },
  { hex: "#ccc", token: "var(--clr-text-dim)" },
  { hex: "#ddd", token: "var(--clr-text)" },
  // More neutral dark grays → bg/surface
  { hex: "#2a2a2a", token: "var(--clr-bg)" },
  { hex: "#2c2c2c", token: "var(--clr-bg)" },
  { hex: "#3a3a3a", token: "var(--clr-bg)" },
  { hex: "#3a3a5e", token: "var(--clr-surface-2)" },
  { hex: "#4a4a6a", token: "var(--clr-surface-2)" },
  { hex: "#4a4a4a", token: "var(--clr-surface)" },
  { hex: "#4f4f4f", token: "var(--clr-surface)" },
  { hex: "#5a5a5a", token: "var(--clr-surface)" },
  { hex: "#4b5563", token: "var(--clr-text-muted)" },
  { hex: "#475569", token: "var(--clr-text-muted)" },
  // Extended purple/indigo → blue (normalização)
  { hex: "#7c3aed", token: "var(--clr-blue)" },
  { hex: "#6d28d9", token: "var(--clr-blue)" },
  { hex: "#6366f1", token: "var(--clr-blue)" },
  { hex: "#6b21a8", token: "var(--clr-blue)" },
  { hex: "#c4b5fd", token: "var(--clr-blue)" },
  { hex: "#a5b4fc", token: "var(--clr-blue)" },
  { hex: "#93c5fd", token: "var(--clr-blue)" },
  // Light reds → live
  { hex: "#fca5a5", token: "var(--clr-live)" },
  { hex: "#f87171", token: "var(--clr-live)" },
  { hex: "#f9a8d4", token: "var(--clr-live)" },
  // Yellow/amber/orange → yellow
  { hex: "#fbbf24", token: "var(--clr-yellow)" },
  { hex: "#f59e0b", token: "var(--clr-yellow)" },
  { hex: "#ffa500", token: "var(--clr-yellow)" },
  { hex: "#856404", token: "var(--clr-yellow)" },
  // Light greens → accent
  { hex: "#86efac", token: "var(--clr-accent)" },
  { hex: "#4caf50", token: "var(--clr-accent)" },
  { hex: "#45a049", token: "var(--clr-accent)" },
  // More reds → live
  { hex: "#dc2626", token: "var(--clr-live)" },
  { hex: "#b91c1c", token: "var(--clr-live)" },
  { hex: "#ff6b6b", token: "var(--clr-live)" },
  { hex: "#f44336", token: "var(--clr-live)" },
  { hex: "#fb7185", token: "var(--clr-live)" },
  { hex: "#fca5ac", token: "var(--clr-live)" },
  // More yellows/ambers → yellow
  { hex: "#fcd34d", token: "var(--clr-yellow)" },
  { hex: "#fde047", token: "var(--clr-yellow)" },
  { hex: "#FFD700", token: "var(--clr-yellow)" },
  { hex: "#ffd700", token: "var(--clr-yellow)" },
  // Orange → clay
  { hex: "#fb923c", token: "var(--clr-orange)" },
  { hex: "#ea580c", token: "var(--clr-clay)" },
  { hex: "#c2622a", token: "var(--clr-clay)" },
  { hex: "#c24108", token: "var(--clr-clay)" },
  { hex: "#e8936a", token: "var(--clr-clay)" },
  { hex: "#c4623a", token: "var(--clr-clay)" },
  { hex: "#fb923c", token: "var(--clr-orange)" },
  // Amber/orange from Tailwind
  { hex: "#92400e", token: "var(--clr-clay)" },
  { hex: "#451a03", token: "var(--clr-clay)" },
  { hex: "#450a0a", token: "var(--clr-live)" },
  // Pink → live (sport accent)
  { hex: "#be185d", token: "var(--clr-live)" },
  { hex: "#f472b6", token: "var(--clr-live)" },
  { hex: "#fb7185", token: "var(--clr-live)" },
  { hex: "#ec4899", token: "var(--clr-live)" },
  { hex: "#f9a8d4", token: "var(--clr-live)" },
  // Purple → purple token
  { hex: "#7c3aed", token: "var(--clr-purple)" },
  { hex: "#6d28d9", token: "var(--clr-purple)" },
  { hex: "#6366f1", token: "var(--clr-blue)" },
  { hex: "#6b21a8", token: "var(--clr-purple)" },
  { hex: "#c4b5fd", token: "var(--clr-purple)" },
  { hex: "#a5b4fc", token: "var(--clr-blue)" },
  { hex: "#c7d2fe", token: "var(--clr-blue)" },
  { hex: "#f3e8ff", token: "var(--clr-text)", onlyInColorProp: true },
  // More blues
  { hex: "#90caf9", token: "var(--clr-blue)" },
  { hex: "#dbeafe", token: "var(--clr-text)", onlyInColorProp: true },
  { hex: "#6c757d", token: "var(--clr-text-muted)" },
  // Light near-white
  { hex: "#f5f5f5", token: "var(--clr-light-bg)" },
  { hex: "#e3f2fd", token: "var(--clr-light-surface)" },
  { hex: "#e9e9e9", token: "var(--clr-text-dim)" },
  { hex: "#eee", token: "var(--clr-text-dim)" },
  { hex: "#f0f0f0", token: "var(--clr-light-bg)" },
  { hex: "#f9f9f9", token: "var(--clr-light-bg)" },
  { hex: "#f1f5f9", token: "var(--clr-light-bg)" },
  { hex: "#dcfce7", token: "var(--clr-light-surface)" },
  { hex: "#dbeafe", token: "var(--clr-light-surface)" },
  { hex: "#f3e8ff", token: "var(--clr-light-surface)" },
  { hex: "#fff3cd", token: "var(--clr-light-surface)" },
  { hex: "#fef3c7", token: "var(--clr-light-surface)" },
  { hex: "#fecdd3", token: "var(--clr-light-surface)" },
  // 4-digit hex alpha
  { hex: "#fff2", token: "var(--clr-white-strong)" },
  // More yellows
  { hex: "#ffb84d", token: "var(--clr-yellow)" },
  { hex: "#fdba74", token: "var(--clr-orange)" },
  { hex: "#fda4af", token: "var(--clr-live)" },
  // More reds
  { hex: "#ff5252", token: "var(--clr-live)" },
  { hex: "#ff8787", token: "var(--clr-live)" },
];

// ── Mapeamento rgba → token ──────────────────────────────────────────────────────
// Usa substituição de string exata (case-sensitive, espaços normalizados)
const RGBA_TOKEN_MAP = [
  // Live / error
  { from: "rgba(244, 63, 94, 0.05)", to: "var(--clr-live-faintest)" },
  { from: "rgba(244, 63, 94, 0.15)", to: "var(--clr-live-faint)" },
  { from: "rgba(244, 63, 94, 0.25)", to: "var(--clr-live-subtle)" },
  { from: "rgba(239, 68, 68, 0.05)", to: "var(--clr-live-faintest)" },
  { from: "rgba(239, 68, 68, 0.15)", to: "var(--clr-live-faint)" },
  { from: "rgba(239, 68, 68, 0.20)", to: "var(--clr-live-faint)" },
  { from: "rgba(239, 68, 68, 0.2)", to: "var(--clr-live-faint)" },
  { from: "rgba(239, 68, 68, 0.25)", to: "var(--clr-live-subtle)" },
  // Accent / success green
  { from: "rgba(34, 197, 94, 0.15)", to: "var(--clr-accent-faint)" },
  { from: "rgba(16, 185, 129, 0.15)", to: "var(--clr-accent-faint)" }, // emerald ≈ accent
  // Blue / info
  { from: "rgba(59, 130, 246, 0.15)", to: "var(--clr-blue-faint)" },
  // Yellow / warning
  { from: "rgba(234, 179, 8, 0.15)", to: "var(--clr-yellow-mid)" },
  { from: "rgba(234, 179, 8, 0.06)", to: "var(--clr-yellow-faint)" },
  { from: "rgba(234, 179, 8, 0.12)", to: "var(--clr-yellow-light)" },
  { from: "rgba(234, 179, 8, 0.40)", to: "var(--clr-yellow-hover)" },
  { from: "rgba(234, 179, 8, 0.4)", to: "var(--clr-yellow-hover)" },
  // Surface / neutral gray
  { from: "rgba(107, 114, 128, 0.15)", to: "var(--clr-surface-lighter)" },
  // Extended live/error alpha
  { from: "rgba(239, 68, 68, 0.1)", to: "var(--clr-live-micro)" },
  { from: "rgba(244, 63, 94, 0.1)", to: "var(--clr-live-micro)" },
  { from: "rgba(239, 68, 68, 0.12)", to: "var(--clr-live-faint)" },
  { from: "rgba(239, 68, 68, 0.3)", to: "var(--clr-live-mid)" },
  { from: "rgba(239, 68, 68, 0.30)", to: "var(--clr-live-mid)" },
  { from: "rgba(244, 63, 94, 0.3)", to: "var(--clr-live-mid)" },
  // Extended accent/success alpha
  { from: "rgba(34, 197, 94, 0.1)", to: "var(--clr-accent-micro)" },
  { from: "rgba(34, 197, 94, 0.12)", to: "var(--clr-accent-light)" },
  // Extended blue/info alpha
  { from: "rgba(59, 130, 246, 0.12)", to: "var(--clr-blue-light)" },
  { from: "rgba(59, 130, 246, 0.18)", to: "var(--clr-blue-mid)" },
  { from: "rgba(59, 130, 246, 0.1)", to: "var(--clr-blue-micro)" },
  { from: "rgba(99, 102, 241, 0.15)", to: "var(--clr-blue-faint)" },
  // White overlay variants
  { from: "rgba(255, 255, 255, 0.02)", to: "var(--clr-white-micro)" },
  { from: "rgba(255, 255, 255, 0.06)", to: "var(--clr-white-faint)" },
  { from: "rgba(255, 255, 255, 0.15)", to: "var(--clr-white-mid)" },
  { from: "rgba(255, 255, 255, 0.20)", to: "var(--clr-white-hover)" },
  { from: "rgba(255, 255, 255, 0.2)", to: "var(--clr-white-hover)" },
  // Extended white overlays
  { from: "rgba(255, 255, 255, 0.03)", to: "var(--clr-white-thin)" },
  { from: "rgba(255, 255, 255, 0.05)", to: "var(--clr-white-soft)" },
  { from: "rgba(255, 255, 255, 0.08)", to: "var(--clr-white-strong)" },
  { from: "rgba(255, 255, 255, 0.38)", to: "var(--clr-white-bold)" },
  // Dark overlays
  { from: "rgba(0, 0, 0, 0.5)", to: "var(--clr-overlay-50)" },
  { from: "rgba(0, 0, 0, 0.50)", to: "var(--clr-overlay-50)" },
  { from: "rgba(0, 0, 0, 0.55)", to: "var(--clr-overlay-55)" },
  { from: "rgba(0, 0, 0, 0.6)", to: "var(--clr-overlay-60)" },
  { from: "rgba(0, 0, 0, 0.60)", to: "var(--clr-overlay-60)" },
  { from: "rgba(0, 0, 0, 0.7)", to: "var(--clr-overlay-70)" },
  { from: "rgba(0, 0, 0, 0.70)", to: "var(--clr-overlay-70)" },
  { from: "rgba(0, 0, 0, 0.75)", to: "var(--clr-overlay-75)" },
  // Accent extended
  { from: "rgba(34, 197, 94, 0.2)", to: "var(--clr-accent-low)" },
  { from: "rgba(34, 197, 94, 0.20)", to: "var(--clr-accent-low)" },
  { from: "rgba(34, 197, 94, 0.3)", to: "var(--clr-accent-medium)" },
  { from: "rgba(34, 197, 94, 0.30)", to: "var(--clr-accent-medium)" },
  { from: "rgba(34, 197, 94, 0.08)", to: "var(--clr-accent-faintest)" },
  // Live/red extended
  { from: "rgba(244, 63, 94, 0.08)", to: "var(--clr-live-faintest2)" },
  { from: "rgba(244, 63, 94, 0.12)", to: "var(--clr-live-faint)" },
  { from: "rgba(239, 68, 68, 0.08)", to: "var(--clr-live-faintest2)" },
  // Blue extended
  { from: "rgba(59, 130, 246, 0.45)", to: "var(--clr-blue-strong)" },
  { from: "rgba(99, 179, 237, 0.12)", to: "var(--clr-blue-light)" },
  // Yellow extended
  { from: "rgba(234, 179, 8, 0.2)", to: "var(--clr-yellow-low)" },
  { from: "rgba(234, 179, 8, 0.20)", to: "var(--clr-yellow-low)" },
  { from: "rgba(234, 179, 8, 0.3)", to: "var(--clr-yellow-strong)" },
  { from: "rgba(234, 179, 8, 0.30)", to: "var(--clr-yellow-strong)" },
  { from: "rgba(234, 179, 8, 0.05)", to: "var(--clr-yellow-faintest)" },
  { from: "rgba(251, 191, 36, 0.05)", to: "var(--clr-yellow-faintest)" },
  { from: "rgba(245, 158, 11, 0.12)", to: "var(--clr-yellow-light)" },
  // Orange accent
  { from: "rgba(249, 115, 22, 0.12)", to: "var(--clr-orange-faint)" },
  { from: "rgba(249, 115, 22, 0.18)", to: "var(--clr-orange-light)" },
  // Purple accent
  { from: "rgba(124, 58, 237, 0.12)", to: "var(--clr-purple-faint)" },
  { from: "rgba(124, 58, 237, 0.15)", to: "var(--clr-purple-light)" },
  { from: "rgba(99, 102, 241, 0.4)", to: "var(--clr-purple-mid)" },
  { from: "rgba(99, 102, 241, 0.40)", to: "var(--clr-purple-mid)" },
  { from: "rgba(167, 139, 250, 0.15)", to: "var(--clr-purple-subtle)" },
  // Dark overlays (extended)
  { from: "rgba(0, 0, 0, 0.07)", to: "var(--clr-overlay-dark)" },
  {
    from: "rgba(0, 0, 0, 0.15)",
    to: "var(--clr-surface-darker, rgba(0,0,0,0.15))",
  },
  { from: "rgba(0, 0, 0, 0.25)", to: "var(--clr-overlay-dark)" },
  { from: "rgba(0, 0, 0, 0.4)", to: "var(--clr-surface-dark)" },
  { from: "rgba(0, 0, 0, 0.65)", to: "var(--clr-overlay-dark)" },
  { from: "rgba(0, 0, 0, 0.85)", to: "var(--clr-overlay-dark)" },
  // Extra live/red alpha
  { from: "rgba(239, 68, 68, 0.5)", to: "var(--clr-live-mid)" },
  { from: "rgba(239, 68, 68, 0.6)", to: "var(--clr-live)" },
  { from: "rgba(239, 68, 68, 0.22)", to: "var(--clr-live-faint)" },
  { from: "rgba(244, 63, 94, 0.2)", to: "var(--clr-live-faint)" },
  { from: "rgba(220, 38, 38, 0.18)", to: "var(--clr-live-faint)" },
  // Extra blue alpha
  { from: "rgba(59, 130, 246, 0.2)", to: "var(--clr-blue-faint)" },
  { from: "rgba(59, 130, 246, 0.3)", to: "var(--clr-blue-micro)" },
  { from: "rgba(59, 130, 246, 0.08)", to: "var(--clr-blue-micro)" },
  { from: "rgba(59, 130, 246, 0.06)", to: "var(--clr-blue-micro)" },
  { from: "rgba(59, 130, 246, 0.22)", to: "var(--clr-blue-faint)" },
  { from: "rgba(59, 130, 246, 0.25)", to: "var(--clr-blue-faint)" },
  { from: "rgba(59, 130, 246, 0.32)", to: "var(--clr-blue-mid)" },
  { from: "rgba(37, 99, 235, 0.18)", to: "var(--clr-blue-faint)" },
  { from: "rgba(99, 179, 237, 0.15)", to: "var(--clr-blue-light)" },
  { from: "rgba(99, 179, 237, 0.18)", to: "var(--clr-blue-light)" },
  { from: "rgba(99, 179, 237, 0.24)", to: "var(--clr-blue-mid)" },
  { from: "rgba(99, 179, 237, 0.25)", to: "var(--clr-blue-mid)" },
  { from: "rgba(99, 179, 237, 0.4)", to: "var(--clr-blue-strong)" },
  { from: "rgba(99, 179, 237, 0.5)", to: "var(--clr-blue-strong)" },
  { from: "rgba(102, 126, 234, 0.15)", to: "var(--clr-blue-faint)" },
  { from: "rgba(102, 126, 234, 0.28)", to: "var(--clr-blue-mid)" },
  // Extra accent/green alpha
  { from: "rgba(34, 197, 94, 0.05)", to: "var(--clr-accent-faintest)" },
  { from: "rgba(34, 197, 94, 0.06)", to: "var(--clr-accent-faintest)" },
  { from: "rgba(34, 197, 94, 0.18)", to: "var(--clr-accent-light)" },
  { from: "rgba(34, 197, 94, 0.25)", to: "var(--clr-accent-low)" },
  { from: "rgba(34, 197, 94, 0.4)", to: "var(--clr-accent-medium)" },
  { from: "rgba(34, 197, 94, 0.40)", to: "var(--clr-accent-medium)" },
  { from: "rgba(34, 197, 94, 0.88)", to: "var(--clr-accent)" },
  { from: "rgba(22, 163, 74, 0.15)", to: "var(--clr-accent-faint)" },
  { from: "rgba(22, 163, 74, 0.18)", to: "var(--clr-accent-light)" },
  { from: "rgba(52, 211, 153, 0.1)", to: "var(--clr-accent-micro)" },
  { from: "rgba(52, 211, 153, 0.12)", to: "var(--clr-accent-light)" },
  { from: "rgba(76, 175, 80, 0.06)", to: "var(--clr-accent-faintest)" },
  { from: "rgba(76, 175, 80, 0.1)", to: "var(--clr-accent-micro)" },
  { from: "rgba(76, 175, 80, 0.15)", to: "var(--clr-accent-faint)" },
  { from: "rgba(100, 200, 100, 0.08)", to: "var(--clr-accent-faintest)" },
  // Extra yellow/amber alpha
  { from: "rgba(234, 179, 8, 0.08)", to: "var(--clr-yellow-faintest)" },
  { from: "rgba(234, 179, 8, 0.1)", to: "var(--clr-yellow-faintest)" },
  { from: "rgba(234, 179, 8, 0.18)", to: "var(--clr-yellow-light)" },
  { from: "rgba(245, 158, 11, 0.2)", to: "var(--clr-yellow-low)" },
  { from: "rgba(245, 158, 11, 0.25)", to: "var(--clr-yellow-low)" },
  { from: "rgba(245, 158, 11, 0.4)", to: "var(--clr-yellow-strong)" },
  { from: "rgba(217, 119, 6, 0.18)", to: "var(--clr-yellow-light)" },
  { from: "rgba(251, 191, 36, 0.15)", to: "var(--clr-yellow-light)" },
  // Orange alpha
  { from: "rgba(249, 115, 22, 0.2)", to: "var(--clr-orange-faint)" },
  { from: "rgba(249, 115, 22, 0.22)", to: "var(--clr-orange-faint)" },
  { from: "rgba(249, 115, 22, 0.3)", to: "var(--clr-orange-light)" },
  { from: "rgba(249, 115, 22, 0.32)", to: "var(--clr-orange-light)" },
  { from: "rgba(249, 115, 22, 0.45)", to: "var(--clr-orange-light)" },
  { from: "rgba(255, 165, 0, 0.1)", to: "var(--clr-yellow-faintest)" },
  { from: "rgba(234, 88, 12, 0.18)", to: "var(--clr-orange-faint)" },
  { from: "rgba(194, 98, 42, 0.25)", to: "var(--clr-orange-light)" },
  { from: "rgba(196, 98, 58, 0.18)", to: "var(--clr-orange-faint)" },
  // Purple alpha
  { from: "rgba(124, 58, 237, 0.1)", to: "var(--clr-purple-faint)" },
  { from: "rgba(124, 58, 237, 0.18)", to: "var(--clr-purple-faint)" },
  { from: "rgba(124, 58, 237, 0.24)", to: "var(--clr-purple-light)" },
  { from: "rgba(124, 58, 237, 0.4)", to: "var(--clr-purple-mid)" },
  { from: "rgba(124, 58, 237, 0.5)", to: "var(--clr-purple)" },
  { from: "rgba(99, 102, 241, 0.07)", to: "var(--clr-purple-faint)" },
  { from: "rgba(99, 102, 241, 0.1)", to: "var(--clr-purple-faint)" },
  { from: "rgba(99, 102, 241, 0.18)", to: "var(--clr-purple-faint)" },
  { from: "rgba(99, 102, 241, 0.25)", to: "var(--clr-purple-light)" },
  { from: "rgba(99, 102, 241, 0.45)", to: "var(--clr-purple-mid)" },
  { from: "rgba(109, 40, 217, 0.2)", to: "var(--clr-purple-faint)" },
  { from: "rgba(109, 40, 217, 0.22)", to: "var(--clr-purple-faint)" },
  { from: "rgba(139, 92, 246, 0.15)", to: "var(--clr-purple-light)" },
  { from: "rgba(139, 92, 246, 0.3)", to: "var(--clr-purple-mid)" },
  { from: "rgba(167, 139, 250, 0.4)", to: "var(--clr-purple-mid)" },
  // Pink/rose alpha
  { from: "rgba(236, 72, 153, 0.15)", to: "var(--clr-live-faint)" },
  { from: "rgba(236, 72, 153, 0.18)", to: "var(--clr-live-faint)" },
  { from: "rgba(236, 72, 153, 0.45)", to: "var(--clr-live-mid)" },
  { from: "rgba(255, 107, 107, 0.1)", to: "var(--clr-live-micro)" },
  // Muted/slate alpha
  { from: "rgba(100, 116, 139, 0.2)", to: "var(--clr-surface-lighter)" },
  { from: "rgba(100, 116, 139, 0.45)", to: "var(--clr-text-muted)" },
  { from: "rgba(107, 114, 128, 0.1)", to: "var(--clr-surface-lighter)" },
  { from: "rgba(107, 114, 128, 0.12)", to: "var(--clr-surface-lighter)" },
  { from: "rgba(107, 114, 128, 0.2)", to: "var(--clr-surface-lighter)" },
  { from: "rgba(107, 114, 128, 0.3)", to: "var(--clr-text-muted)" },
  { from: "rgba(107, 114, 128, 0.8)", to: "var(--clr-text-muted)" },
  { from: "rgba(74, 85, 104, 0.3)", to: "var(--clr-surface-lighter)" },
  { from: "rgba(74, 85, 104, 0.5)", to: "var(--clr-text-muted)" },
  // Text alpha
  { from: "rgba(232, 234, 240, 0.7)", to: "var(--clr-text-dim)" },
  { from: "rgba(232, 234, 240, 0.85)", to: "var(--clr-text)" },
  { from: "rgba(255, 255, 255, 0.07)", to: "var(--clr-border)" },
  { from: "rgba(255, 255, 255, 0.12)", to: "var(--clr-white-strong)" },
  { from: "rgba(255, 255, 255, 0.14)", to: "var(--clr-white-strong)" },
  { from: "rgba(255, 255, 255, 0.18)", to: "var(--clr-white-strong)" },
  { from: "rgba(255, 255, 255, 0.28)", to: "var(--clr-white-mid)" },
  { from: "rgba(255, 255, 255, 0.3)", to: "var(--clr-white-mid)" },
  { from: "rgba(255, 255, 255, 0.35)", to: "var(--clr-white-hover)" },
  { from: "rgba(255, 255, 255, 0.6)", to: "var(--clr-text-dim)" },
  { from: "rgba(255, 255, 255, 0.95)", to: "var(--clr-text)" },
  // Dark bg alpha
  { from: "rgba(15, 17, 23, 0.6)", to: "var(--clr-overlay-60)" },
  { from: "rgba(15, 23, 42, 0.8)", to: "var(--clr-overlay-70)" },
  { from: "rgba(15, 23, 42, 0.9)", to: "var(--clr-overlay-dark)" },
  { from: "rgba(15, 23, 42, 0.95)", to: "var(--clr-overlay-dark)" },
  { from: "rgba(7, 25, 18, 0.93)", to: "var(--clr-overlay-dark)" },
];

// ── Mapeamento transition: all → propriedades específicas ───────────────────────
// Fase 4: elimina `transition: all` para evitar jank e animações não intencionais
const TRANSITION_MAP = [
  // var(--transition-normal) + ease
  {
    from: /transition:\s*all\s+var\(--transition-normal\)\s+ease\s*;/g,
    to: "transition: color var(--transition-normal) var(--ease-in-out), background-color var(--transition-normal) var(--ease-in-out), transform var(--transition-normal) var(--ease-in-out), opacity var(--transition-normal) var(--ease-in-out), border-color var(--transition-normal) var(--ease-in-out), box-shadow var(--transition-normal) var(--ease-in-out);",
  },
  // var(--transition-normal) sem easing
  {
    from: /transition:\s*all\s+var\(--transition-normal\)\s*;/g,
    to: "transition: color var(--transition-normal) var(--ease-in-out), background-color var(--transition-normal) var(--ease-in-out), transform var(--transition-normal) var(--ease-in-out), opacity var(--transition-normal) var(--ease-in-out), border-color var(--transition-normal) var(--ease-in-out), box-shadow var(--transition-normal) var(--ease-in-out);",
  },
  // var(--transition-normal, 300ms ease) com fallback
  {
    from: /transition:\s*all\s+var\(--transition-normal,\s*300ms\s+ease\)\s*;/g,
    to: "transition: color var(--transition-normal) var(--ease-in-out), background-color var(--transition-normal) var(--ease-in-out), transform var(--transition-normal) var(--ease-in-out), opacity var(--transition-normal) var(--ease-in-out), border-color var(--transition-normal) var(--ease-in-out), box-shadow var(--transition-normal) var(--ease-in-out);",
  },
  // var(--transition-fast) + ease
  {
    from: /transition:\s*all\s+var\(--transition-fast\)\s+ease\s*;/g,
    to: "transition: color var(--transition-fast) var(--ease-out), background-color var(--transition-fast) var(--ease-out), transform var(--transition-fast) var(--ease-out), opacity var(--transition-fast) var(--ease-out), border-color var(--transition-fast) var(--ease-out), box-shadow var(--transition-fast) var(--ease-out);",
  },
  // var(--transition-fast) sem easing
  {
    from: /transition:\s*all\s+var\(--transition-fast\)\s*;/g,
    to: "transition: color var(--transition-fast) var(--ease-out), background-color var(--transition-fast) var(--ease-out), transform var(--transition-fast) var(--ease-out), opacity var(--transition-fast) var(--ease-out), border-color var(--transition-fast) var(--ease-out), box-shadow var(--transition-fast) var(--ease-out);",
  },
  // 150ms ease
  {
    from: /transition:\s*all\s+150ms\s+ease\s*;/g,
    to: "transition: color 150ms var(--ease-out), background-color 150ms var(--ease-out), transform 150ms var(--ease-out), opacity 150ms var(--ease-out), border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out);",
  },
  // 150ms cubic-bezier(0.4, 0, 0.2, 1)
  {
    from: /transition:\s*all\s+150ms\s+cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)\s*;/g,
    to: "transition: color 150ms var(--ease-in-out), background-color 150ms var(--ease-in-out), transform 150ms var(--ease-in-out), opacity 150ms var(--ease-in-out), border-color 150ms var(--ease-in-out), box-shadow 150ms var(--ease-in-out);",
  },
  // 150ms var(--ease-in-out, cubic-bezier(...))
  {
    from: /transition:\s*all\s+150ms\s+var\(--ease-in-out,\s*cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)\)\s*;/g,
    to: "transition: color 150ms var(--ease-in-out), background-color 150ms var(--ease-in-out), transform 150ms var(--ease-in-out), opacity 150ms var(--ease-in-out), border-color 150ms var(--ease-in-out), box-shadow 150ms var(--ease-in-out);",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function collectCssFiles(dir, results = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDED_PATHS.some((ex) => entry === ex || entry.includes(ex)))
      continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectCssFiles(fullPath, results);
    } else if (extname(entry) === ".css") {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Escapa uma string para uso em RegExp.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Constrói um regex que substitui um hex color em contexto de propriedade CSS.
 * Garante que o hex não seja prefixo de um valor mais longo (#fff vs #fff0).
 */
function buildHexRegex(hex, onlyInColorProp = false) {
  const escaped = escapeRegex(hex);
  const hexBody = escaped.replace(/^#/, "");
  // Não deve ser seguido por dígito hex para evitar match parcial
  const negativeLookahead = "(?![0-9a-fA-F])";
  if (onlyInColorProp) {
    // Só substitui quando aparece em propriedade `color:` (não background, border, etc.)
    return new RegExp(
      `((?:^|;|\\{)\\s*color\\s*:\\s*)${escaped}${negativeLookahead}`,
      "gim",
    );
  }
  return new RegExp(`${escaped}${negativeLookahead}`, "gi");
}

// ── Processa um arquivo ──────────────────────────────────────────────────────────
function processFile(file) {
  const original = readFileSync(file, "utf8");

  // Preservar blocos @media print e @media screen intactos (ex: tema claro para impressão)
  // Divide o conteúdo em segmentos: fora/@media-print/dentro
  let content = "";
  const printRegex = /@media\s+print\s*\{/g;
  let lastIndex = 0;
  let match;
  const segments = [];

  // Encontrar todos os blocos @media print e isolar
  const tempContent = original;
  const printBlocks = [];
  let searchFrom = 0;
  while (true) {
    const startIdx = tempContent.indexOf("@media print", searchFrom);
    if (startIdx === -1) break;
    // Encontrar o bloco { } matching
    let depth = 0;
    let i = startIdx;
    let blockStart = -1;
    while (i < tempContent.length) {
      if (tempContent[i] === "{") {
        depth++;
        if (depth === 1) blockStart = i;
      }
      if (tempContent[i] === "}") {
        depth--;
        if (depth === 0) {
          printBlocks.push([startIdx, i]);
          break;
        }
      }
      i++;
    }
    searchFrom = i + 1;
  }

  // Se não há blocos print, processa normalmente
  let processable = original;
  if (printBlocks.length > 0) {
    // Substitui blocos @media print por placeholders
    const placeholders = {};
    let result = original;
    let offset = 0;
    printBlocks.forEach(([s, e], idx) => {
      const placeholder = `/*__PRINT_BLOCK_${idx}__*/`;
      const block = original.slice(s, e + 1);
      placeholders[placeholder] = block;
      const actualS = s + offset;
      const actualE = e + 1 + offset;
      result = result.slice(0, actualS) + placeholder + result.slice(actualE);
      offset += placeholder.length - (e + 1 - s);
    });
    processable = result;
    // Processar só a parte não-print
    let processed = processable;

    // 1. rgba → token
    for (const { from, to } of RGBA_TOKEN_MAP) {
      if (processed.includes(from)) processed = processed.split(from).join(to);
    }
    // 2. hex → token
    for (const { hex, token, onlyInColorProp } of HEX_TOKEN_MAP) {
      const re = buildHexRegex(hex, onlyInColorProp ?? false);
      if (onlyInColorProp) {
        processed = processed.replace(re, (m, prefix) => prefix + token);
      } else {
        processed = processed.replace(re, token);
      }
    }
    // 3. transition: all → específicas
    for (const { from, to } of TRANSITION_MAP) {
      processed = processed.replace(from, to);
    }
    // Restaurar placeholders
    Object.entries(placeholders).forEach(([ph, block]) => {
      processed = processed.replace(ph, block);
    });
    content = processed;
  } else {
    // No print blocks — process entire file
    content = original;
    // 1. rgba → token
    for (const { from, to } of RGBA_TOKEN_MAP) {
      if (content.includes(from)) content = content.split(from).join(to);
    }
    // 2. hex → token
    for (const { hex, token, onlyInColorProp } of HEX_TOKEN_MAP) {
      const re = buildHexRegex(hex, onlyInColorProp ?? false);
      if (onlyInColorProp) {
        content = content.replace(re, (match, prefix) => prefix + token);
      } else {
        content = content.replace(re, token);
      }
    }
    // 3. transition: all → específicas
    for (const { from, to } of TRANSITION_MAP) {
      content = content.replace(from, to);
    }
  }

  return { changed: content !== original, content, original };
}

// ── Main ───────────────────────────────────────────────────────────────────────
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const scanDir = join(ROOT, "frontend", "src");
const files = collectCssFiles(scanDir);

let totalChanged = 0;
let filesChanged = 0;
const unmapped = new Set();

console.log(
  `\n${BOLD}${CYAN}══════════════════════════════════════════${RESET}`,
);
console.log(`${BOLD}${CYAN}  migrate-colors.mjs — Token Migration    ${RESET}`);
console.log(`${BOLD}${CYAN}══════════════════════════════════════════${RESET}`);
console.log(
  `${DIM}Mode: ${WRITE_MODE ? "WRITE" : "DRY-RUN"}  |  Scanning: ${files.length} CSS files${RESET}\n`,
);

for (const file of files) {
  const { changed, content, original } = processFile(file);

  if (changed) {
    const rel = relative(ROOT, file);
    // Contar linhas alteradas
    const origLines = original.split("\n");
    const newLines = content.split("\n");
    let changedCount = 0;
    for (let i = 0; i < Math.max(origLines.length, newLines.length); i++) {
      if (origLines[i] !== newLines[i]) changedCount++;
    }
    totalChanged += changedCount;
    filesChanged++;

    if (WRITE_MODE) {
      writeFileSync(file, content, "utf8");
      console.log(
        `${GREEN}✅${RESET} ${rel} ${DIM}(${changedCount} linhas)${RESET}`,
      );
    } else {
      console.log(
        `${YELLOW}📋${RESET} ${rel} ${DIM}(${changedCount} linhas pendentes)${RESET}`,
      );
    }
  }

  // Detectar cores não mapeadas restantes para relatório
  const remaining = content.matchAll(
    /(?:color|background(?:-color)?|border(?:-color)?):\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g,
  );
  for (const m of remaining) {
    unmapped.add(m[1]);
  }
}

console.log(
  `\n${BOLD}${WRITE_MODE ? `${GREEN}✅ Aplicado` : `${YELLOW}📋 Dry-run`}${RESET}${BOLD}: ${filesChanged} arquivos, ${totalChanged} linhas alteradas${RESET}`,
);

if (!WRITE_MODE) {
  console.log(`\n${DIM}Execute com --write para aplicar as mudanças.${RESET}`);
}

if (unmapped.size > 0) {
  console.log(
    `\n${YELLOW}⚠️  Cores sem mapeamento (${unmapped.size}) — requerem atenção manual:${RESET}`,
  );
  [...unmapped]
    .sort()
    .slice(0, 30)
    .forEach((c) => console.log(`   ${DIM}${c}${RESET}`));
  if (unmapped.size > 30) {
    console.log(`   ${DIM}... e mais ${unmapped.size - 30} cores${RESET}`);
  }
}
