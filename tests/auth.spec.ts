import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    const uniqueId = Date.now();
    const email = `user${uniqueId}@example.com`;
    const password = 'Password123';
    const displayName = `User ${uniqueId}`;

    test('User can sign up and reach dashboard', async ({ page }) => {
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

        // Step 3: Join/Create Group
        await expect(page.getByText('Find your Squad')).toBeVisible();
        await expect(page.getByText('Create Group')).toBeVisible();

        // Click Create Group
        await page.getByText('Create Group', { exact: false }).click();

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

        await expect(page.getByText('Find your Squad')).toBeVisible();
        await page.getByText('Create Group', { exact: false }).click();

        await expect(page.getByPlaceholder('e.g. The Avengers')).toBeVisible();
        await page.getByPlaceholder('e.g. The Avengers').fill('Logout Group');
        await page.getByRole('button', { name: 'Create Group' }).click();
        await expect(page).toHaveURL('/dashboard');

        // Go to settings
        await page.goto('/settings');
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

        // Click Log Out - might need scrolling or ensuring visibility
        // It's in the profile tab which is default
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
        await page.goto('/onboarding?step=1'); // Force default view
        await expect(page.getByPlaceholder('e.g. Alice')).toBeVisible();
        await page.getByPlaceholder('e.g. Alice').fill('Login User');
        await page.getByRole('button', { name: 'Next Step' }).click();

        await expect(page.getByText('Secure Account')).toBeVisible();
        await page.getByPlaceholder('you@example.com').fill(testEmail);
        await page.locator('input[type="password"]').fill(testPass);
        await page.getByRole('button', { name: 'Continue' }).click();

        await expect(page.getByText('Find your Squad')).toBeVisible();
        await page.getByText('Create Group', { exact: false }).click();

        await expect(page.getByPlaceholder('e.g. The Avengers')).toBeVisible();
        await page.getByPlaceholder('e.g. The Avengers').fill('Login Group');
        await page.getByRole('button', { name: 'Create Group' }).click();
        await expect(page).toHaveURL('/dashboard');

        // Log out
        await page.goto('/settings');
        await page.getByText('Log Out').click();
        await expect(page).toHaveURL(/\/onboarding/);

        // Login
        // Ensure we are on login view or toggle it
        await page.goto('/onboarding?view=login');
        // Check for "Welcome Back"
        await expect(page.getByText('Welcome Back')).toBeVisible();

        await page.getByPlaceholder('you@example.com').fill(testEmail);
        await page.getByPlaceholder('••••••••').fill(testPass);
        await page.getByRole('button', { name: 'Log In' }).click();

        await expect(page).toHaveURL('/dashboard');
    });
});
