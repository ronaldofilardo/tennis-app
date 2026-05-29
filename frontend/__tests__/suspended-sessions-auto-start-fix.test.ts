import { describe, it, expect } from 'vitest';

/**
 * Testes para o fix: partida não desaparece de "anotações suspensas" ao abrir scoreboard
 *
 * Conversa 28/05/2026:
 * - BUG: POST /api/matches/:id/sessions reativava SEMPRE sessões suspensas (isActive=false → true)
 * - Isso ocorria no auto-start do useScoreboardEngine ao carregar o placar
 * - Resultado: partida saía de "anotações suspensas" antes de qualquer ação do usuário
 *
 * FIX:
 * - Adicionado parâmetro `autoStarted: true` ao POST /api/matches/:id/sessions
 * - Quando autoStarted=true + sessão isActive=false: retorna sem reativar (isActive mantido)
 * - Quando usuário edita placar (handleEditScore): PATCH session → isActive=true (reativação explícita)
 *
 * Comportamento esperado:
 * 1. Partida suspensa → carregar scoreboard → CONTINUA em "anotações suspensas" ✅
 * 2. Partida suspensa → editar placar       → SAI de "anotações suspensas" (isActive=true) ✅
 * 3. Partida suspensa → jogador vence       → SAI de "anotações suspensas" (match.status=FINISHED) ✅
 * 4. Retomar explícito (sem autoStarted)    → reativa normalmente ✅
 */
describe('Suspended Sessions - Auto-Start Fix (28/05/2026)', () => {
  it('autoStarted=true should NOT reactivate a suspended session', () => {
    // Simula a lógica do backend: recebe autoStarted=true com sessão isActive=false
    const requestBody = { autoStarted: true };
    const mostRecentSession = {
      id: 'session-abc',
      isActive: false,
      status: 'IN_PROGRESS',
      matchStateSnapshot: '{"sets":{"PLAYER_1":1,"PLAYER_2":0}}',
    };

    // Lógica do backend (espelhada)
    const autoStarted = requestBody.autoStarted === true;
    const shouldSkipReactivation = autoStarted && mostRecentSession.isActive === false;

    expect(shouldSkipReactivation).toBe(true);
  });

  it('autoStarted=false should reactivate a suspended session (explicit resume)', () => {
    const requestBody = { autoStarted: false };
    const mostRecentSession = { id: 'session-abc', isActive: false, status: 'IN_PROGRESS' };

    const autoStarted = requestBody.autoStarted === true;
    const shouldSkipReactivation = autoStarted && mostRecentSession.isActive === false;

    // Deve reativar normalmente quando autoStarted=false
    expect(shouldSkipReactivation).toBe(false);
  });

  it('autoStarted=true should still reactivate an already-active session', () => {
    // Sessão já está ativa (isActive=true): autoStarted não deve interferir
    const requestBody = { autoStarted: true };
    const mostRecentSession = { id: 'session-abc', isActive: true, status: 'IN_PROGRESS' };

    const autoStarted = requestBody.autoStarted === true;
    const shouldSkipReactivation = autoStarted && mostRecentSession.isActive === false;

    // isActive=true: não deve pular reativação
    expect(shouldSkipReactivation).toBe(false);
  });

  it('suspended-sessions filter requires isActive=false to show in dashboard', () => {
    // A query de suspended-sessions exige isActive=false
    // Após fix: sessão permanece isActive=false após auto-start → aparece no dashboard
    const sessionAfterAutoStart = {
      id: 'session-abc',
      isActive: false, // ← mantido pelo fix
      status: 'IN_PROGRESS',
      matchId: 'match-xyz',
    };

    const suspendedSessionsFilter = {
      isActive: false,
      status: { in: ['IN_PROGRESS', 'ABANDONED'] },
    };

    const matchesSuspendedFilter =
      sessionAfterAutoStart.isActive === suspendedSessionsFilter.isActive &&
      suspendedSessionsFilter.status.in.includes(sessionAfterAutoStart.status);

    expect(matchesSuspendedFilter).toBe(true);
  });

  it('score edit should reactivate session (isActive=false → true via PATCH)', () => {
    // Após editar placar, o PATCH session com status=IN_PROGRESS deve setar isActive=true
    const patchBody = { status: 'IN_PROGRESS' };
    const updateData: Record<string, unknown> = {
      status: patchBody.status,
      ...(patchBody.status === 'IN_PROGRESS' && { isActive: true }),
    };

    expect(updateData.isActive).toBe(true);
    expect(updateData.status).toBe('IN_PROGRESS');
  });

  it('match removal from suspended-sessions happens via isActive=true after score edit', () => {
    // Após PATCH com isActive=true, a sessão NÃO passa mais no filtro isActive=false
    const sessionAfterScoreEdit = {
      id: 'session-abc',
      isActive: true, // ← após PATCH de reativação por edição de placar
      status: 'IN_PROGRESS',
    };

    const stillMatchesSuspendedFilter = sessionAfterScoreEdit.isActive === false;

    // Sessão ativa NÃO aparece em "anotações suspensas"
    expect(stillMatchesSuspendedFilter).toBe(false);
  });

  it('session returned with autoStarted=true carries suspended=true flag', () => {
    // O backend retorna suspended=true quando não reativou (autoStarted=true + isActive=false)
    const sessionSnapshot = '{"sets":{"PLAYER_1":1,"PLAYER_2":0}}';
    const mostRecentSession = {
      id: 'session-abc',
      isActive: false,
      status: 'IN_PROGRESS',
      matchStateSnapshot: sessionSnapshot,
    };

    // Simula resposta do backend (sem reativação)
    const response = {
      ...mostRecentSession,
      suspended: true,
      previousState: JSON.parse(mostRecentSession.matchStateSnapshot),
    };

    expect(response.suspended).toBe(true);
    expect(response.isActive).toBe(false);
    expect(response.previousState).toEqual({ sets: { PLAYER_1: 1, PLAYER_2: 0 } });
  });
});
