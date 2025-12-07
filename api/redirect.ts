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
async function getGeoLocation(ip: string): Promise<{ country: string; city: string } | null> {
  // Skip for localhost/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null;
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`, {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === 'fail') return null;

    return {
      country: data.country || null,
      city: data.city || null,
    };
  } catch {
    return null;
  }
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

// ==================== Main Handler ====================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Get short code from query
  const { code } = req.query;

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
        default_language
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
    const { url: redirectUrl, abVariantId } = getRedirectUrl(qrCode as DynamicQRCode, context);

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
