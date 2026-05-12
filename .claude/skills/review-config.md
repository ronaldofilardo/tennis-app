---
name: review-config
description: >
  Configuração de Code Review automático do Claude para PRs neste repositório.
  Define severidades, regras e padrões específicos do Racket para revisão.
  Referência interna — ver REVIEW.md na raiz para instruções externas.
---

# Code Review — Configuração Racket

> Este skill define o comportamento do Claude Code Review neste repositório.
> Quando ativo em PRs, Claude analisa diffs contra estas regras.

---

## Severidades

| Nível        | Símbolo | Quando usar                                                                                                          |
| ------------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| Important    | 🔴      | Bugs que quebram funcionalidade, violações críticas de segurança, regressões de UX severas, falhas de acessibilidade |
| Nit          | 🟡      | Melhorias de código, violações de estilo, oportunidades de UX menor, easing/timing de animação                       |
| Pre-existing | 🟣      | Bugs já presentes no código antes desta PR                                                                           |

---

## Regras — TypeScript

**Nível Important:**

- Uso de `any` sem comentário justificando
- `@ts-ignore` sem explicação
- Funções async sem try/catch ou Result type
- Tipos derivados de dados externos sem validação Zod

**Nível Nit:**

- Default exports em módulos compartilhados (preferir named exports)
- `as` cast sem comentário (verificar se justificado)
- Interfaces duplicadas que poderiam ser reutilizadas

---

## Regras — React

**Nível Important:**

- Mutação de estado diretamente (`state.items.push(x)`)
- Componentes definidos dentro de outros componentes
- `useEffect` para sincronizar estado que poderia ser derivado
- Props sem tipagem explícita

**Nível Nit:**

- Objetos/arrays inline em JSX como props (causa re-renders)
- `useMemo` desnecessário sem cálculo custoso
- Ausência de Error Boundary em seções críticas

---

## Regras — UI/UX

**Nível Important:**

- Cores hardcoded (usar tokens `var(--clr-*)` de `src/index.css`)
- Breakpoints sem cobertura mobile (375px mínimo)
- Elementos interativos sem `cursor: pointer`
- Ausência de estados: loading, error, empty
- Contraste < 4.5:1 para texto de corpo
- `transition: all` — causa jank em Safari

**Nível Nit:**

- `ease-in` em animações de UI (usar `ease-out`)
- Duração de animação > 300ms em UI frequente
- Hover effects sem `@media (hover: hover) and (pointer: fine)`
- Ausência de `prefers-reduced-motion` em animações
- Scale(0) como ponto de partida de animação (usar scale(0.95))
- Ausência de `transform: scale(0.97)` em botões clicáveis
- Stagger ausente em listas de 3+ itens

---

## Regras — CSS

**Nível Important:**

- Uso de `!important` sem comentário
- `position: fixed` sem consideração de `env(safe-area-inset-*)`
- Remoção ou alteração de tokens existentes de `src/index.css`

**Nível Nit:**

- Duplicação de valores que já existem como token CSS
- `z-index` arbitrários sem escala documentada
- Valores em px que deveriam ser relativos (rem/em/%)

---

## Regras — Testes

**Nível Important:**

- Testes Vitest ou Playwright que passavam e passaram a falhar
- Novos componentes sem teste unitário mínimo
- Remoção de asserções sem justificativa

**Nível Nit:**

- Testes sem description clara do que validam
- Setup de test com dados hardcoded que poderiam usar factories

---

## Padrões Específicos Racket

**Nunca fazer (Important):**

- Modificar `frontend/src/index.css` design tokens sem PR dedicada
- Quebrar `OfflineBanner` ou fluxo de conectividade
- Alterar comportamento de scoring sem testes de regressão
- Remover safe-area-inset do padding do body

**Atenção especial (Nit):**

- BottomTabBar: mudanças afetam toda a navegação mobile
- LiveMatchesCarousel: componente crítico de performance
- Toast: transitions devem ser interruptíveis (não keyframes)

---

## Skips (Nunca Reportar)

- Typos em comentários de código
- Mudanças apenas de whitespace/formatting
- Mudanças em arquivos `.sql` (scripts de debug)
- Mudanças em `*.config.ts` que apenas ajustam paths
- Mudanças em `pnpm-lock.yaml`
- Arquivos em `coverage/`, `playwright-report/`, `test-results/`
- Arquivos em `scripts/` com extensão `.cjs` (scripts de manutenção)

---

## Volume de Nits

- Máximo 5 nits por PR para não sobrecarregar o autor
- Priorizar nits de UI/UX sobre nits de estilo de código
- Se há mais de 5 nits, agrupar os similares em 1 comentário

---

## Fluxo de Code Review

1. Claude analisa o diff completo da PR
2. Verifica contra regras de TypeScript, React, UI/UX, CSS, Testes
3. Posta comentários inline nos arquivos relevantes
4. Posta resumo no topo da PR com findings agrupados
5. Findings Important bloqueiam merge até resolução
6. Findings Nit são sugestões — autor decide se aplica
