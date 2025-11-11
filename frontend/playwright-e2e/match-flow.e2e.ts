import { test, expect } from '@playwright/test';

test.describe('Fluxo Completo de Partida - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Limpar localStorage e cookies antes de cada teste
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('fluxo completo de partida end-to-end', async ({ page }) => {
    // 1. Acessar aplicação
    await page.goto('/');
    await expect(page).toHaveTitle(/RacketApp/);

    // 2. Fazer login
    await expect(page.locator('text=Login (local)')).toBeVisible();

    // Preencher formulário de login
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento para dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Minhas Partidas')).toBeVisible();

    // 3. Verificar dashboard vazio inicialmente
    await expect(page.locator('text=Nenhuma partida encontrada')).toBeVisible();

    // 4. Criar nova partida
    await page.click('text=Nova Partida');

    // Aguardar carregamento da página de criação
    await page.waitForURL('**/match/new');
    await expect(page.locator('text=Nova Partida')).toBeVisible();

    // 5. Preencher dados da partida
    await page.fill('input[placeholder*="Jogador 1"]', 'João Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Maria Santos');

    // Selecionar formato BEST_OF_3
    await page.selectOption('select[data-testid="format-select"]', 'BEST_OF_3');

    // 6. Iniciar partida
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento para placar
    await page.waitForURL('**/match/**');
    await expect(page.locator('text=João Silva')).toBeVisible();
    await expect(page.locator('text=Maria Santos')).toBeVisible();

    // 7. Configurar partida (selecionar servidor)
    await expect(page.locator('text=Configuração da Partida')).toBeVisible();
    await page.click('text=🎾 João Silva');

    // Aguardar carregamento do placar ativo
    await expect(page.locator('text=Tênis')).toBeVisible();

    // 8. Verificar estado inicial
    await expect(page.locator('text=0-0')).toBeVisible(); // Pontos
    await expect(page.locator('text=Sets: 0')).toBeVisible(); // Sets João
    await expect(page.locator('text=Sets: 0')).toBeVisible(); // Sets Maria

    // 9. Marcar pontos para vencer alguns games
    const joaoButton = page.locator('text=+ Ponto João Silva');

    // Marcar pontos suficientes para vencer alguns games (simulação realista)
    for (let i = 0; i < 4; i++) {
      await joaoButton.click();
      await page.waitForTimeout(100); // Pequena pausa para simular usuário real
    }

    // Verificar progresso
    await expect(page.locator('text=Games: 1')).toBeVisible(); // João venceu 1 game

    // 10. Continuar marcando pontos para vencer set
    for (let i = 0; i < 20; i++) {
      await joaoButton.click();
      await page.waitForTimeout(50);
    }

    // Verificar que João venceu o primeiro set
    await expect(page.locator('text=Sets: 1')).toBeVisible();

    // 11. Continuar para vencer a partida
    for (let i = 0; i < 24; i++) {
      await joaoButton.click();
      await page.waitForTimeout(30);
    }

    // 12. Verificar finalização da partida
    await expect(page.locator('text=PARTIDA FINALIZADA!')).toBeVisible();
    await expect(page.locator('text=VENCEDOR:')).toBeVisible();
    await expect(page.locator('text=João Silva')).toBeVisible();
    await expect(page.locator('text=Placar Final: 2 sets x 0 sets')).toBeVisible();

    // 13. Verificar botões de ação pós-partida
    await expect(page.locator('text=📊 Ver Estatísticas')).toBeVisible();
    await expect(page.locator('text=🎾 Nova Partida')).toBeVisible();

    // 14. Voltar para dashboard
    await page.click('text=📊 Ver Estatísticas');

    // 15. Verificar partida no dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=João Silva vs. Maria Santos')).toBeVisible();
    await expect(page.locator('text=Finalizada')).toBeVisible();

    // 16. Verificar placar final no dashboard
    await expect(page.locator('text=2x0')).toBeVisible();
  });

  test('abandono de partida em andamento', async ({ page }) => {
    // Setup similar ao teste anterior até ter uma partida em andamento
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Simular partida existente em andamento (via API ou estado)
    // Este teste assumiria que há uma partida em andamento no backend

    // Clicar na partida em andamento
    await page.click('text=Em Andamento');

    // Verificar carregamento da partida
    await expect(page.locator('text=Tênis')).toBeVisible();

    // Abandonar partida
    await page.click('button[title*="end"]'); // Botão X de finalizar

    // Verificar retorno ao dashboard
    await page.waitForURL('**/dashboard');

    // Verificar que partida ainda existe mas pode ser continuada
    await expect(page.locator('text=Em Andamento')).toBeVisible();
  });

  test('responsividade em dispositivos móveis', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Teste específico para mobile');

    await page.goto('/');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // Verificar layout responsivo
    await expect(page.locator('text=Minhas Partidas')).toBeVisible();

    // Verificar que botões são acessíveis em mobile
    const novaPartidaButton = page.locator('text=Nova Partida');
    await expect(novaPartidaButton).toBeVisible();

    // Verificar tamanho dos elementos em mobile
    const buttonBox = await novaPartidaButton.boundingBox();
    expect(buttonBox?.width).toBeLessThan(400); // Botão não deve ser muito largo
  });

  test('performance - tempo de carregamento crítico', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Aguardar carregamento completo do dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Minhas Partidas')).toBeVisible();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Dashboard deve carregar em menos de 5s

    // Testar carregamento do placar
    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');

    const setupLoadTime = Date.now() - startTime;
    expect(setupLoadTime).toBeLessThan(3000); // Setup deve carregar em menos de 3s
  });
});