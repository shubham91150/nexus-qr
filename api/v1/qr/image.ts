import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import qrGenerator from 'qrcode-generator';

// =====================================================
// Binary QR Image Streaming API with Styled Rendering
// =====================================================
//
// Endpoints:
// GET /api/v1/qr/{id}/image.png - Returns raw PNG bytes
// GET /api/v1/qr/{id}/image.svg - Returns raw SVG (with styling!)
//
// Supports:
// - Dot patterns: square, circle, square-dots, uniform-pills
// - Corner styles: square, circle, rounded
// - Colors: solid colors, gradients
// - Custom corner colors
// - Transparent backgrounds
// =====================================================

// Style Configuration Interface
interface QRStyleConfig {
  size: number;
  padding: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  fgColor: string;
  bgColor: string;
  isGradient: boolean;
  gradientType: 'linear' | 'radial';
  fgColor2: string;
  gradientRotation: number;
  bgTransparent: boolean;
  customCornerColor: boolean;
  cornerSquareColor: string;
  cornerDotColor: string;
  dotsType: string;
  cornerSquareType: string;
  logoImage: string | null;
  logoSize: number;
  logoShape: string;
  frameType: string;
  frameText: string;
}

const defaultStyleConfig: QRStyleConfig = {
  size: 400,
  padding: 10,
  errorCorrectionLevel: 'M',
  fgColor: '#000000',
  bgColor: '#ffffff',
  isGradient: false,
  gradientType: 'linear',
  fgColor2: '#000000',
  gradientRotation: 0,
  bgTransparent: false,
  customCornerColor: false,
  cornerSquareColor: '#000000',
  cornerDotColor: '#000000',
  dotsType: 'square',
  cornerSquareType: 'square',
  logoImage: null,
  logoSize: 0.2,
  logoShape: 'rounded',
  frameType: 'none',
  frameText: 'SCAN ME',
};

// ==================== Inline Styled SVG Renderer ====================

class StyledQRRenderer {
  private settings: QRStyleConfig;
  private qrMatrix: boolean[][] = [];
  private moduleCount: number = 0;

  constructor(config: Partial<QRStyleConfig>) {
    this.settings = { ...defaultStyleConfig, ...config };
  }

  private generateMatrix(text: string): boolean[][] | null {
    try {
      const errorLevel = this.settings.errorCorrectionLevel;
      const qr = qrGenerator(0, errorLevel);
      qr.addData(text);
      qr.make();

      this.moduleCount = qr.getModuleCount();
      const matrix: boolean[][] = [];

      for (let row = 0; row < this.moduleCount; row++) {
        matrix[row] = [];
        for (let col = 0; col < this.moduleCount; col++) {
          matrix[row][col] = qr.isDark(row, col);
        }
      }
      this.qrMatrix = matrix;
      return matrix;
    } catch (e) {
      console.error("Matrix generation failed", e);
      return null;
    }
  }

  private generateGradientDefs(): string {
    if (!this.settings.isGradient) return '';

    const { gradientType, gradientRotation, fgColor, fgColor2 } = this.settings;
    let defs = '<defs>';
    const id = 'qrGradient';

    const stops = `
      <stop offset="0%" stop-color="${fgColor}" />
      <stop offset="100%" stop-color="${fgColor2}" />
    `;

    if (gradientType === 'linear') {
      const rad = gradientRotation * (Math.PI / 180);
      const x1 = 50 - 50 * Math.cos(rad + Math.PI/2);
      const y1 = 50 - 50 * Math.sin(rad + Math.PI/2);
      const x2 = 50 + 50 * Math.cos(rad + Math.PI/2);
      const y2 = 50 + 50 * Math.sin(rad + Math.PI/2);
      defs += `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`;
    } else {
      defs += `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stops}</radialGradient>`;
    }

    defs += '</defs>';
    return defs;
  }

  private isCornerSquare(row: number, col: number): boolean {
    const cornerSize = 7;
    const count = this.moduleCount;
    if (row < cornerSize && col < cornerSize) return true;
    if (row < cornerSize && col >= count - cornerSize) return true;
    if (row >= count - cornerSize && col < cornerSize) return true;
    return false;
  }

