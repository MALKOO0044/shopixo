import { test, expect } from '@playwright/test';

test.describe('Theme Toggle Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage before each test
    await page.goto('/');
  });

  test('should allow toggling between light and dark themes', async ({ page }) => {
    // Locate the theme toggle button by its accessible name
    const themeToggleButton = page.getByRole('button', { name: 'Toggle theme' });
    await expect(themeToggleButton).toBeVisible();

    // Check initial state: the <html> element should not have the 'dark' class
    const htmlElement = page.locator('html');
    await expect(htmlElement).not.toHaveClass('dark');

    // --- Switch to Dark Mode ---
    // Click the button to open the dropdown menu
    await themeToggleButton.click();

    // Click the 'Dark' menu item
    await page.getByRole('menuitem', { name: 'Dark' }).click();

    // Assert that the html element now has the 'dark' class
    await expect(htmlElement).toHaveClass('dark');

    // --- Switch back to Light Mode ---
    // Click the button again to reopen the menu
    await themeToggleButton.click();

    // Click the 'Light' menu item
    await page.getByRole('menuitem', { name: 'Light' }).click();

    // Assert that the 'dark' class has been removed
    await expect(htmlElement).not.toHaveClass('dark');
  });
});
