import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  escapeJs,
  escapeUrlParam,
  stripHtml,
  sanitizeFilename,
  isValidUrl,
  sanitizeUrl,
  isValidRedirectUrl,
  isValidEmail,
  isValidPhone,
  isValidUUID,
  sanitizeInt,
  truncate,
  generateCSRFToken,
  validateCSRFToken,
  checkPasswordStrength,
  containsMaliciousContent,
  validateFileType,
} from '../../lib/security';

// ============================================
// XSS Protection Tests
// ============================================

describe('XSS Protection', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
      expect(escapeHtml("It's fine")).toBe("It&#x27;s fine");
    });

    it('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should escape backticks and equals', () => {
      expect(escapeHtml('`test` = value')).toBe('&#x60;test&#x60; &#x3D; value');
    });
  });

  describe('escapeJs', () => {
    it('should escape JavaScript special characters', () => {
      expect(escapeJs("alert('xss')")).toBe("alert(\\'xss\\')");
      expect(escapeJs('say "hello"')).toBe('say \\"hello\\"');
    });

    it('should escape newlines and tabs', () => {
      expect(escapeJs('line1\nline2')).toBe('line1\\nline2');
      expect(escapeJs('col1\tcol2')).toBe('col1\\tcol2');
    });

    it('should escape closing script tags', () => {
      expect(escapeJs('</script>')).toBe('<\\/script>');
    });
  });

  describe('escapeUrlParam', () => {
    it('should encode special characters', () => {
      expect(escapeUrlParam('hello world')).toBe('hello%20world');
      expect(escapeUrlParam('a=b&c=d')).toBe('a%3Db%26c%3Dd');
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    });

    it('should handle script tags', () => {
      expect(stripHtml('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
    });
  });
});

// ============================================
// URL Security Tests
// ============================================

describe('URL Security', () => {
  describe('isValidUrl', () => {
    it('should accept valid HTTP/HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
      expect(isValidUrl('https://sub.example.com/path?query=1')).toBe(true);
    });

    it('should accept mailto and tel URLs', () => {
      expect(isValidUrl('mailto:test@example.com')).toBe(true);
      expect(isValidUrl('tel:+1234567890')).toBe(true);
    });

    it('should reject javascript: URLs', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
      expect(isValidUrl('JAVASCRIPT:alert(1)')).toBe(false);
    });

    it('should reject data: URLs', () => {
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should reject vbscript: URLs', () => {
      expect(isValidUrl('vbscript:msgbox(1)')).toBe(false);
    });

    it('should accept relative URLs starting with /', () => {
      expect(isValidUrl('/path/to/page')).toBe(true);
      expect(isValidUrl('/api/endpoint?param=value')).toBe(true);
    });

    it('should reject protocol-relative URLs', () => {
      expect(isValidUrl('//evil.com')).toBe(false);
    });

    it('should reject URLs with event handlers', () => {
      expect(isValidUrl('https://example.com" onclick="alert(1)')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return valid URLs unchanged', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should return fallback for malicious URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('/');
      expect(sanitizeUrl('javascript:alert(1)', '/home')).toBe('/home');
    });
  });

  describe('isValidRedirectUrl', () => {
    it('should accept relative URLs', () => {
      expect(isValidRedirectUrl('/dashboard')).toBe(true);
      expect(isValidRedirectUrl('/api/callback')).toBe(true);
    });

    it('should reject protocol-relative URLs', () => {
      expect(isValidRedirectUrl('//evil.com')).toBe(false);
    });

    it('should validate against allowed hosts', () => {
      const allowedHosts = ['example.com', 'trusted.org'];
      expect(isValidRedirectUrl('https://example.com/page', allowedHosts)).toBe(true);
      expect(isValidRedirectUrl('https://sub.example.com/page', allowedHosts)).toBe(true);
      expect(isValidRedirectUrl('https://evil.com/page', allowedHosts)).toBe(false);
    });
  });
});

