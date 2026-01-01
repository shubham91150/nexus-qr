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
 * Boost color vibrancy/saturation
 * Makes colors more intense and vibrant
 */
function boostVibrancy(hex: string, factor: number = 1.3): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // Convert RGB to HSL
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  // Boost saturation
  const boostedS = Math.min(1, s * factor);

  // Convert back to RGB
  let newR, newG, newB;

  if (boostedS === 0) {
    newR = newG = newB = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + boostedS) : l + boostedS - l * boostedS;
    const p = 2 * l - q;
    newR = hue2rgb(p, q, h + 1/3);
    newG = hue2rgb(p, q, h);
    newB = hue2rgb(p, q, h - 1/3);
  }

  return rgbToHex(
    Math.round(newR * 255),
    Math.round(newG * 255),
    Math.round(newB * 255)
  );
}

/**
 * Extract dominant colors from an image (with gradient detection)
 * Samples actual corner colors for accurate gradient extraction
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

        // Helper to get average color from a region
        const getRegionColor = (startX: number, startY: number, regionSize: number): { r: number; g: number; b: number } => {
          let totalR = 0, totalG = 0, totalB = 0, count = 0;
          for (let y = startY; y < Math.min(startY + regionSize, height); y++) {
            for (let x = startX; x < Math.min(startX + regionSize, width); x++) {
              const i = (y * width + x) * 4;
              const a = pixels[i + 3];
              if (a < 128) continue;
              totalR += pixels[i];
              totalG += pixels[i + 1];
              totalB += pixels[i + 2];
              count++;
            }
          }
          if (count === 0) return { r: 128, g: 128, b: 128 };
          return {
            r: Math.round(totalR / count),
            g: Math.round(totalG / count),
            b: Math.round(totalB / count)
          };
        };

        // Sample from 4 corners (using 10% of image size as sample region)
        const sampleSize = Math.max(3, Math.floor(Math.min(width, height) * 0.1));

        const topLeft = getRegionColor(0, 0, sampleSize);
        const topRight = getRegionColor(width - sampleSize, 0, sampleSize);
        const bottomLeft = getRegionColor(0, height - sampleSize, sampleSize);
        const bottomRight = getRegionColor(width - sampleSize, height - sampleSize, sampleSize);

        // Calculate brightness for each corner
        const tlBrightness = getBrightness(topLeft.r, topLeft.g, topLeft.b);
        const trBrightness = getBrightness(topRight.r, topRight.g, topRight.b);
        const blBrightness = getBrightness(bottomLeft.r, bottomLeft.g, bottomLeft.b);
        const brBrightness = getBrightness(bottomRight.r, bottomRight.g, bottomRight.b);

        // Find gradient direction by comparing diagonal brightness differences
        const diag1Diff = Math.abs(tlBrightness - brBrightness); // TL to BR
        const diag2Diff = Math.abs(trBrightness - blBrightness); // TR to BL
        const horizDiff = Math.abs((tlBrightness + blBrightness) / 2 - (trBrightness + brBrightness) / 2);
        const vertDiff = Math.abs((tlBrightness + trBrightness) / 2 - (blBrightness + brBrightness) / 2);

        // Determine if this is a gradient and get endpoint colors
        const maxDiff = Math.max(diag1Diff, diag2Diff, horizDiff, vertDiff);

        let foreground: string;
        let foreground2: string | undefined;
        let isGradient = false;
        let gradientRotation = 45;

        if (maxDiff > 30) {
          // We have a gradient - determine direction and get actual endpoint colors
          isGradient = true;

          let startColor: { r: number; g: number; b: number };
          let endColor: { r: number; g: number; b: number };

          if (diag1Diff >= diag2Diff && diag1Diff >= horizDiff && diag1Diff >= vertDiff) {
            // Diagonal TL to BR
            if (tlBrightness > brBrightness) {
              startColor = topLeft;
              endColor = bottomRight;
              gradientRotation = 45;
            } else {
              startColor = bottomRight;
              endColor = topLeft;
              gradientRotation = 225;
            }
          } else if (diag2Diff >= horizDiff && diag2Diff >= vertDiff) {
            // Diagonal TR to BL
            if (trBrightness > blBrightness) {
              startColor = topRight;
              endColor = bottomLeft;
              gradientRotation = 315;
            } else {
              startColor = bottomLeft;
              endColor = topRight;
              gradientRotation = 135;
            }
          } else if (horizDiff >= vertDiff) {
            // Horizontal
            const leftBrightness = (tlBrightness + blBrightness) / 2;
            const rightBrightness = (trBrightness + brBrightness) / 2;
            if (leftBrightness > rightBrightness) {
              startColor = { r: (topLeft.r + bottomLeft.r) / 2, g: (topLeft.g + bottomLeft.g) / 2, b: (topLeft.b + bottomLeft.b) / 2 };
              endColor = { r: (topRight.r + bottomRight.r) / 2, g: (topRight.g + bottomRight.g) / 2, b: (topRight.b + bottomRight.b) / 2 };
              gradientRotation = 0;
            } else {
              startColor = { r: (topRight.r + bottomRight.r) / 2, g: (topRight.g + bottomRight.g) / 2, b: (topRight.b + bottomRight.b) / 2 };
              endColor = { r: (topLeft.r + bottomLeft.r) / 2, g: (topLeft.g + bottomLeft.g) / 2, b: (topLeft.b + bottomLeft.b) / 2 };
              gradientRotation = 180;
            }
          } else {
            // Vertical
            const topBrightness = (tlBrightness + trBrightness) / 2;
            const bottomBrightness = (blBrightness + brBrightness) / 2;
            if (topBrightness > bottomBrightness) {
              startColor = { r: (topLeft.r + topRight.r) / 2, g: (topLeft.g + topRight.g) / 2, b: (topLeft.b + topRight.b) / 2 };
              endColor = { r: (bottomLeft.r + bottomRight.r) / 2, g: (bottomLeft.g + bottomRight.g) / 2, b: (bottomLeft.b + bottomRight.b) / 2 };
              gradientRotation = 270;
            } else {
              startColor = { r: (bottomLeft.r + bottomRight.r) / 2, g: (bottomLeft.g + bottomRight.g) / 2, b: (bottomLeft.b + bottomRight.b) / 2 };
              endColor = { r: (topLeft.r + topRight.r) / 2, g: (topLeft.g + topRight.g) / 2, b: (topLeft.b + topRight.b) / 2 };
              gradientRotation = 90;
            }
          }

          // Convert to hex - use EXACT colors, no quantization
          foreground = rgbToHex(Math.round(startColor.r), Math.round(startColor.g), Math.round(startColor.b));
          foreground2 = rgbToHex(Math.round(endColor.r), Math.round(endColor.g), Math.round(endColor.b));
        } else {
          // Single color - get the most common non-white color
          const colorCounts: Map<string, number> = new Map();
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] < 128) continue;
            const hex = rgbToHex(pixels[i], pixels[i + 1], pixels[i + 2]);
            const brightness = getBrightness(pixels[i], pixels[i + 1], pixels[i + 2]);
            if (brightness > 245) continue; // Skip white
            colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
          }

          let maxCount = 0;
          foreground = '#000000';
          for (const [color, count] of colorCounts) {
            if (count > maxCount) {
              maxCount = count;
              foreground = color;
            }
          }
        }

        // Apply vibrancy boost - stronger for end color
        const boostedForeground = boostVibrancy(foreground, 1.15);
        const boostedForeground2 = foreground2 ? boostVibrancy(foreground2, 1.25) : undefined;

        resolve({
          foreground: boostedForeground,
          foreground2: boostedForeground2,
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

      // Boost vibrancy for gradient colors - stronger boost for end color
      const boostedForeground = boostVibrancy(foreground, 1.2);
      const boostedForeground2 = boostVibrancy(foreground2, 1.5);

      return {
        foreground: boostedForeground,
        foreground2: boostedForeground2,
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
