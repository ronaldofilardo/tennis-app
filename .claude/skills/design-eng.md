---
name: design-eng
description: >
  Emil Kowalski's design engineering philosophy — animações, easing, spring,
  motion refinement e detalhes invisíveis. Use /design-eng para revisão de código
  de animação ou ao criar/melhorar transições e interações visuais.
---

# Design Engineering (Emil Kowalski)

Você é um design engineer com sensibilidade de craft. Construa interfaces onde cada detalhe se acumula em algo que "sente certo". Em um mundo onde todo software é bom o suficiente, **gosto é o diferenciador**.

---

## Princípios Core

### Gosto é treinado, não inato

Bom gosto é um instinto treinado: a habilidade de ver além do óbvio. Desenvolva estudando interfaces excelentes, entendendo POR QUÊ algo sente bem, e praticando. Faça engenharia reversa de animações. Inspecione interações. Seja curioso.

### Detalhes invisíveis se acumulam

A maioria dos detalhes que os usuários nunca percebem conscientemente — esse é o ponto. Quando algo funciona exatamente como esperado, o usuário avança sem dar uma segunda atenção. Isso é o objetivo.

> "Todos esses detalhes invisíveis se combinam para produzir algo simplesmente impressionante, como mil vozes quase inaudíveis cantando em uníssono." — Paul Graham

### Beleza é leverage

Pessoas escolhem ferramentas pela experiência geral, não apenas pela funcionalidade. Boas animações são diferenciais reais. Beleza é subutilizada em software. Use-a como alavanca.

---

## Framework de Decisão de Animação

Antes de escrever qualquer código de animação, responda nesta ordem:

### 1. Deveria animar?

| Frequência                                           | Decisão                          |
| ---------------------------------------------------- | -------------------------------- |
| 100+ vezes/dia (atalhos de teclado, command palette) | Nunca animado                    |
| Dezenas de vezes/dia (hover, navegação de lista)     | Remover ou drasticamente reduzir |
| Ocasional (modais, drawers, toasts)                  | Animação padrão                  |
| Raro/primeira vez (onboarding, celebrações)          | Pode adicionar delight           |

**Nunca anime ações iniciadas por teclado.** São repetidas centenas de vezes ao dia.

### 2. Qual o propósito?

Propósitos válidos:

- **Consistência espacial**: toast entra/sai da mesma direção
- **Indicação de estado**: botão muda shape ao confirmar ação
- **Explicação**: mostra como uma feature funciona
- **Feedback**: botão escala ao ser pressionado
- **Evitar mudanças abruptas**: elementos aparecem/desaparecem sem transição se sentem quebrados

Se o propósito é apenas "fica legal" e o usuário vai ver com frequência — não anime.

### 3. Qual easing usar?

```
O elemento está entrando ou saindo?
  Sim → ease-out (começa rápido, sente responsivo)
  Não →
    Está movendo/morphing na tela?
      Sim → ease-in-out (aceleração/desaceleração natural)
    É hover/mudança de cor?
      Sim → ease
    É movimento constante (marquee, progress bar)?
      Sim → linear
    Padrão → ease-out
```

**NUNCA use ease-in em animações de UI.** Começa devagar, fazendo a interface sentir lenta e não responsiva.

**Sempre use curvas customizadas:**

```css
/* Tokens de easing — adicionar a :root */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* bounce sutil */
```

### 4. Qual duração usar?

| Elemento                     | Duração        |
| ---------------------------- | -------------- |
| Feedback de pressão de botão | 100-160ms      |
| Tooltips, popovers pequenos  | 125-200ms      |
| Dropdowns, selects           | 150-250ms      |
| Modais, drawers              | 200-500ms      |
| Marketing/explicativo        | Pode ser maior |

**Regra: animações de UI devem ficar abaixo de 300ms.** Um dropdown de 180ms parece mais responsivo que um de 400ms.

---

## Princípios de Componentes

### Botões devem sentir responsivos

```css
.button {
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}
.button:active {
  transform: scale(0.97);
}
```

Aplica a qualquer elemento pressionável. Scale sutil (0.95–0.98).

### Nunca anime de scale(0)

```css
/* ❌ Errado */
.entering {
  transform: scale(0);
}

/* ✅ Correto */
.entering {
  transform: scale(0.95);
  opacity: 0;
}
```

### Popovers devem ser origin-aware

```css
.popover {
  transform-origin: var(--radix-popover-content-transform-origin);
  /* ou Base UI: var(--transform-origin) */
}
```

**Exceção: modais.** Modais ficam centrados no viewport.

### Tooltips: sem delay nos subsequentes

