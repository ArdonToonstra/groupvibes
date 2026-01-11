import { test, expect } from '@playwright/test';

// Helper function to get verification code from test endpoint
async function getVerificationCode(page: any): Promise<string | null> {
    try {
        const response = await page.request.get('/api/auth/test-get-code');
        const data = await response.json();
        return data.verificationCode || null;
    } catch {
        return null;
    }
}

// Helper function to check if verification step appears and handle it
async function handleVerificationStepIfNeeded(page: any) {
    await page.waitForTimeout(500);
    const verifyEmailVisible = await page.getByText('Verify Email').isVisible().catch(() => false);

    if (verifyEmailVisible) {
        const code = await getVerificationCode(page);
        if (code) {
            await page.getByPlaceholder('Enter 6-digit code').fill(code);
            await page.getByRole('button', { name: 'Verify Email' }).click();
        }
    }
}

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

        // Handle verification if enabled
        await handleVerificationStepIfNeeded(page);

        // Group Selection
        await expect(page.getByText('Find your Squad')).toBeVisible();
        await page.locator('button:has-text("Create Group")').first().click();

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
        await expect(page.getByRole('heading', { name: /What have you.*been up to/i })).toBeVisible();

        // Select activity
        await page.getByRole('button', { name: 'family' }).click();

        // Add note
        const noteInput = page.getByPlaceholder('Add Note...');
        await expect(noteInput).toBeVisible();
        await noteInput.fill('Feeling good today!');

        // Save
        await page.getByRole('button', { name: 'Save Vibe Check' }).click();

        await expect(page).toHaveURL('/dashboard');

        // Verify dashboard updates
        await expect(page.getByText('8', { exact: false })).toBeVisible();
        await expect(page.getByText("Vibes are immaculate")).toBeVisible();
    });
});
