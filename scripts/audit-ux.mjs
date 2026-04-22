#!/usr/bin/env node
/**
 * audit-ux.mjs — Auditoria Visual Racket
 *
 * Detecta anti-patterns de UX/design nos componentes React + CSS do projeto.
 * Baseado nos princípios do Impeccable Framework + Emil Kowalski Design Engineering.
 *
 * Uso:
 *   node scripts/audit-ux.mjs
 *   node scripts/audit-ux.mjs --json          (output JSON)
 *   node scripts/audit-ux.mjs --fix           (exibe sugestões de fix)
 *   node scripts/audit-ux.mjs --path=frontend/src/components/Toast.css
 *
 * Saída: relatório no console + audit-results.md
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// ── Cores para output ─────────────────────────────────────────────────────────
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// ── Definição de regras ───────────────────────────────────────────────────────
/** @type {Array<{id: string, severity: 'important'|'nit', category: string, description: string, check: (content: string, file: string) => Array<{line: number, match: string, suggestion: string}>}>} */
const RULES = [
  // ── Animações & Motion ────────────────────────────────────────────────────
  {
    id: "A001",
    severity: "important",
    category: "Motion",
    description:
      "`transition: all` — causa jank e anima propriedades não intencionais",
    check(content) {
      return findMatches(content, /transition:\s*all\b/g, (m, line) => ({
        line,
        match: m,
        suggestion:
          "Especificar propriedades: `transition: transform 200ms ease-out, opacity 200ms ease-out`",
      }));
    },
  },
  {
    id: "A002",
    severity: "nit",
    category: "Motion",
    description: "`ease-in` em elemento de UI — sente lento e não responsivo",
    check(content) {
      return findMatches(
        content,
        /transition:[^;]*\bease-in\b(?!-out)/g,
        (m, line) => ({
          line,
          match: m,
          suggestion:
            "Usar `ease-out` (entradas) ou `cubic-bezier(0.23, 1, 0.32, 1)` para forças customizadas",
        }),
      );
    },
  },
  {
    id: "A003",
    severity: "nit",
    category: "Motion",
    description:
      "Animação com duração > 300ms em CSS — pode sentir lento em UI frequente",
    check(content) {
      const results = [];
      const re = /transition:[^;]+?(\d+)ms/g;
      let m;
      while ((m = re.exec(content)) !== null) {
        const ms = parseInt(m[1], 10);
        if (ms > 300) {
          const line = content.slice(0, m.index).split("\n").length;
          results.push({
            line,
            match: m[0].trim(),
            suggestion: `${ms}ms é longo para UI. Considere ≤300ms. Exceções: modais/drawers complexos.`,
          });
        }
      }
      return results;
    },
  },
  {
    id: "A004",
    severity: "nit",
    category: "Motion",
    description:
      "`scale(0)` como ponto de partida de animação — elementos não aparecem do nada no mundo real",
    check(content) {
      return findMatches(content, /scale\(0\)/g, (m, line) => ({
        line,
        match: m,
        suggestion:
          "Usar `scale(0.95)` com `opacity: 0` para entrada mais natural",
      }));
    },
  },
  {
    id: "A005",
    severity: "nit",
    category: "Motion",
    description:
      "Ausência de `prefers-reduced-motion` em arquivo com animações/transições",
    check(content, file) {
      const hasAnimation = /animation:|@keyframes|transition:/.test(content);
      const hasReducedMotion = /prefers-reduced-motion/.test(content);
      if (hasAnimation && !hasReducedMotion && file.endsWith(".css")) {
        return [
          {
            line: 1,
            match: "(arquivo inteiro)",
            suggestion:
              "Adicionar `@media (prefers-reduced-motion: reduce) { ... }` para respeitar preferências de acessibilidade",
          },
        ];
      }
      return [];
    },
  },
  {
    id: "A006",
    severity: "nit",
    category: "Motion",
    description: "Hover effects sem guard para touch devices",
    check(content) {
      const hasHoverTransform = /:hover\s*\{[^}]*(transform|scale)/g.test(
        content,
      );
      const hasHoverMediaGuard = /@media\s*\(hover:\s*hover\)/.test(content);
      if (hasHoverTransform && !hasHoverMediaGuard) {
        return [
          {
            line: 1,
            match: ":hover com transform",
            suggestion:
              "Encapsular em `@media (hover: hover) and (pointer: fine)` para evitar false positives em touch",
          },
        ];
      }
      return [];
    },
  },

  // ── Interação ─────────────────────────────────────────────────────────────
  {
    id: "I001",
    severity: "nit",
    category: "Interaction",
    description: "Botão/elemento clicável sem estado `:active` de feedback",
    check(content, file) {
      if (!file.endsWith(".css")) return [];
      const hasButton = /\.btn|button|\.fab|\.tab-item|\.action/i.test(content);
      const hasActive = /:active/.test(content);
      if (hasButton && !hasActive) {
        return [
          {
            line: 1,
            match: "(componente clicável sem :active)",
            suggestion:
              "Adicionar `transform: scale(0.97)` no `:active` para feedback tátil",
          },
        ];
      }
      return [];
    },
  },
  {
    id: "I002",
    severity: "important",
    category: "Interaction",
    description: "Elemento interativo sem `cursor: pointer`",
    check(content, file) {
      if (!file.endsWith(".css")) return [];
      const hasClickable =
        /\.btn|button:not\(|\.fab|\.tab-item|role="button"|onClick/i.test(
          content,
        );
      const hasCursor = /cursor:\s*pointer/.test(content);
      if (hasClickable && !hasCursor) {
        return [
          {
            line: 1,
            match: "(elemento clicável sem cursor: pointer)",
            suggestion:
              "Adicionar `cursor: pointer` para indicar clicabilidade",
          },
        ];
      }
      return [];
    },
  },

  // ── Tipografia ────────────────────────────────────────────────────────────
  {
    id: "T001",
    severity: "nit",
    category: "Typography",
    description:
      "Tamanho de fonte em `px` fixo — usar `rem` ou `clamp()` para responsividade",
    check(content, file) {
      if (!file.endsWith(".css")) return [];
      return findMatches(content, /font-size:\s*\d+px\b/g, (m, line) => ({
        line,
        match: m,
        suggestion:
          "Converter para `rem` ou `clamp()`. Ex: 16px → 1rem; 14px → 0.875rem",
      }));
    },
  },

  // ── Cores & Contraste ─────────────────────────────────────────────────────
  {
    id: "C001",
    severity: "important",
    category: "Color",
    description:
      "Cor hardcoded em CSS — usar tokens `var(--clr-*)` de src/index.css",
    check(content, file) {
      if (!file.endsWith(".css")) return [];
      const results = [];
      // Detectar cores hex/rgb que não são parte de :root (os tokens em si)
      const isTokenFile =
        file.includes("index.css") || file.includes("scoreboard-tokens");
      if (isTokenFile) return [];

      const re =
        /(?<!var\()(?<!--\S+:\s*)(?:color|background(?:-color)?|border(?:-color)?|fill|stroke):\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g;
      let m;
      while ((m = re.exec(content)) !== null) {
        const color = m[1];
        // Exceções: transparent, inherit, currentColor, cores de sistema
        if (/transparent|inherit|currentColor|currentcolor/.test(color))
          continue;
        const line = content.slice(0, m.index).split("\n").length;
        results.push({
          line,
          match: m[0].trim(),
          suggestion: `Substituir por token CSS. Ex: ${color} → var(--clr-surface) ou var(--clr-accent)`,
        });
      }
      return results;
    },
  },

  // ── Layout & Espaçamento ──────────────────────────────────────────────────
  {
    id: "L001",
    severity: "nit",
    category: "Layout",
    description: "Largura/altura em `px` fixo sem equivalente responsivo",
    check(content, file) {
      if (!file.endsWith(".css")) return [];
      return findMatches(
        content,
        /(?:width|height):\s*\d{3,}px\b/g,
        (m, line) => ({
          line,
          match: m,
          suggestion:
            "Considerar `%`, `vw/vh`, `min-content`, `max-content` ou `clamp()` para responsividade",
        }),
      );
    },
  },

  // ── React/TSX ─────────────────────────────────────────────────────────────
  {
    id: "R001",
    severity: "important",
    category: "React",
    description: "Estado mutado diretamente (`.push`, `.splice` em state)",
    check(content, file) {
      if (!file.endsWith(".tsx") && !file.endsWith(".ts")) return [];
      return findMatches(
        content,
        /\bstate\.\w+\.(push|splice|pop|shift|unshift|sort|reverse)\(/g,
        (m, line) => ({
          line,
          match: m,
          suggestion:
            "Usar spread ou immer. Ex: setState(prev => [...prev, newItem])",
        }),
      );
    },
  },
  {
    id: "R002",
    severity: "nit",
    category: "React",
    description:
      "Objeto/array inline como prop (causa re-renders desnecessários)",
    check(content, file) {
      if (!file.endsWith(".tsx") && !file.endsWith(".jsx")) return [];
      return findMatches(content, /\w+=\{\{[^}]{20,}\}\}/g, (m, line) => ({
        line,
        match: m,
        suggestion: "Mover objeto para fora do JSX ou usar useMemo/useCallback",
      }));
    },
  },
  {
    id: "R003",
    severity: "important",
    category: "TypeScript",
    description: "Uso de `any` sem comentário justificando",
    check(content, file) {
      if (!file.endsWith(".tsx") && !file.endsWith(".ts")) return [];
      return findMatches(content, /:\s*any\b(?!\s*\/\/)/g, (m, line) => ({
        line,
        match: m,
        suggestion:
          "Substituir por tipo específico ou `unknown` com type guard",
      }));
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * @param {string} content
 * @param {RegExp} re
 * @param {(match: string, line: number) => {line: number, match: string, suggestion: string}} mapper
 */
function findMatches(content, re, mapper) {
  const results = [];
  let m;
  const regex = new RegExp(
    re.source,
    re.flags.includes("g") ? re.flags : re.flags + "g",
  );
  while ((m = regex.exec(content)) !== null) {
    const line = content.slice(0, m.index).split("\n").length;
    results.push(mapper(m[0], line));
  }
  return results;
}

/**
 * @param {string} dir
 * @param {string[]} results
 * @returns {string[]}
 */
function collectFiles(dir, results = []) {
  const IGNORE = [
    "node_modules",
    "dist",
    "coverage",
    ".git",
    "playwright-report",
    "test-results",
    "__mocks__",
  ];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (IGNORE.some((ig) => entry === ig)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, results);
    } else {
      const ext = extname(entry);
      if ([".css", ".tsx", ".ts"].includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const outputJson = args.includes("--json");
const showFix = args.includes("--fix");
const pathArg = args
  .find((a) => a.startsWith("--path="))
  ?.replace("--path=", "");

const scanDir = pathArg ? join(ROOT, pathArg) : join(ROOT, "frontend", "src");

const files =
  pathArg && !statSync(join(ROOT, pathArg)).isDirectory()
    ? [join(ROOT, pathArg)]
    : collectFiles(scanDir);

/** @type {Array<{file: string, rule: string, severity: string, category: string, description: string, line: number, match: string, suggestion: string}>} */
const findings = [];

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const relPath = relative(ROOT, file);

  for (const rule of RULES) {
    const matches = rule.check(content, file);
    for (const m of matches) {
      findings.push({
        file: relPath,
        rule: rule.id,
        severity: rule.severity,
        category: rule.category,
        description: rule.description,
        line: m.line,
        match: m.match,
        suggestion: m.suggestion,
      });
    }
  }
}

// ── Output ────────────────────────────────────────────────────────────────────
if (outputJson) {
  console.log(JSON.stringify(findings, null, 2));
  process.exit(findings.some((f) => f.severity === "important") ? 1 : 0);
}

const important = findings.filter((f) => f.severity === "important");
const nits = findings.filter((f) => f.severity === "nit");

console.log(
  `\n${BOLD}${CYAN}══════════════════════════════════════════${RESET}`,
);
console.log(
  `${BOLD}${CYAN}  Racket UX Audit — Impeccable + Emil Eng  ${RESET}`,
);
console.log(`${BOLD}${CYAN}══════════════════════════════════════════${RESET}`);
console.log(
  `${DIM}Scanned: ${files.length} files in ${relative(ROOT, scanDir)}${RESET}\n`,
);

if (findings.length === 0) {
  console.log(`${GREEN}✓ Nenhum problema encontrado!${RESET}\n`);
} else {
  console.log(
    `${RED}🔴 Important: ${important.length}${RESET}  ${YELLOW}🟡 Nits: ${nits.length}${RESET}\n`,
  );

  const byFile = findings.reduce((acc, f) => {
    if (!acc[f.file]) acc[f.file] = [];
    acc[f.file].push(f);
    return acc;
  }, {});

  for (const [file, fileFindings] of Object.entries(byFile)) {
    console.log(`${BOLD}${file}${RESET}`);
    for (const f of fileFindings) {
      const icon =
        f.severity === "important" ? `${RED}🔴${RESET}` : `${YELLOW}🟡${RESET}`;
      console.log(
        `  ${icon} ${BOLD}[${f.rule}]${RESET} ${f.category}: ${f.description}`,
      );
      console.log(
        `     ${DIM}Line ${f.line} — ${f.match.slice(0, 80)}${RESET}`,
      );
      if (showFix) {
        console.log(`     ${CYAN}💡 ${f.suggestion}${RESET}`);
      }
    }
    console.log();
  }
}

// ── Gerar relatório markdown ──────────────────────────────────────────────────
const date = new Date().toISOString().split("T")[0];
let md = `# Racket UX Audit Report\n\n`;
md += `**Data:** ${date}  \n`;
md += `**Arquivos scaneados:** ${files.length}  \n`;
md += `**🔴 Important:** ${important.length}  \n`;
md += `**🟡 Nits:** ${nits.length}\n\n`;

if (findings.length === 0) {
  md += `## ✅ Nenhum problema encontrado!\n`;
} else {
  md += `## Sumário por Categoria\n\n`;
  const categories = [...new Set(findings.map((f) => f.category))];
  md += `| Categoria | Important | Nit | Total |\n|---|---|---|---|\n`;
  for (const cat of categories) {
    const catFindings = findings.filter((f) => f.category === cat);
    const imp = catFindings.filter((f) => f.severity === "important").length;
    const nit = catFindings.filter((f) => f.severity === "nit").length;
    md += `| ${cat} | ${imp} | ${nit} | ${catFindings.length} |\n`;
  }

  md += `\n## Findings Detalhados\n\n`;
  const byFile = findings.reduce((acc, f) => {
    if (!acc[f.file]) acc[f.file] = [];
    acc[f.file].push(f);
    return acc;
  }, {});

  for (const [file, fileFindings] of Object.entries(byFile)) {
    md += `### \`${file}\`\n\n`;
    md += `| Regra | Severidade | Categoria | Linha | Problema | Sugestão |\n`;
    md += `|---|---|---|---|---|---|\n`;
    for (const f of fileFindings) {
      const sev = f.severity === "important" ? "🔴 Important" : "🟡 Nit";
      const match = f.match.slice(0, 50).replace(/\|/g, "\\|");
      const sug = f.suggestion.replace(/\|/g, "\\|");
      md += `| ${f.rule} | ${sev} | ${f.category} | ${f.line} | \`${match}\` | ${sug} |\n`;
    }
    md += "\n";
  }

  md += `## Próximos Passos\n\n`;
  md += `1. Resolver todos os findings **Important** antes do próximo release\n`;
  md += `2. Para fixes detalhados, executar: \`node scripts/audit-ux.mjs --fix\`\n`;
  md += `3. Para auditoria via CLI do Impeccable: \`npx impeccable detect frontend/src/\`\n`;
  md += `4. Para overlay visual no browser: \`npx impeccable live\`\n`;
}

const reportPath = join(ROOT, "audit-results.md");
writeFileSync(reportPath, md, "utf8");
console.log(`${GREEN}📄 Relatório salvo em: audit-results.md${RESET}\n`);

process.exit(important.length > 0 ? 1 : 0);
