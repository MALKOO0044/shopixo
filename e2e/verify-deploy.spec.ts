import { test, expect } from '@playwright/test';

test('Verify Theme Toggle on Production', async ({ page }) => {
  // Navigate to the production URL
  await page.goto('https://shopixo.vercel.app/');

  // Locate the theme toggle button by its accessible name
  const themeToggleButton = page.getByRole('button', { name: 'Toggle theme' });

  // Assert that the button is visible on the page
  await expect(themeToggleButton).toBeVisible({ timeout: 10000 }); // Wait up to 10 seconds
});
