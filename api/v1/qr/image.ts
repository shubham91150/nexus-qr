import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import qrGenerator from 'qrcode-generator';
import sharp from 'sharp';

// =====================================================
// Binary QR Image Streaming API with Styled Rendering
// =====================================================
//
// Endpoints:
// GET /api/v1/qr/{id}/image.png - Returns raw PNG bytes (high-density)
// GET /api/v1/qr/{id}/image.svg - Returns raw SVG (with styling!)
//
// Supports:
// - Dot patterns: square, circle, square-dots, uniform-pills, mixed, sharp-diamond
// - Corner styles: square, circle, rounded, two-sided, three-sided
// - Colors: solid colors, gradients (linear/radial)
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

  // ==================== Uniform Pills Pattern (like frontend) ====================

  private getPillLength(row: number, col: number): number {
    const pattern = (row * 3 + col * 2) % 11;
    if (pattern === 0 || pattern === 10) return 8;
    if (pattern === 1 || pattern === 9) return 7;
    if (pattern === 2 || pattern === 8) return 6;
    if (pattern === 3 || pattern === 7) return 5;
    if (pattern === 4 || pattern === 6) return 4;
    if (pattern === 5) return 3;
    return 2;
  }

  private findPillGroups(matrix: boolean[][]): Array<{row: number; startCol: number; length: number; type: string}> {
    const pills: Array<{row: number; startCol: number; length: number; type: string}> = [];
    const processed = new Set<string>();
    const count = this.moduleCount;

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        const key = `${row}-${col}`;
        if (matrix[row][col] && !processed.has(key) && !this.isCornerSquare(row, col)) {
          let length = 1;
          const maxLength = this.getPillLength(row, col);

          while (
            col + length < count &&
            matrix[row][col + length] &&
            !this.isCornerSquare(row, col + length) &&
            !processed.has(`${row}-${col + length}`) &&
            length < maxLength
          ) {
            length++;
          }

          if (length >= 2) {
            pills.push({ row, startCol: col, length, type: 'pill' });
            for (let k = 0; k < length; k++) processed.add(`${row}-${col + k}`);
          } else {
            pills.push({ row, startCol: col, length: 1, type: 'single' });
            processed.add(key);
          }
        }
      }
    }
    return pills;
  }

  private generatePillsSVG(pills: Array<{row: number; startCol: number; length: number; type: string}>, cellSize: number, offset: number, fill: string): string {
    let svg = '';
    const uniformGap = cellSize * 0.1;
    const pillHeight = cellSize * 0.75;

    pills.forEach(pill => {
      if (pill.type === 'pill') {
        const x = (pill.startCol * cellSize) + offset + (uniformGap / 2);
        const y = (pill.row * cellSize) + offset + (cellSize - pillHeight) / 2;
        const totalWidth = (pill.length * cellSize) - uniformGap;
        const rx = pillHeight / 2;

        const segmentWidth = totalWidth / pill.length;
        const gapWidth = 0.2;
        const actualSegWidth = segmentWidth - gapWidth;

        for (let j = 0; j < pill.length; j++) {
          let segX = x + (j * segmentWidth);

          if (j === 0) {
            // First segment - rounded left, flat right
            svg += `<path d="M${segX + rx},${y} L${segX + actualSegWidth},${y} L${segX + actualSegWidth},${y + pillHeight} L${segX + rx},${y + pillHeight} Q${segX},${y + pillHeight} ${segX},${y + pillHeight - rx} L${segX},${y + rx} Q${segX},${y} ${segX + rx},${y} Z" fill="${fill}" />`;
          } else if (j === pill.length - 1) {
            // Last segment - flat left, rounded right
            segX += gapWidth;
            const endX = segX + actualSegWidth;
            svg += `<path d="M${segX},${y} L${endX - rx},${y} Q${endX},${y} ${endX},${y + rx} L${endX},${y + pillHeight - rx} Q${endX},${y + pillHeight} ${endX - rx},${y + pillHeight} L${segX},${y + pillHeight} Z" fill="${fill}" />`;
          } else {
            // Middle segments - flat both sides
            segX += gapWidth;
            svg += `<rect x="${segX}" y="${y}" width="${actualSegWidth}" height="${pillHeight}" fill="${fill}" />`;
          }
        }
      } else {
        // Single cell - draw as small circle
        const cx = (pill.startCol * cellSize) + offset + (cellSize / 2);
        const cy = (pill.row * cellSize) + offset + (cellSize / 2);
        const r = pillHeight / 3;
        svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`;
      }
    });
    return svg;
  }

  // ==================== Standard Patterns ====================

  private generateDotsPattern(matrix: boolean[][], cellSize: number, offset: number, fillOverride?: string): string {
    let svg = '';
    const fill = fillOverride || this.settings.fgColor;
    const pattern = this.settings.dotsType;

    // Note: uniform-pills is handled separately by findPillGroups + generatePillsSVG
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
          } else if (pattern === 'sharp-diamond') {
            // Diamond shape using curved paths
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            const hs = cellSize / 2;
            svg += `<path d="M${cx},${y} Q${cx + hs*0.1},${cy} ${x+cellSize},${cy} Q${cx+hs*0.1},${cy} ${cx},${y+cellSize} Q${cx-hs*0.1},${cy} ${x},${cy} Q${cx-hs*0.1},${cy} ${cx},${y} Z" fill="${fill}" />`;
          } else if (pattern === 'mixed') {
            // Mixed sizes - alternating larger and smaller circles
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
            const isBig = (row + col) % 3 === 0;
            const r = isBig ? (cellSize/2)*0.85 : (cellSize/2)*0.5;
            svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`;
          } else {
            // Default: square
            svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}" />`;
          }
        }
      }
    }
    return svg;
  }

  // Helper for generating rounded rect with individual corner radii
  private generateRoundedRectPath(x: number, y: number, w: number, h: number, radii: number[], fill: string): string {
    const [tl, tr, br, bl] = radii;
    return `<path d="
      M${x + tl},${y}
      L${x + w - tr},${y}
      Q${x + w},${y} ${x + w},${y + tr}
      L${x + w},${y + h - br}
      Q${x + w},${y + h} ${x + w - br},${y + h}
      L${x + bl},${y + h}
      Q${x},${y + h} ${x},${y + h - bl}
      L${x},${y + tl}
      Q${x},${y} ${x + tl},${y}
      Z" fill="${fill}" />`;
  }

  private generateCorners(cellSize: number, offset: number, fillOverride?: string, bgOverride?: string): string {
    let svg = '';
    const cornerSize = cellSize * 7;
    const count = this.moduleCount;
    const style = this.settings.cornerSquareType;

    // For mask mode: fillOverride = 'white', bgOverride = 'black'
    // For normal mode: use settings colors
    let fill = fillOverride || this.settings.fgColor;
    let dotFill = fillOverride || this.settings.fgColor;
    let bg = bgOverride || (this.settings.bgTransparent ? 'transparent' : this.settings.bgColor);

    // Apply custom corner colors only in non-mask mode
    if (!fillOverride && this.settings.customCornerColor) {
      fill = this.settings.cornerSquareColor || this.settings.fgColor;
      dotFill = this.settings.cornerDotColor || fill;
    }

    const corners = [
      { r: 0, c: 0, type: 'top-left' },
      { r: 0, c: count - 7, type: 'top-right' },
      { r: count - 7, c: 0, type: 'bottom-left' }
    ];

    corners.forEach(corner => {
      const x = (corner.c * cellSize) + offset;
      const y = (corner.r * cellSize) + offset;
      const maskId = `corner-mask-${corner.type}-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
      const radius = cornerSize * 0.15;

      if (style === 'circle') {
        const cx = x + cornerSize/2;
        const cy = y + cornerSize/2;

        // For transparent bg (and not in mask mode), use SVG mask to cut out the ring
        if (this.settings.bgTransparent && !fillOverride) {
          svg += `<defs><mask id="${maskId}">`;
          svg += `<circle cx="${cx}" cy="${cy}" r="${cornerSize/2}" fill="white" />`;
          svg += `<circle cx="${cx}" cy="${cy}" r="${cornerSize/2 - cellSize}" fill="black" />`;
          svg += `</mask></defs>`;
          svg += `<circle cx="${cx}" cy="${cy}" r="${cornerSize/2}" fill="${fill}" mask="url(#${maskId})" />`;
        } else {
          svg += `<circle cx="${cx}" cy="${cy}" r="${cornerSize/2}" fill="${fill}" />`;
          svg += `<circle cx="${cx}" cy="${cy}" r="${cornerSize/2 - cellSize}" fill="${bg}" />`;
        }
        svg += `<circle cx="${cx}" cy="${cy}" r="${cornerSize/2 - cellSize*2}" fill="${dotFill}" />`;
      } else if (style === 'rounded') {
        if (this.settings.bgTransparent && !fillOverride) {
          svg += `<defs><mask id="${maskId}">`;
          svg += `<rect x="${x}" y="${y}" width="${cornerSize}" height="${cornerSize}" rx="${radius}" fill="white" />`;
          svg += `<rect x="${x + cellSize}" y="${y + cellSize}" width="${cornerSize - cellSize*2}" height="${cornerSize - cellSize*2}" rx="${radius*0.7}" fill="black" />`;
          svg += `</mask></defs>`;
          svg += `<rect x="${x}" y="${y}" width="${cornerSize}" height="${cornerSize}" rx="${radius}" fill="${fill}" mask="url(#${maskId})" />`;
        } else {
          svg += `<rect x="${x}" y="${y}" width="${cornerSize}" height="${cornerSize}" rx="${radius}" fill="${fill}" />`;
          svg += `<rect x="${x + cellSize}" y="${y + cellSize}" width="${cornerSize - cellSize*2}" height="${cornerSize - cellSize*2}" rx="${radius*0.7}" fill="${bg}" />`;
        }
        svg += `<rect x="${x + cellSize*2}" y="${y + cellSize*2}" width="${cornerSize - cellSize*4}" height="${cornerSize - cellSize*4}" rx="${radius*0.4}" fill="${dotFill}" />`;
      } else if (style === 'two-sided' || style === 'three-sided') {
        // Advanced corner styles with individual corner radii
        let rOut = [radius, radius, radius, radius];

        if (style === 'three-sided') {
          // One sharp corner based on position (like a leaf shape)
          if (corner.type === 'top-left') rOut = [0, radius, radius, radius];
          else if (corner.type === 'top-right') rOut = [radius, 0, radius, radius];
          else rOut = [radius, radius, radius, 0]; // bottom-left
        } else if (style === 'two-sided') {
          // Diagonal corners rounded (like a parallelogram)
          if (corner.type === 'top-left' || corner.type === 'bottom-right') rOut = [0, radius, 0, radius];
          else rOut = [radius, 0, radius, 0];
        }

        if (this.settings.bgTransparent && !fillOverride) {
          svg += `<defs><mask id="${maskId}">`;
          svg += this.generateRoundedRectPath(x, y, cornerSize, cornerSize, rOut, 'white');
          const innerRadii = rOut.map(r => r > 0 ? r * 0.7 : 0);
          svg += this.generateRoundedRectPath(x + cellSize, y + cellSize, cornerSize - cellSize*2, cornerSize - cellSize*2, innerRadii, 'black');
          svg += `</mask></defs>`;
          let outerPath = this.generateRoundedRectPath(x, y, cornerSize, cornerSize, rOut, fill);
          outerPath = outerPath.replace('fill=', `mask="url(#${maskId})" fill=`);
          svg += outerPath;
        } else {
          svg += this.generateRoundedRectPath(x, y, cornerSize, cornerSize, rOut, fill);
          const innerRadii = rOut.map(r => r > 0 ? r * 0.7 : 0);
          svg += this.generateRoundedRectPath(x + cellSize, y + cellSize, cornerSize - cellSize*2, cornerSize - cellSize*2, innerRadii, bg);
        }
        const centerRadii = rOut.map(r => r > 0 ? r * 0.4 : 0);
        svg += this.generateRoundedRectPath(x + cellSize*2, y + cellSize*2, cornerSize - cellSize*4, cornerSize - cellSize*4, centerRadii, dotFill);
      } else {
        // Default: square
        if (this.settings.bgTransparent && !fillOverride) {
          svg += `<defs><mask id="${maskId}">`;
          svg += `<rect x="${x}" y="${y}" width="${cornerSize}" height="${cornerSize}" fill="white" />`;
          svg += `<rect x="${x + cellSize}" y="${y + cellSize}" width="${cornerSize - cellSize*2}" height="${cornerSize - cellSize*2}" fill="black" />`;
          svg += `</mask></defs>`;
          svg += `<rect x="${x}" y="${y}" width="${cornerSize}" height="${cornerSize}" fill="${fill}" mask="url(#${maskId})" />`;
        } else {
          svg += `<rect x="${x}" y="${y}" width="${cornerSize}" height="${cornerSize}" fill="${fill}" />`;
          svg += `<rect x="${x + cellSize}" y="${y + cellSize}" width="${cornerSize - cellSize*2}" height="${cornerSize - cellSize*2}" fill="${bg}" />`;
        }
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
    const isUniformPills = this.settings.dotsType === 'uniform-pills';

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

    // Add gradient definitions if needed
    svg += this.generateGradientDefs();

    // Background
    if (!this.settings.bgTransparent) {
      svg += `<rect width="100%" height="100%" fill="${this.settings.bgColor}" />`;
    }

    if (this.settings.isGradient) {
      // === MASK TECHNIQUE for gradient ===
      // This applies the gradient across the WHOLE QR, not per-cell
      const maskId = `qr-mask-${Date.now()}`;
      svg += `<defs><mask id="${maskId}">`;
      // Black background (masked out)
      svg += `<rect x="0" y="0" width="${size}" height="${size}" fill="black" />`;

      // Draw dots in WHITE (visible through mask)
      if (isUniformPills) {
        const pills = this.findPillGroups(matrix);
        svg += this.generatePillsSVG(pills, cellSize, padding, 'white');
      } else {
        svg += this.generateDotsPattern(matrix, cellSize, padding, 'white');
      }

      // Draw corners in WHITE if not using custom corner colors
      if (!this.settings.customCornerColor) {
        svg += this.generateCorners(cellSize, padding, 'white', 'black');
      }
      svg += `</mask></defs>`;

      // Apply gradient rectangle with mask - gradient spans entire QR
      svg += `<rect x="0" y="0" width="${size}" height="${size}" fill="url(#qrGradient)" mask="url(#${maskId})" />`;

      // If custom corner colors, draw corners separately (with their own colors)
      if (this.settings.customCornerColor) {
        svg += this.generateCorners(cellSize, padding);
      }
    } else {
      // === NORMAL MODE (no gradient) ===
      // Draw dots with solid color
      if (isUniformPills) {
        const pills = this.findPillGroups(matrix);
        svg += this.generatePillsSVG(pills, cellSize, padding, this.settings.fgColor);
      } else {
        svg += this.generateDotsPattern(matrix, cellSize, padding);
      }
      // Draw corners with solid colors
      svg += this.generateCorners(cellSize, padding);
    }

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
      // PNG - generate styled SVG and convert to PNG using sharp
      let pngBuffer: Buffer;

      if (useStyledRenderer) {
        // Generate styled SVG first
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
        const svg = renderer.render(qrContent);

        // Convert SVG to PNG using sharp with high density for quality
        const svgBuffer = Buffer.from(svg);
        pngBuffer = await sharp(svgBuffer, { density: 300 })
          .png()
          .toBuffer();
      } else {
        // Basic PNG using qrcode library
        pngBuffer = await generateBasicPNG(qrContent, {
          width: styleConfig.size || 400,
          margin: styleConfig.padding ? Math.floor(styleConfig.padding / 5) : 2,
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
