import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateShortCode,
  isQRExpired,
  getConditionalRedirectUrl,
  DynamicQRCode,
  ConditionalRule
} from '../../lib/supabase';

describe('generateShortCode', () => {
  it('should generate a short code with default length of 6', () => {
    const code = generateShortCode();
    expect(code).toHaveLength(6);
  });

  it('should generate a short code with custom length', () => {
    const code = generateShortCode(10);
    expect(code).toHaveLength(10);
  });

  it('should only contain alphanumeric characters (excluding confusing ones)', () => {
    const code = generateShortCode(100);
    // Should not contain 0, O, 1, l, I (confusing characters)
    expect(code).not.toMatch(/[0O1lI]/);
  });

  it('should generate unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateShortCode());
    }
    // All 100 codes should be unique
    expect(codes.size).toBe(100);
  });
});

describe('isQRExpired', () => {
  it('should return false when expires_at is null', () => {
    const qr = { expires_at: null } as DynamicQRCode;
    expect(isQRExpired(qr)).toBe(false);
  });

  it('should return false when expires_at is undefined', () => {
    const qr = {} as DynamicQRCode;
    expect(isQRExpired(qr)).toBe(false);
  });

  it('should return true when QR code has expired', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
    const qr = { expires_at: pastDate } as DynamicQRCode;
    expect(isQRExpired(qr)).toBe(true);
  });

  it('should return false when QR code has not expired', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
    const qr = { expires_at: futureDate } as DynamicQRCode;
    expect(isQRExpired(qr)).toBe(false);
  });
});

describe('getConditionalRedirectUrl', () => {
  const baseQR: DynamicQRCode = {
    id: 'test-id',
    user_id: 'user-id',
    short_code: 'abc123',
    title: 'Test QR',
    destination_url: 'https://example.com',
    qr_style: {},
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should return destination_url when no conditions are set', () => {
    const url = getConditionalRedirectUrl(baseQR, {});
    expect(url).toBe('https://example.com');
  });

  it('should return expired_redirect_url when QR is expired', () => {
    const expiredQR = {
      ...baseQR,
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      expired_redirect_url: 'https://expired.example.com',
    };
    const url = getConditionalRedirectUrl(expiredQR, {});
    expect(url).toBe('https://expired.example.com');
  });

  it('should return destination_url when QR is expired but no expired_redirect_url set', () => {
    const expiredQR = {
      ...baseQR,
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };
    const url = getConditionalRedirectUrl(expiredQR, {});
    expect(url).toBe('https://example.com');
  });

  it('should match device condition', () => {
    const qrWithDeviceRule: DynamicQRCode = {
      ...baseQR,
      conditional_rules: [
        {
          id: 'rule-1',
          type: 'device',
          condition: { devices: ['mobile'] },
          destinationUrl: 'https://mobile.example.com',
          priority: 1,
        },
      ],
    };

    const url = getConditionalRedirectUrl(qrWithDeviceRule, { device: 'mobile' });
    expect(url).toBe('https://mobile.example.com');
  });

  it('should match location condition', () => {
    const qrWithLocationRule: DynamicQRCode = {
      ...baseQR,
      conditional_rules: [
        {
          id: 'rule-1',
          type: 'location',
          condition: { countries: ['India'] },
          destinationUrl: 'https://india.example.com',
          priority: 1,
        },
      ],
    };

    const url = getConditionalRedirectUrl(qrWithLocationRule, { country: 'India' });
    expect(url).toBe('https://india.example.com');
  });

  it('should select A/B variant when enabled', () => {
    const qrWithAB: DynamicQRCode = {
      ...baseQR,
      ab_testing_enabled: true,
      ab_variants: [
        { id: 'v1', name: 'Variant A', destinationUrl: 'https://a.example.com', weight: 100, scans: 0, conversions: 0 },
      ],
    };

    const url = getConditionalRedirectUrl(qrWithAB, {});
    expect(url).toBe('https://a.example.com');
  });

  it('should match language-specific content', () => {
    const qrWithLanguage: DynamicQRCode = {
      ...baseQR,
      multi_language_enabled: true,
      language_contents: [
        { language: 'hi', destinationUrl: 'https://hindi.example.com' },
        { language: 'en', destinationUrl: 'https://english.example.com' },
      ],
    };

    const url = getConditionalRedirectUrl(qrWithLanguage, { language: 'hi-IN' });
    expect(url).toBe('https://hindi.example.com');
  });

  it('should respect rule priority order', () => {
    const qrWithMultipleRules: DynamicQRCode = {
      ...baseQR,
      conditional_rules: [
        {
          id: 'rule-2',
          type: 'device',
          condition: { devices: ['mobile'] },
          destinationUrl: 'https://low-priority.example.com',
          priority: 2,
        },
        {
          id: 'rule-1',
          type: 'device',
          condition: { devices: ['mobile'] },
          destinationUrl: 'https://high-priority.example.com',
          priority: 1,
        },
      ],
    };

    const url = getConditionalRedirectUrl(qrWithMultipleRules, { device: 'mobile' });
    expect(url).toBe('https://high-priority.example.com');
  });
});
