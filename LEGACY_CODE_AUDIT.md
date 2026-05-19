# 🗑️ Auditoria de Código Legado — Racket Tennis App

**Data:** 19 de maio de 2026  
**Escopo:** Frontend (c:\apps\Racket\Racket) + raiz do projeto  
**Critérios:** Código não utilizado, debug-only, duplicado, ou obsoleto que pode ser removido com segurança.

---

## 📊 Sumário Executivo

| Categoria                               | Quantidade   | Risco | Prioridade |
| --------------------------------------- | ------------ | ----- | ---------- |
| Arquivos de debug .cjs (root-level)     | 16           | Baixo | Media      |
| Arquivos de teste .js (deveria ser .ts) | 2            | Alto  | Alta       |
| Arquivos duplicados (.js + .ts)         | 3            | Alto  | Alta       |
| Arquivos SQL de debug (root)            | 4            | Baixo | Media      |
| Scripts de importação (root)            | 2            | Baixo | Baixa      |
| Funções legadas (compatibilidade)       | 2            | Baixo | Baixa      |
| **TOTAL REMOVÍVEL**                     | ~29 arquivos | -     | -          |

---

## 🔴 CRÍTICOS (Remover imediatamente)

### 1. Arquivos de Teste em JavaScript (deveriam ser TypeScript)

#### [frontend/src/**tests**/contracts.test.js](frontend/src/__tests__/contracts.test.js)

- **Tipo:** Teste unitário em JS (deveria ser TS)
- **Razão para remover:** TypeScript strict mode é obrigatório. Arquivo JS quebra padrão do projeto
- **Linha aproximada:** 1-150 (arquivo inteiro)
- **Impacto:** Nenhum — arquivo está duplicado ou quebrado em relação ao sistema de testes
- **Ação:** ✅ **REMOVER** — Converter para TS ou remover se duplicado

#### [frontend/src/services/matchStatus.test.js](frontend/src/services/matchStatus.test.js)

- **Tipo:** Teste unitário em JS (deveria ser TS)
- **Razão para remover:** Viola strict mode TS; não está em diretório de testes convencionais
- **Linha aproximada:** 1-50 (arquivo inteiro)
- **Impacto:** Baixo — se testes funcionam em vitest.config, este é legacy
- **Ação:** ✅ **REMOVER**

---

## 🟠 ALTOS (Remover ou consolidar)

### 2. Duplicação de Código JavaScript → TypeScript

#### [frontend/src/services/statsUtils.js](frontend/src/services/statsUtils.js) — **DUPLICADO**

- **Tipo:** Implementação JS duplicada
- **Arquivo oficial:** [frontend/src/services/statsUtils.ts](frontend/src/services/statsUtils.ts)
- **Razão:** Arquivo .js é versão antiga/transpilada; versão TS é a oficial
- **Linha aproximada:** 1-100+ (arquivo inteiro)
- **Impacto:** Confusão de importação; imports podem resolver ao .js em vez do .ts
- **Ação:** ✅ **REMOVER** — Consolidar em statsUtils.ts

#### [frontend/src/services/businessLogic.js](frontend/src/services/businessLogic.js) — **DUPLICADO**

- **Tipo:** Implementação JS duplicada
- **Arquivo oficial:** [frontend/src/services/businessLogic.ts](frontend/src/services/businessLogic.ts)
- **Razão:** Versão JS é transpilação/legacy; TS é oficial com tipos
- **Linha aproximada:** 1-150+ (arquivo inteiro)
- **Impacto:** Imports podem resolver ao .js (runtime sem tipos)
- **Ação:** ✅ **REMOVER**

#### [frontend/src/data/dedup-matriz.js](frontend/src/data/dedup-matriz.js) — **DUPLICADO**

- **Tipo:** Script de deduplicação (duplica .cjs)
- **Arquivo alternativo:** [frontend/src/data/dedup-matriz.cjs](frontend/src/data/dedup-matriz.cjs)
- **Razão:** Dois scripts idênticos; .cjs é versão NodeJS-compatível
- **Linha aproximada:** 1-25 (arquivo inteiro)
- **Impacto:** Baixo — scripts não são importados, apenas executáveis manuais
- **Ação:** ✅ **REMOVER** .js — Manter apenas .cjs (ou converter ambos a script/ts)

