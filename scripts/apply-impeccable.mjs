#!/usr/bin/env node
/**
 * apply-impeccable.mjs — Setup e aplicação do Impeccable Framework
 *
 * Instala os skills do Impeccable e guia a configuração do projeto.
 * Gera .impeccable.md com o contexto de design do Racket.
 *
 * Uso:
 *   node scripts/apply-impeccable.mjs           (setup completo)
 *   node scripts/apply-impeccable.mjs --detect  (apenas rodar detecção)
 *   node scripts/apply-impeccable.mjs --live    (overlay no browser)
 *
 * Requisitos: Node.js ≥ 18, npx disponível
 */

import { execSync, spawnSync } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// ── Cores ─────────────────────────────────────────────────────────────────────
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const log = {
  info: (msg) => console.log(`${CYAN}ℹ${RESET}  ${msg}`),
  success: (msg) => console.log(`${GREEN}✓${RESET}  ${msg}`),
  warn: (msg) => console.log(`${YELLOW}⚠${RESET}  ${msg}`),
  error: (msg) => console.log(`${RED}✗${RESET}  ${msg}`),
  header: (msg) => console.log(`\n${BOLD}${CYAN}── ${msg} ──${RESET}\n`),
  step: (n, msg) => console.log(`${BOLD}[${n}]${RESET} ${msg}`),
};

const args = process.argv.slice(2);
const detectOnly = args.includes("--detect");
const liveMode = args.includes("--live");

// ── Verificar Node.js ≥ 18 ────────────────────────────────────────────────────
const nodeVersion = process.versions.node.split(".").map(Number);
if (nodeVersion[0] < 18) {
  log.error(
    `Node.js ≥ 18 é necessário. Versão atual: ${process.versions.node}`,
  );
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(
  `\n${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}`,
);
console.log(
  `${BOLD}${CYAN}║   Impeccable Setup — Racket Tennis App   ║${RESET}`,
);
console.log(
  `${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}\n`,
);

if (detectOnly) {
  runDetect();
  process.exit(0);
}

if (liveMode) {
  runLive();
  process.exit(0);
}

// ── Fluxo completo ────────────────────────────────────────────────────────────
runFullSetup();

function runFullSetup() {
  log.header("1. Verificando dependências");
  checkDependencies();

  log.header("2. Instalando skills Impeccable");
  installSkills();

  log.header("3. Gerando .impeccable.md (contexto do projeto)");
  generateImpeccableContext();

  log.header("4. Rodando detecção de anti-patterns");
  runDetect();

  log.header("5. Setup concluído");
  printNextSteps();
}

// ── Funções ───────────────────────────────────────────────────────────────────
function checkDependencies() {
  // Verificar npx
  const npx = spawnSync("npx", ["--version"], {
    encoding: "utf8",
    shell: true,
  });
  if (npx.status !== 0) {
    log.error("npx não encontrado. Instale o Node.js: https://nodejs.org");
    process.exit(1);
  }
  log.success(`npx disponível (npm ${npx.stdout.trim()})`);

  // Verificar pnpm
  const pnpm = spawnSync("pnpm", ["--version"], {
    encoding: "utf8",
    shell: true,
  });
  if (pnpm.status === 0) {
    log.success(`pnpm disponível (${pnpm.stdout.trim()})`);
  } else {
    log.warn("pnpm não encontrado (opcional para este script)");
  }
}

function installSkills() {
  // Verificar se .claude/skills/ já existe
  const skillsDir = join(ROOT, ".claude", "skills");
  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, { recursive: true });
    log.success("Criado .claude/skills/");
  }

  // Instalar emilkowalski/skill
  log.step("a", "Instalando emilkowalski/skill via npx skills...");
  const emilResult = spawnSync("npx", ["skills", "add", "emilkowalski/skill"], {
    encoding: "utf8",
    shell: true,
    cwd: ROOT,
  });
  if (emilResult.status === 0) {
    log.success("emilkowalski/skill instalado");
  } else {
    log.warn(
      "Não foi possível instalar emilkowalski/skill via npx. Usando skill local em .claude/skills/design-eng.md",
    );
    log.info(`${DIM}Erro: ${emilResult.stderr?.slice(0, 100)}${RESET}`);
  }

  // Instalar pbakaus/impeccable
  log.step("b", "Instalando pbakaus/impeccable via npx skills...");
  const impResult = spawnSync("npx", ["skills", "add", "pbakaus/impeccable"], {
    encoding: "utf8",
    shell: true,
    cwd: ROOT,
  });
  if (impResult.status === 0) {
    log.success("pbakaus/impeccable instalado");
  } else {
    log.warn(
      "Não foi possível instalar pbakaus/impeccable via npx. Usando skill local em .claude/skills/impeccable.md",
    );
    log.info(`${DIM}Erro: ${impResult.stderr?.slice(0, 100)}${RESET}`);
  }

  log.info("Skills locais (fallback) disponíveis em .claude/skills/");
}

