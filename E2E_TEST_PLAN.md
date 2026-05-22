# E2E Test Plan — Abandoned Annotation Resumption

## Pré-requisitos

- Dev server rodando: `npm run dev` (porta 3001 backend, 5173 frontend)
- Browser aberto em `http://localhost:5173`
- Usuário autenticado como jogador/anotador

---

## Scenario A: Partial Set Mid-Play (3-2) → Resume

**Setup:**

1. Iniciar nova partida
2. Anotar pontos até atingir 3-2 no Set 1 (parcial, não completo)
3. Abandonar sessão (fechar abas/browser)

**Expected Behavior:**

- ✅ Modal pré-carrega com 3-2
- ✅ Confirmar → continua em 3-2 (NÃO avança para Set 2)
- ✅ Próximo ponto muda de 3-2 para 4-2, 3-3, etc.

**Verificação:**

- [ ] Modal mostra "Set 1" com inputs 3 e 2
- [ ] Após confirmar, currentSet continua 1
- [ ] Placar exibe "3-2 (Set 1)"

---

## Scenario B: Multiple Sets (6-4 + 3-2 Partial)

**Setup:**

1. Iniciar partida
2. Completar Set 1 com 6-4 (COMPLETO)
3. Iniciar Set 2 e anotar até 3-2 (PARCIAL)
4. Abandonar sessão

**Expected Behavior:**

- ✅ Modal pré-carrega com Set 1 6-4 (display apenas) + Set 2 3-2 (inputs editable)
- ✅ Confirmar → continua em Set 2 @ 3-2
- ✅ currentSetNumber = 2 (não 1)

**Verificação:**

- [ ] Modal mostra Set 1 como "6-4 ✓" (read-only badge)
- [ ] Set 2 inputs mostram 3-2 (editable)
- [ ] Após confirmar, currentSet = 2
- [ ] Placar exibe "Set 1: 6-4 | Set 2: 3-2"

---

## Scenario C: Empty Modal Submission (Guard Prevention)

**Setup:**

1. Qualquer partida em andamento
2. Abrir modal de retomada
3. Clicar em "Confirmar" SEM preencher scores

**Expected Behavior:**

- ✅ Guard `if (setResults.length === 0) return;` previne ação
- ✅ Modal permanece aberto (nenhum estado alterado)
- ✅ Placar não muda

**Verificação:**

- [ ] Modal não fecha
- [ ] Placar não altera
- [ ] Nenhum erro em console

---

## Scenario D: Backend Snapshot Preservation (Advanced)

**Setup:**

1. Abandonar partida com estado parcial
2. Retomar sessão (frontend resume)
3. Confirmar scores no modal
4. Verificar que backend manteve snapshot até confirmação

**Expected Behavior:**

- ✅ PATCH `/api/matches/:id/sessions/:sessionId` preserva `matchStateSnapshot`
- ✅ Snapshot só é limpo APÓS COMPLETED status
- ✅ Rollback seguro se frontend falhar

**Verificação:**

- [ ] DevTools → Network → Session reactivation call
- [ ] Response inclui `matchStateSnapshot` (não nulo)
- [ ] Confirmar scores → backend atualiza estado

---

## Debug Checklist

Ao encontrar problema, verificar:

1. **Snapshot não carregando?**
   - Console: `[useDashboardData] Fetching suspended sessions...`
   - DB check: `SELECT matchStateSnapshot FROM matches WHERE id = '...'`

2. **Modal mostra scores errados?**
   - Check `EditScoreModal.tsx` line 80-95 (pre-load effect)
   - Verify `currentSets` prop value

3. **Set number não incrementa?**
   - Check `usePointHandlers.ts` line ~254: `const currentSetNumber = completedSets.length + 1;`
   - Verify `completedSets` array length

4. **Scores hardcoded como 6-0?**
   - Check `usePointHandlers.ts` line ~245: Using `set.p1Games` and `set.p2Games`

---

## Test Completion Criteria

- ✅ All 4 scenarios pass
- ✅ No console errors
- ✅ No data loss on resume
- ✅ Backend snapshot preserved/restored correctly
- ✅ State machine respects partial vs complete sets