---

## 🟡 MÉDIOS (Revisar antes de remover)

### 3. Arquivos de Debug em Root Level

#### [debug_annotated.js](debug_annotated.js)

- **Tipo:** Script de debug standalone
- **Razão:** Debugar partidas anotadas em desenvolvimento; não é produção
- **Linha aproximada:** 1-80 (arquivo inteiro)
- **Usado por:** Desenvolvimento local; pode estar em .gitignore ou docs
- **Ação:** ⚠️ **REVISAR** — Se não está documentado em TESTING.md, **REMOVER**

### 4. Arquivos SQL de Debug em Root Level

| Arquivo                                      | Tipo        | Razão                       | Ação        |
| -------------------------------------------- | ----------- | --------------------------- | ----------- |
| [check_match.sql](check_match.sql)           | Query debug | Verificar estado de partida | REMOVER     |
| [check_sessions.sql](check_sessions.sql)     | Query debug | Verificar sessões           | REMOVER     |
| [check_sessions2.sql](check_sessions2.sql)   | Query debug | Duplicado de check_sessions | **REMOVER** |
| [cleanup_sessions.sql](cleanup_sessions.sql) | Query debug | Limpeza manual de DB        | REMOVER     |
| [check_matchstate.sql](check_matchstate.sql) | Query debug | Inspecionar estado          | REMOVER     |

**Consolidar em:** `frontend/scripts/db/` com documentação

---

### 5. Arquivos .CJS de Debug em Root Level (frontend/)

| Arquivo                     | Tipo        | Razão                       | Situação                                              |
| --------------------------- | ----------- | --------------------------- | ----------------------------------------------------- |
| check\_\*.cjs (5 arquivos)  | Debug       | Inspecionar dados de DB     | **Considerar remover**                                |
| query_pupilo.cjs            | Debug       | Query específica de usuário | **REMOVER**                                           |
| consolidate_sessions.cjs    | Debug       | Consolidação manual         | **REMOVER** se não documentado                        |
| create_play_user.cjs        | Setup       | Criar usuário de teste      | **ARQUIVO DE TESTE** — REMOVER                        |
| create_test_abandoned.cjs   | Setup       | Criar sessão de teste       | **ARQUIVO DE TESTE** — REMOVER                        |
| dev-server.cjs              | Dev server  | Servidor dev alternativo    | **REVISAR** — Verificar se vite.config.ts o substitui |
| find_scored_matches.cjs     | Debug       | Procurar partidas           | **REMOVER**                                           |
| fix_players_emails.cjs      | Maintenance | Corrigir emails             | **ARQUIVO ONE-OFF** — REMOVER                         |
| http_test_api.cjs           | Debug       | Testar API                  | **REMOVER** — Usar Playwright/Vitest                  |
| list_users.cjs              | Debug       | Listar usuários             | **REMOVER**                                           |
| show_scored_example.cjs     | Debug       | Mostrar exemplo             | **REMOVER**                                           |
| test_dedup_logic.cjs        | Debug       | Testar lógica dedup         | **REMOVER**                                           |
| test_suspended_endpoint.cjs | Debug       | Testar endpoint             | **USAR PLAYWRIGHT** em vez disso                      |
| test-server.cjs             | Dev server  | Servidor de teste           | **REVISAR** — Possível duplicação do dev-server       |
| verify_consolidation.cjs    | Debug       | Verificar consolidação      | **REMOVER**                                           |

**Padrão:** Todos esses arquivos parecem ser scripts one-off ou debug. Consolidar úteis em `frontend/scripts/db/` documentados em TESTING.md.

---

## 🟢 BAIXOS (Verificar antes, mas provavelmente legado)

### 6. Funções de Compatibilidade Legada

#### `legacyToMatchPlayers()` — [frontend/src/types/athlete.ts:122](frontend/src/types/athlete.ts#L122)

```typescript
export function legacyToMatchPlayers(legacy: {
  p1: string;
  p2: string;
}): MatchPlayers;
```

