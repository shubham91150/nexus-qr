import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

// Use require for local module to ensure Vercel bundles it correctly
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ServerSVGRenderer } = require('./serverSvgRenderer');

// Type definition for style config
interface QRStyleConfig {
  size?: number;
  padding?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  fgColor?: string;
  bgColor?: string;
  isGradient?: boolean;
  gradientType?: 'linear' | 'radial';
  fgColor2?: string;
  gradientRotation?: number;
  bgTransparent?: boolean;
  customCornerColor?: boolean;
  cornerSquareColor?: string;
  cornerDotColor?: string;
  dotsType?: string;
  cornerSquareType?: string;
  cornerDotType?: string;
  frameType?: string;
  frameText?: string;
  logoImage?: string | null;
  logoSize?: number;
  logoPadding?: number;
  logoUseCustomColors?: boolean;
  logoForegroundColor?: string;
  logoBackgroundColor?: string;
  logoShape?: string;
}

// =====================================================
// Binary QR Image Streaming API
// =====================================================
//
// Endpoints:
// GET /api/v1/qr/{id}/image.png - Returns raw PNG bytes
// GET /api/v1/qr/{id}/image.svg - Returns raw SVG
//
// This is more efficient than Base64 because:
// - No 33% size overhead
// - Native browser/mobile decoding
// - Proper caching with Cache-Control headers
// - No memory issues on mobile devices
//
// NEW: Supports full QR styling (patterns, colors, gradients, corners, logos)
// =====================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Build QR content based on type
function buildQRContent(type: string, content: string | Record<string, any>): string {
  if (typeof content === 'string') return content;

  switch (type) {
    case 'vcard':
      const vc = content;
      return `BEGIN:VCARD
VERSION:3.0
FN:${vc.name || ''}
ORG:${vc.company || ''}
TEL:${vc.phone || ''}
EMAIL:${vc.email || ''}
URL:${vc.website || ''}
ADR:;;${vc.address || ''}
NOTE:${vc.note || ''}
END:VCARD`;

    case 'wifi':
      return `WIFI:T:${content.encryption || 'WPA'};S:${content.ssid || ''};P:${content.password || ''};;`;

    case 'email':
      return `mailto:${content.address || content.to || ''}?subject=${encodeURIComponent(content.subject || '')}&body=${encodeURIComponent(content.body || '')}`;

    case 'sms':
      return `sms:${content.phone || ''}?body=${encodeURIComponent(content.message || '')}`;

    case 'phone':
      return `tel:${content.number || content}`;

    case 'geo':
      return `geo:${content.latitude || 0},${content.longitude || 0}`;

    case 'event':
      const ev = content;
      return `BEGIN:VEVENT
SUMMARY:${ev.title || ''}
DTSTART:${ev.start || ''}
DTEND:${ev.end || ''}
LOCATION:${ev.location || ''}
DESCRIPTION:${ev.description || ''}
END:VEVENT`;

    default:
      return typeof content === 'object' ? JSON.stringify(content) : String(content);
  }
}

// Generate QR code as PNG buffer (basic - no styling)
async function generateBasicQRPNG(content: string, options: any = {}): Promise<Buffer> {
  const qrOptions = {
    type: 'png' as const,
    width: Math.min(Math.max(options.width || 400, 100), 2000),
    margin: Math.min(Math.max(options.margin ?? 2, 0), 10),
    errorCorrectionLevel: (options.error_correction || 'M') as 'L' | 'M' | 'Q' | 'H',
    color: {
      dark: options.color || '#000000',
      light: options.background || '#ffffff'
    }
  };

  return await QRCode.toBuffer(content, qrOptions);
}

// Generate QR code as SVG string (basic - no styling)
async function generateBasicQRSVG(content: string, options: any = {}): Promise<string> {
  const qrOptions = {
    type: 'svg' as const,
    width: Math.min(Math.max(options.width || 400, 100), 2000),
    margin: Math.min(Math.max(options.margin ?? 2, 0), 10),
    errorCorrectionLevel: (options.error_correction || 'M') as 'L' | 'M' | 'Q' | 'H',
    color: {
      dark: options.color || '#000000',
      light: options.background || '#ffffff'
    }
  };

  return await QRCode.toString(content, qrOptions);
}

// Generate styled QR code as SVG string
function generateStyledQRSVG(content: string, styleConfig: Partial<QRStyleConfig>): string {
  const renderer = new ServerSVGRenderer(styleConfig);
  return renderer.render(content);
}

