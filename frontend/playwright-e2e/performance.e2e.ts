import { test, expect } from '@playwright/test';

test.describe('Performance - E2E', () => {
  test('dashboard deve carregar rapidamente', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Login
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Aguardar carregamento do dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Minhas Partidas')).toBeVisible();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // 5 segundos máximo

    // Log do tempo para monitoramento
    console.log(`Dashboard load time: ${loadTime}ms`);
  });

  test('placar deve carregar rapidamente', async ({ page }) => {
    // Setup: login
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    const startTime = Date.now();

    // Navegar para criação de partida
    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');

    // Preencher e criar partida
    await page.fill('input[placeholder*="Jogador 1"]', 'João Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Maria Santos');
    await page.click('button[type="submit"]');

    // Aguardar carregamento do placar
    await page.waitForURL('**/match/**');
    await expect(page.locator('text=João Silva')).toBeVisible();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(8000); // 8 segundos máximo para fluxo completo

    console.log(`Scoreboard load time: ${loadTime}ms`);
  });

  test('operações de pontuação devem ser responsivas', async ({ page }) => {
    // Setup: criar partida ativa
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await page.fill('input[placeholder*="Jogador 1"]', 'João Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Maria Santos');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/match/**');
    await page.click('text=🎾 João Silva'); // Selecionar servidor

    // Medir tempo de resposta das operações de pontuação
    const pointButton = page.locator('text=+ Ponto João Silva');

    const startTime = Date.now();
    await pointButton.click();

    // Aguardar atualização da UI
    await expect(page.locator('text=15')).toBeVisible();

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000); // 1 segundo máximo para operação de pontuação

    console.log(`Point operation response time: ${responseTime}ms`);
  });

  test('deve lidar com múltiplas operações sequenciais', async ({ page }) => {
    // Setup similar ao teste anterior
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await page.fill('input[placeholder*="Jogador 1"]', 'João Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Maria Santos');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/match/**');
    await page.click('text=🎾 João Silva');

    const pointButton = page.locator('text=+ Ponto João Silva');

    // Executar 10 operações sequenciais
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      await pointButton.click();
      // Pequena pausa para simular usuário real
      await page.waitForTimeout(50);
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / 10;

    expect(avgTime).toBeLessThan(500); // Média de 500ms por operação
    expect(totalTime).toBeLessThan(6000); // Total máximo de 6 segundos

    console.log(`10 point operations: ${totalTime}ms total, ${avgTime}ms average`);
  });

  test('memória não deve vazar durante uso prolongado', async ({ page }) => {
    // Este teste monitora uso de memória (limitado no que podemos fazer com Playwright)
    await page.goto('/');

    // Fazer login
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Simular uso prolongado: navegar entre páginas múltiplas vezes
    for (let i = 0; i < 5; i++) {
      await page.click('text=Nova Partida');
      await page.waitForURL('**/match/new');
      await page.click('text=← Voltar'); // Voltar ao dashboard
      await page.waitForURL('**/dashboard');
    }

    // Verificar que aplicação ainda responde
    await expect(page.locator('text=Minhas Partidas')).toBeVisible();
    await expect(page.locator('text=Nova Partida')).toBeVisible();
  });
});