function generateImpeccableContext() {
  const contextPath = join(ROOT, ".impeccable.md");

  if (existsSync(contextPath)) {
    log.info(".impeccable.md já existe. Pulando geração automática.");
    log.info("Para regenerar, execute: npx impeccable teach");
    return;
  }

  // Contexto pré-definido para o Racket (evita interatividade em CI)
  const context = `# Impeccable — Racket Tennis App

## Projeto
**Nome:** Racket Tennis App  
**Tipo:** Aplicativo PWA de tênis (scores ao vivo, rankings, anotação de partidas)  
**Audiência:** Jogadores de tênis amadores e gestores de clubes  
**Plataforma primária:** Mobile (iOS/Android via PWA), depois desktop  

## Personalidade & Tom
- **Esportivo** mas não agressivo — elegante, preciso, confiável
- **Energia** de placar ao vivo — tempo real, dinâmico, responsivo
- **Simplicidade** como diferencial — menos é mais em contexto de jogo

## Paleta
\`\`\`css
--clr-bg: #0f1117          /* Fundo escuro profundo */
--clr-surface: #181d27     /* Superfícies */
--clr-surface-2: #1e2535   /* Superfícies elevadas */
--clr-accent: #22c55e      /* Verde primário (ação, sucesso) */
--clr-live: #f43f5e        /* Vermelho ao vivo */
--clr-blue: #3b82f6        /* Informação, hard court */
--clr-yellow: #eab308      /* Atenção, clay court */
--clr-clay: #c4623a        /* Quadra de saibro */
--clr-grass: #16a34a       /* Quadra de grama */
\`\`\`

## Tipografia
- Fonte principal: Inter (sistema de fallback incluído)
- Escala fluida mobile-first: \`clamp(14px, 4vw, 16px)\`
- Hierarquia obrigatória: pelo menos 1.25x entre níveis

## Restrições Técnicas
- CSS vanilla (sem Tailwind, sem CSS-in-JS)
- Todos os estilos via variáveis CSS (\`var(--clr-*)\`)
- Responsividade: 375px / 768px / 1024px / 1440px
- Dark theme apenas (light mode não suportado atualmente)
- PWA: suporte offline obrigatório

## Anti-patterns PROIBIDOS neste projeto
- Cores hardcoded (sempre usar tokens \`var(--clr-*)\`)
- \`transition: all\` (causa jank em animations)
- \`ease-in\` em UI (usar \`ease-out\` ou curvas customizadas)
- Hover effects sem guard \`@media (hover: hover)\`
- Scale(0) como ponto de entrada de animação
- Ausência de \`prefers-reduced-motion\`
- Tamanhos fixos em \`px\` sem responsividade

## Componentes Críticos (alta atenção)
- \`BottomTabBar\`: navegação principal mobile, afeta toda UX
- \`LiveMatchesCarousel\`: performance crítica, dados em tempo real
- \`Toast\`: transitions devem ser interruptíveis
- \`FloatingActionButton\`: feedback tátil obrigatório (:active scale)
- \`ScoreBoard\`: legibilidade em condição de luz solar

## Comandos Prioritários
- \`/audit\` — diagnóstico completo
- \`/animate\` — refinamento de motion
- \`/polish\` — pass final pré-release
- \`/harden\` — empty states, edge cases mobile
`;

  writeFileSync(contextPath, context, "utf8");
  log.success(".impeccable.md gerado com contexto do Racket");
  log.info("Edite .impeccable.md para personalizar o contexto de design");
}

function runDetect() {
  log.info("Rodando npx impeccable detect frontend/src/ ...");
  const detectResult = spawnSync(
    "npx",
    ["impeccable", "detect", "frontend/src/", "--fast"],
    { encoding: "utf8", shell: true, cwd: ROOT, timeout: 60000 },
  );

  if (detectResult.status === 0 || detectResult.stdout) {
    console.log(detectResult.stdout || "Nenhum output.");
    if (detectResult.stderr && !detectResult.stderr.includes("warn")) {
      log.warn(detectResult.stderr.slice(0, 200));
    }
  } else {
    log.warn(
      "npx impeccable não disponível. Rodando audit-ux.mjs como fallback...",
    );
    const fallback = spawnSync("node", ["scripts/audit-ux.mjs", "--fix"], {
      encoding: "utf8",
      shell: true,
      cwd: ROOT,
      stdio: "inherit",
    });
    if (fallback.status !== 0 && fallback.status !== 1) {
      log.error("Falha ao rodar audit-ux.mjs");
    }
  }
}

function runLive() {
  log.info("Iniciando overlay visual do Impeccable no browser...");
  log.info(
    "Certifique-se de que o dev server está rodando (pnpm --filter frontend dev)",
  );
  console.log();

  const liveResult = spawnSync("npx", ["impeccable", "live"], {
    encoding: "utf8",
    shell: true,
    cwd: ROOT,
    stdio: "inherit",
  });

  if (liveResult.status !== 0) {
    log.error(
      "Falha ao iniciar impeccable live. Verifique se o npm package está disponível.",
    );
    log.info("Instale manualmente: npm install -g impeccable");
  }
}

function printNextSteps() {
  console.log(`${BOLD}Próximos passos:${RESET}\n`);
  console.log(
    `  ${CYAN}1.${RESET} Inspecionar o arquivo ${BOLD}audit-results.md${RESET} gerado`,
  );
  console.log(
    `  ${CYAN}2.${RESET} Em Claude Code, usar ${BOLD}/audit${RESET} para auditoria assistida`,
  );
  console.log(
    `  ${CYAN}3.${RESET} Para animar componentes: ${BOLD}/animate${RESET}`,
  );
  console.log(
    `  ${CYAN}4.${RESET} Para polish pré-release: ${BOLD}/polish${RESET}`,
  );
  console.log(
    `  ${CYAN}5.${RESET} Para overlay visual: ${BOLD}node scripts/apply-impeccable.mjs --live${RESET}`,
  );
  console.log(
    `  ${CYAN}6.${RESET} Para detecção contínua em CI: ${BOLD}node scripts/audit-ux.mjs --json${RESET}`,
  );
  console.log();
  console.log(`${DIM}Documentação: https://impeccable.style${RESET}`);
  console.log(`${DIM}Skills locais: .claude/skills/${RESET}\n`);
}
