import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tyuambzppjfvwxkmpgma.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dWFtYnpwcGpmdnd4a21wZ21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDU3MDksImV4cCI6MjA4MDUyMTcwOX0.4-OxuDsfxDf4M5_Xe06x9TC_7hgodZJZp-xzO0U68bA';

// Create client directly - Supabase handles browser environment detection internally
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Export getter for components that need null-safety
export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

// Conditional Redirect Rule
export interface ConditionalRule {
  id: string;
  type: 'time' | 'location' | 'device' | 'language';
  condition: {
    // Time-based
    startTime?: string; // HH:MM format
    endTime?: string;
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    // Location-based
    countries?: string[];
    cities?: string[];
    // Device-based
    devices?: ('mobile' | 'tablet' | 'desktop')[];
    os?: string[];
    browsers?: string[];
    // Language-based
    languages?: string[];
  };
  destinationUrl: string;
  priority: number; // Lower = higher priority
}

// A/B Test Variant
export interface ABTestVariant {
  id: string;
  name: string;
  destinationUrl: string;
  weight: number; // Percentage (0-100)
  scans: number;
  conversions: number;
}

// Multi-language Content
export interface LanguageContent {
  language: string; // 'en', 'hi', 'es', etc.
  destinationUrl: string;
  label?: string;
}

// Analytics Options
export interface AnalyticsOptions {
  trackLocation: boolean;
  trackDevice: boolean;
  trackBrowser: boolean;
  trackTime: boolean;
  trackReferrer: boolean;
}

// Password Protection
export interface PasswordProtection {
  enabled: boolean;
  password: string;
  hint?: string;
}

// Geofencing
export interface GeofenceLocation {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  name?: string;
}

export interface GeofenceSettings {
  enabled: boolean;
  locations: GeofenceLocation[];
  blockOutside: boolean; // true = only allow inside, false = only allow outside
  blockedRedirectUrl?: string;
}

// IP Restriction
export interface IPRestriction {
  enabled: boolean;
  maxScansPerIP: number;
  timeWindowMinutes: number; // e.g., 60 = 1 scan per hour per IP
  blockedRedirectUrl?: string;
}

// UTM Parameters
export interface UTMParameters {
  enabled: boolean;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

// Retargeting Configuration
export interface RetargetingConfig {
  enabled: boolean;
  gtm_id?: string; // Google Tag Manager ID (GTM-XXXXXX)
  facebook_pixel_id?: string; // Facebook Pixel ID
  google_ads_id?: string; // Google Ads Conversion ID
  tiktok_pixel_id?: string; // TikTok Pixel ID
  custom_events?: {
    scan: string; // Event name for scan
    conversion: string; // Event name for conversion
  };
}

// Location Tracking Configuration (IP-based)
export interface LocationTrackingConfig {
  enabled: boolean;
}

// Email Notification Configuration
export interface EmailNotificationConfig {
  enabled: boolean;
  email: string;
  frequency: 'every_scan' | 'first_daily' | 'every_10_scans';
}

// URL History Entry
export interface URLHistoryEntry {
  url: string;
  changed_at: string;
  changed_to: string;
}

// Webhook Configuration
export interface WebhookConfig {
  enabled: boolean;
  url: string;
  secret?: string; // Optional HMAC secret for signature verification
  events: ('scan' | 'url_changed' | 'expired')[];
  headers?: Record<string, string>; // Custom headers
}

// Extended Dynamic QR Code with all features
export interface DynamicQRCode {
  id: string;
  user_id: string;
  short_code: string;
  title: string;
  destination_url: string;
  qr_style: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Expiry Control
  expires_at?: string | null;
  expired_redirect_url?: string | null;

  // Conditional Redirects
  conditional_rules?: ConditionalRule[];

  // A/B Testing
  ab_testing_enabled?: boolean;
  ab_variants?: ABTestVariant[];

  // Multi-language
  multi_language_enabled?: boolean;
  language_contents?: LanguageContent[];
  default_language?: string;

  // Analytics Options
  analytics_options?: AnalyticsOptions;

  // Scan Count (for quick access)
  scan_count?: number;

  // NEW: Password Protection
  password_protection?: PasswordProtection;

  // NEW: Geofencing
  geofence_settings?: GeofenceSettings;

  // NEW: IP Restriction
  ip_restriction?: IPRestriction;

  // NEW: UTM Parameters
  utm_parameters?: UTMParameters;

  // NEW: Retargeting (GTM/Facebook Pixel)
  retargeting_config?: RetargetingConfig;

  // NEW: Location Tracking (IP-based)
  location_tracking_config?: LocationTrackingConfig;

  // NEW: Email Notifications
  email_notification_config?: EmailNotificationConfig;

  // NEW: URL History (track all URL changes)
  url_history?: URLHistoryEntry[];

