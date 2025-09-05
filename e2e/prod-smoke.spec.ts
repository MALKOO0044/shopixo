import { test, expect, request } from '@playwright/test';

// Production smoke tests hitting the live site
const base = process.env.E2E_BASE_URL || 'https://shopixo.vercel.app';

test.describe('Production Smoke', () => {
  test('home loads', async ({ page }) => {
    const resp = await page.goto(base + '/');
    expect(resp?.ok()).toBeTruthy();
    // Expect to see Sign In link (public header)
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    const resp = await page.goto(base + '/login');
    expect(resp?.ok()).toBeTruthy();
    await expect(page.getByRole('heading', { name: /log in to shopixo/i })).toBeVisible();
  });

  test('health endpoint is ok', async () => {
    const api = await request.newContext();
    const res = await api.get(base + '/api/health');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.ok).toBeTruthy();
  });

  test('not-found returns 404', async ({ page }) => {
    const resp = await page.goto(base + '/definitely-not-a-real-page-xyz');
    expect(resp?.status()).toBe(404);
  });

  test('account security requires auth (redirects to login or returns 404)', async ({ page }) => {
    const resp = await page.goto(base + '/account/security');
    const status = resp?.status();
    if (status === 404) {
      // Some deployments may hide protected routes by returning 404 when unauthenticated
      expect(status).toBe(404);
      return;
    }
    // Otherwise we expect a redirect (final URL contains /login)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /log in to shopixo/i })).toBeVisible();
  });
});