  private generateDotsPattern(matrix: boolean[][], cellSize: number, offset: number): string {
    let svg = '';
    const fill = this.settings.isGradient ? 'url(#qrGradient)' : this.settings.fgColor;
    const pattern = this.settings.dotsType;

    for (let row = 0; row < this.moduleCount; row++) {
      for (let col = 0; col < this.moduleCount; col++) {
        if (matrix[row][col] && !this.isCornerSquare(row, col)) {
          const x = (col * cellSize) + offset;
          const y = (row * cellSize) + offset;

          if (pattern === 'circle') {
            const r = (cellSize / 2) * 0.85;
            svg += `<circle cx="${x + cellSize/2}" cy="${y + cellSize/2}" r="${r}" fill="${fill}" />`;
          } else if (pattern === 'square-dots') {
            const size = cellSize * 0.85;
            const off = (cellSize - size) / 2;
            svg += `<rect x="${x+off}" y="${y+off}" width="${size}" height="${size}" fill="${fill}" />`;
          } else if (pattern === 'uniform-pills') {
            const size = cellSize * 0.75;
            const off = (cellSize - size) / 2;
            const rx = size / 2;
            svg += `<rect x="${x+off}" y="${y+off}" width="${size}" height="${size}" rx="${rx}" fill="${fill}" />`;
          } else {
            // Default: square
            svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}" />`;
          }
        }
      }
    }
    return svg;
  }

  private generateCorners(cellSize: number, offset: number): string {
    let svg = '';
    const cornerSize = cellSize * 7;
    const count = this.moduleCount;
    const style = this.settings.cornerSquareType;

    let fill = this.settings.isGradient ? 'url(#qrGradient)' : this.settings.fgColor;
    let dotFill = fill;

    if (this.settings.customCornerColor) {
      fill = this.settings.cornerSquareColor || this.settings.fgColor;
      dotFill = this.settings.cornerDotColor || fill;
    }

    const bg = this.settings.bgTransparent ? 'transparent' : this.settings.bgColor;

    const corners = [
      { r: 0, c: 0 },
      { r: 0, c: count - 7 },
      { r: count - 7, c: 0 }
    ];

    corners.forEach(corner => {
      const x = (corner.c * cellSize) + offset;
      const y = (corner.r * cellSize) + offset;

      if (style === 'circle') {
        const cx = x + cornerSize/2;
        const cy = y + cornerSize/2;
        svg += `<circle cx="${cx}" cy="${cy}" r="${cornerSize/2}" fill="${fill}" />`;
        svg += `<circle cx="${cx}" cy="${cy}" r="${cornerSize/2 - cellSize}" fill="${bg}" />`;
        svg += `<circle cx="${cx}" cy="${cy}" r="${cornerSize/2 - cellSize*2}" fill="${dotFill}" />`;
      } else if (style === 'rounded') {
        const radius = cornerSize * 0.15;
        svg += `<rect x="${x}" y="${y}" width="${cornerSize}" height="${cornerSize}" rx="${radius}" fill="${fill}" />`;
        svg += `<rect x="${x + cellSize}" y="${y + cellSize}" width="${cornerSize - cellSize*2}" height="${cornerSize - cellSize*2}" rx="${radius*0.7}" fill="${bg}" />`;
        svg += `<rect x="${x + cellSize*2}" y="${y + cellSize*2}" width="${cornerSize - cellSize*4}" height="${cornerSize - cellSize*4}" rx="${radius*0.4}" fill="${dotFill}" />`;
      } else {
        // Default: square
        svg += `<rect x="${x}" y="${y}" width="${cornerSize}" height="${cornerSize}" fill="${fill}" />`;
        svg += `<rect x="${x + cellSize}" y="${y + cellSize}" width="${cornerSize - cellSize*2}" height="${cornerSize - cellSize*2}" fill="${bg}" />`;
        svg += `<rect x="${x + cellSize*2}" y="${y + cellSize*2}" width="${cornerSize - cellSize*4}" height="${cornerSize - cellSize*4}" fill="${dotFill}" />`;
      }
    });

    return svg;
  }

  private generateLogo(): string {
    if (!this.settings.logoImage) return '';

    const size = this.settings.size;
    const logoSize = size * this.settings.logoSize;
    const cx = size / 2;
    const cy = size / 2;
    const bgSize = logoSize * 1.1;
    const bgX = cx - bgSize / 2;
    const bgY = cy - bgSize / 2;
    const logoX = cx - logoSize / 2;
    const logoY = cy - logoSize / 2;

    let svg = '';
    const shape = this.settings.logoShape;

    if (shape === 'circle') {
      svg += `<circle cx="${cx}" cy="${cy}" r="${bgSize / 2}" fill="#ffffff" />`;
    } else if (shape === 'rounded') {
      const cornerRadius = bgSize * 0.15;
      svg += `<rect x="${bgX}" y="${bgY}" width="${bgSize}" height="${bgSize}" rx="${cornerRadius}" fill="#ffffff" />`;
    } else {
      svg += `<rect x="${bgX}" y="${bgY}" width="${bgSize}" height="${bgSize}" fill="#ffffff" />`;
    }

    svg += `<image x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" href="${this.settings.logoImage}" preserveAspectRatio="xMidYMid meet" />`;

    return svg;
  }

  public render(text: string): string {
    const matrix = this.generateMatrix(text);
    if (!matrix) return '';

    const size = this.settings.size;
    const padding = this.settings.padding;
    const effectiveSize = size - (padding * 2);
    const cellSize = effectiveSize / this.moduleCount;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

    // Add gradient definitions if needed
    svg += this.generateGradientDefs();

    // Background
    if (!this.settings.bgTransparent) {
      svg += `<rect width="100%" height="100%" fill="${this.settings.bgColor}" />`;
    }

    // Dots/modules
    svg += this.generateDotsPattern(matrix, cellSize, padding);

    // Corners
    svg += this.generateCorners(cellSize, padding);

    // Logo
    svg += this.generateLogo();

    svg += '</svg>';
    return svg;
  }
}

