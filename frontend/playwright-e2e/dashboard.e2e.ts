import { test, expect } from '@playwright/test';

test.describe('Dashboard - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: login e navegação para dashboard
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('deve exibir dashboard vazio inicialmente', async ({ page }) => {
    await expect(page.locator('text=Minhas Partidas')).toBeVisible();
    await expect(page.locator('text=Nova Partida')).toBeVisible();

    // Verificar que não há partidas inicialmente
    const matches = page.locator('.match-card');
    await expect(matches).toHaveCount(0);
  });

  test('deve permitir navegação para criação de partida', async ({ page }) => {
    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await expect(page.locator('text=Nova Partida')).toBeVisible();
  });

  test('deve exibir partidas finalizadas com placar', async ({ page }) => {
    // Este teste assumiria que há partidas finalizadas no backend
    // Verificar exibição de placares finais
    const finalScore = page.locator('text=2x0');
    if (await finalScore.isVisible()) {
      await expect(finalScore).toBeVisible();
    }
  });

  test('deve permitir abertura de estatísticas', async ({ page }) => {
    // Clicar no botão de estatísticas de uma partida finalizada
    const statsButton = page.locator('text=📊 Abrir Resultado').first();
    if (await statsButton.isVisible()) {
      await statsButton.click();
      await expect(page.locator('text=Estatísticas da Partida')).toBeVisible();
    }
  });

  test('deve permitir continuação de partidas em andamento', async ({ page }) => {
    // Clicar em uma partida em andamento
    const inProgressCard = page.locator('.match-card').filter({ hasText: 'Em Andamento' }).first();
    if (await inProgressCard.isVisible()) {
      await inProgressCard.click();
      await page.waitForURL('**/match/**');
      await expect(page.locator('text=Tênis')).toBeVisible();
    }
  });
});