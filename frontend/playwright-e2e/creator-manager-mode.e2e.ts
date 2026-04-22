import { test, expect } from '@playwright/test';

test.describe('Creator Manager Mode - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Limpar localStorage, sessionStorage e cookies
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('criador GESTOR entra em partida e vê MatchManagerModal', async ({ page }) => {
    // 1. Login como gestor criador
    await page.goto('/');
    await page.fill('input[type="email"]', 'gestor@clube.com');
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

    // Aguardar navegação para a partida
    await page.waitForURL('**/match/**');
    const matchUrl = page.url();
    const matchId = matchUrl.split('/').pop();

    // 3. Verificar que MatchManagerModal é renderizado (não SetupModal)
    await expect(page.locator('text=Gerenciar Partida')).toBeVisible({ timeout: 5000 });

    // 4. Verificar que tem abas de edição e anotadores
    await expect(page.locator('button:has-text("📋 Editar Dados")')).toBeVisible();
    await expect(page.locator('button:has-text("👥 Anotadores")')).toBeVisible();

    // 5. Verificar que scoreboard NÃO é renderizado
    await expect(page.locator('text=Tênis')).not.toBeVisible();
  });

  test('criador pode editar dados em MatchManagerModal', async ({ page }) => {
    // 1. Setup: criar partida como gestor
    await page.goto('/');
    await page.fill('input[type="email"]', 'gestor2@clube.com');
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

    // 2. Verificar MatchManagerModal
    await expect(page.locator('text=Gerenciar Partida')).toBeVisible();

    // 3. Editar apelido
    const nicknameInput = page.locator('input[placeholder="Ex: Desafio Amigos"]');
    await nicknameInput.fill('Treino Quartzo');

    // 4. Mudar visibilidade
    const visibilitySelect = page.locator('select#mm-visibility');
    await visibilitySelect.selectOption('PUBLIC');

    // 5. Marcar checkbox de anotação
    const annotationCheckbox = page.locator('input[type="checkbox"]');
    await annotationCheckbox.check();

    // 6. Salvar
    await page.click('button:has-text("✓ Salvar Mudanças")');
    await expect(page.locator('text=Dados da partida atualizados')).toBeVisible({ timeout: 5000 });

    // 7. Verificar que os dados foram salvos (ainda em modal)
    await expect(nicknameInput).toHaveValue('Treino Quartzo');
  });

  test('criador NÃO pode editar atletas em MatchManagerModal', async ({ page }) => {
    // 1. Setup: criar partida
    await page.goto('/');
    await page.fill('input[type="email"]', 'gestor3@clube.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await page.fill('input[placeholder*="Jogador 1"]', 'Carlos Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Lucia Santos');
    await page.selectOption('select[data-testid="format-select"]', 'BEST_OF_3');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/match/**');

    // 2. Verificar MatchManagerModal
    await expect(page.locator('text=Gerenciar Partida')).toBeVisible();

    // 3. Verificar que campos de atleta NÃO são editáveis
    // (MatchManagerModal não inclui player1/player2 fields - apenas EditMatchModal faz)
    const editForm = page.locator('.match-manager-form');
    const playerInputs = editForm.locator('input[placeholder*="Jogador"]');

    // Não deve haver inputs de jogadores no formulário do manager
    expect(await playerInputs.count()).toBe(0);
  });

  test('outro gestor (não-criador) entra partida e vê scoreboard', async ({ page, context }) => {
    // 1. Criador cria partida
    await page.goto('/');
    await page.fill('input[type="email"]', 'gestor.criador@clube.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await page.fill('input[placeholder*="Jogador 1"]', 'Bruno Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Fernanda Santos');
    await page.selectOption('select[data-testid="format-select"]', 'BEST_OF_3');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/match/**');
    const matchUrl = page.url();

    // 2. Outro gestor entra em nova aba
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.fill('input[type="email"]', 'gestor.outro@clube.com');
    await page2.fill('input[type="password"]', 'password');
    await page2.click('button[type="submit"]');
    await page2.waitForURL('**/dashboard');

    // 3. Acessar mesma partida via URL
    await page2.goto(matchUrl);

    // 4. Verificar que vê SetupModal ou scoreboard (NÃO MatchManagerModal)
    await page2.waitForTimeout(2000);

    // Não deve ver "Gerenciar Partida"
    await expect(page2.locator('text=Gerenciar Partida')).not.toBeVisible();

    // Deve ver SetupModal ou scoreboard
    const hasSetup = await page2
      .locator('text=Configuração da Partida')
      .isVisible()
      .catch(() => false);
    const hasScoreboard = await page2
      .locator('text=Tênis')
      .isVisible()
      .catch(() => false);

    expect(hasSetup || hasScoreboard).toBeTruthy();

    await page2.close();
  });

  test('anotador entra partida e vê scoreboard, não MatchManagerModal', async ({
    page,
    context,
  }) => {
    // 1. Criador cria partida (openForAnnotation: true)
    await page.goto('/');
    await page.fill('input[type="email"]', 'gestor.criador2@clube.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await page.fill('input[placeholder*="Jogador 1"]', 'Miguel Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Sophia Santos');
    await page.selectOption('select[data-testid="format-select"]', 'BEST_OF_3');

    // Garantir que é público
    const visibilitySelect = page.locator('select[data-testid="visibility-select"]');
    await visibilitySelect.selectOption('PUBLIC').catch(() => {});

    await page.click('button[type="submit"]');
    await page.waitForURL('**/match/**');
    const matchUrl = page.url();

    // 2. Fechar MatchManagerModal (criador volta)
    await expect(page.locator('text=Gerenciar Partida')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("↤ Voltar ao Dashboard")');
    await page.waitForURL('**/dashboard');

    // 3. Anotador (qualquer usuário) entra em nova aba
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.fill('input[type="email"]', 'anotador@test.com');
    await page2.fill('input[type="password"]', 'password');
    await page2.click('button[type="submit"]');
    await page2.waitForURL('**/dashboard');

    // 4. Acessar mesma partida
    await page2.goto(matchUrl);

    // 5. Verificar que vê SetupModal ou scoreboard (NÃO MatchManagerModal)
    await page2.waitForTimeout(1000);

    // Não deve ver "Gerenciar Partida"
    await expect(page2.locator('text=Gerenciar Partida')).not.toBeVisible();

    // Deve ver SetupModal ou scoreboard
    const hasSetup = await page2
      .locator('text=Configuração da Partida')
      .isVisible()
      .catch(() => false);
    const hasScoreboard = await page2
      .locator('text=Tênis')
      .isVisible()
      .catch(() => false);

    expect(hasSetup || hasScoreboard).toBeTruthy();

    await page2.close();
  });

  test('criador vê aba de anotadores e lista atualiza em tempo real', async ({ page }) => {
    // 1. Setup: criar partida
    await page.goto('/');
    await page.fill('input[type="email"]', 'gestor4@clube.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await page.fill('input[placeholder*="Jogador 1"]', 'Rafael Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Isabela Santos');
    await page.selectOption('select[data-testid="format-select"]', 'BEST_OF_3');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/match/**');

    // 2. Clicar em aba de anotadores
    await page.click('button:has-text("👥 Anotadores")');

    // 3. Verificar que AnnotationSessionPanel está visível
    // (pode estar vazio ou com anotadores se há sessões ativas)
    const annotatorsSection = page.locator('.match-manager-annotators-section');
    await expect(annotatorsSection).toBeVisible();
  });

  test('fechar modal redireciona para dashboard', async ({ page }) => {
    // 1. Setup: criar e entrar em partida como gestor
    await page.goto('/');
    await page.fill('input[type="email"]', 'gestor5@clube.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('text=Nova Partida');
    await page.waitForURL('**/match/new');
    await page.fill('input[placeholder*="Jogador 1"]', 'Tiago Silva');
    await page.fill('input[placeholder*="Jogador 2"]', 'Camila Santos');
    await page.selectOption('select[data-testid="format-select"]', 'BEST_OF_3');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/match/**');

    // 2. Verificar MatchManagerModal
    await expect(page.locator('text=Gerenciar Partida')).toBeVisible();

    // 3. Clicar em "Voltar ao Dashboard"
    await page.click('button:has-text("↤ Voltar ao Dashboard")');

    // 4. Verificar redirecionamento
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Minhas Partidas')).toBeVisible({ timeout: 5000 });
  });
});
