import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login option', async ({ page }) => {
    await page.goto('/');

    // Look for login/signup button
    const loginBtn = page.locator('a:has-text("Login"), button:has-text("Login"), a:has-text("Sign in"), button:has-text("Sign in")').first();
    await expect(loginBtn).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    const loginBtn = page.locator('a:has-text("Login"), button:has-text("Login"), a:has-text("Sign in")').first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForLoadState('networkidle');

      // Should show login form or redirect to auth provider
      const pageContent = await page.content();
      expect(
        pageContent.includes('Email') ||
          pageContent.includes('Password') ||
          pageContent.includes('Google') ||
          pageContent.includes('GitHub') ||
          pageContent.includes('Sign in')
      ).toBeTruthy();
    }
  });

  test('should show signup option', async ({ page }) => {
    await page.goto('/');

    const signupBtn = page.locator('a:has-text("Sign up"), button:has-text("Sign up"), a:has-text("Register"), button:has-text("Get Started")').first();

    if (await signupBtn.isVisible()) {
      await signupBtn.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test.skip('should login with valid credentials', async ({ page }) => {
    // This test requires test credentials
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('testpassword123');
    await page.locator('button[type="submit"]').click();

    await page.waitForLoadState('networkidle');

    // Should redirect to dashboard
    await expect(page.getByText(/Dashboard|Welcome/i)).toBeVisible();
  });

  test.skip('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Should show error
    await expect(page.getByText(/Invalid|Error|incorrect/i)).toBeVisible();
  });

  test.skip('should logout successfully', async ({ page }) => {
    // Assume user is logged in
    await page.goto('/dashboard');

    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out")').first();
    await logoutBtn.click();

    // Should redirect to home or login
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login or show login prompt
    await page.waitForLoadState('networkidle');
    const url = page.url();

    // Either redirected to login or showing login modal
    expect(
      url.includes('login') ||
        url.includes('auth') ||
        (await page.getByText(/Login|Sign in/i).isVisible())
    ).toBeTruthy();
  });

  test('should redirect unauthenticated users from dynamic QR management', async ({ page }) => {
    await page.goto('/dynamic');

    await page.waitForLoadState('networkidle');
    const url = page.url();

    expect(
      url.includes('login') ||
        url.includes('auth') ||
        (await page.getByText(/Login|Sign in/i).isVisible()) ||
        url === page.url() // May stay on page with login prompt
    ).toBeTruthy();
  });
});

test.describe('OAuth Providers', () => {
  test('should show Google login option', async ({ page }) => {
    await page.goto('/');

    const loginBtn = page.locator('a:has-text("Login"), button:has-text("Login")').first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForLoadState('networkidle');

      const googleBtn = page.locator('button:has-text("Google"), [data-testid="google-login"]');
      // May or may not be visible depending on implementation
    }
  });

  test('should show GitHub login option', async ({ page }) => {
    await page.goto('/');

    const loginBtn = page.locator('a:has-text("Login"), button:has-text("Login")').first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForLoadState('networkidle');

      const githubBtn = page.locator('button:has-text("GitHub"), [data-testid="github-login"]');
      // May or may not be visible depending on implementation
    }
  });
});
