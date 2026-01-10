import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Hardcoded Supabase URL (same as frontend) - service key from env
const SUPABASE_URL = 'https://tyuambzppjfvwxkmpgma.supabase.co';

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseServiceKey) {
    console.error('[SUPABASE] SUPABASE_SERVICE_KEY not configured in environment variables!');
    return null;
  }

  console.log('[SUPABASE] Creating client with URL:', SUPABASE_URL);
  supabase = createClient(SUPABASE_URL, supabaseServiceKey);
  return supabase;
}

// ==================== Signed URL Helper Functions ====================

/**
 * Generate a signed URL for secure file access
 * @param filePath - The file path in storage (e.g., user_id/qr_id/filename)
 * @param bucket - The bucket name (qr-media or qr-docs)
 * @param expiresIn - Expiry time in seconds (default 300 = 5 minutes)
 */
async function generateSignedUrl(
  db: SupabaseClient,
  filePath: string,
  bucket: string,
  expiresIn: number = 300
): Promise<string | null> {
  try {
    // Skip if it's already a full URL (external link)
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    const { data, error } = await db.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('[SIGNED_URL] Error generating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[SIGNED_URL] Exception:', err);
    return null;
  }
}

/**
 * Generate signed URLs for multiple files
 */
async function generateSignedUrls(
  db: SupabaseClient,
  filePaths: string[],
  bucket: string,
  expiresIn: number = 300
): Promise<string[]> {
  const urls: string[] = [];
  for (const path of filePaths) {
    const url = await generateSignedUrl(db, path, bucket, expiresIn);
    if (url) urls.push(url);
  }
  return urls;
}

/**
 * Determine bucket from content type
 */
function getBucketForContentType(contentType: string): string {
  const mediaBucketTypes = ['audio', 'video', 'images'];
  const docsBucketTypes = ['pdf', 'document'];

  if (mediaBucketTypes.includes(contentType)) return 'qr-media';
  if (docsBucketTypes.includes(contentType)) return 'qr-docs';
  return 'qr-media'; // default
}

// ==================== Security Helper Functions ====================

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Hash password using SHA-256 for secure comparison
 * Note: In production, use bcrypt with salt. This is a basic implementation.
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Validate URL to prevent open redirect attacks
 * Only allows http:// and https:// URLs
 */
function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    // Block javascript: and data: URIs that might bypass protocol check
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('javascript:') || lowerUrl.includes('data:')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize URL for safe redirect - returns fallback if invalid
 */
function sanitizeRedirectUrl(url: string, fallback: string = '/'): string {
  if (!url || !isValidRedirectUrl(url)) {
    console.warn(`[SECURITY] Invalid redirect URL blocked: ${url}`);
    return fallback;
  }
  return url;
}

// ==================== Duplicate Scan Prevention ====================

/**
 * Check if a duplicate scan exists from the same IP within a time window
 * Rule: Same IP + Same QR + Within 60 seconds = Duplicate (skip logging)
 * @param db - Supabase client
 * @param qrId - QR code ID
 * @param ipAddress - Client IP address
 * @param windowSeconds - Time window in seconds (default 60)
 * @returns true if duplicate exists, false if this is a new scan
 */
async function isDuplicateScan(
  db: SupabaseClient,
  qrId: string,
  ipAddress: string | null,
  windowSeconds: number = 60
): Promise<boolean> {
  // If no IP address, allow the scan (can't deduplicate without IP)
  if (!ipAddress) {
    console.log('[DEDUP] No IP address available, allowing scan');
    return false;
  }

  try {
    // Calculate the time threshold
    const timeThreshold = new Date(Date.now() - windowSeconds * 1000).toISOString();

    // Check for recent scan from same IP + same QR
    const { data: recentScan, error } = await db
      .from('qr_scans')
      .select('id, scanned_at')
      .eq('qr_id', qrId)
      .eq('ip_address', ipAddress)
      .gte('scanned_at', timeThreshold)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[DEDUP] Error checking duplicate scan:', error);
      // On error, allow the scan (fail-open for user experience)
      return false;
    }

    if (recentScan) {
      console.log(`[DEDUP] Duplicate scan detected from IP ${ipAddress} for QR ${qrId}, last scan at ${recentScan.scanned_at}`);
      return true;
    }

    return false;
  } catch (err) {
    console.error('[DEDUP] Exception checking duplicate scan:', err);
    // On exception, allow the scan (fail-open)
    return false;
  }
}

// ==================== Types ====================

// QR Content Types that need custom landing pages
const LANDING_PAGE_TYPES = ['pdf', 'menu', 'audio', 'video', 'images', 'document', 'coupon', 'text'];

// QR Content Types that need smart redirect (device detection)
const SMART_REDIRECT_TYPES = ['appstore'];

// QR Content Types that get direct redirect
const DIRECT_REDIRECT_TYPES = [
  'url', 'youtube', 'instagram', 'twitter', 'linkedin', 'facebook',
  'tiktok', 'pinterest', 'snapchat', 'discord', 'telegram', 'spotify',
  'whatsapp', 'zoom', 'googlemeet', 'googlereview', 'paypal', 'skype', 'social'
];

interface ConditionalRule {
  id: string;
  type: 'time' | 'location' | 'device' | 'language';
  condition: {
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
    countries?: string[];
    cities?: string[];
    devices?: ('mobile' | 'tablet' | 'desktop')[];
    os?: string[];
    browsers?: string[];
    languages?: string[];
  };
  destinationUrl: string;
  priority: number;
}

interface ABTestVariant {
  id: string;
  name: string;
  destinationUrl: string;
  weight: number;
  scans: number;
  conversions: number;
}

interface LanguageContent {
  language: string;
  destinationUrl: string;
  label?: string;
}

interface PasswordProtection {
  enabled: boolean;
  password: string;
  hint?: string;
}

interface GeofenceLocation {
  latitude: number;
  longitude: number;
  radius: number;
  name?: string;
}

interface GeofenceSettings {
  enabled: boolean;
  locations: GeofenceLocation[];
  blockOutside: boolean;
  blockedRedirectUrl?: string;
}

interface IPRestriction {
  enabled: boolean;
  maxScansPerIP: number;
  timeWindowMinutes: number;
  blockedRedirectUrl?: string;
}

interface UTMParameters {
  enabled: boolean;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

interface RetargetingConfig {
  enabled: boolean;
  gtm_id?: string;
  facebook_pixel_id?: string;
  google_ads_id?: string;
  tiktok_pixel_id?: string;
  custom_events?: {
    scan: string;
    conversion: string;
  };
}

interface LocationTrackingConfig {
  enabled: boolean;
}

interface EmailNotificationConfig {
  enabled: boolean;
  email: string;
  frequency: 'every_scan' | 'first_daily' | 'every_10_scans';
}

interface DynamicQRCode {
  id: string;
  destination_url: string;
  is_active: boolean;
  expires_at: string | null;
  expired_redirect_url: string | null;
  conditional_rules: ConditionalRule[] | null;
  ab_testing_enabled: boolean;
  ab_variants: ABTestVariant[] | null;
  multi_language_enabled: boolean;
  language_contents: LanguageContent[] | null;
  default_language: string | null;
  password_protection: PasswordProtection | null;
  geofence_settings: GeofenceSettings | null;
  ip_restriction: IPRestriction | null;
  utm_parameters: UTMParameters | null;
  retargeting_config: RetargetingConfig | null;
  location_tracking_config: LocationTrackingConfig | null;
  email_notification_config: EmailNotificationConfig | null;
  title: string;
  scan_count: number;
}

// ==================== Helper Functions ====================

// Parse user agent to get device info
function parseUserAgent(ua: string): { device: 'mobile' | 'tablet' | 'desktop'; browser: string; os: string } {
  let device: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect device
  if (/Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    device = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
  }

  // Detect browser
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Edge|Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/MSIE|Trident/i.test(ua)) {
    browser = 'Internet Explorer';
  } else if (/Opera|OPR/i.test(ua)) {
    browser = 'Opera';
  }

  // Detect OS
  if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Mac OS X/i.test(ua)) {
    os = /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : 'macOS';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  return { device, browser, os };
}

// Get IP address from request
function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }
  return req.socket?.remoteAddress || '';
}

// Extract primary language from Accept-Language header
function getLanguage(req: VercelRequest): string {
  const acceptLanguage = req.headers['accept-language'];
  if (typeof acceptLanguage === 'string') {
    // Parse "en-US,en;q=0.9,hi;q=0.8" format
    const primary = acceptLanguage.split(',')[0];
    return primary.split('-')[0].toLowerCase(); // Returns 'en', 'hi', etc.
  }
  return 'en';
}

// Fetch geolocation data from IP (using free API over HTTPS)
async function getGeoLocation(ip: string): Promise<{ country: string; city: string; lat?: number; lon?: number } | null> {
  // Skip for localhost/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    console.log('[GEO] Skipping geolocation for private/local IP:', ip);
    return null;
  }

  try {
    console.log('[GEO] Fetching geolocation for IP:', ip);

    // Using ip-api.com (free tier: 45 requests/minute, no API key needed)
    // Note: Free tier requires HTTP (not HTTPS)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,city,lat,lon`, {
      signal: AbortSignal.timeout(3000),
    });

    console.log('[GEO] Response status:', response.status);

    if (!response.ok) {
      console.error('[GEO] API returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[GEO] API response:', JSON.stringify(data));

    // ip-api.com returns status field to indicate success/fail
    if (data.status !== 'success') {
      console.error('[GEO] API returned error:', data.message || 'Unknown error');
      return null;
    }

    const result = {
      country: data.country || null,
      city: data.city || null,
      lat: data.lat,
      lon: data.lon,
    };

    console.log('[GEO] Parsed result:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('[GEO] Exception during geolocation fetch:', error);
    return null;
  }
}

