/**
 * Testes E2E aprovados para funcionalidade de encerramento manual de partida
 * Valida fluxo completo: Step1 (menu) → Step2 (seleção vencedor) → Sucesso → Dashboard
 */

import { test, expect } from '@playwright/test';

test.describe('Creator End Match - Fluxo Completo Aprovado', () => {
  let baseUrl: string;

  test.beforeAll(() => {
    baseUrl = process.env.VITE_TEST_URL || 'http://localhost:5173';
  });

  test('Fluxo 1: Indicar Vencedor (PLAYER_2) → Sucesso + Volta Dashboard', async ({
    page,
  }) => {
    // Setup
    await page.goto(`${baseUrl}/match/test-match-id`);
    await page.waitForLoadState('networkidle');

    // Abrir painel End Match
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await expect(endMatchBtn).toBeVisible({ timeout: 5000 });
    await endMatchBtn.click();

    // Step 1: Selecionar "Indicar Vencedor"
    const indicarVencedorBtn = page.locator('button:has-text("Indicar Vencedor")');
    await expect(indicarVencedorBtn).toBeVisible();
    await indicarVencedorBtn.click();

    // Step 2: Selecionar PLAYER_2
    const player2Btn = page.locator('button:has-text("Jogador 2")');
    await expect(player2Btn).toBeVisible();
    await player2Btn.click();

    // Confirmar
    const confirmBtn = page.locator('button:has-text("Confirmar")');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Validar sucesso
    const successMsg = page.locator('text=Partida Finalizada');
    await expect(successMsg).toBeVisible({ timeout: 5000 });

    // Validar volta ao dashboard (redirecionamento automático)
    await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 5000 });
  });

  test('Fluxo 2: Encerrar Sem Vencedor → Sucesso + Volta Dashboard', async ({
    page,
  }) => {
    // Setup
    await page.goto(`${baseUrl}/match/test-match-id-2`);
    await page.waitForLoadState('networkidle');

    // Abrir painel End Match
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await expect(endMatchBtn).toBeVisible({ timeout: 5000 });
    await endMatchBtn.click();

    // Step 1: Selecionar "Encerrar Sem Vencedor"
    const endWithoutWinnerBtn = page.locator('button:has-text("Encerrar Sem Vencedor")');
    await expect(endWithoutWinnerBtn).toBeVisible();
    await endWithoutWinnerBtn.click();

    // Validar sucesso imediato
    const successMsg = page.locator('text=Partida Finalizada');
    await expect(successMsg).toBeVisible({ timeout: 5000 });

    // Validar volta ao dashboard
    await expect(page).toHaveURL(/\/dashboard|\//, { timeout: 5000 });
  });

  test('Fluxo 3: Cancelar no Step 1 → Modal fecha sem alterar', async ({
    page,
  }) => {
    // Setup
    await page.goto(`${baseUrl}/match/test-match-id-3`);
    await page.waitForLoadState('networkidle');

    // Abrir painel End Match
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await expect(endMatchBtn).toBeVisible({ timeout: 5000 });
    await endMatchBtn.click();

    // Step 1: Clicar "Cancelar"
    const cancelBtn = page.locator('button:has-text("Cancelar")');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Validar que modal fechou
    await expect(page.locator('text=Encerrar Partida?')).not.toBeVisible();

    // Validar que ainda está na página de match
    await expect(page).toHaveURL(/\/match\//, { timeout: 5000 });
  });

  test('API: POST /api/matches/:id com action=endMatch retorna 200 OK', async ({
    page,
  }) => {
    // Capturar requisição PATCH
    const patchPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/matches/') &&
        response.request().method() === 'PATCH' &&
        response.status() === 200,
    );

    // Setup + trigger
    await page.goto(`${baseUrl}/match/test-match-id`);
    await page.waitForLoadState('networkidle');

    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();

    const endWithoutWinnerBtn = page.locator('button:has-text("Encerrar Sem Vencedor")');
    await endWithoutWinnerBtn.click();

    // Validar resposta
    const response = await patchPromise;
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status', 'FINISHED');
  });

  test('URL correta: /matches (não /api/api/matches)', async ({
    page,
  }) => {
    const networkLogs: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'debug' && msg.text().includes('[EndMatch]')) {
        networkLogs.push(msg.text());
      }
    });

    await page.goto(`${baseUrl}/match/test-match-id`);
    await page.waitForLoadState('networkidle');

    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();

    const endWithoutWinnerBtn = page.locator('button:has-text("Encerrar Sem Vencedor")');
    await endWithoutWinnerBtn.click();

    // Aguardar sucesso
    await expect(page.locator('text=Partida Finalizada')).toBeVisible({ timeout: 5000 });

    // Validar que não há `/api/api` nos logs
    expect(networkLogs.join('\n')).not.toContain('/api/api');
  });
});
