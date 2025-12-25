import { describe, it, expect } from 'vitest';

// Custom Short URL validation function (same as in DynamicQRForm)
const isValidAlias = (alias: string): boolean => {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(alias);
};

// URL validation function
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

describe('Custom Short URL Alias Validation', () => {
  describe('isValidAlias', () => {
    it('should accept valid aliases', () => {
      expect(isValidAlias('abc')).toBe(true);
      expect(isValidAlias('my-qr-code')).toBe(true);
      expect(isValidAlias('my_qr_code')).toBe(true);
      expect(isValidAlias('MyQRCode123')).toBe(true);
      expect(isValidAlias('a1b2c3')).toBe(true);
    });

    it('should reject aliases shorter than 3 characters', () => {
      expect(isValidAlias('')).toBe(false);
      expect(isValidAlias('a')).toBe(false);
      expect(isValidAlias('ab')).toBe(false);
    });

    it('should reject aliases longer than 30 characters', () => {
      expect(isValidAlias('a'.repeat(31))).toBe(false);
      expect(isValidAlias('a'.repeat(50))).toBe(false);
    });

    it('should accept aliases exactly 3 and 30 characters', () => {
      expect(isValidAlias('abc')).toBe(true);
      expect(isValidAlias('a'.repeat(30))).toBe(true);
    });

    it('should reject aliases with special characters', () => {
      expect(isValidAlias('my@qr')).toBe(false);
      expect(isValidAlias('my#qr')).toBe(false);
      expect(isValidAlias('my qr')).toBe(false);
      expect(isValidAlias('my.qr')).toBe(false);
      expect(isValidAlias('my/qr')).toBe(false);
    });

    it('should accept hyphens and underscores', () => {
      expect(isValidAlias('my-qr')).toBe(true);
      expect(isValidAlias('my_qr')).toBe(true);
      expect(isValidAlias('my-qr_code')).toBe(true);
    });
  });
});

describe('URL Validation', () => {
  describe('isValidUrl', () => {
    it('should accept valid HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://www.example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
    });

    it('should accept valid HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://www.example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('www.example.com')).toBe(false);
    });

    it('should reject non-HTTP protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('file:///path/to/file')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('should accept URLs with ports', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://example.com:8080/api')).toBe(true);
    });

    it('should accept URLs with query parameters and fragments', () => {
      expect(isValidUrl('https://example.com?foo=bar')).toBe(true);
      expect(isValidUrl('https://example.com#section')).toBe(true);
      expect(isValidUrl('https://example.com/path?foo=bar#section')).toBe(true);
    });
  });
});

describe('Folder Name Validation', () => {
  const isValidFolderName = (name: string): boolean => {
    return name.trim().length > 0 && name.trim().length <= 50;
  };

  it('should accept valid folder names', () => {
    expect(isValidFolderName('Marketing')).toBe(true);
    expect(isValidFolderName('Campaign 2024')).toBe(true);
    expect(isValidFolderName('My QR Codes')).toBe(true);
  });

  it('should reject empty folder names', () => {
    expect(isValidFolderName('')).toBe(false);
    expect(isValidFolderName('   ')).toBe(false);
  });

  it('should trim whitespace', () => {
    expect(isValidFolderName('  Marketing  ')).toBe(true);
  });

  it('should reject names longer than 50 characters', () => {
    expect(isValidFolderName('a'.repeat(51))).toBe(false);
  });
});

describe('Color Validation', () => {
  const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  };

  it('should accept valid hex colors', () => {
    expect(isValidHexColor('#000000')).toBe(true);
    expect(isValidHexColor('#FFFFFF')).toBe(true);
    expect(isValidHexColor('#6366f1')).toBe(true);
    expect(isValidHexColor('#ef4444')).toBe(true);
  });

  it('should reject invalid hex colors', () => {
    expect(isValidHexColor('000000')).toBe(false);
    expect(isValidHexColor('#FFF')).toBe(false);
    expect(isValidHexColor('#GGGGGG')).toBe(false);
    expect(isValidHexColor('red')).toBe(false);
    expect(isValidHexColor('')).toBe(false);
  });
});
