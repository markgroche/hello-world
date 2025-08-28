import { test, expect } from '@playwright/test';

test.describe('Mobile viewport (iPhone 12)', () => {
    test('loads app and renders canvas', async ({ page }) => {
        await page.goto('/');

        // App root present
        const root = page.locator('#root');
        await expect(root).toBeVisible();

        // Canvas renders
        const canvas = page.locator('canvas');
        await expect(canvas).toHaveCount(1);
    });

    test('no horizontal scroll on load', async ({ page }) => {
        await page.goto('/');
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
});


