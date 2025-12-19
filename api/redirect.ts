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

// Premium common styles for all landing pages
const commonStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 20px; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  .container { max-width: 480px; margin: 0 auto; }
  .card { background: rgba(255,255,255,0.98); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 80px rgba(0,0,0,0.4); backdrop-filter: blur(20px); }
  .header { padding: 28px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; position: relative; }
  .header::after { content: ''; position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); width: 40px; height: 40px; background: white; border-radius: 50%; }
  .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; text-shadow: 0 2px 10px rgba(0,0,0,0.2); }
  .header p { font-size: 13px; opacity: 0.9; }
  .header-icon { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; backdrop-filter: blur(10px); }
  .content { padding: 36px 24px 24px; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 32px; border-radius: 14px; font-size: 15px; font-weight: 600; text-decoration: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; border: none; width: 100%; }
  .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4); }
  .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5); }
  .btn-secondary { background: #f0f2f5; color: #333; }
  .btn-secondary:hover { background: #e4e6e9; transform: translateY(-2px); }
  .btn-outline { background: transparent; border: 2px solid #667eea; color: #667eea; }
  .btn-outline:hover { background: #667eea; color: white; }
  .btn-success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; }
  .footer { padding: 20px 24px; background: #f8f9fa; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; }
  .footer a { color: #667eea; text-decoration: none; font-weight: 500; }
  .stats { display: flex; justify-content: center; gap: 24px; padding: 16px 0; margin-bottom: 20px; }
  .stat { text-align: center; }
  .stat-value { font-size: 20px; font-weight: 700; color: #333; }
  .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
  .action-grid .btn { padding: 14px 16px; font-size: 13px; }
  .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(102, 126, 234, 0.1); color: #667eea; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .divider { height: 1px; background: #eee; margin: 20px 0; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .animate-fade { animation: fadeIn 0.5s ease-out; }
  .toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 12px 24px; border-radius: 30px; font-size: 14px; opacity: 0; transition: opacity 0.3s; z-index: 1000; }
  .toast.show { opacity: 1; }
`;

// PDF Landing Page - Premium
function getPDFLandingPage(title: string, pdfUrl: string): string {
  const safeTitle = escapeHtml(title || 'PDF Document');
  const safePdfUrl = escapeHtml(pdfUrl);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeTitle} - PDF Viewer</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#667eea">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <style>${commonStyles}
        .pdf-container { position: relative; background: #1a1a2e; border-radius: 16px; overflow: hidden; margin-bottom: 20px; }
        .pdf-preview { width: 100%; height: 450px; border: none; display: block; }
        .pdf-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 80%, rgba(0,0,0,0.8)); pointer-events: none; }
        .pdf-badge { position: absolute; top: 16px; left: 16px; background: rgba(255,59,48,0.9); color: white; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(10px); }
        .fullscreen-btn { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.9); border: none; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .fullscreen-btn:hover { background: white; transform: scale(1.1); }
        .file-meta { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8f9fa; border-radius: 12px; margin-bottom: 20px; }
        .file-icon-lg { width: 56px; height: 56px; background: linear-gradient(135deg, #ff3b30, #ff6b6b); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .file-icon-lg svg { width: 28px; height: 28px; color: white; }
        .file-info-text { flex: 1; }
        .file-info-text h3 { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px; line-height: 1.3; }
        .file-info-text p { font-size: 13px; color: #888; }
        .quick-actions { display: flex; gap: 8px; margin-bottom: 16px; }
        .quick-action { flex: 1; padding: 12px; background: #f8f9fa; border-radius: 12px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s; }
        .quick-action:hover { background: #f0f2f5; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #667eea; }
        .quick-action span { font-size: 11px; color: #666; font-weight: 500; }
        @media (max-width: 500px) { .pdf-preview { height: 350px; } }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header">
            <div class="header-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <h1>${safeTitle}</h1>
            <p>PDF Document</p>
          </div>
          <div class="content">
            <div class="pdf-container">
              <div class="pdf-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg>
                PDF
              </div>
              <button class="fullscreen-btn" onclick="document.querySelector('.pdf-preview').requestFullscreen()" title="Fullscreen">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              </button>
              <iframe src="${safePdfUrl}#toolbar=0&navpanes=0" class="pdf-preview" title="PDF Preview" loading="lazy"></iframe>
            </div>

            <div class="file-meta">
              <div class="file-icon-lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div class="file-info-text">
                <h3>${safeTitle}</h3>
                <p>PDF Document • Ready to download</p>
              </div>
            </div>

            <div class="quick-actions">
              <button class="quick-action" onclick="window.open('${safePdfUrl}', '_blank')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>Open</span>
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

            <a href="${safePdfUrl}" download class="btn btn-primary" style="margin-bottom: 12px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download PDF
            </a>
          </div>
          <div class="footer">
            <span>Shared via</span> <a href="https://nexusqr.app">Nexus QR</a>
          </div>
        </div>
      </div>
      <div class="toast" id="toast">Link copied to clipboard!</div>
      <script>
        function shareContent() {
          if (navigator.share) {
            navigator.share({ title: '${safeTitle}', url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
            showToast('Link copied to clipboard!');
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
      <meta name="theme-color" content="#667eea">
      <style>${commonStyles}
        .video-container { position: relative; background: #000; border-radius: 16px; overflow: hidden; margin-bottom: 20px; }
        .video-player { width: 100%; display: block; max-height: 400px; object-fit: contain; }
        .video-badge { position: absolute; top: 16px; left: 16px; background: rgba(139, 92, 246, 0.9); color: white; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(10px); z-index: 10; }
        .video-controls-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); opacity: 0; transition: opacity 0.3s; }
        .video-container:hover .video-controls-overlay { opacity: 1; }
        .pip-btn { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.9); border: none; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 10; }
        .pip-btn:hover { background: white; transform: scale(1.1); }
        .video-info { display: flex; align-items: center; gap: 16px; padding: 16px; background: linear-gradient(135deg, #f8f9fa, #fff); border-radius: 12px; margin-bottom: 20px; border: 1px solid #eee; }
        .video-icon { width: 56px; height: 56px; background: linear-gradient(135deg, #8b5cf6, #a78bfa); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .video-icon svg { width: 28px; height: 28px; color: white; }
        .video-details { flex: 1; }
        .video-details h3 { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px; }
        .video-details p { font-size: 13px; color: #888; display: flex; align-items: center; gap: 8px; }
        .video-details .dot { width: 4px; height: 4px; background: #ccc; border-radius: 50%; }
        .quick-actions { display: flex; gap: 8px; margin-bottom: 16px; }
        .quick-action { flex: 1; padding: 12px; background: #f8f9fa; border-radius: 12px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s; }
        .quick-action:hover { background: #f0f2f5; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #8b5cf6; }
        .quick-action span { font-size: 11px; color: #666; font-weight: 500; }
        .quality-badge { background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header" style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);">
            <div class="header-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </div>
            <h1>${safeTitle}</h1>
            <p>Video Content</p>
          </div>
          <div class="content">
            <div class="video-container">
              <div class="video-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                VIDEO
              </div>
              <button class="pip-btn" onclick="togglePiP()" title="Picture in Picture">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="11" y="10" width="10" height="7" rx="1"/></svg>
              </button>
              <video id="videoPlayer" controls class="video-player" playsinline preload="metadata">
                <source src="${safeVideoUrl}" type="video/mp4">
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

            <a href="${safeVideoUrl}" download class="btn btn-primary" style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Video
            </a>
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
      <meta name="theme-color" content="#667eea">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <style>${commonStyles}
        .album-art { width: 200px; height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4); position: relative; overflow: hidden; }
        .album-art::before { content: ''; position: absolute; inset: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/><circle cx="50" cy="50" r="20" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/><circle cx="50" cy="50" r="10" fill="rgba(255,255,255,0.2)"/></svg>') center/60% no-repeat; }
        .album-art svg { width: 80px; height: 80px; color: rgba(255,255,255,0.9); position: relative; z-index: 1; }
        .album-art.playing { animation: pulse 2s ease-in-out infinite; }
        .audio-title { font-size: 24px; font-weight: 700; color: #333; margin-bottom: 4px; text-align: center; }
        .audio-artist { font-size: 15px; color: #888; margin-bottom: 32px; text-align: center; }

        /* Waveform Visualization */
        .waveform { display: flex; align-items: center; justify-content: center; gap: 3px; height: 60px; margin-bottom: 16px; padding: 0 20px; }
        .wave-bar { width: 4px; background: linear-gradient(to top, #667eea, #764ba2); border-radius: 4px; transition: height 0.1s ease; }
        .wave-bar.active { animation: wave 0.5s ease-in-out infinite alternate; }
        @keyframes wave { 0% { height: 20%; } 100% { height: 100%; } }

        /* Custom Player */
        .player-container { background: #f8f9fa; border-radius: 20px; padding: 24px; margin-bottom: 20px; }
        .progress-container { position: relative; margin-bottom: 20px; }
        .progress-bar { width: 100%; height: 6px; background: #e0e0e0; border-radius: 3px; cursor: pointer; position: relative; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 3px; width: 0%; transition: width 0.1s linear; }
        .progress-thumb { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 16px; height: 16px; background: white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.2); left: 0%; transition: left 0.1s linear; cursor: grab; }
        .time-display { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #888; font-weight: 500; font-variant-numeric: tabular-nums; }

        /* Controls */
        .controls { display: flex; align-items: center; justify-content: center; gap: 16px; }
        .control-btn { width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .control-btn.secondary { background: #e8e8e8; }
        .control-btn.secondary:hover { background: #ddd; transform: scale(1.1); }
        .control-btn.secondary svg { width: 20px; height: 20px; color: #555; }
        .play-btn { width: 72px; height: 72px; background: linear-gradient(135deg, #667eea, #764ba2); box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4); }
        .play-btn:hover { transform: scale(1.08); box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5); }
        .play-btn svg { width: 32px; height: 32px; color: white; margin-left: 3px; }
        .play-btn.playing svg { margin-left: 0; }

        /* Volume Control */
        .volume-container { display: flex; align-items: center; gap: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        .volume-icon { color: #888; cursor: pointer; }
        .volume-slider { flex: 1; height: 4px; background: #e0e0e0; border-radius: 2px; -webkit-appearance: none; appearance: none; cursor: pointer; }
        .volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #667eea; border-radius: 50%; cursor: pointer; }

        /* Quick Actions */
        .quick-actions { display: flex; gap: 8px; margin-bottom: 16px; }
        .quick-action { flex: 1; padding: 14px 12px; background: #f8f9fa; border-radius: 12px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s; }
        .quick-action:hover { background: #f0f2f5; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #667eea; }
        .quick-action span { font-size: 11px; color: #666; font-weight: 500; }

        /* Speed Control */
        .speed-badge { font-size: 10px; background: rgba(102, 126, 234, 0.1); color: #667eea; padding: 4px 8px; border-radius: 6px; font-weight: 600; }

        audio { display: none; }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header">
            <div class="header-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <h1>Now Playing</h1>
            <p>Audio Track</p>
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
              <button class="quick-action" onclick="window.open('${safeAudioUrl}', '_blank')">
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

            <a href="${safeAudioUrl}" download class="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Audio
            </a>
          </div>
          <div class="footer">Powered by <a href="https://nexusqr.com">Nexus QR</a></div>
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
          loopBtn.style.background = audio.loop ? 'rgba(102, 126, 234, 0.15)' : '';
          loopBtn.querySelector('svg').style.color = audio.loop ? '#667eea' : '';
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

// Images Gallery Landing Page - Premium
function getImagesLandingPage(title: string, imageUrls: string[]): string {
  const safeTitle = escapeHtml(title || 'Image Gallery');
  const safeUrls = imageUrls.map(url => escapeHtml(url));

  const imagesHtml = safeUrls.map((url, i) => `
    <div class="gallery-item" onclick="openLightbox(${i})" style="animation-delay: ${i * 0.1}s">
      <img src="${url}" alt="Image ${i + 1}" loading="lazy">
      <div class="gallery-overlay">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </div>
    </div>
  `).join('');

  const thumbnailsHtml = safeUrls.map((url, i) => `
    <div class="thumb" onclick="goToImage(${i})" data-index="${i}">
      <img src="${url}" alt="Thumbnail ${i + 1}">
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeTitle} - Gallery</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="#667eea">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <style>${commonStyles}
        /* Gallery Grid */
        .gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .gallery-item { aspect-ratio: 1; border-radius: 16px; overflow: hidden; cursor: pointer; position: relative; animation: fadeIn 0.5s ease-out forwards; opacity: 0; }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .gallery-item:hover img { transform: scale(1.1); }
        .gallery-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%); opacity: 0; transition: opacity 0.3s; display: flex; align-items: center; justify-content: center; }
        .gallery-item:hover .gallery-overlay { opacity: 1; }
        .gallery-overlay svg { width: 40px; height: 40px; color: white; }

        /* Gallery Info */
        .gallery-stats { display: flex; justify-content: center; gap: 24px; margin-bottom: 20px; }
        .gallery-stat { text-align: center; padding: 12px 20px; background: #f8f9fa; border-radius: 12px; }
        .gallery-stat-value { font-size: 24px; font-weight: 700; color: #667eea; }
        .gallery-stat-label { font-size: 12px; color: #888; margin-top: 4px; }

        /* Premium Lightbox */
        .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.98); z-index: 1000; flex-direction: column; }
        .lightbox.active { display: flex; animation: fadeIn 0.3s ease-out; }

        .lightbox-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: rgba(255,255,255,0.05); }
        .lightbox-counter { color: white; font-size: 14px; font-weight: 500; }
        .lightbox-actions { display: flex; gap: 8px; }
        .lightbox-btn { width: 44px; height: 44px; background: rgba(255,255,255,0.1); border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .lightbox-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .lightbox-btn svg { width: 22px; height: 22px; color: white; }

        .lightbox-main { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; padding: 20px; overflow: hidden; }
        .lightbox-img-container { position: relative; max-width: 100%; max-height: 100%; display: flex; align-items: center; justify-content: center; }
        .lightbox-img { max-width: 100%; max-height: 70vh; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); transition: transform 0.3s; object-fit: contain; }
        .lightbox-img.zoomed { cursor: zoom-out; transform: scale(1.5); }

        .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border: none; width: 56px; height: 56px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .lightbox-nav:hover { background: rgba(255,255,255,0.25); transform: translateY(-50%) scale(1.1); }
        .lightbox-nav svg { width: 28px; height: 28px; color: white; }
        .lightbox-prev { left: 20px; }
        .lightbox-next { right: 20px; }

        /* Thumbnails */
        .lightbox-thumbs { padding: 16px 20px; background: rgba(255,255,255,0.05); overflow-x: auto; display: flex; gap: 8px; justify-content: center; }
        .thumb { width: 60px; height: 60px; border-radius: 8px; overflow: hidden; cursor: pointer; opacity: 0.5; transition: all 0.2s; flex-shrink: 0; border: 2px solid transparent; }
        .thumb:hover { opacity: 0.8; }
        .thumb.active { opacity: 1; border-color: #667eea; transform: scale(1.05); }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }

        /* Quick Actions */
        .quick-actions { display: flex; gap: 8px; margin-top: 20px; }
        .quick-action { flex: 1; padding: 14px 12px; background: #f8f9fa; border-radius: 12px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s; }
        .quick-action:hover { background: #f0f2f5; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #667eea; }
        .quick-action span { font-size: 11px; color: #666; font-weight: 500; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 500px) {
          .lightbox-nav { width: 44px; height: 44px; }
          .lightbox-prev { left: 10px; }
          .lightbox-next { right: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header">
            <div class="header-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <h1>${safeTitle}</h1>
            <p>${safeUrls.length} Photos</p>
          </div>
          <div class="content">
            <div class="gallery-stats">
              <div class="gallery-stat">
                <div class="gallery-stat-value">${safeUrls.length}</div>
                <div class="gallery-stat-label">Photos</div>
              </div>
              <div class="gallery-stat">
                <div class="gallery-stat-value">HD</div>
                <div class="gallery-stat-label">Quality</div>
              </div>
            </div>

            <div class="gallery">${imagesHtml}</div>

            <div class="quick-actions">
              <button class="quick-action" onclick="shareGallery()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
              <button class="quick-action" onclick="downloadAll()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Save All</span>
              </button>
              <button class="quick-action" onclick="openLightbox(0)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Slideshow</span>
              </button>
            </div>
          </div>
          <div class="footer">Powered by <a href="https://nexusqr.com">Nexus QR</a></div>
        </div>
      </div>

      <!-- Premium Lightbox -->
      <div class="lightbox" id="lightbox">
        <div class="lightbox-header">
          <span class="lightbox-counter"><span id="currentNum">1</span> / ${safeUrls.length}</span>
          <div class="lightbox-actions">
            <button class="lightbox-btn" onclick="toggleZoom()" title="Zoom">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <button class="lightbox-btn" onclick="downloadCurrent()" title="Download">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="lightbox-btn" onclick="closeLightbox()" title="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div class="lightbox-main">
          <button class="lightbox-nav lightbox-prev" onclick="prevImage()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="lightbox-img-container">
            <img id="lightbox-img" src="" alt="Full size" class="lightbox-img" onclick="toggleZoom()">
          </div>
          <button class="lightbox-nav lightbox-next" onclick="nextImage()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div class="lightbox-thumbs" id="thumbs">
          ${thumbnailsHtml}
        </div>
      </div>

      <div class="toast" id="toast">Link copied!</div>

      <script>
        const images = ${JSON.stringify(safeUrls)};
        let currentIndex = 0;
        let isZoomed = false;
        let slideshowInterval = null;

        function openLightbox(i) {
          currentIndex = i;
          updateLightbox();
          document.getElementById('lightbox').classList.add('active');
          document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
          document.getElementById('lightbox').classList.remove('active');
          document.body.style.overflow = '';
          stopSlideshow();
          if (isZoomed) toggleZoom();
        }

        function updateLightbox() {
          document.getElementById('lightbox-img').src = images[currentIndex];
          document.getElementById('currentNum').textContent = currentIndex + 1;

          // Update thumbnails
          document.querySelectorAll('.thumb').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === currentIndex);
          });

          // Scroll thumbnail into view
          const activeThumb = document.querySelector('.thumb.active');
          if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }

        function prevImage() {
          currentIndex = (currentIndex - 1 + images.length) % images.length;
          updateLightbox();
          if (isZoomed) toggleZoom();
        }

        function nextImage() {
          currentIndex = (currentIndex + 1) % images.length;
          updateLightbox();
          if (isZoomed) toggleZoom();
        }

        function goToImage(i) {
          currentIndex = i;
          updateLightbox();
          if (isZoomed) toggleZoom();
        }

        function toggleZoom() {
          isZoomed = !isZoomed;
          document.getElementById('lightbox-img').classList.toggle('zoomed', isZoomed);
        }

        function downloadCurrent() {
          const link = document.createElement('a');
          link.href = images[currentIndex];
          link.download = 'image-' + (currentIndex + 1) + '.jpg';
          link.click();
          showToast('Downloading image...');
        }

        function downloadAll() {
          images.forEach((url, i) => {
            setTimeout(() => {
              const link = document.createElement('a');
              link.href = url;
              link.download = 'image-' + (i + 1) + '.jpg';
              link.click();
            }, i * 500);
          });
          showToast('Downloading ' + images.length + ' images...');
        }

        function shareGallery() {
          if (navigator.share) {
            navigator.share({ title: '${safeTitle}', text: 'Check out this gallery!', url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
            showToast('Link copied!');
          }
        }

        function startSlideshow() {
          stopSlideshow();
          slideshowInterval = setInterval(nextImage, 3000);
          showToast('Slideshow started');
        }

        function stopSlideshow() {
          if (slideshowInterval) {
            clearInterval(slideshowInterval);
            slideshowInterval = null;
          }
        }

        function showToast(message) {
          const toast = document.getElementById('toast');
          toast.textContent = message;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2000);
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
          if (!document.getElementById('lightbox').classList.contains('active')) return;

          if (e.key === 'Escape') closeLightbox();
          if (e.key === 'ArrowLeft') prevImage();
          if (e.key === 'ArrowRight') nextImage();
        });

        // Touch swipe support
        let touchStartX = 0;
        document.getElementById('lightbox').addEventListener('touchstart', (e) => {
          touchStartX = e.changedTouches[0].screenX;
        });
        document.getElementById('lightbox').addEventListener('touchend', (e) => {
          const touchEndX = e.changedTouches[0].screenX;
          const diff = touchStartX - touchEndX;
          if (Math.abs(diff) > 50) {
            if (diff > 0) nextImage();
            else prevImage();
          }
        });

        // Click outside to close
        document.getElementById('lightbox').addEventListener('click', (e) => {
          if (e.target.classList.contains('lightbox-main')) closeLightbox();
        });
      </script>
    </body>
    </html>
  `;
}

// Document Landing Page - Premium
function getDocumentLandingPage(title: string, docUrl: string, fileType?: string): string {
  const safeTitle = escapeHtml(title || 'Document');
  const safeDocUrl = escapeHtml(docUrl);
  const safeFileType = fileType ? escapeHtml(fileType.toUpperCase()) : 'DOC';

  const fileTypeConfig: Record<string, { color: string; gradient: string; icon: string; description: string }> = {
    'PDF': { color: '#E53E3E', gradient: 'linear-gradient(135deg, #E53E3E, #FC8181)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'Portable Document' },
    'DOC': { color: '#3182CE', gradient: 'linear-gradient(135deg, #3182CE, #63B3ED)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'Word Document' },
    'DOCX': { color: '#3182CE', gradient: 'linear-gradient(135deg, #3182CE, #63B3ED)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'Word Document' },
    'XLS': { color: '#38A169', gradient: 'linear-gradient(135deg, #38A169, #68D391)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'Excel Spreadsheet' },
    'XLSX': { color: '#38A169', gradient: 'linear-gradient(135deg, #38A169, #68D391)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'Excel Spreadsheet' },
    'PPT': { color: '#DD6B20', gradient: 'linear-gradient(135deg, #DD6B20, #F6AD55)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'PowerPoint Presentation' },
    'PPTX': { color: '#DD6B20', gradient: 'linear-gradient(135deg, #DD6B20, #F6AD55)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'PowerPoint Presentation' },
    'TXT': { color: '#718096', gradient: 'linear-gradient(135deg, #718096, #A0AEC0)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'Text File' },
    'ZIP': { color: '#805AD5', gradient: 'linear-gradient(135deg, #805AD5, #B794F4)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'Compressed Archive' },
    'RAR': { color: '#805AD5', gradient: 'linear-gradient(135deg, #805AD5, #B794F4)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'Compressed Archive' },
  };

  const config = fileTypeConfig[safeFileType] || { color: '#667eea', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', description: 'Document File' };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeTitle} - Download</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="theme-color" content="${config.color}">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <style>${commonStyles}
        .doc-header { background: ${config.gradient}; }

        /* Document Preview Card */
        .doc-preview { background: #f8f9fa; border-radius: 20px; padding: 24px; margin-bottom: 20px; text-align: center; }
        .doc-icon-large { width: 100px; height: 100px; background: ${config.gradient}; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 15px 40px ${config.color}40; position: relative; }
        .doc-icon-large svg { width: 50px; height: 50px; color: white; }
        .doc-badge { position: absolute; bottom: -8px; background: white; color: ${config.color}; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .doc-title { font-size: 20px; font-weight: 700; color: #333; margin-bottom: 4px; word-break: break-word; }
        .doc-description { font-size: 14px; color: #888; margin-bottom: 16px; }

        /* File Info */
        .file-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
        .info-item { background: white; padding: 14px; border-radius: 12px; text-align: center; }
        .info-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .info-value { font-size: 16px; font-weight: 600; color: #333; }

        /* Quick Actions */
        .quick-actions { display: flex; gap: 8px; margin-bottom: 16px; }
        .quick-action { flex: 1; padding: 14px 12px; background: #f8f9fa; border-radius: 12px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s; }
        .quick-action:hover { background: #f0f2f5; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: ${config.color}; }
        .quick-action span { font-size: 11px; color: #666; font-weight: 500; }

        /* Animated Icon */
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .doc-icon-large { animation: float 3s ease-in-out infinite; }

        /* Secure badge */
        .secure-badge { display: inline-flex; align-items: center; gap: 6px; background: #E8F5E9; color: #2E7D32; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; margin-bottom: 16px; }
        .secure-badge svg { width: 14px; height: 14px; }
      </style>
    </head>
    <body>
      <div class="container animate-fade">
        <div class="card">
          <div class="header doc-header">
            <div class="header-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${config.icon}"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${config.icon}"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
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
                  <div class="info-value" style="color: #38A169;">Ready</div>
                </div>
              </div>
            </div>

            <div class="quick-actions">
              <button class="quick-action" onclick="shareDoc()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
              <button class="quick-action" onclick="window.open('${safeDocUrl}', '_blank')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>Open</span>
              </button>
              <button class="quick-action" onclick="copyLink()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Copy Link</span>
              </button>
            </div>

            <a href="${safeDocUrl}" download class="btn btn-primary" style="background: ${config.gradient};">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download ${safeFileType}
            </a>
          </div>
          <div class="footer">Powered by <a href="https://nexusqr.com">Nexus QR</a></div>
        </div>
      </div>

      <div class="toast" id="toast">Link copied!</div>

      <script>
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

// Coupon Landing Page - Premium
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
      <meta name="theme-color" content="#667eea">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <style>${commonStyles}
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); }

        /* Floating particles */
        .particles { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
        .particle { position: absolute; width: 10px; height: 10px; background: rgba(255,255,255,0.3); border-radius: 50%; animation: float-particle 15s infinite; }
        @keyframes float-particle { 0%, 100% { transform: translateY(100vh) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; } }

        .container { position: relative; z-index: 1; }

        /* Premium Coupon Header */
        .coupon-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 24px 50px; text-align: center; position: relative; }
        .coupon-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 20px; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><path fill="white" d="M0 20 Q 25 0 50 20 Q 75 40 100 20 L 100 20 L 0 20 Z"/></svg>') repeat-x; background-size: 100px 20px; }

        .offer-badge { display: inline-block; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 8px 20px; border-radius: 30px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; animation: pulse 2s ease-in-out infinite; }
        .coupon-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; text-shadow: 0 2px 10px rgba(0,0,0,0.2); }

        /* Discount Display */
        .discount-container { position: relative; margin: 20px 0; }
        .discount-value { font-size: 72px; font-weight: 800; line-height: 1; background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-shadow: none; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.2)); }
        .discount-label { font-size: 14px; opacity: 0.9; margin-top: 8px; }

        /* Coupon Code Box */
        .coupon-code-container { background: #f8f9fa; border-radius: 20px; padding: 24px; margin-bottom: 20px; position: relative; overflow: hidden; }
        .coupon-code-container::before { content: ''; position: absolute; left: -10px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; background: white; border-radius: 50%; }
        .coupon-code-container::after { content: ''; position: absolute; right: -10px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; background: white; border-radius: 50%; }

        .code-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .coupon-code-box { background: white; border: 2px dashed #667eea; border-radius: 12px; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .coupon-code { font-size: 24px; font-weight: 700; color: #333; letter-spacing: 4px; font-family: 'Courier New', monospace; }
        .copy-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 12px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s; white-space: nowrap; }
        .copy-btn:hover { transform: scale(1.05); box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4); }
        .copy-btn.copied { background: linear-gradient(135deg, #38A169, #68D391); }
        .copy-btn svg { width: 18px; height: 18px; }

        /* Expiry Timer */
        .expiry-container { background: linear-gradient(135deg, #FFF5F5, #FED7D7); border-radius: 16px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
        .expiry-icon { width: 44px; height: 44px; background: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(229, 62, 62, 0.2); }
        .expiry-icon svg { width: 24px; height: 24px; color: #E53E3E; }
        .expiry-text { flex: 1; }
        .expiry-label { font-size: 11px; color: #C53030; text-transform: uppercase; letter-spacing: 0.5px; }
        .expiry-value { font-size: 16px; font-weight: 600; color: #C53030; margin-top: 2px; }

        /* Quick Actions */
        .quick-actions { display: flex; gap: 8px; margin-bottom: 20px; }
        .quick-action { flex: 1; padding: 14px 12px; background: #f8f9fa; border-radius: 12px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s; }
        .quick-action:hover { background: #f0f2f5; transform: translateY(-2px); }
        .quick-action svg { width: 22px; height: 22px; color: #667eea; }
        .quick-action span { font-size: 11px; color: #666; font-weight: 500; }

        /* Terms */
        .terms-container { background: #f8f9fa; border-radius: 12px; padding: 16px; }
        .terms-header { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 8px; cursor: pointer; }
        .terms-header svg { width: 16px; height: 16px; color: #888; transition: transform 0.2s; }
        .terms-header.expanded svg { transform: rotate(180deg); }
        .terms-content { font-size: 12px; color: #666; line-height: 1.6; display: none; }
        .terms-content.show { display: block; }

        /* Confetti animation */
        @keyframes confetti { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(100px) rotate(720deg); opacity: 0; } }
        .confetti { position: absolute; width: 8px; height: 8px; animation: confetti 1s ease-out forwards; }

        /* Success animation */
        @keyframes success-pulse { 0% { box-shadow: 0 0 0 0 rgba(56, 161, 105, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(56, 161, 105, 0); } 100% { box-shadow: 0 0 0 0 rgba(56, 161, 105, 0); } }
        .copy-btn.copied { animation: success-pulse 0.5s; }
      </style>
    </head>
    <body>
      <!-- Floating Particles -->
      <div class="particles">
        ${Array(15).fill(0).map((_, i) => `<div class="particle" style="left: ${Math.random() * 100}%; animation-delay: ${Math.random() * 15}s; animation-duration: ${10 + Math.random() * 10}s;"></div>`).join('')}
      </div>

      <div class="container animate-fade">
        <div class="card">
          <div class="coupon-header">
            <div class="offer-badge">Limited Time Offer</div>
            <h1 class="coupon-title">${safeTitle}</h1>
            <div class="discount-container">
              <div class="discount-value">${safeDiscount}</div>
              <p class="discount-label">Use code below at checkout</p>
            </div>
          </div>

          <div class="content">
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
          <div class="footer">Powered by <a href="https://nexusqr.com">Nexus QR</a></div>
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

            // Trigger confetti
            createConfetti();

            showToast('Code copied to clipboard!');

            setTimeout(() => {
              btn.classList.remove('copied');
              icon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
              text.textContent = 'Copy';
            }, 2000);
          });
        }

        function createConfetti() {
          const colors = ['#667eea', '#764ba2', '#f093fb', '#38A169', '#E53E3E', '#F6AD55'];
          const container = document.querySelector('.coupon-code-container');

          for (let i = 0; i < 30; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            container.appendChild(confetti);

            setTimeout(() => confetti.remove(), 1500);
          }
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
