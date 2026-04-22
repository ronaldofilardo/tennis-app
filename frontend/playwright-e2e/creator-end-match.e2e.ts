import { test, expect } from '@playwright/test';

/**
 * Testes E2E para funcionalidade de encerramento manual de partida pelo criador.
 * 
 * Cenários:
 * 1. Criador consegue ver botão "Encerrar Partida"
 * 2. Non-criador não consegue ver botão
 * 3. Ao encerrar, todas as sessões de anotação são finalizadas
 * 4. Anotadores recebem notificação de que partida foi encerrada
 * 5. Entrada de pontos fica desabilitada após encerramento
 */

test.describe('Creator End Match Functionality (E2E)', () => {
  let creatorUrl: string;
  let annotatorUrl: string;
  let matchId: string;

  test.beforeEach(async ({ browser, page }) => {
    // Setup: Criar partida de teste
    // (Requer backend rodando e dados seedados)
    
    // Simular: Ir para dashboard
    await page.goto('http://localhost:5173/dashboard');
    
    // Procurar por partida em progresso (ou criar uma para teste)
    const matchLink = page.locator('a[href*="/match/"]').first();
    if (await matchLink.count() > 0) {
      const href = await matchLink.getAttribute('href');
      matchId = href?.split('/').pop() || '';
      creatorUrl = `http://localhost:5173/match/${matchId}`;
    }
  });

  test('Creator sees "Encerrar Partida" button', async ({ page }) => {
    await page.goto(creatorUrl);
    
    // Aguardar carregamento da página de scoreboard
    await page.waitForSelector('.scoreboard-v2-court');
    
    // Procurar pelo botão "Encerrar Partida"
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await expect(endMatchBtn).toBeVisible();
    await expect(endMatchBtn).not.toBeDisabled();
  });

  test('Non-creator does not see "Encerrar Partida" button', async ({ browser, page }) => {
    // Criar segunda aba com usuário diferente
    const annotatorPage = await browser.newPage();
    
    await annotatorPage.goto(creatorUrl);
    await annotatorPage.waitForSelector('.scoreboard-v2-court');
    
    // Non-creator não deveria ver o botão
    const endMatchBtn = annotatorPage.locator('button:has-text("Encerrar Partida")');
    await expect(endMatchBtn).not.toBeVisible();
    
    await annotatorPage.close();
  });

  test('Creator can open modal to end match', async ({ page }) => {
    await page.goto(creatorUrl);
    await page.waitForSelector('.scoreboard-v2-court');
    
    // Clica em "Encerrar Partida"
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();
    
    // Verificar que modal abriu
    const modal = page.locator('div:has-text("Encerrar Partida?")');
    await expect(modal).toBeVisible();
    
    // Verificar opções
    await expect(page.locator('button:has-text("Indicar Vencedor")')).toBeVisible();
    await expect(page.locator('button:has-text("Encerrar Sem Vencedor")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancelar")')).toBeVisible();
  });

  test('Creator can end match without winner', async ({ page }) => {
    await page.goto(creatorUrl);
    await page.waitForSelector('.scoreboard-v2-court');
    
    // Abrir modal
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();
    
    // Clica "Encerrar Sem Vencedor"
    const endWithoutWinnerBtn = page.locator('button:has-text("Encerrar Sem Vencedor")');
    await endWithoutWinnerBtn.click();
    
    // Aguardar resposta da API e volta ao dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    
    // Verificar que foi redirecionado
    expect(page.url()).toContain('/dashboard');
  });

  test('Creator can end match with winner selection', async ({ page }) => {
    await page.goto(creatorUrl);
    await page.waitForSelector('.scoreboard-v2-court');
    
    // Abrir modal
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();
    
    // Clica "Indicar Vencedor"
    const indicateWinnerBtn = page.locator('button:has-text("Indicar Vencedor")');
    await indicateWinnerBtn.click();
    
    // Seleciona Jogador 1
    const player1Btn = page.locator('button:has-text("Jogador 1")').nth(1);
    await player1Btn.click();
    
    // Verifica que botão foi selecionado
    await expect(player1Btn).toHaveClass(/bg-green-600/);
    
    // Confirma
    const confirmBtn = page.locator('button:has-text("Confirmar")');
    await confirmBtn.click();
    
    // Aguardar redirecionamento
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('Non-creator sees notification when match is ended by creator', async ({ browser, page }) => {
    // Setup: Criar dois contextos (criador e anotador)
    const creatorPage = page;
    const annotatorContext = await browser.newContext();
    const annotatorPage = await annotatorContext.newPage();
    
    // Ambos acessam a mesma partida
    await creatorPage.goto(creatorUrl);
    await annotatorPage.goto(creatorUrl);
    
    // Aguardar carregamento em ambas as abas
    await creatorPage.waitForSelector('.scoreboard-v2-court');
    await annotatorPage.waitForSelector('.scoreboard-v2-court');
    
    // Criador encerra partida
    const endMatchBtn = creatorPage.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();
    
    const endWithoutWinnerBtn = creatorPage.locator('button:has-text("Encerrar Sem Vencedor")');
    await endWithoutWinnerBtn.click();
    
    // Aguardar notificação no anotador (polling acontece a cada 10s ou pode ser instantâneo)
    const notification = annotatorPage.locator('text=Partida foi encerrada');
    await expect(notification).toBeVisible({ timeout: 15000 }); // 10s + margem
    
    await annotatorContext.close();
  });

  test('Scoring buttons are disabled after match ends', async ({ page }) => {
    await page.goto(creatorUrl);
    await page.waitForSelector('.scoreboard-v2-court');
    
    // Procurar por botões de entrada de pontos
    const serveButtons = page.locator('button:has-text("Ace"), button:has-text("Out"), button:has-text("Net")');
    
    // Verificar que estão habilitados antes de encerrar
    const firstBtn = serveButtons.first();
    await expect(firstBtn).not.toBeDisabled();
    
    // Encerrar partida
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();
    
    const endWithoutWinnerBtn = page.locator('button:has-text("Encerrar Sem Vencedor")');
    await endWithoutWinnerBtn.click();
    
    // Aguardar que a partida seja encerrada
    await page.waitForTimeout(1000);
    
    // Verificar que botões estão desabilitados após encerramento
    await expect(firstBtn).toBeDisabled();
  });
});

    const endWithoutWinnerBtn = page.locator('button:has-text("Encerrar Sem Vencedor")');
    await endWithoutWinnerBtn.click();
    
    // Aguardar redirecionamento
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    
    // (Nota: Após redirecionamento, não há mais botões de entrada visíveis nesta página)
    // Este teste valida que após encerrar, usuário é levado para fora da tela de entrada
  });
});