// Send email notification using Resend API
async function sendScanNotification(
  config: EmailNotificationConfig,
  scanData: {
    qrTitle: string;
    city: string | null;
    country: string | null;
    device: string;
    browser: string;
    os: string;
    scanCount: number;
  }
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    console.error('[EMAIL] RESEND_API_KEY not configured in environment variables');
    return;
  }

  // Log key info for debugging (without revealing the full key)
  const keyPrefix = resendApiKey.substring(0, 3);
  const keyLength = resendApiKey.length;
  console.log(`[EMAIL] API key check: prefix="${keyPrefix}", length=${keyLength}, starts_with_re_=${resendApiKey.startsWith('re_')}`);

  // Validate API key format (Resend keys start with 're_')
  if (!resendApiKey.startsWith('re_')) {
    console.error('[EMAIL] Invalid API key format - Resend API keys should start with "re_"');
  }

  // Get custom from domain or use Resend's default
  // IMPORTANT: onboarding@resend.dev only works for sending to the Resend account owner's email
  // For production, set RESEND_FROM_EMAIL env variable with your verified domain
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Nexus QR <onboarding@resend.dev>';

  console.log(`[EMAIL] Attempting to send notification to ${config.email} for QR: ${scanData.qrTitle}`);
  console.log(`[EMAIL] Using from address: ${fromEmail}`);

  try {
    const locationText = scanData.city && scanData.country
      ? `${scanData.city}, ${scanData.country}`
      : scanData.country || 'Unknown location';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: config.email,
        subject: `New QR Scan: ${scanData.qrTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f0;">
              <tr>
                <td align="center" style="padding: 32px 16px;">

                  <!-- Main Card -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 420px; background-color: #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);">

                    <!-- Header Section -->
                    <tr>
                      <td style="padding: 32px 24px 28px 24px; text-align: center; border-bottom: 1px solid #f0f0eb;">
                        <!-- Bell Icon -->
                        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 20px auto;">
                          <tr>
                            <td style="width: 64px; height: 64px; background-color: #f5f5f0; border-radius: 20px; border: 1px solid #e8e8e3; text-align: center; vertical-align: middle;">
                              <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/icons/bell-ring.svg" width="28" height="28" alt="" style="display: inline-block; filter: brightness(0);">
                            </td>
                          </tr>
                        </table>
                        <h1 style="margin: 0 0 8px 0; font-family: 'Playfair Display', Georgia, serif; color: #1a1a1a; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.3;">New QR Scan</h1>
                        <p style="margin: 0; color: #666; font-size: 14px; font-weight: 400;">Someone just scanned your QR code</p>
                      </td>
                    </tr>

                    <!-- QR Code Info Box -->
                    <tr>
                      <td style="padding: 24px 24px 0 24px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="background-color: #f8f8f6; border-radius: 20px; padding: 20px;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                  <td width="60" valign="middle">
                                    <div style="width: 60px; height: 60px; background-color: #1a1a1a; border-radius: 16px; text-align: center; line-height: 60px;">
                                      <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/icons/qr-code.svg" width="26" height="26" alt="" style="vertical-align: middle; filter: brightness(0) invert(1);">
                                    </div>
                                  </td>
                                  <td style="padding-left: 16px;" valign="middle">
                                    <p style="margin: 0 0 6px 0; font-family: 'Playfair Display', Georgia, serif; color: #1a1a1a; font-size: 18px; font-weight: 600;">${scanData.qrTitle}</p>
                                    <p style="margin: 0; color: #666; font-size: 13px;">
                                      <span>${scanData.scanCount + 1} scans</span>
                                      <span style="display: inline-block; width: 4px; height: 4px; background: #ccc; border-radius: 50%; margin: 0 10px; vertical-align: middle;"></span>
                                      <span style="display: inline-block; background: #1a1a1a; color: white; padding: 4px 10px; border-radius: 50px; font-size: 10px; font-weight: 600; letter-spacing: 0.3px;">ACTIVE</span>
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Scan Details -->
                    <tr>
                      <td style="padding: 20px 24px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">

                          <!-- Location -->
                          <tr>
                            <td style="padding: 14px 0; border-bottom: 1px solid #f0f0eb;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                  <td width="48" valign="middle">
                                    <div style="width: 44px; height: 44px; background-color: #f5f5f0; border-radius: 14px; border: 1px solid #e8e8e3; text-align: center; line-height: 44px;">
                                      <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/icons/map-pin.svg" width="20" height="20" alt="" style="vertical-align: middle; filter: brightness(0);">
                                    </div>
                                  </td>
                                  <td style="padding-left: 14px;" valign="middle">
                                    <p style="margin: 0; color: #666; font-size: 12px; font-weight: 500;">Location</p>
                                    <p style="margin: 3px 0 0 0; color: #1a1a1a; font-size: 15px; font-weight: 600;">${locationText}</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Device -->
                          <tr>
                            <td style="padding: 14px 0; border-bottom: 1px solid #f0f0eb;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                  <td width="48" valign="middle">
                                    <div style="width: 44px; height: 44px; background-color: #f5f5f0; border-radius: 14px; border: 1px solid #e8e8e3; text-align: center; line-height: 44px;">
                                      <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/icons/smartphone.svg" width="20" height="20" alt="" style="vertical-align: middle; filter: brightness(0);">
                                    </div>
                                  </td>
                                  <td style="padding-left: 14px;" valign="middle">
                                    <p style="margin: 0; color: #666; font-size: 12px; font-weight: 500;">Device</p>
                                    <p style="margin: 3px 0 0 0; color: #1a1a1a; font-size: 15px; font-weight: 600;">${scanData.device}</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Browser -->
                          <tr>
                            <td style="padding: 14px 0; border-bottom: 1px solid #f0f0eb;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                  <td width="48" valign="middle">
                                    <div style="width: 44px; height: 44px; background-color: #f5f5f0; border-radius: 14px; border: 1px solid #e8e8e3; text-align: center; line-height: 44px;">
                                      <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/icons/globe.svg" width="20" height="20" alt="" style="vertical-align: middle; filter: brightness(0);">
                                    </div>
                                  </td>
                                  <td style="padding-left: 14px;" valign="middle">
                                    <p style="margin: 0; color: #666; font-size: 12px; font-weight: 500;">Browser</p>
                                    <p style="margin: 3px 0 0 0; color: #1a1a1a; font-size: 15px; font-weight: 600;">${scanData.browser} on ${scanData.os}</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Time -->
                          <tr>
                            <td style="padding: 14px 0;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                  <td width="48" valign="middle">
                                    <div style="width: 44px; height: 44px; background-color: #f5f5f0; border-radius: 14px; border: 1px solid #e8e8e3; text-align: center; line-height: 44px;">
                                      <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/icons/clock.svg" width="20" height="20" alt="" style="vertical-align: middle; filter: brightness(0);">
                                    </div>
                                  </td>
                                  <td style="padding-left: 14px;" valign="middle">
                                    <p style="margin: 0; color: #666; font-size: 12px; font-weight: 500;">Time</p>
                                    <p style="margin: 3px 0 0 0; color: #1a1a1a; font-size: 15px; font-weight: 600;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                      <td style="padding: 8px 24px 32px 24px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center">
                              <a href="https://nexus-qr.vercel.app/dashboard" style="display: block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 16px 28px; border-radius: 50px; text-align: center; letter-spacing: -0.2px;">
                                View Dashboard
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 24px; background-color: #f8f8f6; border-top: 1px solid #f0f0eb; text-align: center;">
                        <p style="margin: 0; color: #666; font-size: 13px;">
                          Shared via <a href="https://nexus-qr.vercel.app" style="color: #1a1a1a; text-decoration: none; font-weight: 600;">Nexus QR</a>
                        </p>
                      </td>
                    </tr>

                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EMAIL] Failed to send:', response.status, errorText);
      console.error('[EMAIL] This usually happens when:');
      console.error('[EMAIL] 1. Using onboarding@resend.dev to send to non-account email');
      console.error('[EMAIL] 2. API key is invalid');
      console.error('[EMAIL] 3. Email address is invalid');
    } else {
      const result = await response.json();
      console.log('[EMAIL] Successfully sent to', config.email, 'ID:', result.id);
    }
  } catch (error) {
    console.error('[EMAIL] Error sending notification:', error);
  }
}

// Calculate distance between two coordinates using Haversine formula (in meters)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if user is within geofence
function isWithinGeofence(
  userLat: number | undefined,
  userLon: number | undefined,
  settings: GeofenceSettings
): boolean {
  if (!userLat || !userLon || !settings.locations || settings.locations.length === 0) {
    // If we can't determine location, consider them outside
    return false;
  }

  for (const location of settings.locations) {
    const distance = calculateDistance(userLat, userLon, location.latitude, location.longitude);
    if (distance <= location.radius) {
      return true; // User is within at least one geofence
    }
  }
  return false;
}

// Check IP restriction
async function checkIPRestriction(
  qrId: string,
  clientIP: string,
  restriction: IPRestriction
): Promise<boolean> {
  if (!clientIP) return true; // Can't check without IP

  const db = getSupabaseClient();
  if (!db) return true; // Allow on error

  const timeWindowStart = new Date();
  timeWindowStart.setMinutes(timeWindowStart.getMinutes() - restriction.timeWindowMinutes);

  // Count recent scans from this IP
  const { count, error } = await db
    .from('qr_scans')
    .select('*', { count: 'exact', head: true })
    .eq('qr_id', qrId)
    .eq('ip_address', clientIP)
    .gte('scanned_at', timeWindowStart.toISOString());

  if (error) {
    console.error('Error checking IP restriction:', error);
    return true; // Allow on error
  }

  return (count || 0) < restriction.maxScansPerIP;
}

// Append UTM parameters to URL
function appendUTMParameters(url: string, utm: UTMParameters): string {
  if (!utm.enabled) return url;

  try {
    const urlObj = new URL(url);

    if (utm.source) urlObj.searchParams.set('utm_source', utm.source);
    if (utm.medium) urlObj.searchParams.set('utm_medium', utm.medium);
    if (utm.campaign) urlObj.searchParams.set('utm_campaign', utm.campaign);
    if (utm.term) urlObj.searchParams.set('utm_term', utm.term);
    if (utm.content) urlObj.searchParams.set('utm_content', utm.content);

    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

// Generate password protection page HTML - Premium Design
function getPasswordPage(code: string, hint?: string): string {
  // Escape hint and code to prevent XSS
  const safeHint = hint ? escapeHtml(hint) : '';
  const safeCode = escapeHtml(code);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Password Protected</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src https://fonts.gstatic.com; style-src-elem 'unsafe-inline' https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f0;
          padding: 16px;
          color: #1a1a1a;
        }
        .container { max-width: 420px; width: 100%; }
        .card {
          background: #ffffff;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
        }
        .header {
          padding: 40px 24px 32px;
          background: #ffffff;
          text-align: center;
          position: relative;
          border-bottom: 1px solid #f0f0eb;
        }
        .header-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #f5f5f0 0%, #e8e8e3 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          border: 1px solid #e8e8e3;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }
        .header-icon svg {
          width: 36px;
          height: 36px;
          color: #1a1a1a;
        }
        .header h1 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 28px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 12px;
          line-height: 1.3;
          letter-spacing: -0.5px;
        }
        .header p {
          font-size: 15px;
          color: #666;
          font-weight: 400;
          line-height: 1.5;
        }
        .hint-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #fef3c7;
          color: #92400e;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 500;
          margin-top: 16px;
          border: 1px solid #fcd34d;
        }
        .hint-badge svg {
          width: 14px;
          height: 14px;
        }
        .content {
          padding: 32px 24px;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .input-group {
          position: relative;
        }
        .input-group .key-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: #999;
          pointer-events: none;
        }
        .input-group input {
          width: 100%;
          padding: 18px 52px 18px 52px;
          border: 2px solid #e8e8e3;
          border-radius: 16px;
          font-size: 16px;
          font-family: inherit;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          background: #fafaf8;
        }
        .input-group input:focus {
          outline: none;
          border-color: #1a1a1a;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(26,26,26,0.08);
        }
        .input-group input::placeholder {
          color: #aaa;
        }
        .toggle-password {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none !important;
          border: none !important;
          padding: 0 !important;
          margin: 0;
          width: 24px;
          height: 24px;
          cursor: pointer;
          color: #999;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
          border-radius: 4px !important;
          box-shadow: none !important;
          line-height: 1;
        }
        .toggle-password:hover,
        .toggle-password:focus,
        .toggle-password:active {
          color: #666;
          background: transparent !important;
          transform: translateY(-50%) !important;
          box-shadow: none !important;
          outline: none;
        }
        .toggle-password svg {
          width: 20px;
          height: 20px;
          display: block;
          flex-shrink: 0;
        }
        .error {
          display: none;
          align-items: center;
          gap: 8px;
          padding: 14px 16px;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          border: 1px solid #fecaca;
          margin-top: -8px;
        }
        .error svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .error.show { display: flex; }
        button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 18px 28px;
          background: #1a1a1a;
          color: #ffffff;
          border: none;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: -0.2px;
        }
        button:hover {
          background: #333;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        button:active {
          transform: translateY(0);
        }
        button svg {
          width: 20px;
          height: 20px;
        }
        .footer {
          padding: 20px 24px;
          background: #fafaf8;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #f0f0eb;
        }
        .footer svg {
          width: 14px;
          height: 14px;
          vertical-align: middle;
          margin-right: 4px;
        }

        /* Decorative Elements */
        .decorative-pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #1a1a1a 0%, #4a4a4a 50%, #1a1a1a 100%);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="decorative-pattern"></div>
          <div class="header">
            <div class="header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1>Password Protected</h1>
            <p>This content is secured. Please enter the password to continue.</p>
            ${safeHint ? `
            <div class="hint-badge">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              Hint: ${safeHint}
            </div>
            ` : ''}
          </div>
          <div class="content">
            <form method="POST" action="/api/redirect?code=${safeCode}">
              <div class="input-group">
                <svg class="key-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                <input type="password" id="password" name="password" placeholder="Enter password" required autocomplete="off" />
                <button type="button" class="toggle-password" id="togglePassword" aria-label="Toggle password visibility">
                  <svg id="eyeIcon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <svg id="eyeOffIcon" style="display:none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
              </div>
              <div class="error" id="error">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>Incorrect password. Please try again.</span>
              </div>
              <button type="submit">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Unlock Content
              </button>
            </form>
          </div>
          <div class="footer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Secured by NexusQR
          </div>
        </div>
      </div>
      <script>
        if (new URLSearchParams(window.location.search).get('error') === '1') {
          document.getElementById('error').classList.add('show');
        }

        // Password visibility toggle
        const toggleBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        const eyeIcon = document.getElementById('eyeIcon');
        const eyeOffIcon = document.getElementById('eyeOffIcon');

        toggleBtn.addEventListener('click', function() {
          const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
          passwordInput.setAttribute('type', type);

          if (type === 'text') {
            eyeIcon.style.display = 'none';
            eyeOffIcon.style.display = 'block';
          } else {
            eyeIcon.style.display = 'block';
            eyeOffIcon.style.display = 'none';
          }
        });
      </script>
    </body>
    </html>
  `;
}