// Generate styled QR code as PNG buffer
async function generateStyledQRPNG(content: string, styleConfig: Partial<QRStyleConfig>): Promise<Buffer> {
  const renderer = new ServerSVGRenderer(styleConfig);
  const png = await renderer.renderToPNG(content);
  if (png) return png;

  // Fallback to basic PNG if styled rendering fails (e.g., sharp not available)
  return await generateBasicQRPNG(content, {
    width: styleConfig.size || 400,
    color: styleConfig.fgColor || '#000000',
    background: styleConfig.bgTransparent ? '#00000000' : (styleConfig.bgColor || '#ffffff'),
    error_correction: styleConfig.errorCorrectionLevel || 'M'
  });
}

// Check if style config has advanced styling
function hasAdvancedStyling(styleConfig: any): boolean {
  if (!styleConfig) return false;

  // Check for any advanced styling features
  return (
    styleConfig.isGradient ||
    styleConfig.dotsType !== 'square' ||
    styleConfig.cornerSquareType !== 'square' ||
    styleConfig.customCornerColor ||
    styleConfig.logoImage ||
    (styleConfig.frameType && styleConfig.frameType !== 'none') ||
    styleConfig.bgTransparent
  );
}

// Validate API key (simplified version)
async function validateApiKey(apiKey: string, db: any): Promise<{ valid: boolean; userId?: string }> {
  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const { data: keyData, error } = await db
      .from('api_keys')
      .select('id, user_id, is_active, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyData) {
      return { valid: false };
    }

    if (!keyData.is_active) {
      return { valid: false };
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return { valid: false };
    }

    return { valid: true, userId: keyData.user_id };
  } catch {
    return { valid: false };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getSupabaseAdmin();

    // Get QR ID and format from query params (set by Vercel rewrite)
    const qrIdRaw = req.query.id;
    const qrIdValue = Array.isArray(qrIdRaw) ? qrIdRaw[0] : qrIdRaw;
    const qrId = qrIdValue?.replace(/^["']|["']$/g, '').trim();

    const formatRaw = req.query.format;
    const format = (Array.isArray(formatRaw) ? formatRaw[0] : formatRaw) || 'png';

    if (!qrId) {
      return res.status(400).json({ error: 'QR ID is required' });
    }

    // Check for API key (optional - can make public with rate limiting)
    const apiKey = req.headers['x-api-key'] as string ||
                   (req.headers.authorization?.replace('Bearer ', ''));

    let userId: string | null = null;

    if (apiKey) {
      const validation = await validateApiKey(apiKey, db);
      if (validation.valid) {
        userId = validation.userId || null;
      }
    }

    // Fetch QR code data
    let query = db
      .from('dynamic_qr_codes')
      .select('id, user_id, short_code, content_type, content_data, destination_url, is_dynamic, is_active, qr_style')
      .eq('id', qrId);

    // If user is authenticated, only show their QRs
    // If not authenticated, allow public access (for embedding)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: qrData, error } = await query.single();

    if (error || !qrData) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    if (!qrData.is_active) {
      return res.status(410).json({ error: 'QR code is inactive' });
    }

    // Determine what content to encode in QR
    let qrContent: string;

    if (qrData.is_dynamic) {
      // For dynamic QR, use the redirect URL
      const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
      qrContent = `${baseUrl}/r/${qrData.short_code}`;
    } else {
      // For static QR, use the actual content
      if (qrData.content_type === 'url') {
        qrContent = qrData.destination_url || qrData.content_data?.value || '';
      } else {
        qrContent = buildQRContent(qrData.content_type, qrData.content_data);
      }
    }

    // Get style options from qr_style if available
    const styleConfig = qrData.qr_style?.styleConfig || {};
    const useAdvancedStyling = hasAdvancedStyling(styleConfig);

    // Set caching headers (cache for 1 day, revalidate after)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Vary', 'Accept');

    if (format === 'svg') {
      // Return SVG
      let svg: string;

      if (useAdvancedStyling) {
        // Use styled renderer for advanced features
        svg = generateStyledQRSVG(qrContent, {
          size: styleConfig.size || 400,
          padding: styleConfig.padding || 10,
          errorCorrectionLevel: styleConfig.errorCorrectionLevel || 'M',
          fgColor: styleConfig.fgColor || '#000000',
          bgColor: styleConfig.bgColor || '#ffffff',
          bgTransparent: styleConfig.bgTransparent || false,
          isGradient: styleConfig.isGradient || false,
          gradientType: styleConfig.gradientType || 'linear',
          fgColor2: styleConfig.fgColor2 || '#000000',
          gradientRotation: styleConfig.gradientRotation || 0,
          dotsType: styleConfig.dotsType || 'square',
          cornerSquareType: styleConfig.cornerSquareType || 'square',
          cornerDotType: styleConfig.cornerDotType || 'square',
          customCornerColor: styleConfig.customCornerColor || false,
          cornerSquareColor: styleConfig.cornerSquareColor || '#000000',
          cornerDotColor: styleConfig.cornerDotColor || '#000000',
          logoImage: styleConfig.logoImage || null,
          logoSize: styleConfig.logoSize || 0.2,
          logoPadding: styleConfig.logoPadding || 10,
          logoShape: styleConfig.logoShape || 'auto',
          logoUseCustomColors: styleConfig.logoUseCustomColors || false,
          logoForegroundColor: styleConfig.logoForegroundColor || '#000000',
          logoBackgroundColor: styleConfig.logoBackgroundColor || '#ffffff',
          frameType: styleConfig.frameType || 'none',
          frameText: styleConfig.frameText || 'SCAN ME',
        });
      } else {
        // Use basic renderer for simple QRs
        svg = await generateBasicQRSVG(qrContent, {
          width: styleConfig.size || 400,
          margin: styleConfig.padding !== undefined ? Math.floor(styleConfig.padding / 5) : 2,
          color: styleConfig.fgColor || '#000000',
          background: styleConfig.bgTransparent ? '#00000000' : (styleConfig.bgColor || '#ffffff'),
          error_correction: styleConfig.errorCorrectionLevel || 'M'
        });
      }

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `inline; filename="${qrData.short_code}.svg"`);
      return res.status(200).send(svg);
    } else {
      // Return PNG (default)
      let pngBuffer: Buffer;

      if (useAdvancedStyling) {
        // Use styled renderer for advanced features
        pngBuffer = await generateStyledQRPNG(qrContent, {
          size: styleConfig.size || 400,
          padding: styleConfig.padding || 10,
          errorCorrectionLevel: styleConfig.errorCorrectionLevel || 'M',
          fgColor: styleConfig.fgColor || '#000000',
          bgColor: styleConfig.bgColor || '#ffffff',
          bgTransparent: styleConfig.bgTransparent || false,
          isGradient: styleConfig.isGradient || false,
          gradientType: styleConfig.gradientType || 'linear',
          fgColor2: styleConfig.fgColor2 || '#000000',
          gradientRotation: styleConfig.gradientRotation || 0,
          dotsType: styleConfig.dotsType || 'square',
          cornerSquareType: styleConfig.cornerSquareType || 'square',
          cornerDotType: styleConfig.cornerDotType || 'square',
          customCornerColor: styleConfig.customCornerColor || false,
          cornerSquareColor: styleConfig.cornerSquareColor || '#000000',
          cornerDotColor: styleConfig.cornerDotColor || '#000000',
          logoImage: styleConfig.logoImage || null,
          logoSize: styleConfig.logoSize || 0.2,
          logoPadding: styleConfig.logoPadding || 10,
          logoShape: styleConfig.logoShape || 'auto',
          logoUseCustomColors: styleConfig.logoUseCustomColors || false,
          logoForegroundColor: styleConfig.logoForegroundColor || '#000000',
          logoBackgroundColor: styleConfig.logoBackgroundColor || '#ffffff',
          frameType: styleConfig.frameType || 'none',
          frameText: styleConfig.frameText || 'SCAN ME',
        });
      } else {
        // Use basic renderer for simple QRs
        pngBuffer = await generateBasicQRPNG(qrContent, {
          width: styleConfig.size || 400,
          margin: styleConfig.padding !== undefined ? Math.floor(styleConfig.padding / 5) : 2,
          color: styleConfig.fgColor || '#000000',
          background: styleConfig.bgTransparent ? '#00000000' : (styleConfig.bgColor || '#ffffff'),
          error_correction: styleConfig.errorCorrectionLevel || 'M'
        });
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="${qrData.short_code}.png"`);
      res.setHeader('Content-Length', pngBuffer.length);
      return res.status(200).send(pngBuffer);
    }

  } catch (error: any) {
    console.error('Image API Error:', error);
    return res.status(500).json({ error: 'Failed to generate QR image', details: error.message });
  }
}
