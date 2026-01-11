import { test, expect } from '@playwright/test';

test.describe('Data Export', () => {
    test('should include check-ins in the downloaded data', async ({ page, request }) => {
        // 1. Sign up a new user
        const timestamp = Date.now();
        const email = `export_${timestamp}@example.com`;
        const password = 'Password123!';
        const name = 'Export User';

        await page.goto('/onboarding');
        await page.fill('input[placeholder="e.g. Alice"]', name);
        await page.click('button:has-text("Next Step")');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button:has-text("Continue")');

        // Skip group creation, go to dashboard
        await page.goto('/dashboard');
        await expect(page.locator('text="No Group"')).toBeVisible();

        // 2. Perform a Check-in
        console.log('Navigating to check-in page...');
        await page.goto('/check-in');

        // Wait for page load
        await page.waitForTimeout(1000); // Small stability buffer

        console.log('Navigated to check-in page');
        await page.waitForURL('**/check-in');

        // Select Vibe
        console.log('Selecting vibe...');
        await page.click('button:has-text("good")');
        // Select Activity
        console.log('Selecting activity...');
        await page.click('button:has-text("sleep early")');
        // Submit
        console.log('Submitting...');
        await page.click('button:has-text("Save Vibe Check")');

        await page.waitForURL('**/dashboard');

        // 3. Go to Settings and trigger API call directly to inspect response
        // We can't easily intercept the blob download in this way, 
        // so let's fetch the API directly as the authenticated user.

        const response = await request.get('http://localhost:3000/api/settings');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        const fs = require('fs');
        fs.writeFileSync('debug_response.json', JSON.stringify(data, null, 2));

        // Verify User Data
        expect(data.user).toBeDefined();
        expect(data.user.email).toBe(email);

        // Verify Check-ins key exists and has items
        expect(data.checkins).toBeDefined();
        expect(Array.isArray(data.checkins)).toBeTruthy();
        expect(data.checkins.length).toBeGreaterThan(0);

        const checkin = data.checkins[0];
        expect(checkin.vibeScore).toBeDefined();
        // We selected "good", which maps to a score (e.g. 8)
    });
});
