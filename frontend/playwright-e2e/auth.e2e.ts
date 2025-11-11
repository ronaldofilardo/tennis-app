import { test, expect } from '@playwright/test';

test.describe('Autenticação - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    // Mock das rotas de autenticação e sessão
    await page.route('**/api/auth/login', async (route, request) => {
      const postData = request.postDataJSON?.();
      if (postData?.email === 'test@test.com' && postData?.password === 'password') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ token: 'fake-token', user: { email: 'test@test.com', name: 'Usuário Teste' } })
        });
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Credenciais inválidas' })
        });
      }
    });
    await page.route('**/api/auth/session', async (route) => {
      // Simula sessão válida se token estiver presente
      const cookies = await page.context().cookies();
      const hasToken = cookies.some(c => c.name === 'token' && c.value === 'fake-token');
      if (hasToken) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: { email: 'test@test.com', name: 'Usuário Teste' } })
        });
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Não autenticado' })
        });
      }
    });
    await page.route('**/api/auth/logout', async (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
  });

  test('deve permitir login com credenciais válidas', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=Login (local)')).toBeVisible();

    // Preencher formulário
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Verificar redirecionamento
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Minhas Partidas')).toBeVisible();
  });

  test('deve rejeitar login com credenciais inválidas', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verificar mensagem de erro
    await expect(page.locator('text=Credenciais inválidas')).toBeVisible();

    // Verificar que permanece na página de login
    await expect(page.locator('text=Login (local)')).toBeVisible();
  });

  test('deve manter sessão após refresh', async ({ page }) => {
    await page.goto('/');

    // Fazer login
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // Refresh da página
    await page.reload();

    // Verificar que permanece logado
    await expect(page.locator('text=Minhas Partidas')).toBeVisible();
  });

  test('deve permitir logout', async ({ page }) => {
    await page.goto('/');

    // Fazer login
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // Fazer logout
    await page.click('text=Logout');

    // Verificar redirecionamento para login
    await page.waitForURL('**/login');
    await expect(page.locator('text=Login (local)')).toBeVisible();
  });
});