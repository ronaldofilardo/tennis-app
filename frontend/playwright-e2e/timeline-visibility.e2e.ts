import { test, expect } from '@playwright/test';

/**
 * Teste E2E para validar que botão "Ver timeline" aparece nos cards de partida
 * Cenários cobertos:
 * - Botão visível quando há anotações completadas
 * - Navegação para página de timeline funciona
 */
test.describe('Timeline Visibility — E2E', () => {
  test('deve mostrar botão "Ver timeline" em AnnotatedMatchCard com dados', async ({ page }) => {
    // Setup: Mock dos endpoints de Dashboard
    await page.goto('/');

    // Mock de autenticação
    await page.route('**/api/auth/session', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-123',
            email: 'player@example.com',
            name: 'Test Player',
            role: 'PLAYER',
          },
        }),
      });
    });

    // Mock de matches anotados para o player
    await page.route('**/api/matches/annotated-for-me', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'match-001',
            sportType: 'TENNIS',
            format: 'Singles',
            courtType: 'Hard',
            playerP1: 'João Silva',
            playerP2: 'Pedro Costa',
            scheduledAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'COMPLETED',
            player1: { id: 'p1-id', name: 'João Silva' },
            player2: { id: 'p2-id', name: 'Pedro Costa' },
            club: { id: 'club-1', name: 'Clube Teste' },
            completedAnnotations: [
              {
                id: 'annotation-001',
                annotatorId: 'annotator-1',
                annotatorName: 'Coach Teste',
                endedAt: new Date().toISOString(),
                hasFinalState: true,
              },
            ],
            comparisonAvailable: false,
            myShare: null,
            isNew: false,
          },
        ]),
      });
    });

    // Mock de matches anotados por mim (annotator view)
    await page.route('**/api/matches/annotated-by-me', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'match-002',
            sportType: 'TENNIS',
            format: 'Doubles',
            courtType: 'Clay',
            playerP1: 'Alice Martins',
            playerP2: 'Bruno Lima',
            scheduledAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'COMPLETED',
            player1: { id: 'p3-id', name: 'Alice Martins' },
            player2: { id: 'p4-id', name: 'Bruno Lima' },
            club: { id: 'club-2', name: 'Clube Centro' },
            mySession: {
              id: 'session-001',
              endedAt: new Date().toISOString(),
              hasFinalState: true,
              finalStateSnapshot: JSON.stringify({ pointsHistory: [] }),
              matchStateSnapshot: JSON.stringify({ sets: [] }),
            },
            completedAnnotations: [
              {
                id: 'annotation-002',
                annotatorId: 'user-123',
                annotatorName: 'Test Player',
                endedAt: new Date().toISOString(),
                hasFinalState: true,
              },
            ],
            comparisonAvailable: false,
          },
        ]),
      });
    });

    // Mock de matches completados
    await page.route('**/api/matches/my-completed', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock de sessões suspensas
    await page.route('**/api/matches/suspended-sessions', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock de matches abertos
    await page.route('**/api/matches/open-for-annotation', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Navegar para dashboard
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'load' });

    // Aguardar carregamento de dados
    await page.waitForTimeout(500);

    // Validação 1: Botão "Ver timeline" deve estar visível para player (anotações recebidas)
    const playerTimelineBtn = page.locator('button:has-text("Ver timeline")').first();
    await expect(playerTimelineBtn).toBeVisible({ timeout: 5000 });

    // Validação 2: Verificar se card mostra nome dos jogadores
    await expect(page.locator('text=João Silva vs Pedro Costa')).toBeVisible();

    // Validação 3: Clicar no botão e validar navegação
    await playerTimelineBtn.click();
    await page.waitForNavigation();
    expect(page.url()).toContain('/match-report/');
  });

  test('NÃO deve mostrar botão "Ver timeline" quando sem anotações', async ({ page }) => {
    await page.goto('/');

    // Mock de autenticação
    await page.route('**/api/auth/session', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-456',
            email: 'player2@example.com',
            name: 'Test Player 2',
            role: 'PLAYER',
          },
        }),
      });
    });

    // Mock: sem anotações
    await page.route('**/api/matches/annotated-for-me', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'match-003',
            sportType: 'TENNIS',
            format: 'Singles',
            playerP1: 'Test Player 1',
            playerP2: 'Test Player 2',
            scheduledAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'COMPLETED',
            player1: { id: 'p5-id', name: 'Test Player 1' },
            player2: { id: 'p6-id', name: 'Test Player 2' },
            club: null,
            completedAnnotations: [],
            comparisonAvailable: false,
            myShare: null,
            isNew: false,
          },
        ]),
      });
    });

    // Mocks de outros endpoints
    await page.route('**/api/matches/annotated-by-me', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/matches/my-completed', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/matches/suspended-sessions', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/matches/open-for-annotation', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('http://localhost:5173/dashboard');
    await page.waitForTimeout(500);

    // Validação: botão "Ver timeline" NÃO deve estar visível
    const timelineBtn = page.locator('button:has-text("Ver timeline")');
    await expect(timelineBtn).not.toBeVisible();

    // Mas deve haver botão "Sem dados"
    const noDataBtn = page.locator('button:has-text("Sem dados")');
    await expect(noDataBtn).toBeVisible();
  });
});
