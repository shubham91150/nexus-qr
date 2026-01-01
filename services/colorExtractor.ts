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
 * Get color saturation (0-1)
 */
function getColorSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/**
 * Extract dominant colors from an image (with gradient detection)
 * For multi-colored logos (like Google), picks the two most prominent colors
 * For gradient logos, detects the gradient direction and colors
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

        const maxSize = 150;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Step 1: Collect all visible pixels and bucket them by color
        // Use larger buckets (32) to group similar colors together
        const colorBuckets: Map<string, { r: number; g: number; b: number; count: number; totalR: number; totalG: number; totalB: number }> = new Map();

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const a = pixels[i + 3];
            if (a < 128) continue; // Skip transparent

            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const brightness = getBrightness(r, g, b);

            // Skip pure white/near-white and very light colors
            if (brightness > 240) continue;

            // Skip very desaturated colors (grays)
            const saturation = getColorSaturation(r, g, b);
            if (saturation < 0.15 && brightness > 100) continue;

            // Bucket colors with larger grouping for distinct color detection
            const bucketSize = 32;
            const br = Math.round(r / bucketSize) * bucketSize;
            const bg = Math.round(g / bucketSize) * bucketSize;
            const bb = Math.round(b / bucketSize) * bucketSize;
            const key = `${br},${bg},${bb}`;

            const existing = colorBuckets.get(key);
            if (existing) {
              existing.count++;
              existing.totalR += r;
              existing.totalG += g;
              existing.totalB += b;
            } else {
              colorBuckets.set(key, { r: br, g: bg, b: bb, count: 1, totalR: r, totalG: g, totalB: b });
            }
          }
        }

        if (colorBuckets.size === 0) {
          resolve({ foreground: '#000000', background: '#ffffff', isGradient: false });
          return;
        }

        // Step 2: Convert buckets to array and calculate average colors
        const colorGroups = Array.from(colorBuckets.values()).map(bucket => ({
          r: Math.round(bucket.totalR / bucket.count),
          g: Math.round(bucket.totalG / bucket.count),
          b: Math.round(bucket.totalB / bucket.count),
          count: bucket.count,
          saturation: getColorSaturation(
            Math.round(bucket.totalR / bucket.count),
            Math.round(bucket.totalG / bucket.count),
            Math.round(bucket.totalB / bucket.count)
          )
        }));

        // Step 3: Sort by count (most pixels) but also consider saturation
        // Prioritize vibrant colors over dull ones
        colorGroups.sort((a, b) => {
          // Score = count * (1 + saturation bonus)
          const scoreA = a.count * (1 + a.saturation * 0.5);
          const scoreB = b.count * (1 + b.saturation * 0.5);
          return scoreB - scoreA;
        });

        // Step 4: Get top colors that are sufficiently different from each other
        const distinctColors: { r: number; g: number; b: number; count: number }[] = [];
        const minColorDistance = 80; // Minimum distance to be considered a different color

        for (const color of colorGroups) {
          // Check if this color is sufficiently different from already selected colors
          let isDistinct = true;
          for (const selected of distinctColors) {
            const dist = Math.sqrt(
              Math.pow(color.r - selected.r, 2) +
              Math.pow(color.g - selected.g, 2) +
              Math.pow(color.b - selected.b, 2)
            );
            if (dist < minColorDistance) {
              isDistinct = false;
              break;
            }
          }

          if (isDistinct) {
            distinctColors.push(color);
            if (distinctColors.length >= 4) break; // Get up to 4 distinct colors
          }
        }

        // Ensure we have at least one color
        if (distinctColors.length === 0 && colorGroups.length > 0) {
          distinctColors.push(colorGroups[0]);
        }

        let foreground: string;
        let foreground2: string | undefined;
        let isGradient = false;
        let gradientRotation = 45;

        if (distinctColors.length >= 2) {
          // Multiple distinct colors found - use as gradient
          isGradient = true;

          // Pick the two most prominent distinct colors
          const color1 = distinctColors[0];
          const color2 = distinctColors[1];

          // Order by brightness - lighter color first (gradient start)
          const brightness1 = getBrightness(color1.r, color1.g, color1.b);
          const brightness2 = getBrightness(color2.r, color2.g, color2.b);

          if (brightness1 >= brightness2) {
            foreground = rgbToHex(color1.r, color1.g, color1.b);
            foreground2 = rgbToHex(color2.r, color2.g, color2.b);
          } else {
            foreground = rgbToHex(color2.r, color2.g, color2.b);
            foreground2 = rgbToHex(color1.r, color1.g, color1.b);
          }

          // Default diagonal gradient for multi-color logos
          gradientRotation = 135;
        } else {
          // Single dominant color
          const dominant = distinctColors[0];
          foreground = rgbToHex(dominant.r, dominant.g, dominant.b);
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
    // Collect all colors with their counts
    const colorCounts: Map<string, number> = new Map();

    // Extract fill colors
    const fillMatches = svgContent.matchAll(/fill\s*[=:]\s*["']?(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-z]+)["']?/gi);
    for (const match of fillMatches) {
      const color = parseColor(match[1]);
      if (color) {
        const brightness = getHexBrightness(color);
        // Skip white/near-white colors
        if (brightness < 240) {
          colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        }
      }
    }

    if (colorCounts.size === 0) {
      return { foreground: '#000000', background: '#ffffff', isGradient: false };
    }

    // Convert to array and sort by count
    const sortedColors = Array.from(colorCounts.entries())
      .map(([color, count]) => ({ color, count, brightness: getHexBrightness(color) }))
      .sort((a, b) => b.count - a.count);

    // Find distinct colors (with minimum distance)
    const distinctColors: { color: string; count: number; brightness: number }[] = [];
    const minDistance = 80;

    for (const item of sortedColors) {
      let isDistinct = true;
      for (const selected of distinctColors) {
        const dist = colorDistance(item.color, selected.color);
        if (dist < minDistance) {
          isDistinct = false;
          break;
        }
      }
      if (isDistinct) {
        distinctColors.push(item);
        if (distinctColors.length >= 2) break;
      }
    }

    // If we have 2+ distinct colors, create a gradient
    if (distinctColors.length >= 2) {
      const color1 = distinctColors[0];
      const color2 = distinctColors[1];

      // Order by brightness - lighter first
      let foreground: string, foreground2: string;
      if (color1.brightness >= color2.brightness) {
        foreground = color1.color;
        foreground2 = color2.color;
      } else {
        foreground = color2.color;
        foreground2 = color1.color;
      }

      return {
        foreground,
        foreground2,
        background: '#ffffff',
        isGradient: true,
        gradientType: 'linear',
        gradientRotation: 135 // Diagonal gradient for multi-color logos
      };
    }

    // Single color
    return {
      foreground: distinctColors[0]?.color || sortedColors[0].color,
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