// ============================================
// Input Validation Tests
// ============================================

describe('Input Validation', () => {
  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@no-local.com')).toBe(false);
    });

    it('should reject emails over 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should accept valid phone numbers', () => {
      expect(isValidPhone('+1234567890')).toBe(true);
      expect(isValidPhone('+1 (234) 567-8900')).toBe(true);
      expect(isValidPhone('1234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      // Phone regex: ^\+?[1-9]\d{1,14}$ (after stripping spaces/hyphens/parens)
      // Must start with 1-9 and have 2-15 digits total
      expect(isValidPhone('0123456789')).toBe(false); // starts with 0
      expect(isValidPhone('abc')).toBe(false); // non-numeric
      expect(isValidPhone('')).toBe(false); // empty
    });
  });

  describe('isValidUUID', () => {
    it('should accept valid UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123e4567-e89b-62d3-a456-426614174000')).toBe(false); // Invalid version
      expect(isValidUUID('123e4567-e89b-12d3-0456-426614174000')).toBe(false); // Invalid variant
    });
  });

  describe('sanitizeInt', () => {
    it('should parse valid integers', () => {
      expect(sanitizeInt('42')).toBe(42);
      expect(sanitizeInt(100)).toBe(100);
    });

    it('should respect min/max bounds', () => {
      expect(sanitizeInt('5', 10, 100)).toBe(10);
      expect(sanitizeInt('150', 10, 100)).toBe(100);
      expect(sanitizeInt('50', 10, 100)).toBe(50);
    });

    it('should return null for non-numbers', () => {
      expect(sanitizeInt('not-a-number')).toBe(null);
      expect(sanitizeInt(undefined)).toBe(null);
    });
  });

  describe('truncate', () => {
    it('should truncate strings exceeding max length', () => {
      expect(truncate('Hello World', 5)).toBe('Hello');
    });

    it('should not modify strings within limit', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });
  });
});

// ============================================
// Filename Security Tests
// ============================================

describe('Filename Security', () => {
  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      // sanitizeFilename removes .. and replaces / with _
      const result1 = sanitizeFilename('../../../etc/passwd');
      expect(result1).not.toContain('..');
      expect(result1).not.toContain('/');

      const result2 = sanitizeFilename('..\\..\\windows\\system32');
      expect(result2).not.toContain('..');
      expect(result2).not.toContain('\\');
    });

    it('should replace dangerous characters', () => {
      const result = sanitizeFilename('file:name<>|?*.txt');
      expect(result).not.toContain(':');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('|');
      expect(result).not.toContain('?');
      expect(result).not.toContain('*');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file name.pdf')).toBe('my_file_name.pdf');
    });

    it('should limit filename length to 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt';
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
    });
  });
});

// ============================================
// CSRF Protection Tests
// ============================================

describe('CSRF Protection', () => {
  describe('generateCSRFToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateCSRFToken', () => {
    it('should validate matching tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, token)).toBe(true);
    });

    it('should reject non-matching tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(validateCSRFToken(token1, token2)).toBe(false);
    });

    it('should reject tokens of different lengths', () => {
      expect(validateCSRFToken('short', 'longer-token')).toBe(false);
    });

    it('should reject empty tokens', () => {
      expect(validateCSRFToken('', '')).toBe(false);
      expect(validateCSRFToken('', 'token')).toBe(false);
    });
  });
});

// ============================================
// Password Security Tests
// ============================================

