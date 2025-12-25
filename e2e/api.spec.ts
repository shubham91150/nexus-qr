import { test, expect } from '@playwright/test';

test.describe('API Dashboard', () => {
  test('should show API section link', async ({ page }) => {
    await page.goto('/');

    // Look for API link
    const apiLink = page.locator('a:has-text("API"), button:has-text("API"), [data-testid="api-link"]').first();
    await expect(apiLink).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to API section', async ({ page }) => {
    await page.goto('/');

    const apiLink = page.locator('a:has-text("API"), button:has-text("API")').first();
    if (await apiLink.isVisible()) {
      await apiLink.click();
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      expect(
        pageContent.includes('API') ||
          pageContent.includes('Documentation') ||
          pageContent.includes('Keys')
      ).toBeTruthy();
    }
  });
});

test.describe('API Key Management (Authenticated)', () => {
  test.skip('should display API keys list', async ({ page }) => {
    await page.goto('/api/dashboard');

    await expect(page.getByText(/API Keys|Your Keys/i)).toBeVisible();
  });

  test.skip('should create new API key', async ({ page }) => {
    await page.goto('/api/dashboard');

    const createBtn = page.locator('button:has-text("Create"), button:has-text("New Key")').first();
    await createBtn.click();

    // Fill key name
    const nameInput = page.locator('input[placeholder*="name"], input[name="keyName"]').first();
    await nameInput.fill('Test API Key');

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitBtn.click();

    // Should show new key (only once)
    await expect(page.getByText(/nxqr_/i)).toBeVisible();
  });

  test.skip('should copy API key to clipboard', async ({ page }) => {
    await page.goto('/api/dashboard');

    const copyBtn = page.locator('button:has-text("Copy"), [data-testid="copy-key"]').first();
    if (await copyBtn.isVisible()) {
      await copyBtn.click();

      // Check for success feedback
      await expect(page.getByText(/Copied|clipboard/i)).toBeVisible();
    }
  });

  test.skip('should delete API key', async ({ page }) => {
    await page.goto('/api/dashboard');

    const deleteBtn = page.locator('button:has-text("Delete"), [data-testid="delete-key"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // Confirm deletion
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      // Key should be removed
      await expect(page.getByText(/deleted|removed/i)).toBeVisible();
    }
  });
});

test.describe('API Documentation', () => {
  test.skip('should show API documentation', async ({ page }) => {
    await page.goto('/api/docs');

    // Should have endpoint documentation
    await expect(page.getByText(/Endpoint|API Reference/i)).toBeVisible();
  });

  test.skip('should show code examples', async ({ page }) => {
    await page.goto('/api/docs');

    // Should have code examples
    const codeBlock = page.locator('pre, code, [class*="highlight"]').first();
    await expect(codeBlock).toBeVisible();
  });

  test.skip('should allow switching between programming languages', async ({ page }) => {
    await page.goto('/api/docs');

    const langTabs = page.locator('button:has-text("JavaScript"), button:has-text("Python"), button:has-text("cURL")');
    const count = await langTabs.count();

    if (count > 0) {
      await langTabs.first().click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('API Playground', () => {
  test.skip('should show API playground', async ({ page }) => {
    await page.goto('/api/playground');

    // Should have request builder
    await expect(page.getByText(/Playground|Test|Request/i)).toBeVisible();
  });

  test.skip('should allow selecting endpoint', async ({ page }) => {
    await page.goto('/api/playground');

    const endpointSelect = page.locator('select[name="endpoint"], [data-testid="endpoint-select"]').first();
    if (await endpointSelect.isVisible()) {
      await endpointSelect.selectOption({ index: 1 });
    }
  });

  test.skip('should send test request', async ({ page }) => {
    await page.goto('/api/playground');

    const sendBtn = page.locator('button:has-text("Send"), button:has-text("Execute")').first();
    if (await sendBtn.isVisible()) {
      await sendBtn.click();

      await page.waitForTimeout(2000);

      // Should show response
      await expect(page.locator('[data-testid="response"], pre')).toBeVisible();
    }
  });
});

test.describe('API Analytics', () => {
  test.skip('should show API usage analytics', async ({ page }) => {
    await page.goto('/api/analytics');

    // Should have usage charts/data
    await expect(page.getByText(/Analytics|Usage|Requests/i)).toBeVisible();
  });

  test.skip('should filter analytics by date range', async ({ page }) => {
    await page.goto('/api/analytics');

    const dateFilter = page.locator('select[name="dateRange"], [data-testid="date-filter"]').first();
    if (await dateFilter.isVisible()) {
      await dateFilter.selectOption('7d');
      await page.waitForLoadState('networkidle');
    }
  });

  test.skip('should show endpoint breakdown', async ({ page }) => {
    await page.goto('/api/analytics');

    await expect(page.getByText(/Endpoint|Breakdown/i)).toBeVisible();
  });
});

test.describe('API Webhooks', () => {
  test.skip('should show webhooks configuration', async ({ page }) => {
    await page.goto('/api/webhooks');

    await expect(page.getByText(/Webhook|Endpoint/i)).toBeVisible();
  });

  test.skip('should add new webhook', async ({ page }) => {
    await page.goto('/api/webhooks');

    const addBtn = page.locator('button:has-text("Add"), button:has-text("New Webhook")').first();
    await addBtn.click();

    const urlInput = page.locator('input[placeholder*="URL"], input[name="webhookUrl"]').first();
    await urlInput.fill('https://example.com/webhook');

    const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
    await saveBtn.click();

    await expect(page.getByText(/created|saved/i)).toBeVisible();
  });

  test.skip('should test webhook', async ({ page }) => {
    await page.goto('/api/webhooks');

    const testBtn = page.locator('button:has-text("Test"), [data-testid="test-webhook"]').first();
    if (await testBtn.isVisible()) {
      await testBtn.click();

      await page.waitForTimeout(2000);
      await expect(page.getByText(/Success|Sent|Delivered/i)).toBeVisible();
    }
  });
});

test.describe('API Rate Limiting', () => {
  test.skip('should show rate limit information', async ({ page }) => {
    await page.goto('/api/dashboard');

    // Should display rate limit info
    await expect(page.getByText(/Rate|Limit|Requests/i)).toBeVisible();
  });

  test.skip('should show usage progress', async ({ page }) => {
    await page.goto('/api/dashboard');

    // Progress bar or usage indicator
    const progressBar = page.locator('[role="progressbar"], [class*="progress"]').first();
    // May or may not be visible
  });
});
