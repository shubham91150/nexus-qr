/**
 * Color Extractor Utility
 * Extracts dominant foreground and background colors from logo images
 * Supports gradient detection
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
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate brightness of a color (0-255)
 */
function getBrightness(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000;
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
 * Extract dominant colors from an image (with gradient detection)
 */
export async function extractColorsFromImage(imageDataUrl: string): Promise<ExtractedColors> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ foreground: '#000000', background: '#ffffff', isGradient: false });
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

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

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
          resolve({ foreground: '#000000', background: '#ffffff', isGradient: false });
          return;
        }

        // Separate into light and dark colors
        const lightColors = sortedColors.filter(c => c.brightness > 128);
        const darkColors = sortedColors.filter(c => c.brightness <= 128);

        // Get background (lightest prominent color)
        let background: string;
        if (lightColors.length > 0) {
          background = lightColors[0].color;
        } else {
          const brightest = [...sortedColors].sort((a, b) => b.brightness - a.brightness)[0];
          background = brightest.color;
        }

        // Get foreground colors (for potential gradient)
        let foreground: string;
        let foreground2: string | undefined;
        let isGradient = false;

        if (darkColors.length >= 2) {
          // Check if we have two distinct dark colors (potential gradient)
          foreground = darkColors[0].color;

          // Find a second color that's different enough
          for (let i = 1; i < darkColors.length; i++) {
            const distance = colorDistance(foreground, darkColors[i].color);
            // If colors are different enough (distance > 80) and second color has significant presence
            if (distance > 80 && darkColors[i].count > darkColors[0].count * 0.3) {
              foreground2 = darkColors[i].color;
              isGradient = true;
              break;
            }
          }
        } else if (darkColors.length === 1) {
          foreground = darkColors[0].color;
        } else {
          // No dark colors, use darkest available
          const darkest = [...sortedColors].sort((a, b) => a.brightness - b.brightness)[0];
          foreground = darkest.color;
        }

        // Ensure contrast
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

        if (Math.abs(fgBrightness - bgBrightness) < 50) {
          if (bgBrightness > 128) {
            foreground = '#000000';
            foreground2 = undefined;
            isGradient = false;
          } else {
            background = '#ffffff';
          }
        }

        resolve({
          foreground,
          foreground2,
          background,
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
      console.error('Failed to load image for color extraction');
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

    // Check for gradients in SVG
    const hasLinearGradient = /<linearGradient/i.test(svgContent);
    const hasRadialGradient = /<radialGradient/i.test(svgContent);
    const hasGradient = hasLinearGradient || hasRadialGradient;

    // Extract gradient colors if present
    let gradientColors: string[] = [];
    if (hasGradient) {
      // Match stop colors in gradients
      const stopColorMatches = svgContent.matchAll(/stop[^>]*(?:stop-color\s*[=:]\s*["']?([^"';>\s]+)|style\s*=\s*["'][^"']*stop-color\s*:\s*([^"';>\s]+))/gi);
      for (const match of stopColorMatches) {
        const colorStr = match[1] || match[2];
        if (colorStr) {
          const color = parseColor(colorStr);
          if (color && color !== 'none' && color !== 'transparent') {
            gradientColors.push(color);
          }
        }
      }

      // Also try matching offset colors
      const offsetMatches = svgContent.matchAll(/<stop[^>]*offset[^>]*(?:stop-color|style)[^>]*>/gi);
      for (const match of offsetMatches) {
        const colorMatch = match[0].match(/(?:stop-color\s*[=:]\s*["']?|stop-color\s*:\s*)([^"';>\s]+)/i);
        if (colorMatch) {
          const color = parseColor(colorMatch[1]);
          if (color && color !== 'none' && color !== 'transparent' && !gradientColors.includes(color)) {
            gradientColors.push(color);
          }
        }
      }
    }

    // Extract regular fill/stroke colors
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

    // If we have gradient colors, use them
    if (gradientColors.length >= 2) {
      // Sort by brightness
      const sortedGradientColors = gradientColors.map(color => {
        const rgb = hexToRgb(color);
        return {
          color,
          brightness: rgb ? getBrightness(rgb.r, rgb.g, rgb.b) : 128
        };
      }).sort((a, b) => a.brightness - b.brightness);

      // Get two most different colors
      const darkest = sortedGradientColors[0];
      const secondColor = sortedGradientColors.find(c => colorDistance(darkest.color, c.color) > 50) || sortedGradientColors[sortedGradientColors.length - 1];

      // Background from other colors or default white
      const bgColors = colors.filter(c => c.brightness > 128);
      const background = bgColors.length > 0 ? bgColors[0].color : '#ffffff';

      // Extract gradient rotation from SVG if possible
      let gradientRotation = 45;
      const rotationMatch = svgContent.match(/gradientTransform\s*=\s*["'][^"']*rotate\s*\(\s*([0-9.-]+)/i);
      if (rotationMatch) {
        gradientRotation = parseFloat(rotationMatch[1]);
      } else {
        // Try to calculate from x1,y1,x2,y2
        const coordMatch = svgContent.match(/x1\s*=\s*["']?([0-9.%]+)["']?\s*y1\s*=\s*["']?([0-9.%]+)["']?\s*x2\s*=\s*["']?([0-9.%]+)["']?\s*y2\s*=\s*["']?([0-9.%]+)/i);
        if (coordMatch) {
          const x1 = parseFloat(coordMatch[1]);
          const y1 = parseFloat(coordMatch[2]);
          const x2 = parseFloat(coordMatch[3]);
          const y2 = parseFloat(coordMatch[4]);
          gradientRotation = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
        }
      }

      return {
        foreground: darkest.color,
        foreground2: secondColor.color,
        background,
        isGradient: true,
        gradientType: hasRadialGradient ? 'radial' : 'linear',
        gradientRotation
      };
    }

    // Fallback to regular color extraction
    if (colors.length === 0) {
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

    // Check for multiple dark colors (possible gradient effect)
    let foreground2: string | undefined;
    let isGradient = false;
    if (darkColors.length >= 2) {
      const distance = colorDistance(darkColors[0].color, darkColors[1].color);
      if (distance > 80) {
        foreground2 = darkColors[1].color;
        isGradient = true;
      }
    }

    return {
      foreground,
      foreground2,
      background,
      isGradient,
      gradientType: isGradient ? 'linear' : undefined,
      gradientRotation: isGradient ? 45 : undefined
    };
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
    cyan: '#00ffff',
    magenta: '#ff00ff',
    lime: '#00ff00',
    navy: '#000080',
    teal: '#008080',
    maroon: '#800000',
    olive: '#808000',
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
