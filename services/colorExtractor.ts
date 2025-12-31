/**
 * Color Extractor Utility
 * Extracts dominant foreground and background colors from logo images
 */

interface ExtractedColors {
  foreground: string;
  background: string;
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
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate brightness of a color (0-255)
 */
function getBrightness(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Quantize color to reduce similar colors
 */
function quantizeColor(r: number, g: number, b: number, factor: number = 32): string {
  const qr = Math.round(r / factor) * factor;
  const qg = Math.round(g / factor) * factor;
  const qb = Math.round(b / factor) * factor;
  return rgbToHex(
    Math.min(255, qr),
    Math.min(255, qg),
    Math.min(255, qb)
  );
}

/**
 * Extract dominant colors from an image
 */
export async function extractColorsFromImage(imageDataUrl: string): Promise<ExtractedColors> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ foreground: '#000000', background: '#ffffff' });
          return;
        }

        // Scale down for performance (max 100x100)
        const maxSize = 100;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);

        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Count colors
        const colorCounts: Map<string, ColorCount> = new Map();
        let totalPixels = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          totalPixels++;
          const quantized = quantizeColor(r, g, b);
          const brightness = getBrightness(r, g, b);

          const existing = colorCounts.get(quantized);
          if (existing) {
            existing.count++;
          } else {
            colorCounts.set(quantized, {
              color: quantized,
              count: 1,
              brightness
            });
          }
        }

        // Convert to array and sort by count
        const sortedColors = Array.from(colorCounts.values())
          .sort((a, b) => b.count - a.count);

        if (sortedColors.length === 0) {
          resolve({ foreground: '#000000', background: '#ffffff' });
          return;
        }

        // Separate into light and dark colors
        const lightColors = sortedColors.filter(c => c.brightness > 128);
        const darkColors = sortedColors.filter(c => c.brightness <= 128);

        let foreground: string;
        let background: string;

        // Background: most common light color (or lightest if no light colors)
        if (lightColors.length > 0) {
          background = lightColors[0].color;
        } else {
          // Use the brightest color as background
          const brightest = [...sortedColors].sort((a, b) => b.brightness - a.brightness)[0];
          background = brightest.color;
        }

        // Foreground: most common dark color (or darkest if no dark colors)
        if (darkColors.length > 0) {
          foreground = darkColors[0].color;
        } else {
          // Use the darkest color as foreground
          const darkest = [...sortedColors].sort((a, b) => a.brightness - b.brightness)[0];
          foreground = darkest.color;
        }

        // Ensure contrast between foreground and background
        const fgBrightness = getBrightness(
          parseInt(foreground.slice(1, 3), 16),
          parseInt(foreground.slice(3, 5), 16),
          parseInt(foreground.slice(5, 7), 16)
        );
        const bgBrightness = getBrightness(
          parseInt(background.slice(1, 3), 16),
          parseInt(background.slice(3, 5), 16),
          parseInt(background.slice(5, 7), 16)
        );

        // If contrast is too low, use default black/white
        if (Math.abs(fgBrightness - bgBrightness) < 50) {
          if (bgBrightness > 128) {
            foreground = '#000000';
          } else {
            background = '#ffffff';
          }
        }

        resolve({ foreground, background });
      } catch (error) {
        console.error('Error extracting colors:', error);
        resolve({ foreground: '#000000', background: '#ffffff' });
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for color extraction');
      resolve({ foreground: '#000000', background: '#ffffff' });
    };

    img.src = imageDataUrl;
  });
}

/**
 * Extract colors from SVG data URL
 */
export async function extractColorsFromSvg(svgDataUrl: string): Promise<ExtractedColors> {
  try {
    // Decode SVG content
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

    // Extract colors from SVG attributes
    const colors: { color: string; brightness: number }[] = [];

    // Match fill colors
    const fillMatches = svgContent.matchAll(/fill\s*[=:]\s*["']?(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-z]+)["']?/gi);
    for (const match of fillMatches) {
      const color = parseColor(match[1]);
      if (color && color !== 'none' && color !== 'transparent') {
        const rgb = hexToRgb(color);
        if (rgb) {
          colors.push({
            color,
            brightness: getBrightness(rgb.r, rgb.g, rgb.b)
          });
        }
      }
    }

    // Match stroke colors
    const strokeMatches = svgContent.matchAll(/stroke\s*[=:]\s*["']?(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-z]+)["']?/gi);
    for (const match of strokeMatches) {
      const color = parseColor(match[1]);
      if (color && color !== 'none' && color !== 'transparent') {
        const rgb = hexToRgb(color);
        if (rgb) {
          colors.push({
            color,
            brightness: getBrightness(rgb.r, rgb.g, rgb.b)
          });
        }
      }
    }

    if (colors.length === 0) {
      // Fallback to image-based extraction
      return extractColorsFromImage(svgDataUrl);
    }

    // Separate light and dark
    const lightColors = colors.filter(c => c.brightness > 128);
    const darkColors = colors.filter(c => c.brightness <= 128);

    const foreground = darkColors.length > 0
      ? darkColors[0].color
      : (colors.sort((a, b) => a.brightness - b.brightness)[0]?.color || '#000000');

    const background = lightColors.length > 0
      ? lightColors[0].color
      : (colors.sort((a, b) => b.brightness - a.brightness)[0]?.color || '#ffffff');

    return { foreground, background };
  } catch (error) {
    console.error('Error extracting colors from SVG:', error);
    return extractColorsFromImage(svgDataUrl);
  }
}

/**
 * Parse various color formats to hex
 */
function parseColor(color: string): string | null {
  if (!color) return null;

  color = color.trim().toLowerCase();

  // Already hex
  if (color.startsWith('#')) {
    if (color.length === 4) {
      // Convert #RGB to #RRGGBB
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color;
  }

  // RGB format
  const rgbMatch = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return rgbToHex(
      parseInt(rgbMatch[1]),
      parseInt(rgbMatch[2]),
      parseInt(rgbMatch[3])
    );
  }

  // Named colors (common ones)
  const namedColors: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    green: '#008000',
    blue: '#0000ff',
    yellow: '#ffff00',
    orange: '#ffa500',
    purple: '#800080',
    pink: '#ffc0cb',
    gray: '#808080',
    grey: '#808080',
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