// ==================== Helper Functions ====================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

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

    default:
      return typeof content === 'object' ? JSON.stringify(content) : String(content);
  }
}

// Basic PNG generation (no styling - using qrcode library)
async function generateBasicPNG(content: string, options: any = {}): Promise<Buffer> {
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

// Check if style config has advanced styling that needs custom renderer
function hasAdvancedStyling(styleConfig: any): boolean {
  if (!styleConfig) return false;

  return (
    styleConfig.isGradient ||
    (styleConfig.dotsType && styleConfig.dotsType !== 'square') ||
    (styleConfig.cornerSquareType && styleConfig.cornerSquareType !== 'square') ||
    styleConfig.customCornerColor ||
    styleConfig.logoImage ||
    styleConfig.bgTransparent
  );
}

// Validate API key
async function validateApiKey(apiKey: string, db: any): Promise<{ valid: boolean; userId?: string }> {
  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const { data: keyData, error } = await db
      .from('api_keys')
      .select('id, user_id, is_active, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyData) return { valid: false };
    if (!keyData.is_active) return { valid: false };
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) return { valid: false };

    return { valid: true, userId: keyData.user_id };
  } catch {
    return { valid: false };
  }
}

// ==================== Main Handler ====================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getSupabaseAdmin();

    // Get QR ID and format
    const qrIdRaw = req.query.id;
    const qrIdValue = Array.isArray(qrIdRaw) ? qrIdRaw[0] : qrIdRaw;
    const qrId = qrIdValue?.replace(/^["']|["']$/g, '').trim();

    const formatRaw = req.query.format;
    const format = (Array.isArray(formatRaw) ? formatRaw[0] : formatRaw) || 'png';

    if (!qrId) {
      return res.status(400).json({ error: 'QR ID is required' });
    }

    // Check API key
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

    // Build QR content
    let qrContent: string;

    if (qrData.is_dynamic) {
      const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
      qrContent = `${baseUrl}/r/${qrData.short_code}`;
    } else {
      if (qrData.content_type === 'url') {
        qrContent = qrData.destination_url || qrData.content_data?.value || '';
      } else {
        qrContent = buildQRContent(qrData.content_type, qrData.content_data);
      }
    }

    // Get style config
    const styleConfig = qrData.qr_style?.styleConfig || {};
    const useStyledRenderer = hasAdvancedStyling(styleConfig);

    // Set caching headers
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Vary', 'Accept');

    if (format === 'svg') {
      // SVG - use styled renderer if advanced styling
      let svg: string;

      if (useStyledRenderer) {
        const renderer = new StyledQRRenderer({
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
          customCornerColor: styleConfig.customCornerColor || false,
          cornerSquareColor: styleConfig.cornerSquareColor || '#000000',
          cornerDotColor: styleConfig.cornerDotColor || '#000000',
          logoImage: styleConfig.logoImage || null,
          logoSize: styleConfig.logoSize || 0.2,
          logoShape: styleConfig.logoShape || 'rounded',
          frameType: styleConfig.frameType || 'none',
          frameText: styleConfig.frameText || 'SCAN ME',
        });
        svg = renderer.render(qrContent);
      } else {
        // Basic SVG using qrcode library
        svg = await QRCode.toString(qrContent, {
          type: 'svg',
          width: styleConfig.size || 400,
          margin: styleConfig.padding ? Math.floor(styleConfig.padding / 5) : 2,
          errorCorrectionLevel: (styleConfig.errorCorrectionLevel || 'M') as 'L' | 'M' | 'Q' | 'H',
          color: {
            dark: styleConfig.fgColor || '#000000',
            light: styleConfig.bgTransparent ? '#00000000' : (styleConfig.bgColor || '#ffffff')
          }
        });
      }

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `inline; filename="${qrData.short_code}.svg"`);
      return res.status(200).send(svg);

    } else {
      // PNG - use basic qrcode library (styled PNG requires sharp which has issues on Vercel)
      const pngBuffer = await generateBasicPNG(qrContent, {
        width: styleConfig.size || 400,
        margin: styleConfig.padding ? Math.floor(styleConfig.padding / 5) : 2,
        color: styleConfig.fgColor || '#000000',
        background: styleConfig.bgTransparent ? '#00000000' : (styleConfig.bgColor || '#ffffff'),
        error_correction: styleConfig.errorCorrectionLevel || 'M'
      });

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