describe('Password Security', () => {
  describe('checkPasswordStrength', () => {
    it('should score weak passwords low', () => {
      const result = checkPasswordStrength('123');
      expect(result.score).toBeLessThan(3);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should score strong passwords high', () => {
      const result = checkPasswordStrength('MyStr0ng!P@ssw0rd');
      expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it('should detect common patterns', () => {
      const result = checkPasswordStrength('password123');
      expect(result.feedback).toContain('Avoid common patterns');
    });

    it('should require length of at least 8 characters', () => {
      const result = checkPasswordStrength('Aa1!');
      expect(result.feedback).toContain('Use at least 8 characters');
    });
  });
});

// ============================================
// Content Security Tests
// ============================================

describe('Content Security', () => {
  describe('containsMaliciousContent', () => {
    it('should detect script tags', () => {
      expect(containsMaliciousContent('<script>alert(1)</script>')).toBe(true);
    });

    it('should detect javascript: URLs', () => {
      expect(containsMaliciousContent('href="javascript:alert(1)"')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(containsMaliciousContent('onload=alert(1)')).toBe(true);
      expect(containsMaliciousContent('onclick = doEvil()')).toBe(true);
    });

    it('should detect eval calls', () => {
      expect(containsMaliciousContent('eval("code")')).toBe(true);
    });

    it('should detect document manipulation', () => {
      expect(containsMaliciousContent('document.cookie')).toBe(true);
      expect(containsMaliciousContent('document.location')).toBe(true);
    });

    it('should detect dangerous HTML elements', () => {
      expect(containsMaliciousContent('<iframe src="evil.com">')).toBe(true);
      expect(containsMaliciousContent('<object data="evil.swf">')).toBe(true);
    });

    it('should allow safe content', () => {
      expect(containsMaliciousContent('Hello, this is safe content!')).toBe(false);
      expect(containsMaliciousContent('Visit our website at example.com')).toBe(false);
    });
  });

  describe('validateFileType', () => {
    it('should accept valid image types', () => {
      const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFileType(jpegFile, ['image/jpeg', 'image/png'])).toBe(true);
    });

    it('should reject invalid MIME types', () => {
      const exeFile = new File([''], 'test.exe', { type: 'application/x-executable' });
      expect(validateFileType(exeFile, ['image/jpeg', 'image/png'])).toBe(false);
    });

    it('should reject mismatched extension', () => {
      // File claims to be jpeg but has .exe extension
      const fakeImage = new File([''], 'malware.exe', { type: 'image/jpeg' });
      expect(validateFileType(fakeImage, ['image/jpeg'])).toBe(false);
    });
  });
});

// ============================================
// Rate Limiting Tests
// ============================================

describe('Rate Limiting', () => {
  it('should import rate limiter utilities', async () => {
    const { checkRateLimit, RateLimitPresets } = await import('../../lib/rateLimiter');

    expect(typeof checkRateLimit).toBe('function');
    expect(RateLimitPresets.api).toBeDefined();
    expect(RateLimitPresets.auth).toBeDefined();
    expect(RateLimitPresets.upload).toBeDefined();
  });

  it('should allow requests within limit', async () => {
    const { checkRateLimit, RateLimitPresets } = await import('../../lib/rateLimiter');

    const result = checkRateLimit('test-key-1', RateLimitPresets.api);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RateLimitPresets.api.maxRequests - 1);
  });

  it('should block requests exceeding limit', async () => {
    const { checkRateLimit, RateLimitPresets } = await import('../../lib/rateLimiter');

    const key = 'test-key-block-' + Date.now();
    const config = { windowMs: 60000, maxRequests: 3, blockDuration: 1000 };

    // Make requests up to limit
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);

    // Next request should be blocked
    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
  });
});

// ============================================
// SQL Injection Prevention Tests
// ============================================

describe('SQL Injection Prevention', () => {
  it('should have escapeSqlLike function', async () => {
    const { escapeSqlLike } = await import('../../lib/security');

    // escapeSqlLike escapes %, _, and \ for safe use in LIKE patterns
    const result1 = escapeSqlLike('test%value');
    expect(result1).toContain('%');
    expect(result1.includes('\\')).toBe(true); // Contains escape character

    const result2 = escapeSqlLike('test_value');
    expect(result2).toContain('_');

    // Verify dangerous chars are escaped
    expect(escapeSqlLike('100%')).not.toBe('100%');
  });
});
