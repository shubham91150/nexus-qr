import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase environment variables not configured');
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey);
  return supabase;
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
    return null;
  }

  try {
    // Use HTTPS for secure communication
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    // ipapi.co returns error field on failure
    if (data.error) return null;

    return {
      country: data.country_name || data.country || null,
      city: data.city || null,
      lat: data.latitude,
      lon: data.longitude,
    };
  } catch {
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
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('[EMAIL] RESEND_API_KEY not configured in environment variables');
    return;
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
        subject: `🔔 New QR Scan: ${scanData.qrTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🔔 New QR Scan!</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 12px 12px;">
              <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">${scanData.qrTitle}</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">📍 Location</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 500;">${locationText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">📱 Device</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 500;">${scanData.device}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">🌐 Browser</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 500;">${scanData.browser} on ${scanData.os}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">📊 Total Scans</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 500;">${scanData.scanCount + 1}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">🕐 Time</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; text-align: right; font-weight: 500;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                </tr>
              </table>
              <div style="margin-top: 20px; text-align: center;">
                <a href="https://nexus-qr.vercel.app/dashboard" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Dashboard</a>
              </div>
            </div>
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 15px;">
              Sent by Nexus QR • <a href="#" style="color: #999;">Unsubscribe</a>
            </p>
          </div>
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

// Generate password protection page HTML
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
      <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .card { background: white; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 400px; margin: 20px; width: 100%; }
        .icon { font-size: 48px; margin-bottom: 16px; }
        h1 { color: #333; margin: 0 0 8px 0; font-size: 24px; font-weight: 600; }
        .hint { color: #888; font-size: 14px; margin-bottom: 24px; }
        form { display: flex; flex-direction: column; gap: 16px; }
        input[type="password"] { padding: 14px 16px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 16px; transition: border-color 0.2s; }
        input[type="password"]:focus { outline: none; border-color: #667eea; }
        button { padding: 14px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4); }
        .error { color: #e53e3e; font-size: 14px; margin-top: -8px; display: none; }
        .error.show { display: block; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">🔒</div>
        <h1>Password Protected</h1>
        <p class="hint">${safeHint ? `Hint: ${safeHint}` : 'Enter the password to continue'}</p>
        <form method="POST" action="/api/redirect?code=${safeCode}">
          <input type="password" name="password" placeholder="Enter password" required autocomplete="off" />
          <div class="error" id="error">Incorrect password. Please try again.</div>
          <button type="submit">Unlock</button>
        </form>
      </div>
      <script>
        if (new URLSearchParams(window.location.search).get('error') === '1') {
          document.getElementById('error').classList.add('show');
        }
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

// Common styles for all landing pages
const commonStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
  .container { max-width: 500px; margin: 0 auto; }
  .card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
  .header { padding: 24px; text-align: center; border-bottom: 1px solid #f0f0f0; }
  .header h1 { font-size: 20px; color: #333; font-weight: 600; }
  .header p { font-size: 13px; color: #888; margin-top: 4px; }
  .content { padding: 24px; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 600; text-decoration: none; transition: all 0.2s; cursor: pointer; border: none; width: 100%; }
  .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4); }
  .btn-secondary { background: #f5f5f5; color: #333; }
  .btn-secondary:hover { background: #eee; }
  .footer { padding: 16px 24px; background: #f9f9f9; text-align: center; font-size: 12px; color: #888; }
  .preview { background: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
  .file-info { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .file-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
  .file-details h3 { font-size: 16px; color: #333; margin-bottom: 4px; word-break: break-word; }
  .file-details p { font-size: 13px; color: #888; }
  .share-btns { display: flex; gap: 10px; margin-top: 16px; }
  .share-btns .btn { flex: 1; padding: 12px; }
`;

// PDF Landing Page
function getPDFLandingPage(title: string, pdfUrl: string): string {
  const safeTitle = escapeHtml(title || 'PDF Document');
  const safePdfUrl = escapeHtml(pdfUrl);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${commonStyles}
        .pdf-preview { width: 100%; height: 400px; border: none; border-radius: 12px; background: #f0f0f0; }
        @media (max-width: 500px) { .pdf-preview { height: 300px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <h1>${safeTitle}</h1>
            <p>PDF Document</p>
          </div>
          <div class="content">
            <iframe src="${safePdfUrl}#toolbar=0" class="pdf-preview" title="PDF Preview"></iframe>
            <div style="margin-top: 20px;">
              <a href="${safePdfUrl}" download class="btn btn-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF
              </a>
            </div>
            <div class="share-btns">
              <button class="btn btn-secondary" onclick="navigator.share ? navigator.share({title: '${safeTitle}', url: window.location.href}) : navigator.clipboard.writeText(window.location.href).then(() => this.textContent = 'Link Copied!')">Share</button>
            </div>
          </div>
          <div class="footer">Powered by Nexus QR</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Video Landing Page
function getVideoLandingPage(title: string, videoUrl: string): string {
  const safeTitle = escapeHtml(title || 'Video');
  const safeVideoUrl = escapeHtml(videoUrl);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${commonStyles}
        .video-player { width: 100%; border-radius: 12px; background: #000; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <h1>${safeTitle}</h1>
            <p>Video</p>
          </div>
          <div class="content">
            <video controls class="video-player" playsinline>
              <source src="${safeVideoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
            <div style="margin-top: 20px;">
              <a href="${safeVideoUrl}" download class="btn btn-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Video
              </a>
            </div>
            <div class="share-btns">
              <button class="btn btn-secondary" onclick="navigator.share ? navigator.share({title: '${safeTitle}', url: window.location.href}) : navigator.clipboard.writeText(window.location.href).then(() => this.textContent = 'Link Copied!')">Share</button>
            </div>
          </div>
          <div class="footer">Powered by Nexus QR</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Audio Landing Page
function getAudioLandingPage(title: string, audioUrl: string, artist?: string): string {
  const safeTitle = escapeHtml(title || 'Audio');
  const safeAudioUrl = escapeHtml(audioUrl);
  const safeArtist = artist ? escapeHtml(artist) : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${commonStyles}
        .audio-card { text-align: center; padding: 30px 20px; }
        .audio-icon { width: 120px; height: 120px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 48px; }
        .audio-title { font-size: 22px; font-weight: 600; color: #333; margin-bottom: 4px; }
        .audio-artist { font-size: 15px; color: #888; margin-bottom: 24px; }
        audio { width: 100%; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="content audio-card">
            <div class="audio-icon">🎵</div>
            <h1 class="audio-title">${safeTitle}</h1>
            ${safeArtist ? `<p class="audio-artist">${safeArtist}</p>` : ''}
            <audio controls style="width: 100%;">
              <source src="${safeAudioUrl}" type="audio/mpeg">
              Your browser does not support the audio element.
            </audio>
            <a href="${safeAudioUrl}" download class="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Audio
            </a>
            <div class="share-btns">
              <button class="btn btn-secondary" onclick="navigator.share ? navigator.share({title: '${safeTitle}', url: window.location.href}) : navigator.clipboard.writeText(window.location.href).then(() => this.textContent = 'Link Copied!')">Share</button>
            </div>
          </div>
          <div class="footer">Powered by Nexus QR</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Images Gallery Landing Page
function getImagesLandingPage(title: string, imageUrls: string[]): string {
  const safeTitle = escapeHtml(title || 'Image Gallery');
  const safeUrls = imageUrls.map(url => escapeHtml(url));

  const imagesHtml = safeUrls.map((url, i) => `
    <div class="gallery-item" onclick="openLightbox(${i})">
      <img src="${url}" alt="Image ${i + 1}" loading="lazy">
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${commonStyles}
        .gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .gallery-item { aspect-ratio: 1; border-radius: 12px; overflow: hidden; cursor: pointer; }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .gallery-item:hover img { transform: scale(1.05); }
        .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; align-items: center; justify-content: center; }
        .lightbox.active { display: flex; }
        .lightbox img { max-width: 90%; max-height: 90%; border-radius: 8px; }
        .lightbox-close { position: absolute; top: 20px; right: 20px; background: white; border: none; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; cursor: pointer; }
        .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: white; border: none; width: 50px; height: 50px; border-radius: 50%; font-size: 24px; cursor: pointer; }
        .lightbox-prev { left: 20px; }
        .lightbox-next { right: 20px; }
        .image-count { background: rgba(0,0,0,0.5); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; text-align: center; margin-bottom: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <h1>${safeTitle}</h1>
            <p>${safeUrls.length} images</p>
          </div>
          <div class="content">
            <div class="gallery">${imagesHtml}</div>
            <div class="share-btns" style="margin-top: 20px;">
              <button class="btn btn-secondary" onclick="navigator.share ? navigator.share({title: '${safeTitle}', url: window.location.href}) : navigator.clipboard.writeText(window.location.href).then(() => this.textContent = 'Link Copied!')">Share Gallery</button>
            </div>
          </div>
          <div class="footer">Powered by Nexus QR</div>
        </div>
      </div>

      <div class="lightbox" id="lightbox">
        <button class="lightbox-close" onclick="closeLightbox()">×</button>
        <button class="lightbox-nav lightbox-prev" onclick="prevImage()">‹</button>
        <img id="lightbox-img" src="" alt="Full size">
        <button class="lightbox-nav lightbox-next" onclick="nextImage()">›</button>
      </div>

      <script>
        const images = ${JSON.stringify(safeUrls)};
        let currentIndex = 0;

        function openLightbox(i) {
          currentIndex = i;
          document.getElementById('lightbox-img').src = images[i];
          document.getElementById('lightbox').classList.add('active');
        }

        function closeLightbox() {
          document.getElementById('lightbox').classList.remove('active');
        }

        function prevImage() {
          currentIndex = (currentIndex - 1 + images.length) % images.length;
          document.getElementById('lightbox-img').src = images[currentIndex];
        }

        function nextImage() {
          currentIndex = (currentIndex + 1) % images.length;
          document.getElementById('lightbox-img').src = images[currentIndex];
        }

        document.getElementById('lightbox').onclick = function(e) {
          if (e.target === this) closeLightbox();
        };
      </script>
    </body>
    </html>
  `;
}

// Document Landing Page
function getDocumentLandingPage(title: string, docUrl: string, fileType?: string): string {
  const safeTitle = escapeHtml(title || 'Document');
  const safeDocUrl = escapeHtml(docUrl);
  const safeFileType = fileType ? escapeHtml(fileType.toUpperCase()) : 'DOC';

  const iconColors: Record<string, string> = {
    'PDF': '#E53E3E',
    'DOC': '#3182CE',
    'DOCX': '#3182CE',
    'XLS': '#38A169',
    'XLSX': '#38A169',
    'PPT': '#DD6B20',
    'PPTX': '#DD6B20',
    'TXT': '#718096',
  };

  const bgColor = iconColors[safeFileType] || '#667eea';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${commonStyles}
        .doc-icon { background: ${bgColor}; color: white; font-weight: 700; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <h1>${safeTitle}</h1>
            <p>Document</p>
          </div>
          <div class="content">
            <div class="preview">
              <div class="file-info">
                <div class="file-icon doc-icon">${safeFileType}</div>
                <div class="file-details">
                  <h3>${safeTitle}</h3>
                  <p>${safeFileType} Document</p>
                </div>
              </div>
            </div>
            <a href="${safeDocUrl}" download class="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Document
            </a>
            <div class="share-btns">
              <button class="btn btn-secondary" onclick="navigator.share ? navigator.share({title: '${safeTitle}', url: window.location.href}) : navigator.clipboard.writeText(window.location.href).then(() => this.textContent = 'Link Copied!')">Share</button>
            </div>
          </div>
          <div class="footer">Powered by Nexus QR</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Coupon Landing Page
function getCouponLandingPage(couponData: { code: string; discount: string; expiry?: string; terms?: string }, title?: string): string {
  const safeCode = escapeHtml(couponData.code || 'COUPON');
  const safeDiscount = escapeHtml(couponData.discount || '');
  const safeExpiry = couponData.expiry ? escapeHtml(couponData.expiry) : '';
  const safeTerms = couponData.terms ? escapeHtml(couponData.terms) : '';
  const safeTitle = escapeHtml(title || 'Special Offer');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${commonStyles}
        .coupon-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 24px; text-align: center; }
        .coupon-header h1 { font-size: 28px; margin-bottom: 8px; }
        .coupon-discount { font-size: 48px; font-weight: 800; margin: 16px 0; }
        .coupon-code-box { background: white; border: 3px dashed #667eea; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
        .coupon-code { font-size: 28px; font-weight: 700; color: #333; letter-spacing: 3px; font-family: monospace; }
        .coupon-expiry { background: #FFF5F5; color: #E53E3E; padding: 12px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
        .coupon-terms { font-size: 12px; color: #888; margin-top: 16px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="coupon-header">
            <h1>${safeTitle}</h1>
            <div class="coupon-discount">${safeDiscount}</div>
          </div>
          <div class="content">
            ${safeExpiry ? `<div class="coupon-expiry">⏰ Expires: ${safeExpiry}</div>` : ''}
            <div class="coupon-code-box">
              <p style="font-size: 12px; color: #888; margin-bottom: 8px;">YOUR CODE</p>
              <div class="coupon-code">${safeCode}</div>
            </div>
            <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${safeCode}').then(() => { this.innerHTML = '✓ Code Copied!'; setTimeout(() => this.innerHTML = 'Copy Code', 2000); })">
              Copy Code
            </button>
            ${safeTerms ? `<p class="coupon-terms">* ${safeTerms}</p>` : ''}
          </div>
          <div class="footer">Powered by Nexus QR</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Menu Landing Page
function getMenuLandingPage(title: string, menuUrl: string): string {
  const safeTitle = escapeHtml(title || 'Menu');
  const safeMenuUrl = escapeHtml(menuUrl);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${commonStyles}
        .menu-header { background: linear-gradient(135deg, #F6AD55 0%, #ED8936 100%); color: white; padding: 32px 24px; text-align: center; }
        .menu-header .icon { font-size: 48px; margin-bottom: 12px; }
        .menu-frame { width: 100%; height: 500px; border: none; border-radius: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="menu-header">
            <div class="icon">🍽️</div>
            <h1>${safeTitle}</h1>
          </div>
          <iframe src="${safeMenuUrl}" class="menu-frame" title="Menu"></iframe>
          <div class="content">
            <a href="${safeMenuUrl}" target="_blank" class="btn btn-primary">
              Open Full Menu
            </a>
            <div class="share-btns">
              <button class="btn btn-secondary" onclick="navigator.share ? navigator.share({title: '${safeTitle}', url: window.location.href}) : navigator.clipboard.writeText(window.location.href).then(() => this.textContent = 'Link Copied!')">Share Menu</button>
            </div>
          </div>
          <div class="footer">Powered by Nexus QR</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Text Landing Page
function getTextLandingPage(title: string, text: string): string {
  const safeTitle = escapeHtml(title || 'Message');
  const safeText = escapeHtml(text || '');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${commonStyles}
        .text-content { background: #f5f5f5; border-radius: 12px; padding: 20px; white-space: pre-wrap; word-break: break-word; line-height: 1.6; font-size: 15px; color: #333; max-height: 400px; overflow-y: auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <h1>${safeTitle}</h1>
            <p>Text Message</p>
          </div>
          <div class="content">
            <div class="text-content">${safeText}</div>
            <div style="margin-top: 20px;">
              <button class="btn btn-primary" onclick="navigator.clipboard.writeText(\`${safeText.replace(/`/g, '\\`')}\`).then(() => { this.innerHTML = '✓ Copied!'; setTimeout(() => this.innerHTML = 'Copy Text', 2000); })">
                Copy Text
              </button>
            </div>
            <div class="share-btns">
              <button class="btn btn-secondary" onclick="navigator.share ? navigator.share({title: '${safeTitle}', text: \`${safeText.replace(/`/g, '\\`')}\`}) : null">Share</button>
            </div>
          </div>
          <div class="footer">Powered by Nexus QR</div>
        </div>
      </div>
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
  const { code } = req.query;

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

    // Check if this is an internal request (from dashboard/same origin) - don't count as scan
    const isInternalRequest = referer && (
      referer.includes('/dashboard') ||
      referer.includes('/dynamic') ||
      referer.includes('localhost:') ||
      // Check if referer is from same origin (app itself)
      (typeof referer === 'string' && referer.includes(req.headers.host || ''))
    );

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

      // Record scan before serving landing page
      if (!isInternalRequest) {
        const locationTrackingConfig = qrCode.location_tracking_config as LocationTrackingConfig | null;
        const locationData = locationTrackingConfig?.enabled
          ? { country: geo?.country || null, city: geo?.city || null }
          : { country: null, city: null };

        db.from('qr_scans').insert({
          qr_id: qrCode.id,
          ip_address: clientIP || null,
          ...locationData,
          device_type: device,
          browser: browser,
          os: os,
          referrer: referer,
          language: language,
          user_agent: userAgent,
          ab_variant_id: abVariantId || null,
        }).then(({ error }) => {
          if (error) console.error('Error recording scan:', error);
        });
      }

      // Serve appropriate landing page based on content type
      switch (contentType) {
        case 'pdf': {
          const pdfData = contentData.pdf || {};
          res.status(200).send(getPDFLandingPage(pdfData.title || qrCode.title, pdfData.url || redirectUrl));
          return;
        }

        case 'video': {
          const videoData = contentData.video || {};
          res.status(200).send(getVideoLandingPage(videoData.title || qrCode.title, videoData.url || redirectUrl));
          return;
        }

        case 'audio': {
          const audioData = contentData.audio || {};
          res.status(200).send(getAudioLandingPage(audioData.title || qrCode.title, audioData.url || redirectUrl, audioData.artist));
          return;
        }

        case 'images': {
          const imagesData = contentData.images || {};
          const imageUrls = imagesData.urls || [redirectUrl];
          res.status(200).send(getImagesLandingPage(imagesData.title || qrCode.title, imageUrls));
          return;
        }

        case 'document': {
          const docData = contentData.document || {};
          res.status(200).send(getDocumentLandingPage(docData.title || qrCode.title, docData.url || redirectUrl, docData.fileType));
          return;
        }

        case 'coupon': {
          const couponData = contentData.coupon || {};
          res.status(200).send(getCouponLandingPage(couponData, qrCode.title));
          return;
        }

        case 'menu': {
          const menuData = contentData.menu || {};
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

      // Record scan before redirect
      if (!isInternalRequest) {
        const locationTrackingConfig = qrCode.location_tracking_config as LocationTrackingConfig | null;
        const locationData = locationTrackingConfig?.enabled
          ? { country: geo?.country || null, city: geo?.city || null }
          : { country: null, city: null };

        db.from('qr_scans').insert({
          qr_id: qrCode.id,
          ip_address: clientIP || null,
          ...locationData,
          device_type: device,
          browser: browser,
          os: os,
          referrer: referer,
          language: language,
          user_agent: userAgent,
          ab_variant_id: abVariantId || null,
        }).then(({ error }) => {
          if (error) console.error('Error recording scan:', error);
        });
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

    // Record the scan asynchronously (don't block redirect)
    // Skip recording for internal requests (from dashboard, same origin, etc.)
    if (!isInternalRequest) {
      // Only include city/country if location tracking is enabled
      const locationData = locationTrackingConfig?.enabled
        ? { country: geo?.country || null, city: geo?.city || null }
        : { country: null, city: null };

      db
        .from('qr_scans')
        .insert({
          qr_id: qrCode.id,
          ip_address: clientIP || null,
          ...locationData,
          device_type: device,
          browser: browser,
          os: os,
          referrer: referer,
          language: language,
          user_agent: userAgent,
          ab_variant_id: abVariantId || null,
        })
        .then(({ error }) => {
          if (error) {
            console.error('Error recording scan:', error);
          }
        });

      // Send email notification if enabled
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
          sendScanNotification(emailConfig, {
            qrTitle: qrCode.title || 'Untitled QR',
            city: locationTrackingConfig?.enabled ? geo?.city || null : null,
            country: locationTrackingConfig?.enabled ? geo?.country || null : null,
            device,
            browser,
            os,
            scanCount: currentScanCount,
          });
        }
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
