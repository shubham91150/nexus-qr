/**
 * Zod Validation Schemas for Nexus QR
 *
 * This module provides runtime type validation for all user inputs.
 * It acts as the first line of defense against malformed or malicious data.
 *
 * Security Benefits:
 * - Prevents SQL injection by validating input format
 * - Ensures type safety at runtime
 * - Provides clear error messages
 * - Works alongside Supabase RLS as defense-in-depth
 */

import { z } from 'zod';

// =====================================================
// COMMON SCHEMAS (Reusable building blocks)
// =====================================================

// Safe string that blocks SQL injection patterns
export const SafeStringSchema = z.string()
  .min(1)
  .max(1000)
  .refine(
    (val) => !/[;'"\\]|--|\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|EXEC|EXECUTE)\b/i.test(val),
    { message: 'Input contains potentially unsafe characters' }
  );

// UUID validation
export const UUIDSchema = z.string().uuid();

// URL validation with security checks
export const SafeURLSchema = z.string()
  .url()
  .max(2048)
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Only allow http and https
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'Invalid URL or unsupported protocol' }
  )
  .refine(
    (url) => !url.includes('javascript:') && !url.includes('data:'),
    { message: 'URL contains forbidden protocol' }
  );

// Email validation
export const EmailSchema = z.string()
  .email()
  .max(320)
  .toLowerCase();

// Phone number validation
export const PhoneSchema = z.string()
  .regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number format');

// Slug validation (for short codes and business card slugs)
export const SlugSchema = z.string()
  .min(3)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, hyphens and underscores allowed');

// Short code validation (for QR codes)
export const ShortCodeSchema = z.string()
  .min(4)
  .max(20)
  .regex(/^[a-zA-Z0-9]+$/, 'Only alphanumeric characters allowed');

// Color validation (hex)
export const HexColorSchema = z.string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color');

// =====================================================
// QR CODE SCHEMAS
// =====================================================

// QR Type enum
export const QRTypeSchema = z.enum([
  'url', 'text', 'wifi', 'contact', 'email', 'phone', 'sms', 'geo', 'event',
  'social', 'whatsapp', 'youtube', 'bitcoin', 'coupon', 'upi', 'paypal',
  'telegram', 'spotify', 'instagram', 'twitter', 'linkedin', 'zoom',
  'facebook', 'tiktok', 'pinterest', 'snapchat', 'discord', 'skype',
  'facetime', 'googlemeet', 'googlereview', 'pdf', 'menu', 'audio',
  'video', 'images', 'document', 'appstore', 'ai', 'bulk'
]);

// WiFi data validation
export const WiFiDataSchema = z.object({
  ssid: z.string().min(1).max(32),
  password: z.string().max(63).optional(),
  encryption: z.enum(['WPA', 'WEP', 'nopass']).default('WPA'),
  hidden: z.boolean().default(false),
});

// Contact/vCard data validation
export const ContactDataSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: EmailSchema.optional(),
  phone: PhoneSchema.optional(),
  organization: z.string().max(200).optional(),
  title: z.string().max(100).optional(),
  website: SafeURLSchema.optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    zip: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
  }).optional(),
});

// Event/Calendar data validation
export const EventDataSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  allDay: z.boolean().default(false),
});

// Email data validation
export const EmailDataSchema = z.object({
  address: EmailSchema,
  subject: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
});

// SMS data validation
export const SMSDataSchema = z.object({
  phone: PhoneSchema,
  message: z.string().max(1600).optional(),
});

// Geo location data validation
export const GeoDataSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().max(200).optional(),
});

// =====================================================
// QR STYLE SCHEMAS
// =====================================================

export const QRStyleSchema = z.object({
  size: z.number().min(100).max(4000).default(1000),
  padding: z.number().min(0).max(100).default(20),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).default('M'),
  fgColor: HexColorSchema.default('#000000'),
  bgColor: HexColorSchema.default('#ffffff'),
  isGradient: z.boolean().default(false),
  gradientType: z.enum(['linear', 'radial']).default('linear'),
  fgColor2: HexColorSchema.optional(),
  gradientRotation: z.number().min(0).max(360).default(45),
  bgTransparent: z.boolean().default(false),
  customCornerColor: z.boolean().default(false),
  cornerSquareColor: HexColorSchema.optional(),
  cornerDotColor: HexColorSchema.optional(),
  dotsType: z.string().max(50).default('uniform-pills'),
  cornerSquareType: z.string().max(50).default('three-sided'),
  cornerDotType: z.string().max(50).default('square'),
  frameType: z.string().max(50).default('none'),
  logoImage: z.string().max(500000).nullable().optional(), // Base64 image
  logoSize: z.number().min(0.1).max(0.5).default(0.25),
  logoPadding: z.number().min(0).max(50).default(0),
});

// =====================================================
// DYNAMIC QR SCHEMAS
// =====================================================

