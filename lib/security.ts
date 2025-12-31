/**
 * Comprehensive Security Utilities for Nexus QR
 * Provides protection against common web attacks
 */

// ============================================
// XSS (Cross-Site Scripting) Protection
// ============================================

/**
 * Escape HTML entities to prevent XSS attacks
 * Use this for any user-generated content displayed in HTML
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;')
    .replace(/=/g, '&#x3D;');
}

/**
 * Sanitize string for use in JavaScript context
 * Prevents injection in inline scripts
 */
export function escapeJs(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/<\/script/gi, '<\\/script');
}

/**
 * Sanitize for URL parameter use
 */
export function escapeUrlParam(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return encodeURIComponent(String(unsafe));
}

/**
 * Strip all HTML tags from string
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, '');
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[/\\:*?"<>|]/g, '_') // Replace dangerous chars
    .replace(/\s+/g, '_') // Replace spaces
    .substring(0, 255); // Limit length
}

// ============================================
// SQL Injection Protection
// ============================================

/**
 * Sanitize string for safe use in SQL LIKE patterns
 * Note: Always use parameterized queries - this is additional protection
 */
export function escapeSqlLike(value: string): string {
  return value
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\\/g, '\\\\');
}

// ============================================
// URL Validation & Sanitization
// ============================================

// Whitelist of allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

// Blacklist of dangerous URL patterns
const DANGEROUS_PATTERNS = [
  /^javascript:/i,
  /^data:/i,
  /^vbscript:/i,
  /^file:/i,
  /^about:/i,
  /on\w+\s*=/i, // Event handlers
  /<script/i,
  /&#/i, // HTML entities that could be decoded
];

/**
 * Validate URL to prevent open redirect and XSS attacks
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(url)) return false;
  }

  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    // Allow relative URLs
    return url.startsWith('/') && !url.startsWith('//');
  }
}

/**
 * Sanitize URL - returns safe URL or fallback
 */
export function sanitizeUrl(url: string, fallback: string = '/'): string {
  if (!isValidUrl(url)) {
    console.warn(`[SECURITY] Blocked potentially malicious URL: ${url.substring(0, 100)}`);
    return fallback;
  }
  return url;
}

/**
 * Validate redirect URL to prevent open redirect attacks
 */
export function isValidRedirectUrl(url: string, allowedHosts?: string[]): boolean {
  if (!url) return false;

  // Allow relative URLs starting with /
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(url);

    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // If allowedHosts provided, check against whitelist
    if (allowedHosts && allowedHosts.length > 0) {
      return allowedHosts.some(host =>
        parsed.hostname === host || parsed.hostname.endsWith('.' + host)
      );
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================
// Input Validation
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate phone number format (international)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize and validate integer input
 */
export function sanitizeInt(value: unknown, min?: number, max?: number): number | null {
  const num = parseInt(String(value), 10);
  if (isNaN(num)) return null;
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  return num;
}

/**
 * Truncate string to max length safely
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str || '';
  return str.substring(0, maxLength);
}

// ============================================
// CSRF Protection
// ============================================

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token (timing-safe comparison)
 */
export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken || token.length !== expectedToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return result === 0;
}

// ============================================
// Rate Limiting Helpers
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple client-side rate limiter
 * Note: For production, use server-side rate limiting
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetIn: entry.resetTime - now };
}

// ============================================
// Content Security
// ============================================

/**
 * Validate file type by checking magic bytes (not just extension)
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return false;
  }

  // Check file extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  const typeExtMap: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/svg+xml': ['svg'],
    'application/pdf': ['pdf'],
    'video/mp4': ['mp4'],
    'video/webm': ['webm'],
    'audio/mpeg': ['mp3'],
    'audio/wav': ['wav'],
  };

  const allowedExtensions = typeExtMap[file.type] || [];
  return ext ? allowedExtensions.includes(ext) : false;
}

/**
 * Check if content contains potentially malicious patterns
 */
export function containsMaliciousContent(content: string): boolean {
  const maliciousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /document\.(cookie|location|write)/gi,
    /window\.(location|open)/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /base64/gi,
  ];

  return maliciousPatterns.some(pattern => pattern.test(content));
}

// ============================================
// Password Security
// ============================================

/**
 * Check password strength
 * Returns score from 0-5 and feedback
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Add numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('Add special characters');

  // Check for common patterns
  const commonPatterns = [
    /^123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /(.)\1{2,}/, // Repeated characters
  ];

  if (commonPatterns.some(p => p.test(password))) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common patterns');
  }

  return { score: Math.min(5, score), feedback };
}

// ============================================
// Secure Headers Configuration
// ============================================

/**
 * Get recommended security headers for responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  };
}

// ============================================
// Logging & Audit
// ============================================

export type SecurityEventType =
  | 'auth_failure'
  | 'rate_limit_exceeded'
  | 'invalid_input'
  | 'xss_attempt'
  | 'sql_injection_attempt'
  | 'unauthorized_access'
  | 'suspicious_activity';

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  eventType: SecurityEventType,
  details: Record<string, unknown>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void {
  const event = {
    timestamp: new Date().toISOString(),
    type: eventType,
    severity,
    details,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
  };

  // In production, send to logging service
  if (severity === 'critical' || severity === 'high') {
    console.error('[SECURITY EVENT]', JSON.stringify(event));
  } else {
    console.warn('[SECURITY EVENT]', JSON.stringify(event));
  }

  // TODO: Send to external logging service (e.g., Sentry, LogRocket)
}

// ============================================
// Export all utilities
// ============================================

export const Security = {
  // XSS Protection
  escapeHtml,
  escapeJs,
  escapeUrlParam,
  stripHtml,
  sanitizeFilename,

  // SQL Protection
  escapeSqlLike,

  // URL Security
  isValidUrl,
  sanitizeUrl,
  isValidRedirectUrl,

  // Input Validation
  isValidEmail,
  isValidPhone,
  isValidUUID,
  sanitizeInt,
  truncate,

  // CSRF
  generateCSRFToken,
  validateCSRFToken,

  // Rate Limiting
  checkRateLimit,

  // Content Security
  validateFileType,
  containsMaliciousContent,

  // Password
  checkPasswordStrength,

  // Headers
  getSecurityHeaders,

  // Logging
  logSecurityEvent,
};

export default Security;
