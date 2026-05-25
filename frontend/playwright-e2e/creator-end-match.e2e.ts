import { test, expect } from '@playwright/test';

/**
 * Testes E2E para funcionalidade de encerramento manual de partida pelo criador.
 *
 * Cenários:
 * 1. Criador consegue ver botão "Encerrar Partida"
 * 2. Non-criador não consegue ver botão
 * 3. Modal com fluxo sequencial de steps
 * 4. Seleção de vencedor com validação
 * 5. Ao encerrar, todas as sessões de anotação são finalizadas
 * 6. Tela de sucesso aparece após finalização
 */

test.describe('Creator End Match Functionality (E2E) — Sequential Flow', () => {
  let creatorUrl: string;
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

  test('Step 1: Creator sees initial options (Indicar Vencedor, Encerrar Sem Vencedor, Cancelar)', async ({
    page,
  }) => {
    await page.goto(creatorUrl);
    await page.waitForSelector('.scoreboard-v2-court');

    // Clica em "Encerrar Partida"
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();

    // Verificar que modal abriu com Step 1
    const modal = page.locator('.end-match-modal-content');
    await expect(modal).toBeVisible();

    // Verificar opções do Step 1
    await expect(page.locator('button:has-text("Indicar Vencedor")')).toBeVisible();
    await expect(page.locator('button:has-text("Encerrar Sem Vencedor")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancelar")')).toBeVisible();
  });

  test('Step 1 → Step 2: Navigate to winner selection when clicking "Indicar Vencedor"', async ({ page }) => {
    await page.goto(creatorUrl);
    await page.waitForSelector('.scoreboard-v2-court');

    // Abrir modal
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();

    // Clica "Indicar Vencedor"
    const indicateWinnerBtn = page.locator('button:has-text("Indicar Vencedor")').first();
    await indicateWinnerBtn.click();

    // Verifica que agora o modal mostra seleção de vencedor
    await expect(page.locator('text=Selecione o Vencedor')).toBeVisible();

    // Verifica presença de botões de jogadores
    const player1Btn = page.locator('button:has-text("Jogador 1")');
    const player2Btn = page.locator('button:has-text("Jogador 2")');
    await expect(player1Btn).toBeVisible();
    await expect(player2Btn).toBeVisible();

    // Confirmar botão deveria estar desabilitado inicialmente
    const confirmBtn = page.locator('button:has-text("Confirmar")');
    await expect(confirmBtn).toBeDisabled();
  });

  test('Step 2: Select winner and enable Confirm button', async ({ page }) => {
    await page.goto(creatorUrl);
    await page.waitForSelector('.scoreboard-v2-court');

    // Abrir modal e navegar para Step 2
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();

    const indicateWinnerBtn = page.locator('button:has-text("Indicar Vencedor")').first();
    await indicateWinnerBtn.click();

    // Seleciona Jogador 1
    const player1Btn = page.locator('button:has-text("Jogador 1")').last();
    await player1Btn.click();

    // Verifica que botão foi marcado como selected
    await expect(player1Btn).toHaveClass(/selected/);

    // Confirmar botão agora deveria estar habilitado
    const confirmBtn = page.locator('button:has-text("Confirmar")');
    await expect(confirmBtn).not.toBeDisabled();
  });

  test('Step 2 → Step 1: Back button returns to initial step', async ({ page }) => {
    await page.goto(creatorUrl);
    await page.waitForSelector('.scoreboard-v2-court');

    // Abrir modal
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();

    // Navegar para Step 2
    const indicateWinnerBtn = page.locator('button:has-text("Indicar Vencedor")').first();
    await indicateWinnerBtn.click();

    // Clica Voltar
    const backBtn = page.locator('button:has-text("Voltar")');
    await backBtn.click();

    // Verifica que voltou para Step 1
    await expect(page.locator('text=Encerrar Partida?')).toBeVisible();
    await expect(page.locator('button:has-text("Indicar Vencedor")').first()).toBeVisible();
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

    // Aguardar tela de sucesso
    const successScreen = page.locator('text=Partida Finalizada!');
    await expect(successScreen).toBeVisible();

    // Aguardar fechamento automático (2 segundos) e retorno ao dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('Creator can end match with selected winner', async ({ page }) => {
    await page.goto(creatorUrl);
    await page.waitForSelector('.scoreboard-v2-court');

    // Abrir modal
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();

    // Navegar para seleção de vencedor
    const indicateWinnerBtn = page.locator('button:has-text("Indicar Vencedor")').first();
    await indicateWinnerBtn.click();

    // Seleciona Jogador 2
    const player2Btn = page.locator('button:has-text("Jogador 2")').last();
    await player2Btn.click();

    // Confirma
    const confirmBtn = page.locator('button:has-text("Confirmar")');
    await confirmBtn.click();

    // Aguardar tela de sucesso com mensagem de vencedor
    const successScreen = page.locator('text=Partida Finalizada!');
    await expect(successScreen).toBeVisible();

    const winnerMsg = page.locator('text=Jogador 2 foi marcado como vencedor');
    await expect(winnerMsg).toBeVisible();

    // Aguardar redirecionamento
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('Cancel button closes modal and returns to Step 1 state', async ({ page }) => {
    await page.goto(creatorUrl);
    await page.waitForSelector('.scoreboard-v2-court');

    // Abrir modal
    const endMatchBtn = page.locator('button:has-text("Encerrar Partida")');
    await endMatchBtn.click();

    // Clica Cancelar
    const cancelBtn = page.locator('button:has-text("Cancelar")');
    await cancelBtn.click();

    // Modal deveria estar fechado
    const modal = page.locator('.end-match-modal-content');
    await expect(modal).not.toBeVisible();

    // Botão deveria estar visível novamente (pronto para próximo clique)
    await expect(endMatchBtn).toBeVisible();
  });
});
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
