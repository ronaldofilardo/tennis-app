# REVIEW.md — Instruções de Code Review Automático (Claude)

> Este arquivo é lido automaticamente pelo Claude Code Review ao revisar PRs.
> Instruções aqui têm **precedência máxima** sobre outras configurações.
> Referência: https://code.claude.com/docs/en/code-review

---

## Contexto do Projeto

**Racket Tennis App** — PWA de tênis (scores ao vivo, rankings, anotação de partidas).

- Stack: Vite 5 + React 18 + TypeScript strict + CSS vanilla
- Sem Tailwind — usar sempre `var(--clr-*)` de `frontend/src/index.css`
- Client-side only (Vite, não Next.js)
- Mobile-first, dark theme hardcoded

---

## Severidades

| Nível        | Símbolo | Quando usar                                                                                                                                 |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Important    | 🔴      | Bugs que quebram funcionalidade, regressões de UX severas, violações críticas de acessibilidade, hardcode de cores, `any` sem justificativa |
| Nit          | 🟡      | Oportunidades de melhoria: easing, timing, estilo de código, melhorias menores de UX                                                        |
| Pre-existing | 🟣      | Bugs já presentes antes desta PR                                                                                                            |

---

## O que DEVE ser reportado (Important)

1. **Cores hardcoded** no CSS — sempre usar `var(--clr-*)` de `src/index.css`
2. **`transition: all`** — causa jank em Safari/mobile
3. **`any` sem comentário** — violação do TypeScript strict mode
4. **Estado React mutado diretamente** — `.push()`, `.splice()` em state
5. **Componentes sem tipos de prop** — violação TypeScript
6. **Remoção de tokens existentes** em `src/index.css`
7. **Quebra de `OfflineBanner`** ou fluxo de conectividade offline
8. **Ausência de `safe-area-inset-*`** em elementos fixed/sticky no mobile
9. **Remoção de testes** que cobrem fluxo crítico (scoring, auth)
10. **Falha em testes existentes** introduzida pela PR

---

## O que reportar como Nit (máximo 5 por PR)

1. `ease-in` em animações de UI (sugestão: `ease-out` ou curva customizada)
2. Duração de animação > 300ms em UI de uso frequente
3. Ausência de `prefers-reduced-motion` em arquivo com animações
4. Hover effects sem `@media (hover: hover) and (pointer: fine)`
5. Ausência de `:active` com scale em botões/elementos clicáveis
6. `scale(0)` como ponto de entrada de animação (usar `scale(0.95)`)
7. Imports não utilizados
8. Default exports em módulos compartilhados
9. Valores em `px` que deveriam ser `rem` ou `clamp()`

---

## O que NÃO reportar (ignorar completamente)

- Typos em comentários de código
- Mudanças apenas de whitespace, indentação ou formatting
- Arquivos `*.sql` (scripts de debug/manutenção)
- Arquivos `pnpm-lock.yaml`
- Arquivos em `coverage/`, `playwright-report/`, `test-results/`
- Arquivos em `scripts/` com extensão `.cjs`
- Arquivos `*.config.ts` que apenas ajustam paths ou aliases
- Mudanças em `.gitignore`
- Traduções ou mudanças em arquivos de i18n

---

## Componentes de Alta Atenção

Ao encontrar mudanças nestes arquivos, aplicar revisão mais rigorosa:

| Arquivo                         | Por quê                                              |
| ------------------------------- | ---------------------------------------------------- |
| `BottomTabBar.tsx/.css`         | Navegação principal mobile — afeta toda UX           |
| `LiveMatchesCarousel.tsx/.css`  | Performance crítica, dados em tempo real             |
| `Toast.tsx/.css`                | Transitions devem ser interruptíveis (não keyframes) |
| `FloatingActionButton.tsx/.css` | Feedback tátil obrigatório                           |
| `scoreboard/**`                 | Legibilidade em campo, dados críticos de jogo        |
| `frontend/src/index.css`        | Fonte única de design tokens — mudanças afetam tudo  |

---

## Regras de Negócio Críticas (não quebrar)

- Score de tênis segue formato padrão (0, 15, 30, 40, vantagem, deuce)
- Partidas ao vivo não podem perder dados por re-render
- Offline mode: app deve funcionar sem conectividade para scoring
- PWA: manifest e service worker não devem ser removidos

---

## Volume e Tom

- Máximo **5 nits** por PR para não sobrecarregar o autor
- Agrupar nits similares em 1 comentário quando possível
- Tom construtivo — sugerir a correção, não apenas apontar o problema
- Findings Important: incluir exemplo de código do fix quando possível
- Para mudanças complexas de animação, referenciar `.claude/skills/design-eng.md`

---

## Para ativar Claude Code Review

1. Admin do repositório habilita em: `Settings → Code Review → Claude`
2. Após habilitado, Claude revisa automaticamente cada PR
3. Para revisar manualmente: comentar `@claude review` na PR
4. Para revisar apenas uma vez (sem se inscrever): `@claude review once`
5. Custo estimado: $15–25 por review (billed via Anthropic usage)
