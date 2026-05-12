---
name: impeccable
description: >
  Framework de design de 18 comandos que previne "AI slop" visual. Use para
  auditoria visual completa, detecção de anti-patterns e steering preciso do
  design. Ativa com /impeccable teach (setup), /audit (diagnóstico) ou qualquer
  um dos 18 comandos.
---

# Impeccable Design Framework

> "Great design prompts require design vocabulary. Most people don't have it.
> Impeccable teaches your AI deep design knowledge and gives you 18 commands
> to steer the result." — Paul Bakaus

---

## Setup do Projeto

**Primeiro uso:** Execute `/impeccable teach` para criar `.impeccable.md` com o contexto de design do projeto (audiência, personalidade, tom, restrições).

Todos os comandos se beneficiam do `.impeccable.md` gerado.

---

## Os 18 Comandos

### CRIAR

| Comando             | Descrição                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/shape`            | Discovery interview estruturada → brief de design → implementação. Use antes de criar qualquer nova feature. |
| `/impeccable craft` | Encadeia brief → implementação completa. Para features inteiras, do início.                                  |
| `/impeccable`       | Ponto de entrada geral do framework.                                                                         |

### AVALIAR

| Comando     | Descrição                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `/critique` | Sub-agentes de persona revisam em paralelo contra Heurísticas de Nielsen. Roda detector automaticamente. Abre overlay visual. |
| `/audit`    | Diagnóstico completo de design: tipografia, cor, espaçamento, responsividade, motion, acessibilidade.                         |

### REFINAR

| Comando      | Descrição                                                                  |
| ------------ | -------------------------------------------------------------------------- |
| `/typeset`   | Corrige hierarquia tipográfica, escala, ritmo, escolha de fonte.           |
| `/layout`    | Melhora grid, composição, proporções, uso do espaço.                       |
| `/colorize`  | Refina sistema de cores, contraste, consistência, tema.                    |
| `/animate`   | Adiciona/refina micro-interações e transições com propósito.               |
| `/delight`   | Adiciona detalhes que fazem usuários sorrir (easter eggs, feedback sutil). |
| `/bolder`    | Aumenta impacto visual — mais contraste, hierarquia, presença.             |
| `/quieter`   | Reduz ruído visual — mais whitespace, menos elementos competindo.          |
| `/overdrive` | Maximiza expressão de design — para uso em landing pages, marketing.       |

### SIMPLIFICAR

| Comando    | Descrição                                                          |
| ---------- | ------------------------------------------------------------------ |
| `/distill` | Remove complexidade desnecessária. Menos é mais.                   |
| `/clarify` | Melhora UX writing: labels, CTAs, mensagens de erro.               |
| `/adapt`   | Adapta design para diferentes contextos: mobile, dark mode, print. |

### ENDURECER

| Comando     | Descrição                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `/polish`   | Pass final de qualidade: alinhamento, espaçamento, consistência, micro-detalhes. Use antes de shipar. |
| `/optimize` | Performance: bundle size, animações custosas, paint areas.                                            |
| `/harden`   | Produção: empty states, first-run UX, edge cases, estados de erro.                                    |

---

## As 7 Dimensões de Design

O skill tem conhecimento profundo em:

### 1. Tipografia (33 regras)

- Escala, ritmo, hierarquia, expressão
- Anti-patterns: Inter/Roboto em todo lugar, hierarquia plana, escala sem contraste suficiente

### 2. Cor & Contraste (29 regras)

- Acessibilidade (WCAG AA = 4.5:1, AAA = 7:1), sistemas de cor, theming
- Anti-patterns: gradiente roxo, baixo contraste, ausência de sistema coeso

### 3. Layout Espacial (27 regras)

- Grid, espaçamento, composição, proporções áureas
- Anti-patterns: cards dentro de cards ("cardocalypse"), templates genéricos

### 4. Responsividade (23 regras)

- Layouts fluidos, touch targets (mínimo 44x44px), breakpoints
- Anti-patterns: tamanhos fixos em px, ignorar orientação landscape

### 5. Interação (36 regras)

- Estados (hover, focus, active, disabled), feedback, affordances
- Anti-patterns: sem hover states, estados loading ausentes, sem feedback de ação

### 6. Motion (32 regras)

- Micro-interações, transições, animações com propósito
- Anti-patterns: `transition: all`, `ease-in`, `scale(0)`, duração > 300ms

### 7. UX Writing (32 regras)

- Clareza, voz, mensagens de erro construtivas
- Anti-patterns: lorem ipsum em produção, erros genéricos, jargão técnico

---

## 25 Anti-Patterns Detectados Automaticamente

**Tipografia:**

- Inter/Roboto/Arial/Open Sans como fonte única sem variação
- Tipografia monospace como atalho para "vibes técnicas"
- Ícones grandes com cantos arredondados acima de cada heading
- Hierarquia tipográfica plana (menos de 1.25x entre níveis)
- Corpo extenso em MAIÚSCULAS

**Cor & Contraste:**

- Gradiente roxo em hero/banner
- Texto com contraste insuficiente (< 4.5:1)
- Cards com borda accent espessa no lado esquerdo (side-tab cards)

**Layout:**

- Cards dentro de cards (cardocalypse)
- Templates genéricos de layout (grid 3 colunas padrão)
- Espaçamentos inconsistentes

**Motion:**

- `transition: all` — nunca
- `ease-in` em elementos de UI
- Animações iniciadas por teclado
- Duração > 300ms em UI frequente

**Interação:**

- Ausência de estado `:active` em botões
- Hover states ativam em touch devices
- Sem `prefers-reduced-motion`

**Qualidade:**

- Lorem ipsum em código de produção
- Erros genéricos sem ação construtiva
- Foco não visível (falha de acessibilidade)

---

## Detecção via CLI

```bash
# Detectar anti-patterns em código local
npx impeccable detect frontend/src/

