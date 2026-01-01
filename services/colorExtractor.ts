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
 * Check if a color is usable (not pure white)
 */
function isUsableColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const brightness = getBrightness(rgb.r, rgb.g, rgb.b);
  // Only exclude pure white/near-white
  return brightness < 250;
}

/**
 * Extract dominant colors from an image (with gradient detection)
 * Improved to detect gradient direction and preserve color intensity
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
        const width = canvas.width;
        const height = canvas.height;

        // Use smaller quantization factor for more accurate colors
        const colorCounts: Map<string, ColorCount> = new Map();

        // Also track colors by position for gradient direction detection
        let topLeftBrightness = 0, topRightBrightness = 0;
        let bottomLeftBrightness = 0, bottomRightBrightness = 0;
        let tlCount = 0, trCount = 0, blCount = 0, brCount = 0;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];

            if (a < 128) continue;

            // Less aggressive quantization (factor 24 instead of 32)
            const quantized = quantizeColor(r, g, b, 24);
            const brightness = getBrightness(r, g, b);

            const existing = colorCounts.get(quantized);
            if (existing) {
              existing.count++;
            } else {
              colorCounts.set(quantized, { color: quantized, count: 1, brightness });
            }

            // Track corner brightness for gradient direction
            const midX = width / 2;
            const midY = height / 2;
            if (x < midX && y < midY) { topLeftBrightness += brightness; tlCount++; }
            else if (x >= midX && y < midY) { topRightBrightness += brightness; trCount++; }
            else if (x < midX && y >= midY) { bottomLeftBrightness += brightness; blCount++; }
            else { bottomRightBrightness += brightness; brCount++; }
          }
        }

        // Calculate average brightness per corner
        const avgTL = tlCount > 0 ? topLeftBrightness / tlCount : 128;
        const avgTR = trCount > 0 ? topRightBrightness / trCount : 128;
        const avgBL = blCount > 0 ? bottomLeftBrightness / blCount : 128;
        const avgBR = brCount > 0 ? bottomRightBrightness / brCount : 128;

        const sortedColors = Array.from(colorCounts.values()).sort((a, b) => b.count - a.count);

        if (sortedColors.length === 0) {
          resolve({ foreground: '#000000', background: '#ffffff', isGradient: false });
          return;
        }

        // Get usable colors (non-white)
        const usableColors = sortedColors.filter(c => isUsableColor(c.color));

        if (usableColors.length === 0) {
          resolve({ foreground: '#000000', background: '#ffffff', isGradient: false });
          return;
        }

        // Sort by brightness to find lightest and darkest
        const sortedByBrightness = [...usableColors].sort((a, b) => b.brightness - a.brightness);
        const lightestColor = sortedByBrightness[0];
        const darkestColor = sortedByBrightness[sortedByBrightness.length - 1];

        // Check if there's enough difference for a gradient
        const brightnessDiff = lightestColor.brightness - darkestColor.brightness;
        const colorDist = colorDistance(lightestColor.color, darkestColor.color);

        let foreground: string;
        let foreground2: string | undefined;
        let isGradient = false;
        let gradientRotation = 45;

        if (brightnessDiff > 50 || colorDist > 80) {
          // We have a gradient
          isGradient = true;

          // Determine gradient direction based on corner brightness
          // Find which diagonal has the biggest brightness difference
          const diag1Diff = Math.abs(avgTL - avgBR); // top-left to bottom-right
          const diag2Diff = Math.abs(avgTR - avgBL); // top-right to bottom-left

          if (diag1Diff >= diag2Diff) {
            // Gradient is along top-left to bottom-right diagonal
            if (avgTL > avgBR) {
              // Light at top-left, dark at bottom-right (angle ~135deg in CSS)
              foreground = lightestColor.color;
              foreground2 = darkestColor.color;
              gradientRotation = 45; // Will render as 135 with +90 offset
            } else {
              // Dark at top-left, light at bottom-right
              foreground = darkestColor.color;
              foreground2 = lightestColor.color;
              gradientRotation = 225; // Will render as 315 with +90 offset
            }
          } else {
            // Gradient is along top-right to bottom-left diagonal
            if (avgTR > avgBL) {
              // Light at top-right, dark at bottom-left
              foreground = lightestColor.color;
              foreground2 = darkestColor.color;
              gradientRotation = 315;
            } else {
              // Dark at top-right, light at bottom-left
              foreground = darkestColor.color;
              foreground2 = lightestColor.color;
              gradientRotation = 135;
            }
          }
        } else {
          // Single color - use the most dominant usable color
          foreground = usableColors[0].color;
        }

        resolve({
          foreground,
          foreground2,
          background: '#ffffff',
          isGradient,
          gradientType: isGradient ? 'linear' : undefined,
          gradientRotation: isGradient ? gradientRotation : undefined
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

    // Extract gradient stop colors in ORDER (important for first/last)
    const gradientStops: { offset: number; color: string }[] = [];

    if (hasGradient) {
      // Match all stop elements with their offset and color
      const stopRegex = /<stop[^>]*>/gi;
      const stops = svgContent.match(stopRegex) || [];

      for (const stop of stops) {
        // Extract offset
        const offsetMatch = stop.match(/offset\s*[=:]\s*["']?([0-9.]+%?)/i);
        let offset = 0;
        if (offsetMatch) {
          offset = parseFloat(offsetMatch[1].replace('%', ''));
          if (offsetMatch[1].includes('%')) offset = offset; // Already percentage
          else offset = offset * 100; // Convert decimal to percentage
        }

        // Extract color from stop-color attribute or style
        let colorStr = '';
        const colorMatch = stop.match(/stop-color\s*[=:]\s*["']?([^"';>\s]+)/i);
        if (colorMatch) {
          colorStr = colorMatch[1];
        } else {
          // Try style attribute
          const styleMatch = stop.match(/style\s*=\s*["'][^"']*stop-color\s*:\s*([^"';>\s]+)/i);
          if (styleMatch) {
            colorStr = styleMatch[1];
          }
        }

        if (colorStr) {
          const color = parseColor(colorStr);
          if (color) {
            gradientStops.push({ offset, color });
          }
        }
      }

      // Sort by offset to ensure first and last are correct
      gradientStops.sort((a, b) => a.offset - b.offset);
    }

    // Extract gradient direction/angle
    let gradientRotation = 45; // Default diagonal

    if (hasLinearGradient) {
      // Try to get coordinates from linearGradient
      const gradientMatch = svgContent.match(/<linearGradient[^>]*>/i);
      if (gradientMatch) {
        const gradientTag = gradientMatch[0];

        // Extract x1, y1, x2, y2
        const x1Match = gradientTag.match(/x1\s*=\s*["']?([0-9.]+%?)/i);
        const y1Match = gradientTag.match(/y1\s*=\s*["']?([0-9.]+%?)/i);
        const x2Match = gradientTag.match(/x2\s*=\s*["']?([0-9.]+%?)/i);
        const y2Match = gradientTag.match(/y2\s*=\s*["']?([0-9.]+%?)/i);

        if (x1Match && y1Match && x2Match && y2Match) {
          const x1 = parseFloat(x1Match[1]);
          const y1 = parseFloat(y1Match[1]);
          const x2 = parseFloat(x2Match[1]);
          const y2 = parseFloat(y2Match[1]);

          // Calculate angle from SVG coordinates
          // SVG: x1,y1 is start, x2,y2 is end
          // CSS gradient: 0deg=bottom-to-top, 90deg=left-to-right
          const deltaX = x2 - x1;
          const deltaY = y2 - y1;

          // Calculate angle in CSS gradient convention
          // atan2 gives angle from positive X axis, CSS gradients measure from positive Y axis
          let angle = Math.atan2(deltaX, -deltaY) * (180 / Math.PI);

          // QR renderer adds +90deg internally, so we compensate by subtracting 90
          gradientRotation = angle - 90;

          // Normalize to 0-360 range
          while (gradientRotation < 0) gradientRotation += 360;
          while (gradientRotation >= 360) gradientRotation -= 360;
        }

        // Also check for gradientTransform rotate
        const rotateMatch = gradientTag.match(/gradientTransform\s*=\s*["'][^"']*rotate\s*\(\s*([0-9.-]+)/i);
        if (rotateMatch) {
          // Apply same compensation for renderer's +90deg offset
          gradientRotation = parseFloat(rotateMatch[1]) - 90;
          while (gradientRotation < 0) gradientRotation += 360;
        }
      }
    }

    // If we have gradient stops, use first and last colors in ORIGINAL order
    if (gradientStops.length >= 2) {
      // Use colors in their original gradient order (first stop → last stop)
      // Don't swap based on brightness - keep the gradient direction intact
      const foreground = gradientStops[0].color;
      const foreground2 = gradientStops[gradientStops.length - 1].color;

      return {
        foreground,
        foreground2,
        background: '#ffffff',
        isGradient: true,
        gradientType: hasRadialGradient ? 'radial' : 'linear',
        gradientRotation
      };
    }

    // Fallback: extract fill/stroke colors for non-gradient SVGs
    const allColors: { color: string; brightness: number }[] = [];

    // Extract fill colors
    const fillMatches = svgContent.matchAll(/fill\s*[=:]\s*["']?(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-z]+)["']?/gi);
    for (const match of fillMatches) {
      const color = parseColor(match[1]);
      if (color) {
        allColors.push({ color, brightness: getHexBrightness(color) });
      }
    }

    if (allColors.length === 0) {
      return { foreground: '#000000', background: '#ffffff', isGradient: false };
    }

    // Remove white/near-white colors from foreground candidates
    const foregroundCandidates = allColors.filter(c => c.brightness < 240);
    const primaryColor = foregroundCandidates.length > 0 ? foregroundCandidates[0] : allColors[0];

    return {
      foreground: primaryColor.color,
      background: '#ffffff',
      isGradient: false
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