// Generate geofence blocked page HTML
// Returns null if redirect should be performed, otherwise returns HTML
function getGeofenceBlockedPage(redirectUrl?: string): { html: string | null; redirect: string | null } {
  if (redirectUrl && isValidRedirectUrl(redirectUrl)) {
    // Return validated redirect URL for server-side redirect
    return { html: null, redirect: sanitizeRedirectUrl(redirectUrl) };
  }
  return {
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Access Restricted</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'">
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
        .card { background: white; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; margin: 20px; }
        .icon { font-size: 48px; margin-bottom: 16px; }
        h1 { color: #e53e3e; margin: 0 0 12px 0; font-size: 24px; }
        p { color: #666; margin: 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">📍</div>
        <h1>Location Restricted</h1>
        <p>This QR code is not available in your current location.</p>
      </div>
    </body>
    </html>
  `,
    redirect: null
  };
}

// Generate IP blocked page HTML
// Returns null if redirect should be performed, otherwise returns HTML
function getIPBlockedPage(redirectUrl?: string): { html: string | null; redirect: string | null } {
  if (redirectUrl && isValidRedirectUrl(redirectUrl)) {
    // Return validated redirect URL for server-side redirect
    return { html: null, redirect: sanitizeRedirectUrl(redirectUrl) };
  }
  return {
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Rate Limited</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'">
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
        .card { background: white; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; margin: 20px; }
        .icon { font-size: 48px; margin-bottom: 16px; }
        h1 { color: #ed8936; margin: 0 0 12px 0; font-size: 24px; }
        p { color: #666; margin: 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">⏱️</div>
        <h1>Too Many Requests</h1>
        <p>You have scanned this QR code too many times. Please try again later.</p>
      </div>
    </body>
    </html>
  `,
    redirect: null
  };
}

// Check if QR code is expired
function isQRExpired(qr: DynamicQRCode): boolean {
  if (!qr.expires_at) return false;
  return new Date(qr.expires_at) < new Date();
}

// ==================== Landing Page Generators ====================

// Premium common styles for all landing pages - Modern Minimal Design
const commonStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh;
    background: #f5f5f0;
    padding: 16px;
    color: #1a1a1a;
  }
  .container { max-width: 420px; margin: 0 auto; padding: 20px 0; }

  /* Card Styles - Clean & Minimal */
  .card {
    background: #ffffff;
    border-radius: 28px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  }

  /* Header - Elegant & Clean */
  .header {
    padding: 32px 24px 28px;
    background: #ffffff;
    text-align: center;
    position: relative;
    border-bottom: 1px solid #f0f0eb;
  }
  .header h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 8px;
    line-height: 1.3;
    letter-spacing: -0.5px;
  }
  .header p {
    font-size: 14px;
    color: #666;
    font-weight: 400;
  }
  .header-icon {
    width: 64px;
    height: 64px;
    background: #f5f5f0;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    border: 1px solid #e8e8e3;
  }
  .header-icon svg { color: #1a1a1a; }

  /* Content Area */
  .content { padding: 24px; }

  /* Buttons - Modern Pill Style */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 28px;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    border: none;
    width: 100%;
    letter-spacing: -0.2px;
  }
  .btn-primary {
    background: #1a1a1a;
    color: #ffffff;
  }
  .btn-primary:hover {
    background: #333;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  }
  .btn-secondary {
    background: #f5f5f0;
    color: #1a1a1a;
    border: 1px solid #e8e8e3;
  }
  .btn-secondary:hover {
    background: #eeeee8;
    transform: translateY(-1px);
  }
  .btn-outline {
    background: transparent;
    border: 2px solid #1a1a1a;
    color: #1a1a1a;
  }
  .btn-outline:hover {
    background: #1a1a1a;
    color: white;
  }
  .btn-success {
    background: #2d8a4e;
    color: white;
  }
  .btn-success:hover {
    background: #247a42;
  }

  /* Footer */
  .footer {
    padding: 20px 24px;
    background: #fafaf8;
    text-align: center;
    font-size: 12px;
    color: #999;
    border-top: 1px solid #f0f0eb;
  }
  .footer a {
    color: #1a1a1a;
    text-decoration: none;
    font-weight: 600;
  }

  /* Stats */
  .stats {
    display: flex;
    justify-content: center;
    gap: 32px;
    padding: 20px 0;
    margin-bottom: 20px;
    border-bottom: 1px solid #f0f0eb;
  }
  .stat { text-align: center; }
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #1a1a1a;
    font-family: 'Playfair Display', Georgia, serif;
  }
  .stat-label {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
  }

  /* Action Grid */
  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  }
  .action-grid .btn {
    padding: 14px 16px;
    font-size: 13px;
    border-radius: 16px;
  }

  /* Badge/Pills */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #f5f5f0;
    color: #1a1a1a;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid #e8e8e3;
  }

  /* Category Pills */
  .category-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 20px;
  }
  .pill {
    padding: 8px 16px;
    background: #ffffff;
    border: 1px solid #e8e8e3;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
  }
  .pill:hover, .pill.active {
    background: #1a1a1a;
    color: white;
    border-color: #1a1a1a;
  }

  /* Divider */
  .divider {
    height: 1px;
    background: #f0f0eb;
    margin: 24px 0;
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade { animation: fadeIn 0.6s ease-out; }
  .animate-slide { animation: slideUp 0.5s ease-out; }

  /* Toast - Modern */
  .toast {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: #1a1a1a;
    color: white;
    padding: 14px 28px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 500;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  }
  .toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  /* Info Box */
  .info-box {
    background: #f5f5f0;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #e8e8e3;
  }
  .info-row:last-child {
    border-bottom: none;
  }
  .info-label {
    font-size: 13px;
    color: #666;
  }
  .info-value {
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
  }

  /* Preview Container */
  .preview-container {
    background: #f5f5f0;
    border-radius: 20px;
    padding: 8px;
    margin-bottom: 20px;
  }
  .preview-inner {
    background: #1a1a1a;
    border-radius: 16px;
    overflow: hidden;
    position: relative;
  }

  /* Quick Actions - Modern Grid */
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .quick-action {
    padding: 16px 12px;
    background: #f5f5f0;
    border-radius: 16px;
    border: 1px solid #e8e8e3;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }
  .quick-action:hover {
    background: #eeeee8;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
  .quick-action svg {
    width: 22px;
    height: 22px;
    color: #1a1a1a;
  }
  .quick-action span {
    font-size: 11px;
    color: #666;
    font-weight: 500;
  }

  /* Media Styles */
  .media-preview {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    border-radius: 16px;
  }

  /* Brand Badge */
  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(26,26,26,0.9);
    color: white;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    position: absolute;
    top: 12px;
    left: 12px;
  }
`;

// PDF Landing Page - Modern Minimal Design
function getPDFLandingPage(title: string, pdfUrl: string): string {
  const safeTitle = escapeHtml(title || 'PDF Document');
  const safePdfUrl = escapeHtml(pdfUrl);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#f5f5f0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <style>${commonStyles}
        .pdf-container {
          position: relative;
          background: #f5f5f0;
          border-radius: 20px;
          padding: 8px;
          margin-bottom: 24px;
        }
        .pdf-inner {
          background: #1a1a1a;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
        }
        .pdf-preview { width: 100%; height: 400px; border: none; display: block; }
        .pdf-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(26,26,26,0.9);
          color: white;
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          backdrop-filter: blur(10px);
        }
        .fullscreen-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255,255,255,0.95);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .fullscreen-btn:hover { transform: scale(1.1); }
        .file-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #f5f5f0;
          border-radius: 16px;
          margin-bottom: 20px;
          border: 1px solid #e8e8e3;
        }
        .file-icon-lg {
          width: 52px;
          height: 52px;
          background: #1a1a1a;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .file-icon-lg svg { width: 24px; height: 24px; color: white; }
        .file-info-text { flex: 1; }
        .file-info-text h3 {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        .file-info-text p { font-size: 13px; color: #888; }
        @media (max-width: 500px) { .pdf-preview { height: 320px; } }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header">
            <div class="header-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h1>${safeTitle}</h1>
            <p>PDF Document</p>
          </div>
          <div class="content">
            <div class="pdf-container">
              <div class="pdf-inner">
                <div class="pdf-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg>
                  PDF
                </div>
                <button class="fullscreen-btn" onclick="document.querySelector('.pdf-preview').requestFullscreen()" title="Fullscreen">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                </button>
                <iframe src="${safePdfUrl}#toolbar=0&navpanes=0" class="pdf-preview" title="PDF Preview" loading="lazy"></iframe>
              </div>
            </div>

            <div class="file-meta">
              <div class="file-icon-lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div class="file-info-text">
                <h3>${safeTitle}</h3>
                <p>Ready to view and download</p>
              </div>
            </div>

            <div class="quick-actions">
              <button class="quick-action" onclick="openPdfSecure()" id="openBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span id="openText">Open</span>
              </button>
              <button class="quick-action" onclick="window.print()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                <span>Print</span>
              </button>
              <button class="quick-action" onclick="shareContent()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
            </div>

            <button onclick="downloadPdf()" class="btn btn-primary" id="downloadBtn" style="margin-bottom: 12px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span id="downloadText">Download PDF</span>
            </button>
          </div>
          <div class="footer">
            <span>Shared via</span> <a href="https://nexusqr.app">Nexus QR</a>
          </div>
        </div>
      </div>
      <div class="toast" id="toast">Link copied!</div>
      <script>
        const pdfUrl = '${safePdfUrl}';

        function shareContent() {
          if (navigator.share) {
            navigator.share({ title: '${safeTitle}', url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
            showToast('Link copied to clipboard!');
          }
        }

        // Secure open - fetches file as blob and opens without exposing storage URL
        let isOpening = false;
        async function openPdfSecure() {
          if (isOpening) return;
          isOpening = true;
          const openBtn = document.getElementById('openBtn');
          const openText = document.getElementById('openText');

          try {
            openText.textContent = 'Loading...';
            openBtn.style.opacity = '0.7';

            const response = await fetch(pdfUrl);
            if (!response.ok) throw new Error('Failed to load');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Open in new tab with blob URL (hides original storage URL)
            window.open(blobUrl, '_blank');

            // Revoke blob URL after delay to allow tab to load
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

          } catch (error) {
            console.error('Open error:', error);
            showToast('Failed to open. Try downloading instead.');
          } finally {
            openText.textContent = 'Open';
            openBtn.style.opacity = '1';
            isOpening = false;
          }
        }

        let isDownloading = false;
        async function downloadPdf() {
          if (isDownloading) return;
          isDownloading = true;
          const downloadBtn = document.getElementById('downloadBtn');
          const downloadText = document.getElementById('downloadText');
          const originalText = downloadText.textContent;

          try {
            downloadText.textContent = 'Downloading...';
            downloadBtn.style.opacity = '0.7';
            downloadBtn.style.cursor = 'wait';

            const response = await fetch(pdfUrl);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = '${safeTitle}'.replace(/[^a-zA-Z0-9\\s-]/g, '') + '.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            showToast('Download started!');
          } catch (error) {
            console.error('Download error:', error);
            showToast('Download failed. Please try again.');
          } finally {
            downloadText.textContent = originalText;
            downloadBtn.style.opacity = '1';
            downloadBtn.style.cursor = 'pointer';
            isDownloading = false;
          }
        }

        function showToast(msg) {
          const toast = document.getElementById('toast');
          toast.textContent = msg;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2500);
        }
      </script>
    </body>
    </html>
  `;
}

// Video Landing Page - Premium
function getVideoLandingPage(title: string, videoUrl: string): string {
  const safeTitle = escapeHtml(title || 'Video');
  const safeVideoUrl = escapeHtml(videoUrl);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeTitle} - Video Player</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#f5f5f0">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>${commonStyles}
        .video-container { position: relative; background: #000; border-radius: 20px; overflow: hidden; margin-bottom: 24px; }
        .video-player { width: 100%; display: block; max-height: 400px; object-fit: contain; }
        .video-badge { position: absolute; top: 16px; left: 16px; background: rgba(26, 26, 26, 0.85); color: white; padding: 8px 16px; border-radius: 50px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(10px); z-index: 10; text-transform: uppercase; }
        .pip-btn { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.95); border: none; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; z-index: 10; }
        .pip-btn:hover { background: white; transform: scale(1.08); }
        .video-info { display: flex; align-items: center; gap: 16px; padding: 20px; background: #f8f8f6; border-radius: 20px; margin-bottom: 20px; }
        .video-icon { width: 60px; height: 60px; background: #1a1a1a; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
        .video-icon svg { width: 26px; height: 26px; color: white; }
        .video-details { flex: 1; }
        .video-details h3 { font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; }
        .video-details p { font-size: 13px; color: #666; display: flex; align-items: center; gap: 10px; }
        .video-details .dot { width: 4px; height: 4px; background: #ccc; border-radius: 50%; }
        .quality-badge { background: #1a1a1a; color: white; padding: 4px 10px; border-radius: 50px; font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
        .quick-actions { display: flex; gap: 10px; margin-bottom: 20px; }
        .quick-action { flex: 1; padding: 16px 12px; background: #f8f8f6; border-radius: 16px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.3s ease; }
        .quick-action:hover { background: #f0f0ec; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #1a1a1a; }
        .quick-action span { font-size: 12px; color: #444; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header">
            <div class="header-badge">Video</div>
            <h1>${safeTitle}</h1>
            <p>Watch and enjoy your video content</p>
          </div>
          <div class="content">
            <div class="video-container">
              <div class="video-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Now Playing
              </div>
              <button class="pip-btn" onclick="togglePiP()" title="Picture in Picture">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="11" y="10" width="10" height="7" rx="1"/></svg>
              </button>
              <video id="videoPlayer" controls class="video-player" playsinline preload="metadata" src="${safeVideoUrl}">
                Your browser does not support the video tag.
              </video>
            </div>

            <div class="video-info">
              <div class="video-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </div>
              <div class="video-details">
                <h3>${safeTitle}</h3>
                <p>
                  <span id="videoDuration">--:--</span>
                  <span class="dot"></span>
                  <span class="quality-badge">HD</span>
                </p>
              </div>
            </div>

            <div class="quick-actions">
              <button class="quick-action" onclick="toggleFullscreen()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                <span>Fullscreen</span>
              </button>
              <button class="quick-action" onclick="changeSpeed()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span id="speedLabel">1x Speed</span>
              </button>
              <button class="quick-action" onclick="shareContent()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
            </div>

            <button onclick="downloadVideo()" class="btn btn-primary" id="downloadBtn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span id="downloadText">Download Video</span>
            </button>
          </div>
          <div class="footer">
            <span>Shared via</span> <a href="https://nexusqr.app">Nexus QR</a>
          </div>
        </div>
      </div>
      <div class="toast" id="toast">Link copied!</div>
      <script>
        const video = document.getElementById('videoPlayer');
        const speeds = [1, 1.25, 1.5, 2, 0.5, 0.75];
        let speedIndex = 0;

        video.addEventListener('loadedmetadata', () => {
          const mins = Math.floor(video.duration / 60);
          const secs = Math.floor(video.duration % 60).toString().padStart(2, '0');
          document.getElementById('videoDuration').textContent = mins + ':' + secs;
        });

        function togglePiP() {
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
          } else if (video.requestPictureInPicture) {
            video.requestPictureInPicture();
          }
        }

        function toggleFullscreen() {
          if (video.requestFullscreen) video.requestFullscreen();
          else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
        }

        function changeSpeed() {
          speedIndex = (speedIndex + 1) % speeds.length;
          video.playbackRate = speeds[speedIndex];
          document.getElementById('speedLabel').textContent = speeds[speedIndex] + 'x Speed';
        }

        function shareContent() {
          if (navigator.share) {
            navigator.share({ title: '${safeTitle}', url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
            showToast('Link copied!');
          }
        }

        let isDownloading = false;
        async function downloadVideo() {
          if (isDownloading) return;
          isDownloading = true;
          const downloadBtn = document.getElementById('downloadBtn');
          const downloadText = document.getElementById('downloadText');
          const originalText = downloadText.textContent;

          try {
            downloadText.textContent = 'Downloading...';
            downloadBtn.style.opacity = '0.7';
            downloadBtn.style.cursor = 'wait';

            const response = await fetch(video.src);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = '${safeTitle}'.replace(/[^a-zA-Z0-9\\s-]/g, '') + '.mp4';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            showToast('Download started!');
          } catch (error) {
            console.error('Download error:', error);
            showToast('Download failed. Please try again.');
          } finally {
            downloadText.textContent = originalText;
            downloadBtn.style.opacity = '1';
            downloadBtn.style.cursor = 'pointer';
            isDownloading = false;
          }
        }

        function showToast(msg) {
          const toast = document.getElementById('toast');
          toast.textContent = msg;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2500);
        }
      </script>
    </body>
    </html>
  `;
}

// Audio Landing Page
function getAudioLandingPage(title: string, audioUrl: string, artist?: string): string {
  const safeTitle = escapeHtml(title || 'Audio');
  const safeAudioUrl = escapeHtml(audioUrl);
  const safeArtist = artist ? escapeHtml(artist) : 'Unknown Artist';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeTitle} - Audio Player</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#f5f5f0">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>${commonStyles}
        .album-art { width: 200px; height: 200px; background: #1a1a1a; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 28px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); position: relative; overflow: hidden; }
        .album-art::before { content: ''; position: absolute; inset: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/><circle cx="50" cy="50" r="20" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/><circle cx="50" cy="50" r="10" fill="rgba(255,255,255,0.15)"/></svg>') center/60% no-repeat; }
        .album-art svg { width: 70px; height: 70px; color: rgba(255,255,255,0.85); position: relative; z-index: 1; }
        .album-art.playing { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .audio-title { font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; text-align: center; }
        .audio-artist { font-size: 15px; color: #666; margin-bottom: 32px; text-align: center; }

        /* Waveform Visualization */
        .waveform { display: flex; align-items: center; justify-content: center; gap: 3px; height: 50px; margin-bottom: 20px; padding: 0 20px; }
        .wave-bar { width: 4px; background: #1a1a1a; border-radius: 4px; transition: height 0.1s ease; }
        .wave-bar.active { animation: wave 0.5s ease-in-out infinite alternate; }
        @keyframes wave { 0% { height: 20%; } 100% { height: 100%; } }

        /* Custom Player */
        .player-container { background: #f8f8f6; border-radius: 24px; padding: 28px; margin-bottom: 24px; }
        .progress-container { position: relative; margin-bottom: 24px; }
        .progress-bar { width: 100%; height: 6px; background: #e8e8e6; border-radius: 3px; cursor: pointer; position: relative; overflow: hidden; }
        .progress-fill { height: 100%; background: #1a1a1a; border-radius: 3px; width: 0%; transition: width 0.1s linear; }
        .progress-thumb { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 16px; height: 16px; background: white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.15); left: 0%; transition: left 0.1s linear; cursor: grab; }
        .time-display { display: flex; justify-content: space-between; margin-top: 10px; font-size: 13px; color: #666; font-weight: 500; font-variant-numeric: tabular-nums; }

        /* Controls */
        .controls { display: flex; align-items: center; justify-content: center; gap: 20px; }
        .control-btn { width: 52px; height: 52px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
        .control-btn.secondary { background: #e8e8e6; }
        .control-btn.secondary:hover { background: #ddd; transform: scale(1.08); }
        .control-btn.secondary svg { width: 20px; height: 20px; color: #444; }
        .play-btn { width: 76px; height: 76px; background: #1a1a1a; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2); }
        .play-btn:hover { transform: scale(1.06); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25); }
        .play-btn svg { width: 32px; height: 32px; color: white; margin-left: 3px; }
        .play-btn.playing svg { margin-left: 0; }

        /* Volume Control */
        .volume-container { display: flex; align-items: center; gap: 12px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e8e8e6; }
        .volume-icon { color: #666; cursor: pointer; }
        .volume-slider { flex: 1; height: 4px; background: #e8e8e6; border-radius: 2px; -webkit-appearance: none; appearance: none; cursor: pointer; }
        .volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #1a1a1a; border-radius: 50%; cursor: pointer; }

        /* Quick Actions */
        .quick-actions { display: flex; gap: 10px; margin-bottom: 20px; }
        .quick-action { flex: 1; padding: 16px 12px; background: #f8f8f6; border-radius: 16px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.3s ease; }
        .quick-action:hover { background: #f0f0ec; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #1a1a1a; }
        .quick-action span { font-size: 12px; color: #444; font-weight: 500; }

        /* Speed Control */
        .speed-badge { font-size: 11px; background: #1a1a1a; color: white; padding: 5px 10px; border-radius: 50px; font-weight: 600; cursor: pointer; }

        audio { display: none; }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header">
            <div class="header-badge">Audio</div>
            <h1>Now Playing</h1>
            <p>Listen to your audio content</p>
          </div>
          <div class="content">
            <div class="album-art" id="albumArt">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>

            <h2 class="audio-title">${safeTitle}</h2>
            <p class="audio-artist">${safeArtist}</p>

            <!-- Waveform Visualization -->
            <div class="waveform" id="waveform">
              ${Array(20).fill(0).map((_, i) => `<div class="wave-bar" style="height: ${20 + Math.random() * 60}%; animation-delay: ${i * 0.05}s;"></div>`).join('')}
            </div>

            <div class="player-container">
              <div class="progress-container">
                <div class="progress-bar" id="progressBar" onclick="seek(event)">
                  <div class="progress-fill" id="progressFill"></div>
                  <div class="progress-thumb" id="progressThumb"></div>
                </div>
                <div class="time-display">
                  <span id="currentTime">0:00</span>
                  <span class="speed-badge" id="speedBadge" onclick="cycleSpeed()">1x</span>
                  <span id="duration">0:00</span>
                </div>
              </div>

              <div class="controls">
                <button class="control-btn secondary" onclick="skip(-10)" title="Rewind 10s">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><text x="12" y="15" font-size="7" fill="currentColor" text-anchor="middle">10</text></svg>
                </button>
                <button class="control-btn play-btn" id="playBtn" onclick="togglePlay()">
                  <svg id="playIcon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
                <button class="control-btn secondary" onclick="skip(10)" title="Forward 10s">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/><text x="12" y="15" font-size="7" fill="currentColor" text-anchor="middle">10</text></svg>
                </button>
              </div>

              <div class="volume-container">
                <svg class="volume-icon" id="volumeIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" onclick="toggleMute()"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="80" oninput="setVolume(this.value)">
              </div>
            </div>

            <div class="quick-actions">
              <button class="quick-action" onclick="shareAudio()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
              <button class="quick-action" onclick="downloadAudio()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download</span>
              </button>
              <button class="quick-action" onclick="cycleSpeed()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Speed</span>
              </button>
              <button class="quick-action" id="loopBtn" onclick="toggleLoop()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                <span>Loop</span>
              </button>
            </div>

            <button onclick="downloadAudio()" class="btn btn-primary" id="downloadBtn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span id="downloadText">Download Audio</span>
            </button>
          </div>
          <div class="footer">
            <span>Shared via</span> <a href="https://nexusqr.app">Nexus QR</a>
          </div>
        </div>
      </div>

      <div class="toast" id="toast">Link copied!</div>

      <audio id="audio" src="${safeAudioUrl}" preload="metadata"></audio>

      <script>
        const audio = document.getElementById('audio');
        const playBtn = document.getElementById('playBtn');
        const playIcon = document.getElementById('playIcon');
        const albumArt = document.getElementById('albumArt');
        const progressFill = document.getElementById('progressFill');
        const progressThumb = document.getElementById('progressThumb');
        const currentTimeEl = document.getElementById('currentTime');
        const durationEl = document.getElementById('duration');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeIcon = document.getElementById('volumeIcon');
        const speedBadge = document.getElementById('speedBadge');
        const loopBtn = document.getElementById('loopBtn');
        const waveform = document.getElementById('waveform');
        const waveBars = waveform.querySelectorAll('.wave-bar');

        let isPlaying = false;
        let speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        let currentSpeedIndex = 2;

        audio.volume = 0.8;

        function formatTime(seconds) {
          if (isNaN(seconds)) return '0:00';
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return mins + ':' + secs.toString().padStart(2, '0');
        }

        function togglePlay() {
          if (isPlaying) {
            audio.pause();
            playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
            playBtn.classList.remove('playing');
            albumArt.classList.remove('playing');
            waveBars.forEach(bar => bar.classList.remove('active'));
          } else {
            audio.play();
            playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
            playBtn.classList.add('playing');
            albumArt.classList.add('playing');
            waveBars.forEach(bar => bar.classList.add('active'));
          }
          isPlaying = !isPlaying;
        }

        audio.addEventListener('loadedmetadata', () => {
          durationEl.textContent = formatTime(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
          const percent = (audio.currentTime / audio.duration) * 100;
          progressFill.style.width = percent + '%';
          progressThumb.style.left = percent + '%';
          currentTimeEl.textContent = formatTime(audio.currentTime);
        });

        audio.addEventListener('ended', () => {
          if (!audio.loop) {
            isPlaying = false;
            playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
            playBtn.classList.remove('playing');
            albumArt.classList.remove('playing');
            waveBars.forEach(bar => bar.classList.remove('active'));
            progressFill.style.width = '0%';
            progressThumb.style.left = '0%';
          }
        });

        function seek(e) {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          audio.currentTime = percent * audio.duration;
        }

        function skip(seconds) {
          audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
        }

        function setVolume(value) {
          audio.volume = value / 100;
          updateVolumeIcon();
        }

        function toggleMute() {
          audio.muted = !audio.muted;
          volumeSlider.value = audio.muted ? 0 : audio.volume * 100;
          updateVolumeIcon();
        }

        function updateVolumeIcon() {
          if (audio.muted || audio.volume === 0) {
            volumeIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
          } else if (audio.volume < 0.5) {
            volumeIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
          } else {
            volumeIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>';
          }
        }

        function cycleSpeed() {
          currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
          audio.playbackRate = speeds[currentSpeedIndex];
          speedBadge.textContent = speeds[currentSpeedIndex] + 'x';
          showToast('Speed: ' + speeds[currentSpeedIndex] + 'x');
        }

        function toggleLoop() {
          audio.loop = !audio.loop;
          loopBtn.style.background = audio.loop ? 'rgba(26, 26, 26, 0.1)' : '';
          loopBtn.querySelector('svg').style.color = audio.loop ? '#1a1a1a' : '';
          showToast(audio.loop ? 'Loop enabled' : 'Loop disabled');
        }

        function shareAudio() {
          if (navigator.share) {
            navigator.share({ title: '${safeTitle}', text: 'Listen to ${safeTitle}', url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
            showToast('Link copied!');
          }
        }

        let isDownloading = false;
        async function downloadAudio() {
          if (isDownloading) return;
          isDownloading = true;
          const downloadBtn = document.getElementById('downloadBtn');
          const downloadText = document.getElementById('downloadText');
          const originalText = downloadText.textContent;

          try {
            downloadText.textContent = 'Downloading...';
            downloadBtn.style.opacity = '0.7';
            downloadBtn.style.cursor = 'wait';

            const response = await fetch(audio.src);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = '${safeTitle}'.replace(/[^a-zA-Z0-9\\s-]/g, '') + '.mp3';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            showToast('Download started!');
          } catch (error) {
            console.error('Download error:', error);
            showToast('Download failed. Please try again.');
          } finally {
            downloadText.textContent = originalText;
            downloadBtn.style.opacity = '1';
            downloadBtn.style.cursor = 'pointer';
            isDownloading = false;
          }
        }

        function showToast(message) {
          const toast = document.getElementById('toast');
          toast.textContent = message;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2000);
        }

        // Space bar to play/pause
        document.addEventListener('keydown', (e) => {
          if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            togglePlay();
          }
          if (e.code === 'ArrowLeft') skip(-10);
          if (e.code === 'ArrowRight') skip(10);
        });
      </script>
    </body>
    </html>
  `;
}


// Images Gallery Landing Page - Modern Minimal Design
function getImagesLandingPage(title: string, imageUrls: string[]): string {
  const safeTitle = escapeHtml(title || 'Photo Gallery');
  const safeUrls = imageUrls.map(url => escapeHtml(url));
  const imageCount = safeUrls.length;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
      <meta name="theme-color" content="#f5f5f0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #f5f5f0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .header {
          background: #fff;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .header-icon {
          width: 44px;
          height: 44px;
          background: #1a1a1a;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .header-icon svg { width: 20px; height: 20px; color: white; }
        .header-title { font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 600; color: #1a1a1a; }
        .header-subtitle { font-size: 13px; color: #666; margin-top: 2px; }
        .header-btn {
          width: 44px;
          height: 44px;
          background: #f8f8f6;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .header-btn:hover { background: #f0f0ec; transform: scale(1.05); }
        .header-btn svg { width: 18px; height: 18px; color: #1a1a1a; }

        /* Main Content - Image Viewer */
        .viewer {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #f5f5f0;
        }
        .image-container {
          position: relative;
          max-width: 100%;
          max-height: calc(100vh - 200px);
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .main-image {
          display: block;
          max-width: 100%;
          max-height: calc(100vh - 200px);
          object-fit: contain;
          cursor: pointer;
        }

        /* Counter Badge */
        .counter {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(26,26,26,0.85);
          color: white;
          padding: 8px 16px;
          border-radius: 50px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.3px;
          backdrop-filter: blur(10px);
        }

        /* Navigation Arrows */
        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.95);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
          transition: all 0.3s ease;
          z-index: 10;
        }
        .nav-btn:hover { background: #fff; transform: translateY(-50%) scale(1.08); }
        .nav-btn svg { width: 22px; height: 22px; color: #1a1a1a; }
        .nav-prev { left: -24px; }
        .nav-next { right: -24px; }
        @media (max-width: 600px) {
          .nav-prev { left: 10px; }
          .nav-next { right: 10px; }
        }

        /* Thumbnail Strip */
        .thumbs {
          display: ${imageCount > 1 ? 'flex' : 'none'};
          gap: 10px;
          padding: 18px 20px;
          background: #fff;
          overflow-x: auto;
          justify-content: center;
        }
        .thumbs::-webkit-scrollbar { display: none; }
        .thumb {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          flex-shrink: 0;
          border: 3px solid transparent;
          transition: all 0.3s ease;
          opacity: 0.5;
        }
        .thumb:hover { opacity: 0.8; }
        .thumb.active { border-color: #1a1a1a; opacity: 1; }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }

        /* Bottom Actions */
        .actions {
          display: flex;
          justify-content: center;
          gap: 40px;
          padding: 18px 20px;
          background: #fff;
        }
        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 10px;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        .action-btn:hover { background: #f8f8f6; }
        .action-btn svg { width: 24px; height: 24px; color: #1a1a1a; }
        .action-btn span { font-size: 12px; color: #444; font-weight: 500; }

        /* Fullscreen Lightbox */
        .lightbox {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.96);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        .lightbox.active { display: flex; }
        .lightbox-close {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: all 0.3s ease;
        }
        .lightbox-close:hover { background: rgba(255,255,255,0.2); }
        .lightbox-close svg { width: 24px; height: 24px; color: white; }
        .lightbox-image {
          max-width: 95vw;
          max-height: 95vh;
          object-fit: contain;
          border-radius: 8px;
        }
        .lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 56px;
          height: 56px;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .lightbox-nav:hover { background: rgba(255,255,255,0.2); }
        .lightbox-nav svg { width: 26px; height: 26px; color: white; }
        .lightbox-prev { left: 24px; }
        .lightbox-next { right: 24px; }
        .lightbox-counter {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-size: 14px;
          font-weight: 500;
          background: rgba(0,0,0,0.5);
          padding: 8px 20px;
          border-radius: 50px;
        }

        /* Toast */
        .toast {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          background: #1a1a1a;
          color: white;
          padding: 14px 28px;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 500;
          opacity: 0;
          transition: all 0.3s ease;
          z-index: 2000;
        }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      </style>
    </head>
    <body>
      <!-- Header -->
      <header class="header">
        <div class="header-left">
          <div class="header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div>
            <div class="header-title">${safeTitle}</div>
            <div class="header-subtitle">${imageCount} photo${imageCount > 1 ? 's' : ''}</div>
          </div>
        </div>
        <button class="header-btn" onclick="shareGallery()" title="Share">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </header>

      <!-- Main Viewer -->
      <div class="viewer">
        <div class="image-container">
          ${imageCount > 1 ? '<div class="counter"><span id="currentNum">1</span> / ' + imageCount + '</div>' : ''}
          <img id="mainImage" src="${safeUrls[0]}" alt="${safeTitle}" class="main-image" onclick="openLightbox()">
          ${imageCount > 1 ? `
          <button class="nav-btn nav-prev" onclick="prevImage()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="nav-btn nav-next" onclick="nextImage()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          ` : ''}
        </div>
      </div>

      <!-- Thumbnails -->
      <div class="thumbs">
        ${safeUrls.map((url, i) => `
          <div class="thumb ${i === 0 ? 'active' : ''}" onclick="goToImage(${i})">
            <img src="${url}" alt="Thumb ${i + 1}">
          </div>
        `).join('')}
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="action-btn" onclick="downloadCurrent()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Download</span>
        </button>
        <button class="action-btn" onclick="shareGallery()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span>Share</span>
        </button>
        <button class="action-btn" onclick="openLightbox()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          <span>Fullscreen</span>
        </button>
      </div>

      <!-- Fullscreen Lightbox -->
      <div class="lightbox" id="lightbox" onclick="closeLightbox()">
        <button class="lightbox-close" onclick="closeLightbox()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        ${imageCount > 1 ? `
        <button class="lightbox-nav lightbox-prev" onclick="event.stopPropagation(); prevImage()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        ` : ''}
        <img id="lightboxImage" src="${safeUrls[0]}" alt="${safeTitle}" class="lightbox-image" onclick="event.stopPropagation()">
        ${imageCount > 1 ? `
        <button class="lightbox-nav lightbox-next" onclick="event.stopPropagation(); nextImage()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <div class="lightbox-counter"><span id="lbNum">1</span> / ${imageCount}</div>
        ` : ''}
      </div>

      <div class="toast" id="toast"></div>

      <script>
        const images = ${JSON.stringify(safeUrls)};
        let currentIndex = 0;

        function updateImage() {
          document.getElementById('mainImage').src = images[currentIndex];
          document.getElementById('lightboxImage').src = images[currentIndex];
          ${imageCount > 1 ? `
          document.getElementById('currentNum').textContent = currentIndex + 1;
          document.getElementById('lbNum').textContent = currentIndex + 1;
          document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === currentIndex));
          ` : ''}
        }

        function prevImage() { currentIndex = (currentIndex - 1 + images.length) % images.length; updateImage(); }
        function nextImage() { currentIndex = (currentIndex + 1) % images.length; updateImage(); }
        function goToImage(i) { currentIndex = i; updateImage(); }

        function openLightbox() {
          document.getElementById('lightbox').classList.add('active');
          document.body.style.overflow = 'hidden';
        }
        function closeLightbox() {
          document.getElementById('lightbox').classList.remove('active');
          document.body.style.overflow = '';
        }

        async function downloadCurrent() {
          showToast('Downloading...');
          try {
            const response = await fetch(images[currentIndex]);
            if (!response.ok) throw new Error('Failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '${safeTitle.replace(/[^a-zA-Z0-9]/g, '_')}' + (images.length > 1 ? '_' + (currentIndex + 1) : '') + '.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            showToast('Download started');
          } catch (e) { showToast('Download failed'); }
        }

        function shareGallery() {
          if (navigator.share) {
            navigator.share({ title: '${safeTitle}', url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
            showToast('Link copied!');
          }
        }

        function showToast(msg) {
          const t = document.getElementById('toast');
          t.textContent = msg;
          t.classList.add('show');
          setTimeout(() => t.classList.remove('show'), 2500);
        }

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') closeLightbox();
          if (e.key === 'ArrowLeft') prevImage();
          if (e.key === 'ArrowRight') nextImage();
        });

        let touchStartX = 0;
        document.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; });
        document.addEventListener('touchend', (e) => {
          const diff = touchStartX - e.changedTouches[0].screenX;
          if (Math.abs(diff) > 50) { diff > 0 ? nextImage() : prevImage(); }
        });
      </script>
    </body>
    </html>
  `;
}

// Document Landing Page - Modern Minimal Design
function getDocumentLandingPage(title: string, docUrl: string, fileType?: string): string {
  const safeTitle = escapeHtml(title || 'Document');
  const safeDocUrl = escapeHtml(docUrl);
  const safeFileType = fileType ? escapeHtml(fileType.toUpperCase()) : 'DOC';

  const fileTypeConfig: Record<string, { description: string }> = {
    'PDF': { description: 'Portable Document' },
    'DOC': { description: 'Word Document' },
    'DOCX': { description: 'Word Document' },
    'XLS': { description: 'Excel Spreadsheet' },
    'XLSX': { description: 'Excel Spreadsheet' },
    'PPT': { description: 'PowerPoint Presentation' },
    'PPTX': { description: 'PowerPoint Presentation' },
    'TXT': { description: 'Text File' },
    'ZIP': { description: 'Compressed Archive' },
    'RAR': { description: 'Compressed Archive' },
  };

  const config = fileTypeConfig[safeFileType] || { description: 'Document File' };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeTitle} - Download</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#f5f5f0">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>${commonStyles}
        /* Document Preview Card */
        .doc-preview { background: #f8f8f6; border-radius: 24px; padding: 28px; margin-bottom: 24px; text-align: center; }
        .doc-icon-large { width: 100px; height: 100px; background: #1a1a1a; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 15px 40px rgba(0,0,0,0.12); position: relative; }
        .doc-icon-large svg { width: 48px; height: 48px; color: white; }
        .doc-badge { position: absolute; bottom: -10px; background: white; color: #1a1a1a; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 50px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); letter-spacing: 0.3px; }
        .doc-title { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; word-break: break-word; }
        .doc-description { font-size: 14px; color: #666; margin-bottom: 20px; }

        /* File Info */
        .file-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
        .info-item { background: white; padding: 16px; border-radius: 16px; text-align: center; }
        .info-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .info-value { font-size: 16px; font-weight: 600; color: #1a1a1a; }

        /* Quick Actions */
        .quick-actions { display: flex; gap: 10px; margin-bottom: 20px; }
        .quick-action { flex: 1; padding: 16px 12px; background: #f8f8f6; border-radius: 16px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.3s ease; }
        .quick-action:hover { background: #f0f0ec; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #1a1a1a; }
        .quick-action span { font-size: 12px; color: #444; font-weight: 500; }

        /* Animated Icon */
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .doc-icon-large { animation: float 3s ease-in-out infinite; }

        /* Secure badge */
        .secure-badge { display: inline-flex; align-items: center; gap: 8px; background: #f0f9f4; color: #166534; padding: 10px 18px; border-radius: 50px; font-size: 13px; font-weight: 500; margin-bottom: 20px; }
        .secure-badge svg { width: 16px; height: 16px; }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header">
            <div class="header-badge">${safeFileType}</div>
            <h1>Document Ready</h1>
            <p>${config.description}</p>
          </div>
          <div class="content">
            <div class="secure-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 16 10"/></svg>
              Secure Download
            </div>

            <div class="doc-preview">
              <div class="doc-icon-large">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <span class="doc-badge">${safeFileType}</span>
              </div>
              <h2 class="doc-title">${safeTitle}</h2>
              <p class="doc-description">${config.description}</p>

              <div class="file-info-grid">
                <div class="info-item">
                  <div class="info-label">Format</div>
                  <div class="info-value">${safeFileType}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="info-value" style="color: #166534;">Ready</div>
                </div>
              </div>
            </div>

            <div class="quick-actions">
              <button class="quick-action" onclick="shareDoc()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
              <button class="quick-action" onclick="openDocSecure()" id="openBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span id="openText">Open</span>
              </button>
              <button class="quick-action" onclick="copyLink()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Copy Link</span>
              </button>
            </div>

            <button onclick="downloadDoc()" class="btn btn-primary" id="downloadBtn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span id="downloadText">Download ${safeFileType}</span>
            </button>
          </div>
          <div class="footer">
            <span>Shared via</span> <a href="https://nexusqr.app">Nexus QR</a>
          </div>
        </div>
      </div>

      <div class="toast" id="toast">Link copied!</div>

      <script>
        const docUrl = '${safeDocUrl}';
        const fileType = '${safeFileType}'.toLowerCase();
        const fileExtensions = { docx: '.docx', xlsx: '.xlsx', pptx: '.pptx', doc: '.doc', xls: '.xls', ppt: '.ppt' };
        const ext = fileExtensions[fileType] || '.' + fileType;

        function shareDoc() {
          if (navigator.share) {
            navigator.share({ title: '${safeTitle}', text: 'Download this document', url: window.location.href });
          } else {
            copyLink();
          }
        }

        function copyLink() {
          navigator.clipboard.writeText(window.location.href);
          showToast('Link copied!');
        }

        // Secure open - fetches file as blob and opens without exposing storage URL
        let isOpening = false;
        async function openDocSecure() {
          if (isOpening) return;
          isOpening = true;
          const openBtn = document.getElementById('openBtn');
          const openText = document.getElementById('openText');

          try {
            openText.textContent = 'Loading...';
            openBtn.style.opacity = '0.7';

            const response = await fetch(docUrl);
            if (!response.ok) throw new Error('Failed to load');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Open in new tab with blob URL (hides original storage URL)
            window.open(blobUrl, '_blank');

            // Revoke blob URL after delay to allow tab to load
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

          } catch (error) {
            console.error('Open error:', error);
            showToast('Failed to open. Try downloading instead.');
          } finally {
            openText.textContent = 'Open';
            openBtn.style.opacity = '1';
            isOpening = false;
          }
        }

        let isDownloading = false;
        async function downloadDoc() {
          if (isDownloading) return;
          isDownloading = true;
          const downloadBtn = document.getElementById('downloadBtn');
          const downloadText = document.getElementById('downloadText');
          const originalText = downloadText.textContent;

          try {
            downloadText.textContent = 'Downloading...';
            downloadBtn.style.opacity = '0.7';
            downloadBtn.style.cursor = 'wait';

            const response = await fetch(docUrl);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = '${safeTitle}'.replace(/[^a-zA-Z0-9\\s-]/g, '') + ext;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            showToast('Download started!');
          } catch (error) {
            console.error('Download error:', error);
            showToast('Download failed. Please try again.');
          } finally {
            downloadText.textContent = originalText;
            downloadBtn.style.opacity = '1';
            downloadBtn.style.cursor = 'pointer';
            isDownloading = false;
          }
        }

        function showToast(message) {
          const toast = document.getElementById('toast');
          toast.textContent = message;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2000);
        }
      </script>
    </body>
    </html>
  `;
}

// Coupon Landing Page - Modern Minimal Design
function getCouponLandingPage(couponData: { code: string; discount: string; expiry?: string; terms?: string }, title?: string): string {
  const safeCode = escapeHtml(couponData.code || 'COUPON');
  const safeDiscount = escapeHtml(couponData.discount || '');
  const safeExpiry = couponData.expiry ? escapeHtml(couponData.expiry) : '';
  const safeTerms = couponData.terms ? escapeHtml(couponData.terms) : '';
  const safeTitle = escapeHtml(title || 'Special Offer');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeTitle} - Coupon</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#f5f5f0">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>${commonStyles}

        /* Discount Display */
        .discount-container { text-align: center; margin-bottom: 28px; }
        .discount-value { font-family: 'Playfair Display', Georgia, serif; font-size: 64px; font-weight: 700; line-height: 1; color: #1a1a1a; margin-bottom: 8px; }
        .discount-label { font-size: 15px; color: #666; }

        /* Coupon Code Box */
        .coupon-code-container { background: #f8f8f6; border-radius: 24px; padding: 28px; margin-bottom: 24px; position: relative; overflow: hidden; }
        .coupon-code-container::before { content: ''; position: absolute; left: -12px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; background: white; border-radius: 50%; }
        .coupon-code-container::after { content: ''; position: absolute; right: -12px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; background: white; border-radius: 50%; }

        .code-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; text-align: center; }
        .coupon-code-box { background: white; border: 2px dashed #1a1a1a; border-radius: 16px; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .coupon-code { font-size: 22px; font-weight: 700; color: #1a1a1a; letter-spacing: 3px; font-family: 'Courier New', monospace; }
        .copy-btn { background: #1a1a1a; color: white; border: none; padding: 14px 22px; border-radius: 50px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease; white-space: nowrap; }
        .copy-btn:hover { transform: scale(1.03); }
        .copy-btn.copied { background: #166534; }
        .copy-btn svg { width: 18px; height: 18px; }

        /* Expiry Timer */
        .expiry-container { background: #fef2f2; border-radius: 20px; padding: 18px 22px; margin-bottom: 24px; display: flex; align-items: center; gap: 14px; }
        .expiry-icon { width: 48px; height: 48px; background: white; border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(185, 28, 28, 0.1); }
        .expiry-icon svg { width: 24px; height: 24px; color: #b91c1c; }
        .expiry-text { flex: 1; }
        .expiry-label { font-size: 11px; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px; }
        .expiry-value { font-size: 16px; font-weight: 600; color: #b91c1c; margin-top: 4px; }

        /* Quick Actions */
        .quick-actions { display: flex; gap: 10px; margin-bottom: 24px; }
        .quick-action { flex: 1; padding: 16px 12px; background: #f8f8f6; border-radius: 16px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.3s ease; }
        .quick-action:hover { background: #f0f0ec; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #1a1a1a; }
        .quick-action span { font-size: 12px; color: #444; font-weight: 500; }

        /* Terms */
        .terms-container { background: #f8f8f6; border-radius: 16px; padding: 18px; }
        .terms-header { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: #1a1a1a; cursor: pointer; }
        .terms-header svg { width: 18px; height: 18px; color: #666; transition: transform 0.3s ease; }
        .terms-header.expanded svg { transform: rotate(180deg); }
        .terms-content { font-size: 13px; color: #666; line-height: 1.7; display: none; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e8e8e6; }
        .terms-content.show { display: block; }

        /* Success animation */
        @keyframes success-pulse { 0% { box-shadow: 0 0 0 0 rgba(22, 101, 52, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(22, 101, 52, 0); } 100% { box-shadow: 0 0 0 0 rgba(22, 101, 52, 0); } }
        .copy-btn.copied { animation: success-pulse 0.5s; }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header">
            <div class="header-badge">Limited Offer</div>
            <h1>${safeTitle}</h1>
            <p>Use code below at checkout</p>
          </div>

          <div class="content">
            <div class="discount-container">
              <div class="discount-value">${safeDiscount}</div>
              <p class="discount-label">Your exclusive discount</p>
            </div>

            ${safeExpiry ? `
            <div class="expiry-container">
              <div class="expiry-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div class="expiry-text">
                <div class="expiry-label">Offer Expires</div>
                <div class="expiry-value">${safeExpiry}</div>
              </div>
            </div>
            ` : ''}

            <div class="coupon-code-container">
              <p class="code-label">Your Exclusive Code</p>
              <div class="coupon-code-box">
                <span class="coupon-code" id="couponCode">${safeCode}</span>
                <button class="copy-btn" id="copyBtn" onclick="copyCode()">
                  <svg id="copyIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  <span id="copyText">Copy</span>
                </button>
              </div>
            </div>

            <div class="quick-actions">
              <button class="quick-action" onclick="shareCoupon()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
              <button class="quick-action" onclick="saveToPhotos()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                <span>Save</span>
              </button>
              <button class="quick-action" onclick="copyCode()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Copy</span>
              </button>
            </div>

            ${safeTerms ? `
            <div class="terms-container">
              <div class="terms-header" onclick="toggleTerms()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                Terms & Conditions
              </div>
              <div class="terms-content" id="termsContent">
                ${safeTerms}
              </div>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <span>Shared via</span> <a href="https://nexusqr.app">Nexus QR</a>
          </div>
        </div>
      </div>

      <div class="toast" id="toast">Code copied!</div>

      <script>
        function copyCode() {
          const code = '${safeCode}';
          navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('copyBtn');
            const icon = document.getElementById('copyIcon');
            const text = document.getElementById('copyText');

            btn.classList.add('copied');
            icon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
            text.textContent = 'Copied!';

            showToast('Code copied to clipboard!');

            setTimeout(() => {
              btn.classList.remove('copied');
              icon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
              text.textContent = 'Copy';
            }, 2000);
          });
        }

        function shareCoupon() {
          const shareText = '${safeTitle} - Get ${safeDiscount} OFF with code: ${safeCode}';
          if (navigator.share) {
            navigator.share({ title: '${safeTitle}', text: shareText, url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
            showToast('Link copied!');
          }
        }

        function saveToPhotos() {
          showToast('Screenshot this page to save!');
        }

        function toggleTerms() {
          const header = document.querySelector('.terms-header');
          const content = document.getElementById('termsContent');
          header.classList.toggle('expanded');
          content.classList.toggle('show');
        }

        function showToast(message) {
          const toast = document.getElementById('toast');
          toast.textContent = message;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2000);
        }
      </script>
    </body>
    </html>
  `;
}

// Menu Landing Page - Modern Minimal Design
function getMenuLandingPage(title: string, menuUrl: string): string {
  const safeTitle = escapeHtml(title || 'Menu');
  const safeMenuUrl = escapeHtml(menuUrl);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#f5f5f0">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>${commonStyles}
        .menu-frame { width: 100%; height: 450px; border: none; border-radius: 20px; background: #f8f8f6; margin-bottom: 20px; }
        .quick-actions { display: flex; gap: 10px; margin-bottom: 20px; }
        .quick-action { flex: 1; padding: 16px 12px; background: #f8f8f6; border-radius: 16px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.3s ease; text-decoration: none; }
        .quick-action:hover { background: #f0f0ec; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #1a1a1a; }
        .quick-action span { font-size: 12px; color: #444; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header">
            <div class="header-badge">Menu</div>
            <h1>${safeTitle}</h1>
            <p>View our delicious offerings</p>
          </div>
          <div class="content">
            <iframe src="${safeMenuUrl}" class="menu-frame" title="Menu"></iframe>

            <div class="quick-actions">
              <a href="${safeMenuUrl}" target="_blank" class="quick-action">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>Full Screen</span>
              </a>
              <button class="quick-action" onclick="shareMenu()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
            </div>

            <a href="${safeMenuUrl}" target="_blank" class="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open Full Menu
            </a>
          </div>
          <div class="footer">
            <span>Shared via</span> <a href="https://nexusqr.app">Nexus QR</a>
          </div>
        </div>
      </div>
      <div class="toast" id="toast">Link copied!</div>
      <script>
        function shareMenu() {
          if (navigator.share) {
            navigator.share({ title: '${safeTitle}', url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
            const t = document.getElementById('toast');
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2500);
          }
        }
      </script>
    </body>
    </html>
  `;
}

// Text Landing Page - Modern Minimal Design
function getTextLandingPage(title: string, text: string): string {
  const safeTitle = escapeHtml(title || 'Message');
  const safeText = escapeHtml(text || '');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#f5f5f0">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>${commonStyles}
        .text-content { background: #f8f8f6; border-radius: 20px; padding: 24px; white-space: pre-wrap; word-break: break-word; line-height: 1.7; font-size: 15px; color: #333; max-height: 400px; overflow-y: auto; margin-bottom: 24px; }
        .quick-actions { display: flex; gap: 10px; margin-bottom: 20px; }
        .quick-action { flex: 1; padding: 16px 12px; background: #f8f8f6; border-radius: 16px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.3s ease; }
        .quick-action:hover { background: #f0f0ec; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #1a1a1a; }
        .quick-action span { font-size: 12px; color: #444; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header">
            <div class="header-badge">Message</div>
            <h1>${safeTitle}</h1>
            <p>Shared text content</p>
          </div>
          <div class="content">
            <div class="text-content">${safeText}</div>

            <div class="quick-actions">
              <button class="quick-action" onclick="copyText()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Copy</span>
              </button>
              <button class="quick-action" onclick="shareText()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
            </div>

            <button class="btn btn-primary" onclick="copyText()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span id="copyBtnText">Copy Text</span>
            </button>
          </div>
          <div class="footer">
            <span>Shared via</span> <a href="https://nexusqr.app">Nexus QR</a>
          </div>
        </div>
      </div>
      <div class="toast" id="toast">Text copied!</div>
      <script>
        function copyText() {
          navigator.clipboard.writeText(\`${safeText.replace(/`/g, '\\`')}\`).then(() => {
            const t = document.getElementById('toast');
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2500);

            const btn = document.getElementById('copyBtnText');
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy Text', 2000);
          });
        }

        function shareText() {
          if (navigator.share) {
            navigator.share({ title: '${safeTitle}', text: \`${safeText.replace(/`/g, '\\`')}\` });
          } else {
            copyText();
          }
        }
      </script>
    </body>
    </html>
  `;
}

// App Store Smart Redirect Page
function getAppStoreRedirectPage(appData: { iosUrl?: string; androidUrl?: string; huaweiUrl?: string; appName?: string }, device: string, os: string): string {
  const safeAppName = escapeHtml(appData.appName || 'App');
  const safeIosUrl = appData.iosUrl ? escapeHtml(appData.iosUrl) : '';
  const safeAndroidUrl = appData.androidUrl ? escapeHtml(appData.androidUrl) : '';
  const safeHuaweiUrl = appData.huaweiUrl ? escapeHtml(appData.huaweiUrl) : '';

  // Auto-redirect based on device
  let autoRedirectUrl = '';
  if (os === 'iOS' && safeIosUrl) {
    autoRedirectUrl = safeIosUrl;
  } else if ((os === 'Android' || device === 'mobile') && safeAndroidUrl) {
    autoRedirectUrl = safeAndroidUrl;
  }

  // If we can auto-redirect, do it
  if (autoRedirectUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirecting to ${safeAppName}</title>
        <meta http-equiv="refresh" content="0;url=${autoRedirectUrl}">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>${commonStyles}</style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="content" style="text-align: center; padding: 40px;">
              <div style="font-size: 48px; margin-bottom: 16px;">📱</div>
              <h1 style="font-size: 20px; margin-bottom: 8px;">Redirecting to App Store...</h1>
              <p style="color: #888;">If not redirected, <a href="${autoRedirectUrl}">click here</a></p>
            </div>
          </div>
        </div>
        <script>window.location.href = '${autoRedirectUrl}';</script>
      </body>
      </html>
    `;
  }

  // Show all store options if we can't auto-detect
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Download ${safeAppName}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${commonStyles}
        .store-btn { display: flex; align-items: center; gap: 12px; padding: 16px 20px; margin-bottom: 12px; text-align: left; }
        .store-icon { font-size: 32px; }
        .store-info h3 { font-size: 14px; color: #888; margin-bottom: 2px; }
        .store-info p { font-size: 16px; color: #333; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header" style="padding: 32px;">
            <div style="font-size: 64px; margin-bottom: 16px;">📱</div>
            <h1>Download ${safeAppName}</h1>
            <p>Choose your app store</p>
          </div>
          <div class="content">
            ${safeIosUrl ? `
              <a href="${safeIosUrl}" class="btn btn-secondary store-btn">
                <span class="store-icon">🍎</span>
                <div class="store-info">
                  <h3>Download on the</h3>
                  <p>App Store</p>
                </div>
              </a>
            ` : ''}
            ${safeAndroidUrl ? `
              <a href="${safeAndroidUrl}" class="btn btn-secondary store-btn">
                <span class="store-icon">🤖</span>
                <div class="store-info">
                  <h3>Get it on</h3>
                  <p>Google Play</p>
                </div>
              </a>
            ` : ''}
            ${safeHuaweiUrl ? `
              <a href="${safeHuaweiUrl}" class="btn btn-secondary store-btn">
                <span class="store-icon">📲</span>
                <div class="store-info">
                  <h3>Explore it on</h3>
                  <p>AppGallery</p>
                </div>
              </a>
            ` : ''}
          </div>
          <div class="footer">Powered by Nexus QR</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate retargeting scripts
function generateRetargetingScripts(config: RetargetingConfig, eventName: string = 'qr_scan'): string {
  if (!config.enabled) return '';

  let scripts = '';

  // Google Tag Manager
  if (config.gtm_id) {
    const safeGtmId = escapeHtml(config.gtm_id);
    scripts += `
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${safeGtmId}');</script>
    <script>
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({'event': '${escapeHtml(eventName)}'});
    </script>
    `;
  }

  // Facebook Pixel
  if (config.facebook_pixel_id) {
    const safeFbId = escapeHtml(config.facebook_pixel_id);
    scripts += `
    <!-- Facebook Pixel -->
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${safeFbId}');
      fbq('track', 'PageView');
      fbq('trackCustom', '${escapeHtml(eventName)}');
    </script>
    <noscript><img height="1" width="1" style="display:none"
      src="https://www.facebook.com/tr?id=${safeFbId}&ev=PageView&noscript=1"/></noscript>
    `;
  }

  // TikTok Pixel
  if (config.tiktok_pixel_id) {
    const safeTtId = escapeHtml(config.tiktok_pixel_id);
    scripts += `
    <!-- TikTok Pixel -->
    <script>
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${safeTtId}');
        ttq.page();
        ttq.track('${escapeHtml(eventName)}');
      }(window, document, 'ttq');
    </script>
    `;
  }

  return scripts;
}

// Check if context matches a conditional rule
function matchesCondition(
  rule: ConditionalRule,
  context: {
    time: Date;
    country?: string;
    city?: string;
    device: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
    language: string;
  }
): boolean {
  const { condition } = rule;
  const now = context.time;

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
        if (!condition.devices.includes(context.device)) {
          return false;
        }
      }
      if (condition.os && condition.os.length > 0) {
        if (!condition.os.some(o => context.os.toLowerCase().includes(o.toLowerCase()))) {
          return false;
        }
      }
      if (condition.browsers && condition.browsers.length > 0) {
        if (!condition.browsers.some(b => context.browser.toLowerCase().includes(b.toLowerCase()))) {
          return false;
        }
      }
      return true;

    case 'language':
      if (condition.languages && condition.languages.length > 0) {
        if (!condition.languages.some(l => context.language.startsWith(l.toLowerCase()))) {
          return false;
        }
      }
      return true;

    default:
      return false;
  }
}

// Select A/B test variant based on weights
function selectABVariant(variants: ABTestVariant[]): ABTestVariant | null {
  if (!variants || variants.length === 0) return null;

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight === 0) return variants[0];

  let random = Math.random() * totalWeight;

  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) {
      return variant;
    }
  }

  return variants[0];
}

// Get final redirect URL based on all conditions
function getRedirectUrl(
  qr: DynamicQRCode,
  context: {
    time: Date;
    country?: string;
    city?: string;
    device: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
    language: string;
  }
): { url: string; abVariantId?: string } {
  // 1. Check if expired
  if (isQRExpired(qr)) {
    return { url: qr.expired_redirect_url || qr.destination_url };
  }

  // 2. Check conditional rules (sorted by priority)
  if (qr.conditional_rules && qr.conditional_rules.length > 0) {
    const sortedRules = [...qr.conditional_rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (matchesCondition(rule, context)) {
        return { url: rule.destinationUrl };
      }
    }
  }

  // 3. Check A/B testing
  if (qr.ab_testing_enabled && qr.ab_variants && qr.ab_variants.length > 0) {
    const variant = selectABVariant(qr.ab_variants);
    if (variant) {
      return { url: variant.destinationUrl, abVariantId: variant.id };
    }
  }

  // 4. Check multi-language
  if (qr.multi_language_enabled && qr.language_contents && qr.language_contents.length > 0) {
    const langContent = qr.language_contents.find(
      lc => lc.language.toLowerCase() === context.language.toLowerCase()
    );
    if (langContent) {
      return { url: langContent.destinationUrl };
    }
  }

  // 5. Default destination
  return { url: qr.destination_url };
}

// ==================== Password Verification Handler ====================

/**
 * Securely compare password using constant-time comparison
 * to prevent timing attacks
 */
function secureComparePassword(inputPassword: string, storedPassword: string): boolean {
  // Hash the input password for comparison
  const hashedInput = hashPassword(inputPassword);

  // If stored password looks like a hash (64 hex chars for SHA-256), compare hashes
  // Otherwise, hash the stored password too for comparison (legacy support)
  const hashedStored = storedPassword.length === 64 && /^[a-f0-9]+$/i.test(storedPassword)
    ? storedPassword
    : hashPassword(storedPassword);

  // Constant-time comparison to prevent timing attacks
  if (hashedInput.length !== hashedStored.length) return false;

  let result = 0;
  for (let i = 0; i < hashedInput.length; i++) {
    result |= hashedInput.charCodeAt(i) ^ hashedStored.charCodeAt(i);
  }
  return result === 0;
}

async function handlePasswordVerification(
  req: VercelRequest,
  res: VercelResponse,
  code: string
): Promise<void> {
  if (!code) {
    res.redirect(302, '/');
    return;
  }

  // Sanitize the code parameter
  const safeCode = code.replace(/[^a-zA-Z0-9-_]/g, '');
  if (safeCode !== code) {
    res.redirect(302, '/');
    return;
  }

  // Parse form data
  let password = '';
  try {
    const body = req.body;
    password = typeof body === 'string' ? JSON.parse(body).password : body?.password || '';
  } catch {
    password = '';
  }

  // Get Supabase client
  const db = getSupabaseClient();
  if (!db) {
    res.redirect(302, '/');
    return;
  }

  // Look up the QR code
  const { data: qrCode, error } = await db
    .from('dynamic_qr_codes')
    .select('password_protection, destination_url')
    .eq('short_code', safeCode)
    .single();

  if (error || !qrCode) {
    res.redirect(302, '/');
    return;
  }

  const passwordProtection = qrCode.password_protection as PasswordProtection | null;

  if (!passwordProtection?.enabled) {
    res.redirect(302, `/r/${safeCode}`);
    return;
  }

  // Secure password comparison using constant-time algorithm
  if (secureComparePassword(password, passwordProtection.password)) {
    // Determine if we should add Secure flag (production = HTTPS)
    const isProduction = process.env.NODE_ENV === 'production' ||
                         process.env.VERCEL_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';

    // Set a cookie to bypass password check with security flags
    res.setHeader('Set-Cookie',
      `qr_auth_${safeCode}=verified; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600${secureFlag}`
    );
    res.redirect(302, `/r/${safeCode}`);
  } else {
    // Redirect back with error
    res.redirect(302, `/r/${safeCode}?error=1`);
  }
}

// ==================== Main Handler ====================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Get short code from query
  const { code, debug } = req.query;

  // DEBUG MODE: Test scan insert directly
  if (debug === 'test-scan' && code) {
    const db = getSupabaseClient();
    if (!db) {
      res.status(500).json({ error: 'Supabase not configured', env_check: { service_key_set: !!process.env.SUPABASE_SERVICE_KEY } });
      return;
    }

    // First get the QR code
    const { data: qrCode, error: qrError } = await db
      .from('dynamic_qr_codes')
      .select('id, title, short_code')
      .eq('short_code', code)
      .single();

    if (qrError || !qrCode) {
      res.status(404).json({ error: 'QR not found', qrError });
      return;
    }

    // Try to insert a test scan
    const testScanData = {
      qr_id: qrCode.id,
      ip_address: 'test-debug',
      country: 'TEST',
      city: 'Debug City',
      device_type: 'desktop',
      browser: 'Debug Browser',
      os: 'Debug OS',
      referrer: null,
      language: 'en',
      user_agent: 'Debug Test',
    };

    const { data: insertResult, error: insertError } = await db
      .from('qr_scans')
      .insert(testScanData)
      .select();

    res.status(200).json({
      success: !insertError,
      qr_code: qrCode,
      test_scan_data: testScanData,
      insert_result: insertResult,
      insert_error: insertError,
      message: insertError ? 'Scan insert FAILED' : 'Scan insert SUCCESS - check qr_scans table'
    });
    return;
  }

  // Handle POST for password verification
  if (req.method === 'POST') {
    await handlePasswordVerification(req, res, code as string);
    return;
  }

  // Only allow GET requests otherwise
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing short code' });
    return;
  }

  // Get Supabase client (lazy initialization)
  const db = getSupabaseClient();
  if (!db) {
    console.error('Supabase client not initialized - check environment variables');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    // Look up the QR code with ALL available fields
    // Using * to select all columns - this prevents errors if new columns don't exist yet
    const { data: qrCode, error: qrError } = await db
      .from('dynamic_qr_codes')
      .select('*')
      .eq('short_code', code)
      .single();

    if (qrError || !qrCode) {
      // QR code not found - redirect to home
      res.redirect(302, '/');
      return;
    }

    // Check if QR is inactive
    if (!qrCode.is_active) {
      res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code Inactive</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
            .card { background: white; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; margin: 20px; }
            h1 { color: #333; margin: 0 0 12px 0; font-size: 24px; }
            p { color: #666; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>QR Code Inactive</h1>
            <p>This QR code has been temporarily disabled by its owner.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Check if QR is expired - show expiry page
    if (isQRExpired(qrCode as DynamicQRCode) && !qrCode.expired_redirect_url) {
      res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code Expired</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
            .card { background: white; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; margin: 20px; }
            h1 { color: #e53e3e; margin: 0 0 12px 0; font-size: 24px; }
            p { color: #666; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>QR Code Expired</h1>
            <p>This QR code is no longer active. It expired on ${new Date(qrCode.expires_at!).toLocaleDateString()}.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Get client info for analytics and conditional redirects
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || null;
    const language = getLanguage(req);
    const { device, browser, os } = parseUserAgent(userAgent);

    // Check if this is an internal request (from dashboard preview) - don't count as scan
    // Be very specific to avoid blocking legitimate scans from QR scanners
    const isInternalRequest = referer && (
      referer.includes('/dashboard') ||
      referer.includes('/dynamic') ||
      referer.includes('/preview') ||
      referer.includes('localhost:3000') ||
      referer.includes('localhost:5173')
    );

    // Debug logging for scan tracking
    console.log('[DEBUG] Scan tracking check:', {
      referer: referer || 'none',
      isInternalRequest,
      willRecordScan: !isInternalRequest,
      clientIP,
      device,
      browser,
      os
    });

    // Get geolocation (don't wait too long)
    const geo = await getGeoLocation(clientIP);

    // ==================== Security Checks ====================

    // 1. Check Password Protection
    const passwordProtection = qrCode.password_protection as PasswordProtection | null;
    if (passwordProtection?.enabled) {
      // Check if user has verified password via cookie
      const cookies = req.headers.cookie || '';
      const hasAuthCookie = cookies.includes(`qr_auth_${code}=verified`);

      if (!hasAuthCookie) {
        // Show password page
        res.status(200).send(getPasswordPage(code, passwordProtection.hint));
        return;
      }
    }

    // 2. Check Geofencing
    const geofenceSettings = qrCode.geofence_settings as GeofenceSettings | null;
    if (geofenceSettings?.enabled && geofenceSettings.locations?.length > 0) {
      const withinGeofence = isWithinGeofence(geo?.lat, geo?.lon, geofenceSettings);

      // blockOutside=true means only allow inside, blockOutside=false means only allow outside
      const shouldBlock = geofenceSettings.blockOutside ? !withinGeofence : withinGeofence;

      if (shouldBlock) {
        const geofenceResponse = getGeofenceBlockedPage(geofenceSettings.blockedRedirectUrl);
        if (geofenceResponse.redirect) {
          res.redirect(302, geofenceResponse.redirect);
        } else {
          res.status(403).send(geofenceResponse.html);
        }
        return;
      }
    }

    // 3. Check IP Restriction
    const ipRestriction = qrCode.ip_restriction as IPRestriction | null;
    if (ipRestriction?.enabled && clientIP) {
      const allowed = await checkIPRestriction(qrCode.id, clientIP, ipRestriction);

      if (!allowed) {
        const ipResponse = getIPBlockedPage(ipRestriction.blockedRedirectUrl);
        if (ipResponse.redirect) {
          res.redirect(302, ipResponse.redirect);
        } else {
          res.status(429).send(ipResponse.html);
        }
        return;
      }
    }

    // ==================== Build Redirect Context ====================

    // Build context for conditional redirects
    const context = {
      time: new Date(),
      country: geo?.country,
      city: geo?.city,
      device,
      os,
      browser,
      language,
    };

    // Get the final redirect URL based on all conditions
    let { url: redirectUrl, abVariantId } = getRedirectUrl(qrCode as DynamicQRCode, context);

    // Get content type from qr_style
    const qrStyle = qrCode.qr_style as { contentData?: { type?: string; pdf?: any; video?: any; audio?: any; images?: any; document?: any; coupon?: any; menu?: any; appstore?: any } } | null;
    const contentType = qrStyle?.contentData?.type || 'unknown';
    const contentData = qrStyle?.contentData || {};
    console.log('[DEBUG] Content Type:', contentType, 'Destination:', redirectUrl.substring(0, 100));

    // ==================== Content Type Based Routing ====================

    // 1. Handle Landing Page Content Types (files, media, coupon, text)
    if (LANDING_PAGE_TYPES.includes(contentType)) {
      console.log('[LANDING] Serving landing page for content type:', contentType);

      // Record scan before serving landing page - MUST await to ensure it completes before function terminates
      if (!isInternalRequest) {
        // Check for duplicate scan (same IP + same QR within 60 seconds)
        const isDuplicate = await isDuplicateScan(db, qrCode.id, clientIP);

        if (!isDuplicate) {
          const scanData = {
            qr_id: qrCode.id,
            ip_address: clientIP || null,
            country: geo?.country || null,
            city: geo?.city || null,
            device_type: device,
            browser: browser,
            os: os,
            referrer: referer,
            language: language,
            user_agent: userAgent,
            ab_variant_id: abVariantId || null,
          };

          console.log('[SCAN] Recording landing page scan:', JSON.stringify(scanData));

          try {
            const { error: scanError, data: scanResult } = await db.from('qr_scans').insert(scanData).select();

            if (scanError) {
              console.error('[SCAN ERROR] Insert failed:', JSON.stringify(scanError));
            } else {
              console.log('[SCAN SUCCESS] Landing page scan recorded:', JSON.stringify(scanResult));
            }
          } catch (insertError) {
            console.error('[SCAN EXCEPTION] Exception during insert:', insertError);
          }
          // Send email notification for landing page scans (only for new scans)
          const emailConfig = qrCode.email_notification_config as EmailNotificationConfig | null;
          if (emailConfig?.enabled && emailConfig.email) {
            const currentScanCount = qrCode.scan_count || 0;
            const locationTrackingConfig = qrCode.location_tracking_config as LocationTrackingConfig | null;

            console.log('[EMAIL] Landing page - checking email notification:', emailConfig.frequency);

            // Always send for every_scan frequency
            if (emailConfig.frequency === 'every_scan') {
              await sendScanNotification(emailConfig, {
                qrTitle: qrCode.title || 'Untitled QR',
                city: locationTrackingConfig?.enabled ? geo?.city || null : null,
                country: locationTrackingConfig?.enabled ? geo?.country || null : null,
                device,
                browser,
                os,
                scanCount: currentScanCount + 1,
              });
            }
          }
        } else {
          console.log('[SCAN SKIP] Duplicate scan detected, skipping recording');
        }
      } else {
        console.log('[SCAN SKIP] Skipping scan recording - internal request');
      }

      // Serve appropriate landing page based on content type
      // Generate signed URLs for file-based content types
      const bucket = getBucketForContentType(contentType);

      switch (contentType) {
        case 'pdf': {
          const pdfData = contentData.pdf || {};
          const filePath = pdfData.filePath || pdfData.url || redirectUrl;
          const signedUrl = await generateSignedUrl(db, filePath, 'qr-docs', 300) || filePath;
          res.status(200).send(getPDFLandingPage(pdfData.title || qrCode.title, signedUrl));
          return;
        }

        case 'video': {
          const videoData = contentData.video || {};
          const filePath = videoData.filePath || videoData.url || redirectUrl;
          const signedUrl = await generateSignedUrl(db, filePath, 'qr-media', 300) || filePath;
          res.status(200).send(getVideoLandingPage(videoData.title || qrCode.title, signedUrl));
          return;
        }

        case 'audio': {
          const audioData = contentData.audio || {};
          const filePath = audioData.filePath || audioData.url || redirectUrl;
          const signedUrl = await generateSignedUrl(db, filePath, 'qr-media', 300) || filePath;
          res.status(200).send(getAudioLandingPage(audioData.title || qrCode.title, signedUrl, audioData.artist));
          return;
        }

        case 'images': {
          const imagesData = contentData.images || {};
          // Handle both filePaths (array of paths) and urls (legacy)
          const filePaths = imagesData.filePaths || imagesData.urls || [redirectUrl];
          const signedUrls = await generateSignedUrls(db, filePaths, 'qr-media', 300);
          const imageUrls = signedUrls.length > 0 ? signedUrls : filePaths;
          res.status(200).send(getImagesLandingPage(imagesData.title || qrCode.title, imageUrls));
          return;
        }

        case 'document': {
          const docData = contentData.document || {};
          const filePath = docData.filePath || docData.url || redirectUrl;
          const signedUrl = await generateSignedUrl(db, filePath, 'qr-docs', 300) || filePath;
          res.status(200).send(getDocumentLandingPage(docData.title || qrCode.title, signedUrl, docData.fileType));
          return;
        }

        case 'coupon': {
          const couponData = contentData.coupon || {};
          res.status(200).send(getCouponLandingPage(couponData, qrCode.title));
          return;
        }

        case 'menu': {
          const menuData = contentData.menu || {};
          // Menu URLs are external, no signed URL needed
          res.status(200).send(getMenuLandingPage(menuData.restaurantName || qrCode.title, menuData.url || redirectUrl));
          return;
        }

        case 'text': {
          res.status(200).send(getTextLandingPage(qrCode.title, redirectUrl));
          return;
        }

        default:
          // Fallback to text landing page
          res.status(200).send(getTextLandingPage(qrCode.title, redirectUrl));
          return;
      }
    }

    // 2. Handle Smart Redirect Content Types (appstore)
    if (SMART_REDIRECT_TYPES.includes(contentType)) {
      console.log('[SMART] Serving smart redirect for content type:', contentType);

      // Record scan before redirect - MUST await to ensure it completes before function terminates
      if (!isInternalRequest) {
        // Check for duplicate scan (same IP + same QR within 60 seconds)
        const isDuplicate = await isDuplicateScan(db, qrCode.id, clientIP);

        if (!isDuplicate) {
          const scanData = {
            qr_id: qrCode.id,
            ip_address: clientIP || null,
            country: geo?.country || null,
            city: geo?.city || null,
            device_type: device,
            browser: browser,
            os: os,
            referrer: referer,
            language: language,
            user_agent: userAgent,
            ab_variant_id: abVariantId || null,
          };

          console.log('[SCAN] Recording smart redirect scan:', JSON.stringify(scanData));

          try {
            const { error: scanError, data: scanResult } = await db.from('qr_scans').insert(scanData).select();

            if (scanError) {
              console.error('[SCAN ERROR] Smart redirect insert failed:', JSON.stringify(scanError));
            } else {
              console.log('[SCAN SUCCESS] Smart redirect scan recorded:', JSON.stringify(scanResult));
            }
          } catch (insertError) {
            console.error('[SCAN EXCEPTION] Smart redirect exception:', insertError);
          }
        } else {
          console.log('[SCAN SKIP] Duplicate smart redirect scan detected, skipping recording');
        }
      }

      if (contentType === 'appstore') {
        const appData = contentData.appstore || {};
        res.status(200).send(getAppStoreRedirectPage(appData, device, os));
        return;
      }
    }

    // 3. Handle non-URL content (vCard, WiFi - legacy static types that shouldn't be dynamic)
    const isValidUrl = isValidRedirectUrl(redirectUrl);
    if (!isValidUrl) {
      console.log('[DEBUG] Non-URL content detected, serving as-is');

      // For vCard - serve as downloadable contact file
      if (redirectUrl.startsWith('BEGIN:VCARD')) {
        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="${qrCode.title || 'contact'}.vcf"`);
        res.status(200).send(redirectUrl);
        return;
      }

      // For WiFi - show a nice page with WiFi details
      if (redirectUrl.startsWith('WIFI:')) {
        const wifiMatch = redirectUrl.match(/WIFI:T:([^;]*);S:([^;]*);P:([^;]*);/);
        const wifiType = wifiMatch?.[1] || 'WPA';
        const ssid = wifiMatch?.[2] || '';
        const password = wifiMatch?.[3] || '';

        res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>WiFi: ${escapeHtml(ssid)}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .card { background: white; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 400px; margin: 20px; }
              .icon { font-size: 48px; margin-bottom: 16px; }
              h1 { color: #333; margin: 0 0 8px 0; font-size: 24px; }
              .info { background: #f5f5f5; padding: 15px; border-radius: 12px; margin: 15px 0; text-align: left; }
              .label { color: #666; font-size: 12px; margin-bottom: 4px; }
              .value { color: #333; font-size: 16px; font-weight: 600; word-break: break-all; }
              .copy-btn { background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">📶</div>
              <h1>WiFi Network</h1>
              <div class="info">
                <div class="label">Network Name (SSID)</div>
                <div class="value">${escapeHtml(ssid)}</div>
              </div>
              <div class="info">
                <div class="label">Password</div>
                <div class="value">${escapeHtml(password)}</div>
              </div>
              <div class="info">
                <div class="label">Security</div>
                <div class="value">${escapeHtml(wifiType)}</div>
              </div>
              <button class="copy-btn" onclick="navigator.clipboard.writeText('${escapeHtml(password)}').then(() => this.textContent = 'Copied!')">Copy Password</button>
            </div>
          </body>
          </html>
        `);
        return;
      }

      // For other non-URL content - show text landing page
      res.status(200).send(getTextLandingPage(qrCode.title, redirectUrl));
      return;
    }

    // 4. Direct Redirect for URL-based content types (url, social media, etc.)
    // Append UTM Parameters (only for valid URLs)
    const utmParameters = qrCode.utm_parameters as UTMParameters | null;
    if (utmParameters?.enabled) {
      redirectUrl = appendUTMParameters(redirectUrl, utmParameters);
    }

    // Validate and sanitize the final redirect URL to prevent open redirect attacks
    const safeRedirectUrl = sanitizeRedirectUrl(redirectUrl);
    if (safeRedirectUrl !== redirectUrl) {
      console.warn(`[SECURITY] Redirect URL sanitized from "${redirectUrl}" to "${safeRedirectUrl}"`);
    }

    // 5. Check Retargeting configuration
    const retargetingConfig = qrCode.retargeting_config as RetargetingConfig | null;
    const locationTrackingConfig = qrCode.location_tracking_config as LocationTrackingConfig | null;

    // Generate retargeting scripts if enabled
    const retargetingScripts = retargetingConfig?.enabled
      ? generateRetargetingScripts(retargetingConfig, retargetingConfig.custom_events?.scan || 'qr_scan')
      : '';

    // Record the scan - MUST await to ensure it completes before function terminates
    // Skip recording for internal requests (from dashboard preview only)
    if (!isInternalRequest) {
      // Check for duplicate scan (same IP + same QR within 60 seconds)
      const isDuplicate = await isDuplicateScan(db, qrCode.id, clientIP);

      if (!isDuplicate) {
        const scanData = {
          qr_id: qrCode.id,
          ip_address: clientIP || null,
          country: geo?.country || null,
          city: geo?.city || null,
          device_type: device,
          browser: browser,
          os: os,
          referrer: referer,
          language: language,
          user_agent: userAgent,
          ab_variant_id: abVariantId || null,
        };

        console.log('[SCAN] Recording URL redirect scan:', JSON.stringify(scanData));

        try {
          const { error: scanError, data: scanResult } = await db
            .from('qr_scans')
            .insert(scanData)
            .select();

          if (scanError) {
            console.error('[SCAN ERROR] URL redirect insert failed:', JSON.stringify(scanError));
          } else {
            console.log('[SCAN SUCCESS] URL redirect scan recorded:', JSON.stringify(scanResult));
          }
        } catch (insertError) {
          console.error('[SCAN EXCEPTION] URL redirect exception:', insertError);
        }

        // Send email notification if enabled (only for new scans)
        const emailConfig = qrCode.email_notification_config as EmailNotificationConfig | null;
        console.log('[DEBUG] Email config from DB:', JSON.stringify(emailConfig));
        console.log('[DEBUG] Location tracking config:', JSON.stringify(qrCode.location_tracking_config));

        if (emailConfig?.enabled && emailConfig.email) {
          const currentScanCount = qrCode.scan_count || 0;
          let shouldSendEmail = false;

          switch (emailConfig.frequency) {
            case 'every_scan':
              shouldSendEmail = true;
              break;
            case 'first_daily':
              // For first_daily, we'll send on every scan for now
              // A more sophisticated implementation would track last notification time
              shouldSendEmail = true;
              break;
            case 'every_10_scans':
              // Send when scan count reaches multiples of 10
              shouldSendEmail = (currentScanCount + 1) % 10 === 0;
              break;
            default:
              shouldSendEmail = true;
          }

          console.log('[DEBUG] Should send email:', shouldSendEmail, 'Frequency:', emailConfig.frequency);

          if (shouldSendEmail) {
            await sendScanNotification(emailConfig, {
              qrTitle: qrCode.title || 'Untitled QR',
              city: locationTrackingConfig?.enabled ? geo?.city || null : null,
              country: locationTrackingConfig?.enabled ? geo?.country || null : null,
              device,
              browser,
              os,
              scanCount: currentScanCount + 1,
            });
          }
        }
      } else {
        console.log('[SCAN SKIP] Duplicate URL redirect scan detected, skipping recording');
      }
    } else {
      console.log('Skipping scan record for internal request');
    }

    // 6. If retargeting is enabled, serve redirect page with scripts
    if (retargetingConfig?.enabled && retargetingScripts) {
      // Serve an HTML page with retargeting scripts and auto-redirect
      const retargetingPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="Content-Security-Policy" content="default-src 'self' https://*.google-analytics.com https://*.googletagmanager.com https://*.facebook.net https://*.facebook.com https://analytics.tiktok.com; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://*.googletagmanager.com https://*.facebook.net https://connect.facebook.net https://analytics.tiktok.com; img-src * data:; connect-src *">
          <style>
            body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
            .card { text-align: center; }
            .spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            p { color: #666; }
          </style>
          ${retargetingScripts}
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <p>Redirecting...</p>
          </div>
          <script>
            setTimeout(function() {
              window.location.href = '${escapeHtml(safeRedirectUrl)}';
            }, 500);
          </script>
        </body>
        </html>
      `;

      res.status(200).send(retargetingPage);
      return;
    }

    // Log final redirect
    console.log('[REDIRECT] Final URL:', safeRedirectUrl);

    // Redirect to final destination (validated)
    res.redirect(302, safeRedirectUrl);
  } catch (err) {
    console.error('Redirect error:', err);
    res.redirect(302, '/');
  }
}
