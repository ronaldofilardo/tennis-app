# CLAUDE.md — Racket Tennis App

> Instruções persistentes carregadas em toda sessão Claude Code.
> Última atualização: 2026-04-22

---

## Stack

| Camada           | Tecnologia                                      |
| ---------------- | ----------------------------------------------- |
| Framework        | Vite 5 + React 18                               |
| Linguagem        | TypeScript strict mode                          |
| Estilo           | CSS vanilla com design tokens (`src/index.css`) |
| Testes unitários | Vitest                                          |
| Testes E2E       | Playwright                                      |
| Package manager  | pnpm (workspaces)                               |
| Backend          | Node.js serverless (Vercel API Routes)          |
| Banco de dados   | PostgreSQL via Prisma                           |

---

## Estrutura de Diretórios

```
frontend/
  src/
    components/       # Componentes React (ComponentName.tsx + ComponentName.css)
    __tests__/        # Testes Vitest
    assets/
    App.tsx
    main.tsx
    index.css         # Design tokens globais (fonte única da verdade)
  prisma/             # Schema + migrations
  api/                # Handlers serverless Vercel
  playwright-e2e/     # Testes E2E
scripts/              # Scripts de auditoria e manutenção
.claude/skills/       # Skills Claude locais
.github/
  instructions/       # Guardiões (TypeScript, React, UI/UX, Testing)
  workflows/          # GitHub Actions
```

---

## Design Tokens (src/index.css)

Usar **sempre** tokens existentes — nunca hardcode de cores.

```css
/* Cores */
--clr-bg:
  #0f1117 --clr-surface: #181d27 --clr-surface-2: #1e2535
    --clr-border: rgba(255, 255, 255, 0.07) --clr-text: #e8eaf0
    --clr-text-muted: #6b7280 --clr-text-dim: #9ca3af --clr-accent: #22c55e
    /* verde primário */ --clr-live: #f43f5e /* vermelho ao vivo */
    --clr-blue: #3b82f6 --clr-yellow: #eab308 /* Tipografia */
    --font-main: Inter,
  system-ui, Avenir, Helvetica, Arial,
  sans-serif font-size: clamp(14px, 4vw, 16px) /* fluido mobile-first */;
```

---

## Guardiões Ativos

| Guardião         | Ativa quando                        | Arquivo de instruções                             |
| ---------------- | ----------------------------------- | ------------------------------------------------- |
| TypeScript Pro   | Qualquer `.ts` / `.tsx`             | `.github/instructions/typescript.instructions.md` |
| React Specialist | Componentes `.tsx` / `.jsx`         | `.github/instructions/react.instructions.md`      |
| UI/UX Pro Max    | Componentes visuais `.tsx` / `.css` | `.github/instructions/ui.instructions.md`         |
| QA Expert        | Testes, specs, playwright/          | `.github/instructions/testing.instructions.md`    |

---

## Skills Disponíveis

| Skill                   | Comando          | Ativa quando                             |
| ----------------------- | ---------------- | ---------------------------------------- |
| Emil Design Engineering | `/design-eng`    | Animações, easing, motion refinement     |
| Impeccable Framework    | `/impeccable`    | Auditoria visual completa, anti-patterns |
| Code Review Config      | `/review-config` | Configuração de revisão automática de PR |

Skills estão em `.claude/skills/`. Use `/skill-name` para invocar manualmente.

---

## Regras de Desenvolvimento

### Obrigatórias

1. **NUNCA quebre código existente** — verifique impacto antes de qualquer mudança
2. **NUNCA modifique testes Vitest ou Playwright que passam** sem justificativa documentada
3. **CSS vanilla com tokens** — este projeto NÃO usa Tailwind. Usar variáveis CSS de `src/index.css`
4. **Client-Side somente** — Vite, não Next.js. Sem Server Components
5. **TypeScript strict** — nunca `any`, nunca `@ts-ignore` sem comentário

### Padrões de Componente

- Cada componente tem seu `.css` co-localizado: `Button.tsx` + `Button.css`
- Responsividade obrigatória: 375px / 768px / 1024px / 1440px
- Estados obrigatórios: loading, error, empty, success
- `prefers-reduced-motion` sempre respeitado em animações

### Animações (Emil Design Engineering)

- Transições padrão: `150ms` (micro) / `200ms` (rápido) / `300ms` (normal) / `500ms` (lento)
- Easing padrão: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out) para a maioria
- Entradas: ease-out. Saídas: ease-in
- Spring animations: preferir `cubic-bezier(0.34, 1.56, 0.64, 1)` para bounce sutil

---

## Comandos Úteis

```bash
# Desenvolvimento
pnpm --filter frontend dev        # Inicia Vite + API server
pnpm --filter frontend dev:full   # Vite + API concurrentemente

# Testes
pnpm --filter frontend test       # Vitest watch
pnpm --filter frontend test:ci    # CI com cobertura
pnpm --filter frontend test:e2e   # Playwright

# Auditoria UX
node scripts/audit-ux.mjs         # Auditoria visual completa
node scripts/apply-impeccable.mjs # Aplica sugestões impeccable

# Build
pnpm --filter frontend build      # Build produção
```

---

## Problemas Conhecidos / Decisões Arquiteturais

- **Dark theme hardcoded**: App usa dark sport theme. Light mode não suportado atualmente
- **CSS vanilla**: Tailwind foi considerado mas equipe optou por CSS variables para controle total
- **PWA**: Habilitado via vite-plugin-pwa. Cuidado com cache ao fazer mudanças estruturais
- **Offline support**: `OfflineBanner.tsx` detecta conectividade. Não quebrar esse fluxo

---

## Code Review Automático

Ao abrir PRs neste repositório:

1. GitHub Actions roda `npx impeccable detect` na pasta `frontend/src/`
2. Claude Code Review analisa diffs automaticamente
3. Findings críticos bloqueiam merge; nits são sugestões
4. Ver `REVIEW.md` para regras detalhadas de revisão

---

## Contato e Recursos

- Repo: `ronaldofilardo/tennis-app`
- Branch padrão: `main`
- Branch atual de features: `feature/v2`
- Docs UX: `.github/prompts/ui-ux-pro-max/PROMPT.md`
- Auditoria design: `scripts/audit-ux.mjs`
