import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://tyuambzppjfvwxkmpgma.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Use service key for server-side operations (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

// Fetch geolocation data from IP (using free API)
async function getGeoLocation(ip: string): Promise<{ country: string; city: string; lat?: number; lon?: number } | null> {
  // Skip for localhost/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null;
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,lat,lon`, {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === 'fail') return null;

    return {
      country: data.country || null,
      city: data.city || null,
      lat: data.lat,
      lon: data.lon,
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

  const timeWindowStart = new Date();
  timeWindowStart.setMinutes(timeWindowStart.getMinutes() - restriction.timeWindowMinutes);

  // Count recent scans from this IP
  const { count, error } = await supabase
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
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Password Protected</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
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
        <p class="hint">${hint ? `Hint: ${hint}` : 'Enter the password to continue'}</p>
        <form method="POST" action="/api/redirect?code=${code}">
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
function getGeofenceBlockedPage(redirectUrl?: string): string {
  if (redirectUrl) {
    return `<script>window.location.href="${redirectUrl}";</script>`;
  }
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Access Restricted</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
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
  `;
}

// Generate IP blocked page HTML
function getIPBlockedPage(redirectUrl?: string): string {
  if (redirectUrl) {
    return `<script>window.location.href="${redirectUrl}";</script>`;
  }
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Rate Limited</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
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
  `;
}

// Check if QR code is expired
function isQRExpired(qr: DynamicQRCode): boolean {
  if (!qr.expires_at) return false;
  return new Date(qr.expires_at) < new Date();
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

async function handlePasswordVerification(
  req: VercelRequest,
  res: VercelResponse,
  code: string
): Promise<void> {
  if (!code) {
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

  // Look up the QR code
  const { data: qrCode, error } = await supabase
    .from('dynamic_qr_codes')
    .select('password_protection, destination_url')
    .eq('short_code', code)
    .single();

  if (error || !qrCode) {
    res.redirect(302, '/');
    return;
  }

  const passwordProtection = qrCode.password_protection as PasswordProtection | null;

  if (!passwordProtection?.enabled) {
    res.redirect(302, `/r/${code}`);
    return;
  }

  // Check password
  if (password === passwordProtection.password) {
    // Set a cookie to bypass password check
    res.setHeader('Set-Cookie', `qr_auth_${code}=verified; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`);
    res.redirect(302, `/r/${code}`);
  } else {
    // Redirect back with error
    res.redirect(302, `/r/${code}?error=1`);
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

  // Check if service key is configured
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_KEY not configured');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    // Look up the QR code with ALL necessary fields for advanced features
    const { data: qrCode, error: qrError } = await supabase
      .from('dynamic_qr_codes')
      .select(`
        id,
        destination_url,
        is_active,
        expires_at,
        expired_redirect_url,
        conditional_rules,
        ab_testing_enabled,
        ab_variants,
        multi_language_enabled,
        language_contents,
        default_language,
        password_protection,
        geofence_settings,
        ip_restriction,
        utm_parameters
      `)
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
        res.status(403).send(getGeofenceBlockedPage(geofenceSettings.blockedRedirectUrl));
        return;
      }
    }

    // 3. Check IP Restriction
    const ipRestriction = qrCode.ip_restriction as IPRestriction | null;
    if (ipRestriction?.enabled && clientIP) {
      const allowed = await checkIPRestriction(qrCode.id, clientIP, ipRestriction);

      if (!allowed) {
        res.status(429).send(getIPBlockedPage(ipRestriction.blockedRedirectUrl));
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

    // Record the scan asynchronously (don't block redirect)
    supabase
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

    // Redirect to final destination
    res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Redirect error:', err);
    res.redirect(302, '/');
  }
}