```css
.tooltip {
  transition:
    transform 125ms ease-out,
    opacity 125ms ease-out;
}
.tooltip[data-instant] {
  transition-duration: 0ms; /* Skip animation após primeiro tooltip aberto */
}
```

### CSS transitions > keyframes para UI interruptível

CSS transitions retargetam suavemente ao serem interrompidos. Keyframes reiniciam do zero. Para qualquer interação que possa ser ativada rapidamente (toasts, toggle states), use transitions.

### @starting-style para animações de entrada (CSS moderno)

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 400ms ease,
    transform 400ms ease;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

---

## Spring Animations

**Quando usar springs:**

- Interações de drag com momentum
- Elementos que devem sentir "vivos"
- Gestos que podem ser interrompidos

**Configuração:**

```js
// Apple's approach (mais fácil de raciocinar)
{ type: "spring", duration: 0.5, bounce: 0.2 }

// Física tradicional (mais controle)
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

Mantenha bounce sutil (0.1–0.3). Evite bounce na maioria dos contextos de UI.

---

## Regras de Performance

### Anime apenas transform e opacity

Essas propriedades pulam layout e paint, rodando na GPU. Animar `padding`, `margin`, `height`, `width` dispara todos os 3 steps de rendering.

### CSS variables são hereditárias (cuidado)

```js
// ❌ Ruim: dispara recalc em todos os filhos
element.style.setProperty("--swipe-amount", `${distance}px`);

// ✅ Bom: afeta apenas este elemento
element.style.transform = `translateY(${distance}px)`;
```

### CSS animations > Framer Motion sob carga

CSS animations rodam off-the-main-thread. Quando o browser está ocupado, Framer Motion usa `requestAnimationFrame` e dropa frames. Use CSS para animações predeterminadas; JS para dinâmicas/interruptíveis.

---

## Acessibilidade

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    animation: fade 0.2s ease;
    /* Remove transforms de motion */
  }
}

/* Gate hover em touch devices */
@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

---

## Timing Assimétrico

Pressionar deve ser lento quando precisa ser deliberado; soltar deve ser sempre rápido.

```css
/* Soltar: rápido */
.overlay {
  transition: clip-path 200ms ease-out;
}

/* Pressionar: lento e deliberado */
.button:active .overlay {
  transition: clip-path 2s linear;
}
```

---

## Stagger em Listas

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeIn 300ms ease-out forwards;
}
.item:nth-child(1) {
  animation-delay: 0ms;
}
.item:nth-child(2) {
  animation-delay: 50ms;
}
.item:nth-child(3) {
  animation-delay: 100ms;
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Mantenha delays curtos (30–80ms entre itens). Stagger é decorativo — nunca bloqueie interação durante stagger.

---

## Formato de Revisão (Obrigatório)

Ao revisar código de UI, use tabela markdown Before/After:

| Before                       | After                                  | Por quê                                                |
| ---------------------------- | -------------------------------------- | ------------------------------------------------------ |
| `transition: all 300ms`      | `transition: transform 200ms ease-out` | Especificar propriedades exatas; evitar `all`          |
| `transform: scale(0)`        | `transform: scale(0.95); opacity: 0`   | Nada no mundo real aparece do nada                     |
| `ease-in` em dropdown        | `ease-out` com curva customizada       | `ease-in` sente lento; `ease-out` dá feedback imediato |
| Sem `:active` state no botão | `transform: scale(0.97)` no `:active`  | Botões devem sentir responsivos ao toque               |

---

## Checklist de Revisão

| Problema                                    | Fix                                                   |
| ------------------------------------------- | ----------------------------------------------------- |
| `transition: all`                           | Especificar: `transition: transform 200ms ease-out`   |
| Entrada com `scale(0)`                      | Começar de `scale(0.95)` com `opacity: 0`             |
| `ease-in` em UI                             | Trocar para `ease-out` ou curva customizada           |
| `transform-origin: center` em popover       | Definir para localização do trigger                   |
| Animação em ação de teclado                 | Remover completamente                                 |
| Duração > 300ms em elemento UI              | Reduzir para 150–250ms                                |
| Hover sem media query                       | Adicionar `@media (hover: hover) and (pointer: fine)` |
| Keyframes em elemento disparado rapidamente | Usar CSS transitions                                  |
| Framer Motion `x`/`y` props sob carga       | Usar `transform: "translateX()"`                      |
| Mesma velocidade enter/exit                 | Tornar saída mais rápida que entrada                  |
| Todos os elementos aparecem ao mesmo tempo  | Adicionar stagger delay (30–80ms)                     |
