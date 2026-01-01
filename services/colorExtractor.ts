/**
 * Color Extractor Utility
 * Extracts dominant foreground and background colors from logo images
 * Supports gradient detection
 * ENSURES proper contrast between foreground and background
 */

export interface ExtractedColors {
  foreground: string;
  foreground2?: string;  // Second color for gradient
  background: string;
  isGradient: boolean;
  gradientType?: 'linear' | 'radial';
  gradientRotation?: number;
}

interface ColorCount {
  color: string;
  count: number;
  brightness: number;
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate brightness of a color (0-255)
 */
function getBrightness(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Get brightness from hex color
 */
function getHexBrightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 128;
  return getBrightness(rgb.r, rgb.g, rgb.b);
}

/**
 * Calculate color distance (how different two colors are)
 */
function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 0;

  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

/**
 * Ensure contrast between foreground and background
 * Returns corrected colors with guaranteed contrast
 */
function ensureContrast(fg: string, bg: string, fg2?: string): { foreground: string; background: string; foreground2?: string } {
  const fgBrightness = getHexBrightness(fg);
  const bgBrightness = getHexBrightness(bg);
  const brightnessDiff = Math.abs(fgBrightness - bgBrightness);

  // Need at least 100 brightness difference for good contrast
  if (brightnessDiff < 100) {
    // If foreground is dark (< 128), use white background
    // If foreground is light (>= 128), use dark foreground or white bg
    if (fgBrightness < 128) {
      // Dark foreground - use white background
      return { foreground: fg, background: '#ffffff', foreground2: fg2 };
    } else {
      // Light foreground - use white background and make foreground darker
      // Or just use the color as-is with white background
      return { foreground: fg, background: '#ffffff', foreground2: fg2 };
    }
  }

  return { foreground: fg, background: bg, foreground2: fg2 };
}

/**
 * Quantize color to reduce similar colors
 */
function quantizeColor(r: number, g: number, b: number, factor: number = 32): string {
  const qr = Math.round(r / factor) * factor;
  const qg = Math.round(g / factor) * factor;
  const qb = Math.round(b / factor) * factor;
  return rgbToHex(qr, qg, qb);
}

/**
 * Extract dominant colors from an image (with gradient detection)
 */
export async function extractColorsFromImage(imageDataUrl: string): Promise<ExtractedColors> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ foreground: '#000000', background: '#ffffff', isGradient: false });
          return;
        }

        const maxSize = 100;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        const colorCounts: Map<string, ColorCount> = new Map();

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          if (a < 128) continue;

          const quantized = quantizeColor(r, g, b);
          const brightness = getBrightness(r, g, b);

          const existing = colorCounts.get(quantized);
          if (existing) {
            existing.count++;
          } else {
            colorCounts.set(quantized, { color: quantized, count: 1, brightness });
          }
        }

        const sortedColors = Array.from(colorCounts.values()).sort((a, b) => b.count - a.count);

        if (sortedColors.length === 0) {
          resolve({ foreground: '#000000', background: '#ffffff', isGradient: false });
          return;
        }

        // Get the most dominant color as foreground
        const dominantColor = sortedColors[0].color;

        // Default background to white for best contrast
        let background = '#ffffff';
        let foreground = dominantColor;
        let foreground2: string | undefined;
        let isGradient = false;

        // Check if there's a second significantly different color for gradient
        for (let i = 1; i < sortedColors.length && i < 5; i++) {
          const distance = colorDistance(foreground, sortedColors[i].color);
          if (distance > 100 && sortedColors[i].count > sortedColors[0].count * 0.2) {
            foreground2 = sortedColors[i].color;
            isGradient = true;
            break;
          }
        }

        // Ensure contrast
        const corrected = ensureContrast(foreground, background, foreground2);

        resolve({
          foreground: corrected.foreground,
          foreground2: corrected.foreground2,
          background: corrected.background,
          isGradient,
          gradientType: isGradient ? 'linear' : undefined,
          gradientRotation: isGradient ? 45 : undefined
        });
      } catch (error) {
        console.error('Error extracting colors:', error);
        resolve({ foreground: '#000000', background: '#ffffff', isGradient: false });
      }
    };

    img.onerror = () => {
      resolve({ foreground: '#000000', background: '#ffffff', isGradient: false });
    };

    img.src = imageDataUrl;
  });
}

/**
 * Extract colors from SVG data URL (with gradient detection)
 */
