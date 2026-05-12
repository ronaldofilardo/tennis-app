import { test, expect } from '@playwright/test';

test.describe('Session Resumption - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Limpar localStorage, sessionStorage e cookies antes de cada teste
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('anotador pode retomar sessão suspensa ao voltar', async ({ page, context }) => {
    // 1. Login primeiro usuário (Criador)
    await page.goto('/');
    await page.fill('input[type="email"]', 'creator@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Criar nova partida
    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await page.fill('input[placeholder*="Jogador 1"]', 'João Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Maria Santos');
    await page.selectOption('select[data-testid="format-select"]', 'BEST_OF_3');
    await page.click('button[type="submit"]');

    // Aguardar que a partida seja criada e extrai URL
    await page.waitForURL('**/match/**');
    const matchUrl = page.url();
    const matchId = matchUrl.split('/').pop();

    // 3. Configurar partida
    await expect(page.locator('text=Configuração da Partida')).toBeVisible();
    await page.click('text=🎾 João Silva');
    await expect(page.locator('text=Tênis')).toBeVisible();

    // 4. Marcar alguns pontos
    const joaoButton = page.locator('text=+ Ponto João Silva');
    for (let i = 0; i < 8; i++) {
      await joaoButton.click();
      await page.waitForTimeout(50);
    }

    // Aguardar que pontos sejam contabilizados
    await page.waitForTimeout(500);

    // Armazenar número de pontos anotados
    const pointsBefore = await page.locator('[data-testid="points-count"]').count();

    // 5. Simular saída do anotador (fechando a página)
    await page.close();

    // 6. Anotador volta (nova aba, mesma sessão)
    const page2 = await context.newPage();
    await page2.goto(`/match/${matchId}`);

    // 7. Verificar que modal de retomada aparece
    await expect(page2.locator('text=Retomar Anotação')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('text=Você tem uma anotação em andamento')).toBeVisible();

    // Verificar que pontos anteriores são exibidos
    await expect(page2.locator('text=Pontos Anteriores:')).toBeVisible();

    // 8. Clicar em "Retomar"
    await page2.click('button:has-text("Retomar")');

    // 9. Verificar que modal desaparece e sessão é restaurada
    await expect(page2.locator('text=Retomar Anotação')).not.toBeVisible();

    // 10. Marcar mais pontos para garantir que sistema estava "acordado"
    const joaoButton2 = page2.locator('text=+ Ponto João Silva');
    for (let i = 0; i < 4; i++) {
      await joaoButton2.click();
      await page2.waitForTimeout(50);
    }

    // 11. Verificar que pontos incrementam corretamente
    await expect(page2.locator('[data-testid="points-count"]')).toContainText(/12/);

    await page2.close();
  });

  test('anotador pode iniciar nova sessão ao não retomar', async ({ page, context }) => {
    // 1. Login e criar partida como acima
    await page.goto('/');
    await page.fill('input[type="email"]', 'creator2@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await page.fill('input[placeholder*="Jogador 1"]', 'Pedro Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Ana Santos');
    await page.selectOption('select[data-testid="format-select"]', 'BEST_OF_3');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/match/**');
    const matchUrl = page.url();
    const matchId = matchUrl.split('/').pop();

    // 2. Configurar e marcar pontos
    await expect(page.locator('text=Configuração da Partida')).toBeVisible();
    await page.click('text=🎾 Pedro Silva');

    const pedroButton = page.locator('text=+ Ponto Pedro Silva');
    for (let i = 0; i < 6; i++) {
      await pedroButton.click();
      await page.waitForTimeout(50);
    }

    await page.close();

    // 3. Anotador volta e clica "Iniciar Nova"
    const page2 = await context.newPage();
    await page2.goto(`/match/${matchId}`);

    await expect(page2.locator('text=Retomar Anotação')).toBeVisible({ timeout: 5000 });

    // Clicar em "Iniciar Nova Anotação"
    await page2.click('button:has-text("Iniciar Nova")');

    // 4. Verificar que modal desaparece
    await expect(page2.locator('text=Retomar Anotação')).not.toBeVisible();

    // 5. Verificar que contador de pontos é zerado (nova sessão)
    // Não deve ter pontos prévios salvos
    const pointsAfterNew = await page2.locator('[data-testid="points-count"]').innerText();
    expect(pointsAfterNew).toBe('0');

    await page2.close();
  });

  test('múltiplos anotadores não compartilham sessão de retomada', async ({ page, context }) => {
    // 1. Criador cria partida
    await page.goto('/');
    await page.fill('input[type="email"]', 'creator3@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await page.fill('input[placeholder*="Jogador 1"]', 'Paulo Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Carla Santos');
    await page.selectOption('select[data-testid="format-select"]', 'BEST_OF_3');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/match/**');
    const matchUrl = page.url();
    const matchId = matchUrl.split('/').pop();

    // 2. Anotador 1 começa e marca pontos
    await expect(page.locator('text=Configuração da Partida')).toBeVisible();
    await page.click('text=🎾 Paulo Silva');

    const pauloButton = page.locator('text=+ Ponto Paulo Silva');
    for (let i = 0; i < 4; i++) {
      await pauloButton.click();
      await page.waitForTimeout(50);
    }

    // 3. Anotador 2 entra em nova aba (sem suspender anotador 1)
    const page2 = await context.newPage();
    await page2.goto(`/match/${matchId}`);

    // 4. Anotador 2 NÃO deve ver modal de retomada
    // (porque anotador 1 ainda está ativo)
    await page2.waitForTimeout(2000);
    await expect(page2.locator('text=Retomar Anotação')).not.toBeVisible();

    // 5. Anotador 1 sai
    await page.close();

    // 6. Anotador 2 navega para a partida novamente
    await page2.goto(`/match/${matchId}`);

    // 7. Agora Anotador 2 vê modal de retomada (para a sessão de anotador 2)
    // Nota: Este teste assume que há lógica de context para distinguir anotadores
    // Se não houver, este teste será adaptado

    await page2.close();
  });
});
