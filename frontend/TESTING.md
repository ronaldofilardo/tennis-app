# Convenções de Testes — Racket Frontend

## Localização de Arquivos de Teste

### Regra Geral: Colocalização

Testes devem ficar **ao lado do arquivo que testam**, com o sufixo `.test.ts(x)`.

```
src/
├── core/scoring/
│   ├── TennisScoring.ts
│   ├── TennisScoring.test.ts          ✅ Colocalizados
│   ├── TennisScoring.advanced.test.ts ✅ Variantes com sufixo descritivo
│   └── pointFlowRules.test.ts         ✅
├── contexts/
│   ├── AuthContext.tsx
│   └── AuthContext.test.tsx            ✅
├── hooks/
│   ├── useMatchSync.ts
│   └── useMatchSync.test.ts           ✅
```

### Exceções: pasta `__tests__/`

Use `__tests__/` **somente** para:

- Testes de integração que envolvem múltiplos módulos
- Test utilities e factories compartilhadas
- Testes que não pertencem a um único arquivo fonte

```
src/__tests__/
├── integration.test.jsx       # Testes de integração cross-module
├── regression.test.jsx        # Testes de regressão
├── factories.ts               # Factories para dados de teste
└── test-utils.ts              # Helpers compartilhados
```

## Nomenclatura

| Tipo       | Padrão                             | Exemplo                          |
| ---------- | ---------------------------------- | -------------------------------- |
| Unitário   | `NomeDoModulo.test.ts(x)`          | `TennisScoring.test.ts`          |
| Variante   | `NomeDoModulo.variante.test.ts(x)` | `TennisScoring.advanced.test.ts` |
| Integração | Descritivo em `__tests__/`         | `__tests__/integration.test.jsx` |
| E2E        | Na pasta `e2e/` com `.spec.ts`     | `e2e/auth.spec.ts`               |

## Estrutura Interna (AAA)

```typescript
describe('TennisScoring', () => {
  describe('scorePoint', () => {
    it('deve avançar o placar de 0-0 para 15-0 quando Player 1 marca', () => {
      // Arrange
      const scoring = new TennisScoring('PLAYER_1', 'BEST_OF_3');

      // Act
      scoring.scorePoint('PLAYER_1');

      // Assert
      expect(scoring.getState().currentGame.points.PLAYER_1).toBe('15');
    });
  });
});
```

## Mocks

- Mocks globais ficam em `src/__mocks__/`
- Mocks específicos de teste ficam no próprio arquivo de teste
- Use `vi.mock()` para mock de módulos
- Use `vi.fn()` para mock de funções individuais

## Rodando Testes

```bash
pnpm test              # Watch mode (dev)
pnpm test:ci           # Execução única com cobertura
pnpm test:coverage     # Relatório detalhado de cobertura
pnpm test:e2e          # Playwright
pnpm test:mutation     # Stryker (testes de mutação)
```
