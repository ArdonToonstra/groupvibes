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
    // Wait a moment for the page to settle
    await page.waitForTimeout(500);

    // Check if verification step is showing
    const verifyEmailVisible = await page.getByText('Verify Email').isVisible().catch(() => false);

    if (verifyEmailVisible) {
        // Verification is enabled - get code and verify
        const code = await getVerificationCode(page);
        if (code) {
            await page.getByPlaceholder('Enter 6-digit code').fill(code);
            await page.getByRole('button', { name: 'Verify Email' }).click();
        }
    }
    // If verification step is not visible, we automatically skipped it
}

test.describe('Authentication', () => {
    test('User can sign up and reach dashboard', async ({ page }) => {
        const uniqueId = Date.now();
        const email = `user${uniqueId}@example.com`;
        const password = 'Password123';
        const displayName = `User ${uniqueId}`;

        await page.goto('/onboarding');

        // Step 1: Display Name
        const nameInput = page.getByPlaceholder('e.g. Alice');
        await expect(nameInput).toBeVisible();
        await nameInput.fill(displayName);
        await page.getByRole('button', { name: 'Next Step' }).click();

        // Step 2: Email & Password - Wait for Secure Account header
        await expect(page.getByText('Secure Account')).toBeVisible();
        const emailInput = page.getByPlaceholder('you@example.com');
        await expect(emailInput).toBeVisible();
        await emailInput.fill(email);

        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: 'Continue' }).click();

        // Step 3: Verification (if enabled) - handled automatically
        await handleVerificationStepIfNeeded(page);

        // Step 4 (or 3 if verification disabled): Group Selection
        await expect(page.getByText('Find your Squad')).toBeVisible();
        await expect(page.getByText('Create Group')).toBeVisible();

        // Click Create Group
        await page.locator('button:has-text("Create Group")').first().click();

        // Group Name
        const groupInput = page.getByPlaceholder('e.g. The Avengers');
        await expect(groupInput).toBeVisible();
        const groupName = `Group ${uniqueId}`;
        await groupInput.fill(groupName);
        await page.getByRole('button', { name: 'Create Group' }).click();

        // Should be redirected to dashboard
        await expect(page).toHaveURL('/dashboard');
        await expect(page.getByText(groupName)).toBeVisible();
    });

    test('User can log out', async ({ page }) => {
        const testId = Date.now() + 1;
        const testEmail = `logout${testId}@example.com`;
        const testPass = 'Password123';

        // Signup
        await page.goto('/onboarding');
        await expect(page.getByPlaceholder('e.g. Alice')).toBeVisible();
        await page.getByPlaceholder('e.g. Alice').fill('Logout User');
        await page.getByRole('button', { name: 'Next Step' }).click();

        await expect(page.getByText('Secure Account')).toBeVisible();
        await page.getByPlaceholder('you@example.com').fill(testEmail);
        await page.locator('input[type="password"]').fill(testPass);
        await page.getByRole('button', { name: 'Continue' }).click();

        // Handle verification if enabled
        await handleVerificationStepIfNeeded(page);

        // Group Selection
        await expect(page.getByText('Find your Squad')).toBeVisible();
        await page.locator('button:has-text("Create Group")').first().click();

        await expect(page.getByPlaceholder('e.g. The Avengers')).toBeVisible();
        await page.getByPlaceholder('e.g. The Avengers').fill('Logout Group');
        await page.getByRole('button', { name: 'Create Group' }).click();
        await expect(page).toHaveURL('/dashboard');

        // Go to settings
        await page.goto('/settings');
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

        // Click Log Out
        const logoutBtn = page.getByText('Log Out');
        await expect(logoutBtn).toBeVisible();
        await logoutBtn.click();

        // Should be back at onboarding
        await expect(page).toHaveURL(/\/onboarding/);
    });

    test('User can log in', async ({ page }) => {
        const testId = Date.now() + 2;
        const testEmail = `login${testId}@example.com`;
        const testPass = 'Password123';

        // Signup first to exist
        await page.goto('/onboarding?step=1');
        await expect(page.getByPlaceholder('e.g. Alice')).toBeVisible();
        await page.getByPlaceholder('e.g. Alice').fill('Login User');
        await page.getByRole('button', { name: 'Next Step' }).click();

        await expect(page.getByText('Secure Account')).toBeVisible();
        await page.getByPlaceholder('you@example.com').fill(testEmail);
        await page.locator('input[type="password"]').fill(testPass);
        await page.getByRole('button', { name: 'Continue' }).click();

        // Handle verification if enabled
        await handleVerificationStepIfNeeded(page);

        // Group Selection
        await expect(page.getByText('Find your Squad')).toBeVisible();
        await page.locator('button:has-text("Create Group")').first().click();

        await expect(page.getByPlaceholder('e.g. The Avengers')).toBeVisible();
        await page.getByPlaceholder('e.g. The Avengers').fill('Login Group');
        await page.getByRole('button', { name: 'Create Group' }).click();
        await expect(page).toHaveURL('/dashboard');

        // Log out
        await page.goto('/settings');
        await page.getByText('Log Out').click();
        await expect(page).toHaveURL(/\/onboarding/);

        // Login
        await page.goto('/onboarding?view=login');
        await expect(page.getByText('Welcome Back')).toBeVisible();

        await page.getByPlaceholder('you@example.com').fill(testEmail);
        await page.getByPlaceholder('••••••••').fill(testPass);
        await page.getByRole('button', { name: 'Log In' }).click();

        await expect(page).toHaveURL('/dashboard');
    });

    test('User can skip group selection', async ({ page }) => {
        const uniqueId = Date.now() + 3;
        const email = `skip${uniqueId}@example.com`;
        const password = 'Password123';
        const displayName = `Skip User ${uniqueId}`;

        await page.goto('/onboarding');

        // Step 1: Display Name
        await page.getByPlaceholder('e.g. Alice').fill(displayName);
        await page.getByRole('button', { name: 'Next Step' }).click();

        // Step 2: Email & Password
        await expect(page.getByText('Secure Account')).toBeVisible();
        await page.getByPlaceholder('you@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: 'Continue' }).click();

        // Handle verification if enabled
        await handleVerificationStepIfNeeded(page);

        // Group Selection - Click Skip
        await expect(page.getByText('Find your Squad')).toBeVisible();
        await page.getByText('Skip for now').click();

        // Should be redirected to dashboard
        await expect(page).toHaveURL('/dashboard');
    });
});
