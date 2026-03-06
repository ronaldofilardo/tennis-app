import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Sempre aponta para frontend/vite.config.ts independente do cwd
const viteConfigPath = join(__dirname, "../vite.config.ts");

describe("Configuração do Vite", () => {
  it("deve ter host configurado para 0.0.0.0", () => {
    const viteConfigContent = readFileSync(viteConfigPath, "utf-8");

    // Aceita aspas simples ou duplas ao redor do valor
    expect(viteConfigContent).toMatch(/host:\s*["']0\.0\.0\.0["']/);
  });

  it("deve ter proxy configurado para /api", () => {
    const viteConfigContent = readFileSync(viteConfigPath, "utf-8");

    // Aceita aspas simples ou duplas
    expect(viteConfigContent).toMatch(/["']\/api["']\s*:\s*\{/);
    expect(viteConfigContent).toMatch(
      /target:\s*["']http:\/\/localhost:3001["']/,
    );
    expect(viteConfigContent).toContain("changeOrigin: true");
    // Nota: o proxy usa `configure` (callbacks) em vez de `rewrite` — ambas são formas válidas de configurar o proxy Vite
  });

  it("deve ter plugin React configurado", () => {
    const viteConfigContent = readFileSync(viteConfigPath, "utf-8");

    expect(viteConfigContent).toContain("react()");
    expect(viteConfigContent).toContain("@vitejs/plugin-react");
  });

  it("deve exportar configuração válida", () => {
    const viteConfigContent = readFileSync(viteConfigPath, "utf-8");

    expect(viteConfigContent).toContain("export default defineConfig");
    expect(viteConfigContent).toContain("defineConfig");
  });
});