// Conditional redirect rule
export const ConditionalRuleSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['time', 'location', 'device', 'language']),
  condition: z.object({
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    countries: z.array(z.string().length(2)).optional(),
    cities: z.array(z.string().max(100)).optional(),
    devices: z.array(z.enum(['mobile', 'tablet', 'desktop'])).optional(),
    os: z.array(z.string().max(50)).optional(),
    browsers: z.array(z.string().max(50)).optional(),
    languages: z.array(z.string().max(10)).optional(),
  }),
  destinationUrl: SafeURLSchema,
  priority: z.number().min(0).max(100),
});

// A/B Test variant
export const ABVariantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  destinationUrl: SafeURLSchema,
  weight: z.number().min(0).max(100),
  scans: z.number().min(0).default(0),
  conversions: z.number().min(0).default(0),
});

// Analytics options
export const AnalyticsOptionsSchema = z.object({
  trackLocation: z.boolean().default(true),
  trackDevice: z.boolean().default(true),
  trackBrowser: z.boolean().default(true),
  trackTime: z.boolean().default(true),
  trackReferrer: z.boolean().default(true),
});

// Password protection
export const PasswordProtectionSchema = z.object({
  enabled: z.boolean(),
  password: z.string().min(4).max(100),
  hint: z.string().max(200).optional(),
});

// UTM parameters
export const UTMParametersSchema = z.object({
  enabled: z.boolean(),
  source: z.string().max(100).optional(),
  medium: z.string().max(100).optional(),
  campaign: z.string().max(100).optional(),
  term: z.string().max(100).optional(),
  content: z.string().max(100).optional(),
});

// Dynamic QR create request
export const DynamicQRCreateSchema = z.object({
  title: z.string().min(1).max(255),
  destination_url: SafeURLSchema,
  qr_style: QRStyleSchema.optional(),
  is_active: z.boolean().default(true),
  expires_at: z.string().datetime().nullable().optional(),
  expired_redirect_url: SafeURLSchema.nullable().optional(),
  conditional_rules: z.array(ConditionalRuleSchema).max(10).optional(),
  ab_testing_enabled: z.boolean().default(false),
  ab_variants: z.array(ABVariantSchema).max(5).optional(),
  analytics_options: AnalyticsOptionsSchema.optional(),
  password_protection: PasswordProtectionSchema.nullable().optional(),
  utm_parameters: UTMParametersSchema.nullable().optional(),
});

// Dynamic QR update request
export const DynamicQRUpdateSchema = DynamicQRCreateSchema.partial();

// =====================================================
// BUSINESS CARD SCHEMAS
// =====================================================

export const BusinessCardSchema = z.object({
  slug: SlugSchema,
  first_name: z.string().min(1).max(100),
  last_name: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  company: z.string().max(200).optional(),
  mobile: PhoneSchema.optional(),
  phone: PhoneSchema.optional(),
  email: EmailSchema.optional(),
  work_email: EmailSchema.optional(),
  website: SafeURLSchema.optional(),
  linkedin: z.string().max(100).optional(),
  twitter: z.string().max(100).optional(),
  instagram: z.string().max(100).optional(),
  facebook: z.string().max(100).optional(),
  github: z.string().max(100).optional(),
  youtube: z.string().max(100).optional(),
  tiktok: z.string().max(100).optional(),
  photo_url: SafeURLSchema.optional(),
  template: z.string().max(50).default('professional'),
  theme_color: HexColorSchema.default('#6366f1'),
  bg_color: HexColorSchema.default('#ffffff'),
  text_color: HexColorSchema.default('#1f2937'),
  is_active: z.boolean().default(true),
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

// =====================================================
// API SCHEMAS
// =====================================================

// API QR create request
export const APIQRCreateSchema = z.object({
  type: z.enum(['url', 'text', 'vcard', 'wifi', 'email', 'sms', 'phone', 'geo', 'event']),
  content: z.union([z.string(), z.record(z.any())]),
  title: z.string().max(255).optional(),
  is_dynamic: z.boolean().default(false),
  options: z.object({
    width: z.number().min(100).max(2000).optional(),
    margin: z.number().min(0).max(10).optional(),
    color: HexColorSchema.optional(),
    background: HexColorSchema.optional(),
    format: z.enum(['png', 'svg', 'base64']).optional(),
    error_correction: z.enum(['L', 'M', 'Q', 'H']).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

// API Bulk QR create request
export const APIBulkQRCreateSchema = z.object({
  items: z.array(APIQRCreateSchema).min(1).max(100),
});

// =====================================================
// TEMPLATE SCHEMAS
// =====================================================

export const TemplateCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  style_config: QRStyleSchema,
  is_public: z.boolean().default(false),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validates data against a schema and returns parsed result or throws
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  return result.data;
}

/**
 * Validates data against a schema and returns result with success flag
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
  return { success: true, data: result.data };
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validates and sanitizes user input for database storage
 */
export function sanitizeForDB(input: string): string {
  return sanitizeString(input)
    .replace(/'/g, "''") // Escape single quotes
    .substring(0, 10000); // Limit length
}