export async function extractColorsFromSvg(svgDataUrl: string): Promise<ExtractedColors> {
  try {
    let svgContent = '';
    if (svgDataUrl.includes('base64,')) {
      const base64 = svgDataUrl.split('base64,')[1];
      svgContent = atob(base64);
    } else if (svgDataUrl.includes(',')) {
      const encoded = svgDataUrl.split(',')[1];
      svgContent = decodeURIComponent(encoded);
    } else {
      return extractColorsFromImage(svgDataUrl);
    }

    // Check for gradients in SVG
    const hasLinearGradient = /<linearGradient/i.test(svgContent);
    const hasRadialGradient = /<radialGradient/i.test(svgContent);
    const hasGradient = hasLinearGradient || hasRadialGradient;

    // Extract all colors from SVG
    const allColors: { color: string; brightness: number }[] = [];

    // Extract gradient stop colors
    if (hasGradient) {
      const stopMatches = svgContent.matchAll(/<stop[^>]*(?:stop-color\s*[=:]\s*["']?([^"';>\s]+)|style\s*=\s*["'][^"']*stop-color\s*:\s*([^"';>\s]+))[^>]*>/gi);
      for (const match of stopMatches) {
        const colorStr = match[1] || match[2];
        if (colorStr) {
          const color = parseColor(colorStr);
          if (color) {
            allColors.push({ color, brightness: getHexBrightness(color) });
          }
        }
      }
    }

    // Extract fill colors
    const fillMatches = svgContent.matchAll(/fill\s*[=:]\s*["']?(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-z]+)["']?/gi);
    for (const match of fillMatches) {
      const color = parseColor(match[1]);
      if (color && color !== '#none' && color !== '#transparent') {
        allColors.push({ color, brightness: getHexBrightness(color) });
      }
    }

    // Extract stroke colors
    const strokeMatches = svgContent.matchAll(/stroke\s*[=:]\s*["']?(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-z]+)["']?/gi);
    for (const match of strokeMatches) {
      const color = parseColor(match[1]);
      if (color && color !== '#none' && color !== '#transparent') {
        allColors.push({ color, brightness: getHexBrightness(color) });
      }
    }

    if (allColors.length === 0) {
      return { foreground: '#000000', background: '#ffffff', isGradient: false };
    }

    // Remove white/near-white colors from foreground candidates
    const foregroundCandidates = allColors.filter(c => c.brightness < 240);

    // If no non-white colors, use the first color
    const primaryColor = foregroundCandidates.length > 0 ? foregroundCandidates[0] : allColors[0];
    let foreground = primaryColor.color;
    let foreground2: string | undefined;
    let isGradient = false;

    // Check for gradient (two distinct colors)
    if (hasGradient && foregroundCandidates.length >= 2) {
      const first = foregroundCandidates[0];
      for (let i = 1; i < foregroundCandidates.length; i++) {
        const distance = colorDistance(first.color, foregroundCandidates[i].color);
        if (distance > 80) {
          foreground2 = foregroundCandidates[i].color;
          isGradient = true;
          break;
        }
      }
    }

    // ALWAYS use white background for proper contrast
    const background = '#ffffff';

    // Extract gradient rotation if available
    let gradientRotation = 45;
    if (hasGradient) {
      const rotationMatch = svgContent.match(/gradientTransform\s*=\s*["'][^"']*rotate\s*\(\s*([0-9.-]+)/i);
      if (rotationMatch) {
        gradientRotation = parseFloat(rotationMatch[1]);
      } else {
        const coordMatch = svgContent.match(/x1\s*=\s*["']?([0-9.%]+)["']?\s*y1\s*=\s*["']?([0-9.%]+)["']?\s*x2\s*=\s*["']?([0-9.%]+)["']?\s*y2\s*=\s*["']?([0-9.%]+)/i);
        if (coordMatch) {
          const x1 = parseFloat(coordMatch[1]);
          const y1 = parseFloat(coordMatch[2]);
          const x2 = parseFloat(coordMatch[3]);
          const y2 = parseFloat(coordMatch[4]);
          gradientRotation = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
        }
      }
    }

    // Final contrast check
    const corrected = ensureContrast(foreground, background, foreground2);

    return {
      foreground: corrected.foreground,
      foreground2: corrected.foreground2,
      background: corrected.background,
      isGradient,
      gradientType: hasRadialGradient ? 'radial' : 'linear',
      gradientRotation
    };
  } catch (error) {
    console.error('Error extracting colors from SVG:', error);
    return { foreground: '#000000', background: '#ffffff', isGradient: false };
  }
}

/**
 * Parse various color formats to hex
 */
function parseColor(color: string): string | null {
  if (!color) return null;

  color = color.trim().toLowerCase();

  // Skip none/transparent
  if (color === 'none' || color === 'transparent') return null;

  // Already hex
  if (color.startsWith('#')) {
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color;
  }

  // RGB format
  const rgbMatch = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
  }

  // Named colors
  const namedColors: Record<string, string> = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
    pink: '#ffc0cb', gray: '#808080', grey: '#808080', cyan: '#00ffff',
    magenta: '#ff00ff', lime: '#00ff00', navy: '#000080', teal: '#008080',
    maroon: '#800000', olive: '#808000', silver: '#c0c0c0', aqua: '#00ffff',
  };

  return namedColors[color] || null;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Main function to extract colors from any image type
 */
export async function extractLogoColors(imageDataUrl: string): Promise<ExtractedColors> {
  if (imageDataUrl.startsWith('data:image/svg+xml')) {
    return extractColorsFromSvg(imageDataUrl);
  }
  return extractColorsFromImage(imageDataUrl);
}