  // NEW: Webhook Configuration (for scan notifications)
  webhook_config?: WebhookConfig;
}

// QR Scan Record
export interface QRScan {
  id: string;
  qr_id: string;
  scanned_at: string;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  language: string | null;
  user_agent: string | null;

  // A/B Testing
  ab_variant_id?: string | null;
  converted?: boolean;
}

// Real-time scan event
export interface ScanEvent {
  qr_id: string;
  scan: QRScan;
}

// Generate unique short code using cryptographically secure random values
export function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

  // Use crypto.getRandomValues for secure random number generation
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);

    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomValues[i] % chars.length);
    }
    return result;
  }

  // Fallback for environments without crypto (should not happen in browsers)
  // Using a less predictable seed
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomValue = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomValue);
  }
  return result;
}

// Subscribe to real-time scans for a QR code
export function subscribeToScans(
  qrId: string,
  callback: (scan: QRScan) => void
) {
  return supabase
    .channel(`scans:${qrId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'qr_scans',
        filter: `qr_id=eq.${qrId}`,
      },
      (payload) => {
        callback(payload.new as QRScan);
      }
    )
    .subscribe();
}

// Unsubscribe from real-time scans
export function unsubscribeFromScans(qrId: string) {
  return supabase.channel(`scans:${qrId}`).unsubscribe();
}

// Check if QR is expired
export function isQRExpired(qr: DynamicQRCode): boolean {
  if (!qr.expires_at) return false;
  return new Date(qr.expires_at) < new Date();
}

// Get appropriate redirect URL based on conditions
export function getConditionalRedirectUrl(
  qr: DynamicQRCode,
  context: {
    time?: Date;
    country?: string;
    city?: string;
    device?: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
    language?: string;
  }
): string {
  // Check if expired
  if (isQRExpired(qr)) {
    return qr.expired_redirect_url || qr.destination_url;
  }

  // Check conditional rules (sorted by priority)
  if (qr.conditional_rules && qr.conditional_rules.length > 0) {
    const sortedRules = [...qr.conditional_rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (matchesCondition(rule, context)) {
        return rule.destinationUrl;
      }
    }
  }

  // Check A/B testing
  if (qr.ab_testing_enabled && qr.ab_variants && qr.ab_variants.length > 0) {
    return selectABVariant(qr.ab_variants);
  }

  // Check multi-language
  if (qr.multi_language_enabled && qr.language_contents && context.language) {
    const langContent = qr.language_contents.find(
      lc => lc.language.toLowerCase() === context.language?.toLowerCase().substring(0, 2)
    );
    if (langContent) {
      return langContent.destinationUrl;
    }
  }

  return qr.destination_url;
}

// Check if context matches a conditional rule
function matchesCondition(
  rule: ConditionalRule,
  context: {
    time?: Date;
    country?: string;
    city?: string;
    device?: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
    language?: string;
  }
): boolean {
  const { condition } = rule;
  const now = context.time || new Date();

  switch (rule.type) {
    case 'time':
      // Check time of day
      if (condition.startTime && condition.endTime) {
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        if (currentTime < condition.startTime || currentTime > condition.endTime) {
          return false;
        }
      }
      // Check day of week
      if (condition.daysOfWeek && condition.daysOfWeek.length > 0) {
        if (!condition.daysOfWeek.includes(now.getDay())) {
          return false;
        }
      }
      return true;

    case 'location':
      if (condition.countries && condition.countries.length > 0) {
        if (!context.country || !condition.countries.includes(context.country)) {
          return false;
        }
      }
      if (condition.cities && condition.cities.length > 0) {
        if (!context.city || !condition.cities.includes(context.city)) {
          return false;
        }
      }
      return true;

    case 'device':
      if (condition.devices && condition.devices.length > 0) {
        if (!context.device || !condition.devices.includes(context.device)) {
          return false;
        }
      }
      if (condition.os && condition.os.length > 0) {
        if (!context.os || !condition.os.some(o => context.os?.toLowerCase().includes(o.toLowerCase()))) {
          return false;
        }
      }
      if (condition.browsers && condition.browsers.length > 0) {
        if (!context.browser || !condition.browsers.some(b => context.browser?.toLowerCase().includes(b.toLowerCase()))) {
          return false;
        }
      }
      return true;

    case 'language':
      if (condition.languages && condition.languages.length > 0) {
        if (!context.language || !condition.languages.some(l => context.language?.toLowerCase().startsWith(l.toLowerCase()))) {
          return false;
        }
      }
      return true;

    default:
      return false;
  }
}

// Select A/B test variant based on weights
function selectABVariant(variants: ABTestVariant[]): string {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;

  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) {
      return variant.destinationUrl;
    }
  }

  return variants[0].destinationUrl;
}