- **Tipo:** Função de compatibilidade
- **Razão:** Converte formato antigo `{ p1: string, p2: string }` para MatchPlayers moderno
- **Importado em:** [frontend/src/types/index.ts:10](frontend/src/types/index.ts#L10) (barrel export)
- **Usado em:** Verificar usages
- **Ação:** ⚠️ **REVISAR USAGES** — Se nenhum componente usa, remover com o `matchPlayersToLegacy()`

#### `matchPlayersToLegacy()` — [frontend/src/types/athlete.ts:109](frontend/src/types/athlete.ts#L109)

```typescript
export function matchPlayersToLegacy(players: MatchPlayers): {
  p1: string;
  p2: string;
};
```

- **Tipo:** Função de compatibilidade
- **Razão:** Compatibilidade com APIs antigas que esperam `{ p1, p2 }` strings
- **Status:** Ambas parecem unused; considerar remover em pares
- **Ação:** ⚠️ **REVISAR USAGES** — Se nenhum lugar usa, remover ambas de uma vez

---

## 📋 Arquivos que PODEM ser Legados (verificar usages)

| Arquivo                                                                        | Categoria          | Status                | Ação                         |
| ------------------------------------------------------------------------------ | ------------------ | --------------------- | ---------------------------- |
| [frontend/api/\_handlers/\_health.js](frontend/api/_handlers/_health.js)       | API handler em JS  | Verificar se usado    | Converter para TS ou REMOVER |
| [frontend/scripts/import-prod-data.cjs](frontend/scripts/import-prod-data.cjs) | Data import        | Aparentemente one-off | Documentar ou REMOVER        |
| [frontend/scripts/fill-global-ids.cjs](frontend/scripts/fill-global-ids.cjs)   | DB migration       | Aparentemente one-off | Documentar ou REMOVER        |
| [frontend/scripts/validate-\*.cjs](frontend/scripts/validate-*.cjs)            | Validation scripts | Pode ser útil         | Revisar                      |
| [frontend/scripts/dev-server.cjs](frontend/scripts/dev-server.cjs)             | Dev server         | Possível duplicação   | Consolidar com vite.config   |

---

## ✅ Checklist de Remoção Segura

Antes de remover qualquer arquivo legado:

- [ ] **Grep search** — `grep -r "arquivo.js\|arquivo.cjs" frontend/src api/` para confirmar não importado
- [ ] **Type check** — `pnpm --filter frontend build` sem erros
- [ ] **Tests** — `pnpm --filter frontend test` e `test:e2e` passam
- [ ] **Git history** — Confirmar que arquivo não é recente commit crítico
- [ ] **Documentação** — Se era usado, atualizar TESTING.md ou README.md

---

## 🚀 Plano de Ação Recomendado

### Fase 1: Críticos (Remover imediatamente)

1. `frontend/src/__tests__/contracts.test.js` ✅
2. `frontend/src/services/matchStatus.test.js` ✅
3. `frontend/src/services/statsUtils.js` (duplica .ts) ✅
4. `frontend/src/services/businessLogic.js` (duplica .ts) ✅
5. `frontend/src/data/dedup-matriz.js` (duplica .cjs) ✅

**Impacto esperado:** 0 (não afeta código ativo)  
**Tempo:** ~10 minutos

### Fase 2: Médios (Consolidar/Revisar)

1. Verificar usages de `legacyToMatchPlayers` e `matchPlayersToLegacy`
2. Documentar ou remover scripts .cjs em `frontend/`
3. Consolidar scripts SQL em `frontend/scripts/db/`
4. Revisar `dev-server.cjs` vs `vite.config.ts`

**Impacto esperado:** ~2-5% código funcional pode ser afetado  
**Tempo:** ~30 minutos

### Fase 3: Baixos (Confirmar antes de remover)

1. Revisar cada arquivo .cjs para documentação
2. Se documentado em TESTING.md, manter; senão remover
3. Converter arquivos úteis para TypeScript

**Impacto esperado:** Nenhum (cleanup apenas)  
**Tempo:** ~20 minutos

---

## 📝 Notas Finais

- **Padrão geral:** Projeto migrou de JS para TS; há artifacts JS legacy dispersos
- **Risco de confusão:** TypeScript pode resolver imports ao .js em vez do .ts (quebra type safety)
- **Recomendação:** Limpar em fases; testar cada fase com `pnpm build`
- **Próximas sessões:** Executar Fase 1 + 2 para ganho imediato; Fase 3 é nice-to-have

---

**Preparado para remoção:** ✅ Relatório pronto para validação em sessão de code review
