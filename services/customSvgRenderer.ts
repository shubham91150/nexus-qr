import { QRStyleConfig } from '../types';

export class CustomSVGRenderer {
  private settings: QRStyleConfig;
  private qrMatrix: boolean[][] | null = null;
  private moduleCount: number = 0;

  constructor(config: QRStyleConfig) {
    this.settings = config;
  }

  public updateConfig(config: QRStyleConfig) {
    this.settings = config;
  }

  // --- Core Matrix Logic ---

  private generateMatrix(text: string): boolean[][] | null {
    try {
      // Use window.qrcode (qrcode-generator library)
      const typeNumber = 0; // Auto detection
      const errorCorrection = this.settings.errorCorrectionLevel;
      
      const qr = window.qrcode(typeNumber, errorCorrection);
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

  // --- SVG Generation Helpers ---

  private generateGradientDefs(): string {
    if (!this.settings.isGradient) return '';

    const { gradientType, gradientRotation, fgColor, fgColor2 } = this.settings;
    let defs = '<defs>';
    const id = 'qrMainGradient';
    
    const stops = `
      <stop offset="0%" stop-color="${fgColor}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${fgColor2}" stop-opacity="1"/>
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

  // --- Pattern Logic ---

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

  private findPillGroups(matrix: boolean[][]) {
    const pills = [];
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

  private generatePillsSVG(pills: any[], cellSize: number, offsetX: number, fillOverride?: string, offsetY?: number): string {
    let svg = '';
    const fill = fillOverride || this.settings.fgColor;
    const uniformGap = cellSize * 0.1;
    const pillHeight = cellSize * 0.75;
    const oY = offsetY !== undefined ? offsetY : offsetX; // Use offsetX if offsetY not provided

    pills.forEach(pill => {
      if (pill.type === 'pill') {
        const x = (pill.startCol * cellSize) + offsetX + (uniformGap / 2);
        const y = (pill.row * cellSize) + oY + (cellSize - pillHeight) / 2;
        const totalWidth = (pill.length * cellSize) - uniformGap;
        const rx = pillHeight / 2;
        
        const segmentWidth = totalWidth / pill.length;
        const gapWidth = 0.2;
        const actualSegWidth = segmentWidth - gapWidth;

        for (let j = 0; j < pill.length; j++) {
            let segX = x + (j * segmentWidth);
            
            if (j === 0) {
                svg += `<path d="M${segX + rx},${y} L${segX + actualSegWidth},${y} L${segX + actualSegWidth},${y + pillHeight} L${segX + rx},${y + pillHeight} Q${segX},${y + pillHeight} ${segX},${y + pillHeight - rx} L${segX},${y + rx} Q${segX},${y} ${segX + rx},${y} Z" fill="${fill}" />`;
            } else if (j === pill.length - 1) {
                segX += gapWidth;
                const endX = segX + actualSegWidth;
                svg += `<path d="M${segX},${y} L${endX - rx},${y} Q${endX},${y} ${endX},${y + rx} L${endX},${y + pillHeight - rx} Q${endX},${y + pillHeight} ${endX - rx},${y + pillHeight} L${segX},${y + pillHeight} Z" fill="${fill}" />`;
            } else {
                segX += gapWidth;
                svg += `<rect x="${segX}" y="${y}" width="${actualSegWidth}" height="${pillHeight}" fill="${fill}" />`;
            }
        }
      } else {
        const cx = (pill.startCol * cellSize) + offsetX + (cellSize / 2);
        const cy = (pill.row * cellSize) + oY + (cellSize / 2);
        const r = pillHeight / 3;
        svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`;
      }
    });
    return svg;
  }

  private generateStandardPatternSVG(matrix: boolean[][], cellSize: number, offsetX: number, pattern: string, fillOverride?: string, offsetY?: number): string {
    let svg = '';
    const fill = fillOverride || this.settings.fgColor;
    const count = this.moduleCount;
    const oY = offsetY !== undefined ? offsetY : offsetX; // Use offsetX if offsetY not provided

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (matrix[row][col] && !this.isCornerSquare(row, col)) {
          const x = (col * cellSize) + offsetX;
          const y = (row * cellSize) + oY;

          if (pattern === 'square') {
            svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}" />`;
          } else if (pattern === 'square-dots') {
             const size = cellSize * 0.85;
             const offset = (cellSize - size) / 2;
             svg += `<rect x="${x+offset}" y="${y+offset}" width="${size}" height="${size}" fill="${fill}" />`;
          } else if (pattern === 'circle') {
             const r = (cellSize / 2) * 0.85;
             svg += `<circle cx="${x + cellSize/2}" cy="${y + cellSize/2}" r="${r}" fill="${fill}" />`;
          } else if (pattern === 'sharp-diamond') {
             const cx = x + cellSize / 2;
             const cy = y + cellSize / 2;
             const hs = cellSize / 2;
             svg += `<path d="M${cx},${y} Q${cx + hs*0.1},${cy} ${x+cellSize},${cy} Q${cx+hs*0.1},${cy} ${cx},${y+cellSize} Q${cx-hs*0.1},${cy} ${x},${cy} Q${cx-hs*0.1},${cy} ${cx},${y} Z" fill="${fill}" />`;
          } else if (pattern === 'mixed') {
             const cx = x + cellSize / 2;
             const cy = y + cellSize / 2;
             const isBig = (row + col) % 3 === 0;
             const r = isBig ? (cellSize/2)*0.85 : (cellSize/2)*0.5;
             svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`;
          } else {
             svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}" />`;
          }
        }
      }
    }
    return svg;
  }

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

  private generateAdvancedCornerSVG(cellSize: number, offsetX: number, fillOverride?: string, offsetY?: number): string {
    let svg = '';
    const cornerSize = cellSize * 7;
    const count = this.moduleCount;
    const oY = offsetY !== undefined ? offsetY : offsetX; // Use offsetX if offsetY not provided

    const corners = [
      { r: 0, c: 0, type: 'top-left' },
      { r: 0, c: count - 7, type: 'top-right' },
      { r: count - 7, c: 0, type: 'bottom-left' }
    ];

    const style = this.settings.cornerSquareType;
    let fill = fillOverride;

    if (!fill) {
        fill = this.settings.fgColor;
        if (this.settings.customCornerColor) fill = this.settings.cornerSquareColor;
    }

    let dotFill = fillOverride;
    if (!dotFill) {
        dotFill = this.settings.fgColor;
        if (this.settings.customCornerColor && this.settings.cornerDotColor) {
            dotFill = this.settings.cornerSquareColor;
        }
    }

    corners.forEach(corner => {
      const x = (corner.c * cellSize) + offsetX;
      const y = (corner.r * cellSize) + oY;
      const radius = cornerSize * 0.15;
      const bg = fillOverride ? 'black' : (this.settings.bgTransparent ? 'none' : this.settings.bgColor);
      const maskId = `mask-${corner.type}-${Math.random().toString(36).substr(2,9)}`;

      if (style === 'square') {
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
      else if (style === 'circle') {
          const cx = x + cornerSize/2;
          const cy = y + cornerSize/2;
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
      } 
      else {
          let rOut = [radius, radius, radius, radius];
          if (style === 'three-sided') {
             if (corner.type === 'top-left') rOut = [0, radius, radius, radius];
             else if (corner.type === 'top-right') rOut = [radius, 0, radius, radius];
             else rOut = [radius, radius, radius, 0];
          } else if (style === 'two-sided') {
             if (corner.type === 'top-left' || corner.type === 'bottom-right') rOut = [0, radius, 0, radius];
             else rOut = [radius, 0, radius, 0];
          }

          if (this.settings.bgTransparent && !fillOverride) {
             svg += `<defs><mask id="${maskId}">`;
             svg += this.generateRoundedRectPath(x, y, cornerSize, cornerSize, rOut, 'white');
             const innerRadii = rOut.map(r => r > 0 ? r * 0.7 : 0);
             svg += this.generateRoundedRectPath(x + cellSize, y + cellSize, cornerSize - cellSize*2, cornerSize - cellSize*2, innerRadii, 'black');
             svg += `</mask></defs>`;
             let outerPath = this.generateRoundedRectPath(x, y, cornerSize, cornerSize, rOut, fill!);
             outerPath = outerPath.replace('fill=', `mask="url(#${maskId})" fill=`);
             svg += outerPath;
          } else {
             svg += this.generateRoundedRectPath(x, y, cornerSize, cornerSize, rOut, fill!);
             const innerRadii = rOut.map(r => r > 0 ? r * 0.7 : 0);
             svg += this.generateRoundedRectPath(x + cellSize, y + cellSize, cornerSize - cellSize*2, cornerSize - cellSize*2, innerRadii, bg);
          }
          const centerRadii = rOut.map(r => r > 0 ? r * 0.4 : 0); 
          svg += this.generateRoundedRectPath(x + cellSize*2, y + cellSize*2, cornerSize - cellSize*4, cornerSize - cellSize*4, centerRadii, dotFill!);
      }
    });
    return svg;
  }

  private generateLogoSVG(): string {
    if (!this.settings.logoImage) return '';
    const size = this.settings.size;
    const logoSize = size * this.settings.logoSize;
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;
    let svg = '';
    if (this.settings.logoBackground === 'solid') {
       svg += `<circle cx="${size/2}" cy="${size/2}" r="${logoSize/2 + 5}" fill="white" />`;
    }
    svg += `<image x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" href="${this.settings.logoImage}" preserveAspectRatio="xMidYMid meet" />`;
    return svg;
  }

  // Check if frame is enabled
  private hasFrame(): boolean {
    return this.settings.frameType && this.settings.frameType !== 'none';
  }

  // Get frame layout calculations for CIRCLE frame
  private getCircleFrameLayout() {
    const size = this.settings.size;
    const frameText = (this.settings.frameText || 'SCAN ME').substring(0, 10); // 10 char limit

    // Circle fills ENTIRE container (no gap)
    const circleRadius = size / 2;

    // QR code is 60% of size (smaller to fit inside circle with margins)
    const qrSize = size * 0.60;

    // Text area at bottom
    const textAreaHeight = size * 0.10;

    // QR positioned centered horizontally, above center vertically to leave room for text
    const qrX = (size - qrSize) / 2;
    const qrY = (size - qrSize - textAreaHeight) / 2 + (size * 0.02);

    // White container behind QR (with padding for rounded corners)
    const qrPadding = size * 0.025;
    const whiteContainerSize = qrSize + (qrPadding * 2);
    const whiteContainerX = qrX - qrPadding;
    const whiteContainerY = qrY - qrPadding;

    // Text position (at bottom inside the circle)
    const textY = whiteContainerY + whiteContainerSize + (textAreaHeight * 0.5);
    const textX = size / 2;
    const fontSize = size * 0.05;

    return {
      size,
      circleRadius,
      qrSize,
      qrX,
      qrY,
      whiteContainerSize,
      whiteContainerX,
      whiteContainerY,
      whiteContainerRadius: whiteContainerSize * 0.03,
      textX,
      textY,
      fontSize,
      frameText
    };
  }

  public render(text: string): string {
    const matrix = this.generateMatrix(text);
    if (!matrix) return '';

    const size = this.settings.size;
    const hasFrame = this.hasFrame();
    const frameType = this.settings.frameType || 'none';

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

    // Add gradient definitions
    svg += this.generateGradientDefs();

    if (hasFrame && frameType === 'circle') {
      // === CIRCLE FRAME MODE ===
      const layout = this.getCircleFrameLayout();
      const frameColor = this.settings.isGradient ? 'url(#qrMainGradient)' : this.settings.fgColor;

      // 1. Draw circle background (fills almost entire area)
      svg += `<circle cx="${size/2}" cy="${size/2}" r="${layout.circleRadius}" fill="${frameColor}" />`;

      // 2. Draw white container for QR code (rounded corners)
      svg += `<rect x="${layout.whiteContainerX}" y="${layout.whiteContainerY}" width="${layout.whiteContainerSize}" height="${layout.whiteContainerSize}" rx="${layout.whiteContainerRadius}" fill="white" />`;

      // 3. Calculate QR rendering parameters
      const cellSize = layout.qrSize / this.moduleCount;

      // 4. Render QR code patterns inside (pass both qrX and qrY for proper positioning)
      if (this.settings.dotsType === 'uniform-pills') {
        const pills = this.findPillGroups(matrix);
        svg += this.generatePillsSVG(pills, cellSize, layout.qrX, this.settings.fgColor, layout.qrY);
      } else {
        svg += this.generateStandardPatternSVG(matrix, cellSize, layout.qrX, this.settings.dotsType, this.settings.fgColor, layout.qrY);
      }
      svg += this.generateAdvancedCornerSVG(cellSize, layout.qrX, undefined, layout.qrY);

      // 5. Draw text at bottom
      svg += `<text x="${layout.textX}" y="${layout.textY}"
                    font-family="Arial, Helvetica, sans-serif" font-size="${layout.fontSize}" font-weight="bold"
                    fill="white" text-anchor="middle" dominant-baseline="middle">${layout.frameText}</text>`;

    } else if (hasFrame) {
      // === OTHER FRAMES (rounded-box, square-box) - Keep for future ===
      // For now, render normal QR
      const padding = this.settings.padding || 0;
      const effectiveSize = size - (padding * 2);
      const cellSize = effectiveSize / this.moduleCount;

      if (!this.settings.bgTransparent) {
        svg += `<rect width="100%" height="100%" fill="${this.settings.bgColor}" />`;
      }

      if (this.settings.dotsType === 'uniform-pills') {
        const pills = this.findPillGroups(matrix);
        svg += this.generatePillsSVG(pills, cellSize, padding, this.settings.fgColor);
      } else {
        svg += this.generateStandardPatternSVG(matrix, cellSize, padding, this.settings.dotsType, this.settings.fgColor);
      }
      svg += this.generateAdvancedCornerSVG(cellSize, padding);
      svg += this.generateLogoSVG();

    } else {
      // === NORMAL MODE (no frame) ===
      const padding = this.settings.padding || 0;
      const effectiveSize = size - (padding * 2);
      const cellSize = effectiveSize / this.moduleCount;

      if (!this.settings.bgTransparent) {
        svg += `<rect width="100%" height="100%" fill="${this.settings.bgColor}" />`;
      }

      if (this.settings.isGradient) {
        const maskId = `qr-mask-${Math.random().toString(36).substr(2,9)}`;
        svg += `<defs><mask id="${maskId}">`;
        svg += `<rect x="0" y="0" width="${size}" height="${size}" fill="black" />`;

        const whiteFill = 'white';
        if (this.settings.dotsType === 'uniform-pills') {
          const pills = this.findPillGroups(matrix);
          svg += this.generatePillsSVG(pills, cellSize, padding, whiteFill);
        } else {
          svg += this.generateStandardPatternSVG(matrix, cellSize, padding, this.settings.dotsType, whiteFill);
        }

        if (!this.settings.customCornerColor) {
          svg += this.generateAdvancedCornerSVG(cellSize, padding, 'white');
        }
        svg += `</mask></defs>`;
        svg += `<rect x="0" y="0" width="${size}" height="${size}" fill="url(#qrMainGradient)" mask="url(#${maskId})" />`;

        if (this.settings.customCornerColor) {
          svg += this.generateAdvancedCornerSVG(cellSize, padding);
        }
      } else {
        if (this.settings.dotsType === 'uniform-pills') {
          const pills = this.findPillGroups(matrix);
          svg += this.generatePillsSVG(pills, cellSize, padding, this.settings.fgColor);
        } else {
          svg += this.generateStandardPatternSVG(matrix, cellSize, padding, this.settings.dotsType, this.settings.fgColor);
        }
        svg += this.generateAdvancedCornerSVG(cellSize, padding);
      }

      svg += this.generateLogoSVG();
    }

    svg += '</svg>';
    return svg;
  }
}