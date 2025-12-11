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

interface GPSTrackingConfig {
  enabled: boolean;
  require_permission: boolean;
  track_precise_location: boolean;
  store_for_heatmap: boolean;
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
  gps_tracking_config: GPSTrackingConfig | null;
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

// Generate GPS tracking page with permission request
function getGPSTrackingPage(
  code: string,
  redirectUrl: string,
  qrId: string,
  retargetingScripts: string,
  highAccuracy: boolean = true
): string {
  const safeCode = escapeHtml(code);
  const safeRedirectUrl = escapeHtml(redirectUrl);
  const safeQrId = escapeHtml(qrId);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loading...</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self' https://*.google-analytics.com https://*.googletagmanager.com https://*.facebook.net https://*.facebook.com https://analytics.tiktok.com https://*.supabase.co; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://*.googletagmanager.com https://*.facebook.net https://connect.facebook.net https://analytics.tiktok.com; img-src * data:; connect-src *">
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .card { background: white; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 400px; margin: 20px; width: 100%; }
        .spinner { width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        h1 { color: #333; margin: 0 0 8px 0; font-size: 24px; font-weight: 600; }
        p { color: #666; font-size: 14px; margin: 0 0 20px 0; }
        .btn { padding: 14px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; margin-bottom: 10px; }
        .btn-skip { background: #f5f5f5; color: #666; }
        .status { font-size: 12px; color: #888; margin-top: 15px; }
        .hidden { display: none; }
      </style>
      ${retargetingScripts}
    </head>
    <body>
      <div class="card">
        <div id="loading" class="hidden">
          <div class="spinner"></div>
          <h1>Redirecting...</h1>
          <p>Please wait while we prepare your destination.</p>
          <p class="status" id="status">Getting location...</p>
        </div>
        <div id="permission">
          <div style="font-size: 48px; margin-bottom: 16px;">📍</div>
          <h1>Allow Location?</h1>
          <p>This helps us provide better analytics and personalized experience.</p>
          <button class="btn" onclick="requestLocation()">Allow Location</button>
          <button class="btn btn-skip" onclick="skipLocation()">Continue Without</button>
        </div>
      </div>
      <script>
        const redirectUrl = '${safeRedirectUrl}';
        const qrId = '${safeQrId}';
        const highAccuracy = ${highAccuracy};

        function showLoading() {
          document.getElementById('permission').classList.add('hidden');
          document.getElementById('loading').classList.remove('hidden');
        }

        function updateStatus(msg) {
          document.getElementById('status').textContent = msg;
        }

        function sendLocationAndRedirect(lat, lng, accuracy) {
          updateStatus('Saving location...');

          // Send location to API
          fetch('/api/track-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              qr_id: qrId,
              latitude: lat,
              longitude: lng,
              accuracy: accuracy,
              timestamp: new Date().toISOString()
            })
          }).finally(() => {
            updateStatus('Redirecting...');
            setTimeout(() => { window.location.href = redirectUrl; }, 500);
          });
        }

        function requestLocation() {
          showLoading();

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                sendLocationAndRedirect(
                  position.coords.latitude,
                  position.coords.longitude,
                  position.coords.accuracy
                );
              },
              (error) => {
                updateStatus('Location unavailable, redirecting...');
                setTimeout(() => { window.location.href = redirectUrl; }, 1000);
              },
              { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 0 }
            );
          } else {
            updateStatus('Geolocation not supported, redirecting...');
            setTimeout(() => { window.location.href = redirectUrl; }, 1000);
          }
        }

        function skipLocation() {
          showLoading();
          updateStatus('Redirecting...');
          setTimeout(() => { window.location.href = redirectUrl; }, 500);
        }
      </script>
    </body>
    </html>
  `;
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

    // 4. Append UTM Parameters
    const utmParameters = qrCode.utm_parameters as UTMParameters | null;
    if (utmParameters?.enabled) {
      redirectUrl = appendUTMParameters(redirectUrl, utmParameters);
    }

    // Validate and sanitize the final redirect URL to prevent open redirect attacks
    const safeRedirectUrl = sanitizeRedirectUrl(redirectUrl);
    if (safeRedirectUrl !== redirectUrl) {
      console.warn(`[SECURITY] Redirect URL sanitized from "${redirectUrl}" to "${safeRedirectUrl}"`);
    }

    // 5. Check Retargeting and GPS Tracking configurations
    const retargetingConfig = qrCode.retargeting_config as RetargetingConfig | null;
    const gpsTrackingConfig = qrCode.gps_tracking_config as GPSTrackingConfig | null;

    // Generate retargeting scripts if enabled
    const retargetingScripts = retargetingConfig?.enabled
      ? generateRetargetingScripts(retargetingConfig, retargetingConfig.custom_events?.scan || 'qr_scan')
      : '';

    // Record the scan asynchronously (don't block redirect)
    // Skip recording for internal requests (from dashboard, same origin, etc.)
    if (!isInternalRequest) {
      db
        .from('qr_scans')
        .insert({
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
        })
        .then(({ error }) => {
          if (error) {
            console.error('Error recording scan:', error);
          }
        });
    } else {
      console.log('Skipping scan record for internal request');
    }

    // 6. Check if GPS tracking with permission is enabled
    // If GPS tracking is enabled and requires permission, show tracking page
    if (gpsTrackingConfig?.enabled && gpsTrackingConfig?.require_permission && !isInternalRequest) {
      // Check if user already submitted location (via cookie)
      const cookies = req.headers.cookie || '';
      const hasLocationCookie = cookies.includes(`qr_gps_${code}=tracked`);

      if (!hasLocationCookie) {
        // Show GPS tracking permission page
        const trackingPage = getGPSTrackingPage(
          code,
          safeRedirectUrl,
          qrCode.id,
          retargetingScripts,
          gpsTrackingConfig.track_precise_location
        );

        // Determine if we should add Secure flag (production = HTTPS)
        const isProduction = process.env.NODE_ENV === 'production' ||
                             process.env.VERCEL_ENV === 'production';
        const secureFlag = isProduction ? '; Secure' : '';

        // Set cookie to prevent showing again (1 hour expiry)
        res.setHeader('Set-Cookie',
          `qr_gps_${code}=tracked; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${secureFlag}`
        );

        res.status(200).send(trackingPage);
        return;
      }
    }

    // 7. If retargeting is enabled but no GPS tracking, serve redirect page with scripts
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

    // Redirect to final destination (validated)
    res.redirect(302, safeRedirectUrl);
  } catch (err) {
    console.error('Redirect error:', err);
    res.redirect(302, '/');
  }
}
