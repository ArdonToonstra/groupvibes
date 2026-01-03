import { test, expect } from '@playwright/test';

test.describe('Check-ins', () => {
    test.beforeEach(async ({ page }) => {
        const uniqueId = Date.now();
        const email = `checkin${uniqueId}@example.com`;
        const password = 'Password123';

        await page.goto('/onboarding');
        await expect(page.getByPlaceholder('e.g. Alice')).toBeVisible();
        await page.getByPlaceholder('e.g. Alice').fill(`User ${uniqueId}`);
        await page.getByRole('button', { name: 'Next Step' }).click();

        await expect(page.getByText('Secure Account')).toBeVisible();
        await page.getByPlaceholder('you@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: 'Continue' }).click();

        await expect(page.getByText('Find your Squad')).toBeVisible();
        await page.getByText('Create Group', { exact: false }).click();

        await expect(page.getByPlaceholder('e.g. The Avengers')).toBeVisible();
        await page.getByPlaceholder('e.g. The Avengers').fill('Vibe Group');
        await page.getByRole('button', { name: 'Create Group' }).click();

        await expect(page).toHaveURL('/dashboard');
    });

    test('Create vibe check in', async ({ page }) => {
        // Click Check In Now
        await page.getByText('Check In Now').click();
        await expect(page).toHaveURL('/check-in');

        // Step 1: Vibe selection
        await expect(page.getByText('HOW ARE YOU?')).toBeVisible();
        await page.getByText('good').click();

        // Step 2: Activities
        await expect(page.getByText('What have you been up to?')).toBeVisible(); // matches uppercase in CSS? Content is "What have you\nbeen up to?"

        // Select activity
        await page.getByText('family').click();

        // Add note
        const noteInput = page.getByPlaceholder('Add Note...');
        await expect(noteInput).toBeVisible();
        await noteInput.fill('Feeling good today!');

        // Save
        await page.getByRole('button', { name: 'Save Vibe Check' }).click();

        await expect(page).toHaveURL('/dashboard');

        // Verify dashboard updates
        // Use first or exact match
        await expect(page.getByText('8', { exact: true })).toBeVisible();
        await expect(page.getByText("Keepin' it steady")).toBeVisible();
    });
});