# Modo rápido (regex, sem LLM)
npx impeccable detect frontend/src/ --fast

# Output JSON para CI/CD
npx impeccable detect frontend/src/ --json > audit-results.json

# Live overlay no browser
npx impeccable live
```

---

## Checklist /polish (Pré-Entrega)

Use antes de cada PR que afeta UI:

- [ ] Hierarquia tipográfica clara (≥1.25x entre níveis)
- [ ] Contraste WCAG AA em todos os textos (4.5:1 para corpo, 3:1 para large)
- [ ] Touch targets ≥ 44x44px em mobile
- [ ] Espaçamentos consistentes (múltiplos de 4px ou token do sistema)
- [ ] Transições apenas em `transform` e `opacity` (não `all`)
- [ ] `prefers-reduced-motion` respeitado
- [ ] Estados: loading, erro, vazio, sucesso implementados
- [ ] Foco visível para navegação por teclado
- [ ] Sem lorem ipsum em produção
- [ ] Sem cores hardcoded (usar tokens CSS)

---

## Integração com Este Projeto (Racket)

O projeto usa:

- **CSS vanilla** com design tokens em `src/index.css`
- **Dark sport theme** — fundo escuro (#0f1117), accent verde (#22c55e)
- **Responsividade mobile-first** com breakpoints em 375/768/1024/1440px
- **Inter como fonte** (exceção permitida neste projeto — mas variar peso/tamanho para hierarquia)

Anti-patterns prioritários para Racket:

1. Transições com `transition: all` em componentes (ex: `BottomTabBar.css`)
2. Ausência de `transform: scale(0.97)` em botões de ação (FAB, BottomTabBar)
3. Animações sem `prefers-reduced-motion` guard
4. Hover effects sem `@media (hover: hover) and (pointer: fine)`
5. Stagger ausente em listas de cards (DashboardMatchCard, etc.)
