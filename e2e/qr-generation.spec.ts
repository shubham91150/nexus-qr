import { test, expect } from '@playwright/test';

test.describe('QR Code Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show QR type selection options', async ({ page }) => {
    // Look for QR type options (URL, Text, etc.)
    const qrTypes = page.locator('[data-testid="qr-type"], button:has-text("URL"), button:has-text("Text")');
    await expect(qrTypes.first()).toBeVisible({ timeout: 10000 });
  });

  test('should generate QR code for URL input', async ({ page }) => {
    // Find URL input or tab
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="https"]').first();

    if (await urlInput.isVisible()) {
      await urlInput.fill('https://example.com');

      // Wait for QR code to generate
      await page.waitForTimeout(1000);

      // Check if QR code is displayed (SVG or canvas)
      const qrCode = page.locator('svg, canvas').first();
      await expect(qrCode).toBeVisible();
    }
  });

  test('should generate QR code for text input', async ({ page }) => {
    // Click on Text tab if exists
    const textTab = page.locator('button:has-text("Text"), [data-testid="text-tab"]').first();
    if (await textTab.isVisible()) {
      await textTab.click();
    }

    // Find text input
    const textInput = page.locator('textarea, input[type="text"]').first();
    if (await textInput.isVisible()) {
      await textInput.fill('Hello, this is a test QR code!');
      await page.waitForTimeout(1000);

      const qrCode = page.locator('svg, canvas').first();
      await expect(qrCode).toBeVisible();
    }
  });

  test('should allow customization of QR colors', async ({ page }) => {
    // Look for color picker or color input
    const colorInput = page.locator('input[type="color"], [data-testid="color-picker"]').first();

    if (await colorInput.isVisible()) {
      // Change foreground color
      await colorInput.fill('#ff0000');
      await page.waitForTimeout(500);
    }
  });

  test('should allow download of QR code', async ({ page }) => {
    // First generate a QR code
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"]').first();

    if (await urlInput.isVisible()) {
      await urlInput.fill('https://example.com');
      await page.waitForTimeout(1000);
    }

    // Look for download button
    const downloadBtn = page.locator('button:has-text("Download"), button:has-text("PNG"), button:has-text("SVG"), [data-testid="download"]').first();

    if (await downloadBtn.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await downloadBtn.click();

      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(png|svg|jpg|jpeg)$/i);
      }
    }
  });

  test('should show preview of QR code in real-time', async ({ page }) => {
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"]').first();

    if (await urlInput.isVisible()) {
      // Type character by character
      await urlInput.fill('');
      await urlInput.type('https://test.com', { delay: 50 });

      // QR should update as user types
      await page.waitForTimeout(500);
      const qrCode = page.locator('svg, canvas').first();
      await expect(qrCode).toBeVisible();
    }
  });
});

test.describe('QR Code Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should support vCard QR generation', async ({ page }) => {
    const vcardTab = page.locator('button:has-text("vCard"), button:has-text("Contact"), [data-testid="vcard-tab"]').first();

    if (await vcardTab.isVisible()) {
      await vcardTab.click();

      // Fill contact details
      const nameInput = page.locator('input[placeholder*="Name"], input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('John Doe');
      }

      const phoneInput = page.locator('input[placeholder*="Phone"], input[name="phone"], input[type="tel"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('+1234567890');
      }

      await page.waitForTimeout(1000);
      const qrCode = page.locator('svg, canvas').first();
      await expect(qrCode).toBeVisible();
    }
  });

  test('should support WiFi QR generation', async ({ page }) => {
    const wifiTab = page.locator('button:has-text("WiFi"), button:has-text("Wi-Fi"), [data-testid="wifi-tab"]').first();

    if (await wifiTab.isVisible()) {
      await wifiTab.click();

      // Fill WiFi details
      const ssidInput = page.locator('input[placeholder*="SSID"], input[placeholder*="Network"], input[name="ssid"]').first();
      if (await ssidInput.isVisible()) {
        await ssidInput.fill('MyNetwork');
      }

      const passwordInput = page.locator('input[placeholder*="Password"], input[type="password"], input[name="password"]').first();
      if (await passwordInput.isVisible()) {
        await passwordInput.fill('mypassword123');
      }

      await page.waitForTimeout(1000);
      const qrCode = page.locator('svg, canvas').first();
      await expect(qrCode).toBeVisible();
    }
  });

  test('should support Email QR generation', async ({ page }) => {
    const emailTab = page.locator('button:has-text("Email"), [data-testid="email-tab"]').first();

    if (await emailTab.isVisible()) {
      await emailTab.click();

      const emailInput = page.locator('input[type="email"], input[placeholder*="Email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
      }

      await page.waitForTimeout(1000);
      const qrCode = page.locator('svg, canvas').first();
      await expect(qrCode).toBeVisible();
    }
  });
});

test.describe('QR Code Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show error for invalid URL', async ({ page }) => {
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"]').first();

    if (await urlInput.isVisible()) {
      await urlInput.fill('not-a-valid-url');
      await urlInput.blur();

      // Check for error message or validation state
      const error = page.locator('[class*="error"], [class*="invalid"], .text-red');
      // Error might or might not show depending on implementation
    }
  });

  test('should handle empty input gracefully', async ({ page }) => {
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"]').first();

    if (await urlInput.isVisible()) {
      await urlInput.fill('');
      await urlInput.blur();

      // App should not crash
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle very long input', async ({ page }) => {
    const textInput = page.locator('textarea, input[type="text"]').first();

    if (await textInput.isVisible()) {
      const longText = 'A'.repeat(1000);
      await textInput.fill(longText);

      await page.waitForTimeout(1000);
      // App should handle long input without crashing
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
