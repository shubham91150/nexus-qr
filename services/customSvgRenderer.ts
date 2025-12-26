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

  // Get frame layout calculations for SCAN-ARC frame
  private getScanArcFrameLayout() {
    const size = this.settings.size;
    const frameText = (this.settings.frameText || 'SCAN ME').substring(0, 10);

    // Arc parameters matching the reference design (thickness = 22 at size 320)
    const center = size / 2;
    const arcThickness = size * 0.07; // 7% of size (was 3.5% - too thin!)
    const arcRadius = center - arcThickness; // radius = center - thickness

    // QR code is 55% of size (fit inside the arc)
    const qrSize = size * 0.52;

    // QR positioned centered
    const qrX = (size - qrSize) / 2;
    const qrY = (size - qrSize) / 2 - (size * 0.02); // slightly above center

    // White container behind QR
    const qrPadding = size * 0.015;
    const whiteContainerSize = qrSize + (qrPadding * 2);
    const whiteContainerX = qrX - qrPadding;
    const whiteContainerY = qrY - qrPadding;

    // Text position (at bottom inside the arc)
    const textY = size * 0.82;
    const textX = size / 2;
    const fontSize = size * 0.055;

    return {
      size,
      center,
      arcRadius,
      arcThickness,
      qrSize,
      qrX,
      qrY,
      whiteContainerSize,
      whiteContainerX,
      whiteContainerY,
      whiteContainerRadius: whiteContainerSize * 0.02,
      textX,
      textY,
      fontSize,
      frameText
    };
  }

  // Generate arc path for scan-arc frame
  private generateArcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
    const startX = cx + radius * Math.cos(startAngle);
    const startY = cy + radius * Math.sin(startAngle);
    const endX = cx + radius * Math.cos(endAngle);
    const endY = cy + radius * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
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

    } else if (hasFrame && frameType === 'scan-arc') {
      // === SCAN-ARC FRAME MODE ===
      // Using the exact SVG provided by user - scaling from 1024 to current size
      const scale = size / 1024;
      const frameColor = this.settings.isGradient ? 'url(#qrMainGradient)' : this.settings.fgColor;

      // QR code positioning (centered, ~42% of size to fit inside frame)
      const qrSize = size * 0.42;
      const qrX = (size - qrSize) / 2;
      const qrY = (size - qrSize) / 2 - (size * 0.04); // slightly above center for text space
      const cellSize = qrSize / this.moduleCount;

      // 1. Draw background
      if (!this.settings.bgTransparent) {
        svg += `<rect width="100%" height="100%" fill="${this.settings.bgColor}" />`;
      }

      // 2. Embed the EXACT user-provided SVG frame paths (scaled)
      svg += `<g transform="scale(${scale})">`;
      // Main arc path from user's SVG
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9647058823529412" d="M 479.5 135 L 507.5 136 L 508.5 135 L 522.5 135 L 523.5 136 L 534.5 136 L 535.5 137 L 543.5 137 L 564.5 141 L 570.5 141 L 575.5 142 L 577.5 144 L 581 143 L 581.5 145 L 585 144 L 585.5 146 L 588.5 145 L 611.5 151 L 637.5 160 L 644 163.5 L 642.5 164 L 618.5 156 L 575.5 148 L 552.5 147 L 551.5 146 L 514.5 146 L 513.5 147 L 502.5 147 L 501.5 148 L 492.5 148 L 491.5 149 L 478.5 150 L 438.5 159 L 393.5 175 L 364.5 190 L 363 189.5 L 361.5 192 L 354.5 195 L 323.5 216 L 293 241 L 293 242.5 L 276.5 259 L 272 262.5 L 273 263.5 L 268 268.5 Q 240.9 299.9 221 338.5 L 207 369.5 L 197 401 L 195 401.5 L 196 404.5 Q 188.6 423.6 186.5 448 L 185 447.5 L 186 453.5 L 185 454.5 L 184 472.5 L 183 473.5 L 182 513.5 L 183 514.5 L 183 530.5 L 184 531.5 L 185 545.5 L 184 549 Q 188 547.6 186 554.5 L 187 558.5 Q 184.5 560 188 561.5 L 189 572.5 L 196 599.5 L 195.5 601 Q 197.8 600.3 197 602.5 L 196.5 604 Q 199.5 603.1 198 607.5 L 204 623.5 L 203.5 625 Q 205.8 624.3 205 626.5 L 206 628.5 L 205.5 630 Q 208.1 629.2 207 632.5 L 225 671.5 L 244 701.5 L 243.5 703 L 246 704.5 L 245.5 706 L 248 707.5 Q 266.6 735.4 290.5 758 L 293 759.5 L 296.5 764 L 325 787.5 L 325.5 789 L 326.5 788 L 329.5 791 L 369 815.5 L 369.5 817 L 371.5 817 L 384.5 824 L 387 824 L 387.5 826 L 389.5 826 Q 391.8 825.3 391 827.5 L 392.5 827 L 402.5 832 L 408 833 L 408.5 835 L 410.5 835 Q 413.8 833.9 413 836.5 L 415.5 837 L 437 843 Q 435.9 845.7 438.5 845 L 441 844 L 441.5 846 L 444 845 L 444.5 847 L 447 846 L 447.5 848 L 449.5 847 L 473.5 853 L 501 856 Q 499.7 859.3 504.5 858 L 505.5 857 L 513.5 857 L 514.5 858 L 557.5 858 L 558.5 857 L 566.5 857 L 572 858 Q 570.9 854.5 578.5 856 Q 580 858.5 581.5 855 L 600.5 853 L 627.5 846 L 629 846.5 Q 628.1 843.5 632.5 845 L 658.5 836 L 660 836.5 Q 659.3 834.3 661.5 835 L 663 835.5 L 663.5 834 Q 665 836.5 666.5 833 L 682.5 826 L 684 826.5 L 685.5 824 L 701.5 816 L 703 816.5 L 704.5 814 L 720.5 805 L 722 805.5 L 723.5 803 L 747.5 786 L 749 786.5 L 752.5 782 Q 776.1 765.1 795 743.5 Q 817.2 719.2 835 690.5 Q 847.2 671.7 856 649.5 L 854 650.5 Q 823.9 715.4 773.5 760 Q 752.1 779.6 727.5 796 L 702.5 811 L 663.5 829 L 633.5 839 L 604.5 846 L 576.5 849 L 575.5 850 L 566.5 850 L 565.5 851 L 537.5 852 L 536.5 851 L 516.5 851 L 515.5 850 L 490.5 848 L 483.5 846 L 475.5 846 L 446.5 839 L 400.5 823 L 371 807.5 L 372.5 807 L 383.5 813 L 404.5 821 L 449.5 833 L 456.5 833 L 479.5 837 L 527.5 838 L 528.5 837 L 551.5 836 L 552.5 835 L 565.5 834 L 587.5 830 L 621.5 820 Q 630.9 813.9 643.5 811 L 682.5 790 L 706.5 773 L 741 740.5 Q 762.3 717.8 779 690.5 L 797 656.5 L 798 651.5 L 807 631.5 L 807 628.5 L 816 602.5 L 824 560.5 L 825 541.5 L 826 540.5 L 826 493.5 L 825 492.5 L 825 482.5 L 824 481.5 L 823 468.5 L 815 432.5 L 799 388.5 Q 769 323 718.5 278 Q 694.6 256.9 666.5 240 L 631.5 222 L 613.5 215 L 589.5 207 L 550.5 199 L 535.5 198 L 534.5 197 L 521.5 197 L 520.5 196 L 485.5 196 L 484.5 197 L 473.5 197 L 472.5 198 L 456.5 199 L 440.5 203 L 430.5 204 L 396.5 214 L 374.5 223 Q 310.1 253.1 266 303.5 Q 239.4 333.9 220 371.5 L 208 397.5 L 196.5 434 L 196 428.5 L 205 394.5 L 210 380.5 L 224 347.5 L 234 328.5 L 264 283.5 L 294.5 250 Q 320.9 223.4 353.5 203 L 394.5 181 L 416.5 172 L 452.5 161 L 493.5 153 L 515.5 152 L 516.5 151 L 556.5 151 L 557.5 152 L 578.5 153 L 621.5 161 L 657.5 172 L 676.5 180 Q 749.1 213.4 799 269.5 L 825 301.5 L 844 331.5 L 856 354.5 L 869 386.5 L 876 408.5 L 885 449.5 L 886 464.5 L 887 465.5 L 887 477.5 L 888 478.5 L 888 519.5 L 887 520.5 L 886 541.5 L 888 545.5 L 887 546.5 L 885 576.5 L 876 621.5 L 865 655.5 L 862 660.5 L 857 675.5 Q 829 738.5 785.5 786 L 783 787.5 L 757.5 814 Q 732.3 836.8 702.5 855 L 675.5 870 L 644.5 884 L 612.5 895 L 604.5 896 L 593.5 900 L 589.5 900 L 571.5 905 L 564.5 905 L 557.5 907 L 551.5 907 L 543.5 909 L 532.5 909 L 531.5 910 L 495.5 911 L 494.5 910 L 461.5 909 L 460.5 908 L 452.5 908 L 451.5 907 L 426 904 L 425.5 902 L 421 903 L 420.5 901 L 417.5 902 L 398.5 896 L 390 895 L 389.5 893 L 387.5 894 L 361.5 885 L 336 874 L 335.5 872 L 333.5 872 L 317 864 L 316.5 862 L 314.5 862 L 300 853.5 L 299.5 852 Q 298 854.5 296.5 851 L 284.5 844 L 261 825.5 L 260.5 824 L 259.5 825 L 254.5 820 L 243 810.5 Q 243.8 808.3 241.5 809 L 218.5 785 L 216 783.5 L 210.5 776 L 208 774.5 L 186 745.5 L 186.5 744 L 184 742.5 L 170 720.5 L 170.5 719 L 168 717.5 L 161 704.5 L 161.5 703 L 160 702.5 L 160.5 701 Q 158.3 701.8 159 699.5 L 148 678.5 L 139 654.5 L 139.5 653 Q 136.5 653.9 138 649.5 L 130 626.5 L 131 624 Q 127.3 625.4 129 619.5 L 123 594.5 L 124 592 Q 121.3 593.1 122 590.5 L 123 587 Q 119 588.4 121 581.5 L 119 573.5 L 117 537.5 L 116 536.5 L 116 507.5 L 117 506.5 L 117 491.5 L 118 490.5 L 118 481.5 L 119 480.5 L 119 471.5 L 120 470.5 L 121 457 Q 124 458.3 123 454.5 L 122 452 Q 124.7 453.1 124 450.5 L 123 447.5 L 126 438.5 L 129 421 L 131 420.5 L 130 417.5 L 132 417.5 L 131 414.5 L 147 370 L 149 369.5 L 148 367.5 Q 154.7 358.4 158 347 L 160 346.5 L 159.5 345 L 161 344.5 L 161 342.5 L 169.5 327 L 171 326.5 Q 168.5 325 172 323.5 Q 177.1 311.1 185.5 302 L 187 301.5 L 186 300.5 L 189 297.5 L 195.5 288 L 198 286.5 L 197 285.5 L 201 281.5 L 228.5 250 L 246.5 233 L 250 231.5 L 253.5 227 Q 256.8 228.1 256 225.5 L 259.5 222 Q 260.8 224.2 262 221.5 L 264.5 218 L 271.5 213 Q 272.8 215.3 274 212.5 L 275.5 210 L 284.5 203 L 286 203.5 L 287.5 201 L 289 201.5 L 289 200 L 292 200 Q 290.9 197.3 293.5 198 Q 295.4 194.4 300 195 L 301.5 192 L 303 192.5 Q 302.3 190.3 304.5 191 L 315.5 184 L 317 184.5 L 318.5 182 L 320 182.5 L 320.5 181 L 322 181.5 Q 321.3 179.3 323.5 180 L 334.5 174 L 336 174.5 L 336.5 173 L 338 173.5 L 338.5 172 L 340 172.5 L 340.5 171 L 342 171.5 Q 341.2 168.9 344.5 170 L 354.5 165 L 356 165.5 L 356.5 164 L 358 164.5 L 358.5 163 L 360 163.5 Q 359.2 160.9 362.5 162 L 380.5 155 L 382 155.5 Q 381.3 153.3 383.5 154 L 385 154.5 L 385.5 153 L 388 154 Q 386.9 151.3 389.5 152 L 391 152.5 Q 390.1 149.5 394.5 151 L 415.5 145 L 417 145.5 Q 416.2 142.9 419.5 144 L 421 144.5 Q 420.2 141.9 423.5 143 L 426 144 Q 424.7 140.7 429.5 142 L 450.5 138 L 478.5 136 L 479.5 135 Z M 882 570 L 881 573 L 882 573 L 882 570 Z M 881 574 L 880 578 L 881 578 L 881 574 Z M 880 578 L 878 583 L 879 585 L 880 583 L 880 578 Z M 873 605 L 872 608 L 873 608 L 873 605 Z M 872 608 L 871 611 L 872 611 L 872 608 Z M 871 611 L 869 615 L 870 617 L 871 615 L 871 611 Z M 869 617 L 868 620 L 869 620 L 869 617 Z M 867 622 L 866 625 L 867 625 L 867 622 Z M 866 625 L 864 628 L 865 630 L 866 628 L 866 625 Z M 864 630 L 856 647 L 857 649 L 864 633 L 864 630 Z " />`;
      // SCAN ME text path from user's SVG
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9647058823529412" d="M 414.5 749 Q 427.8 746.7 431 754.5 L 432 757.5 L 426.5 758 Q 425 752.5 416.5 754 Q 414.3 754.8 415 758.5 L 430 766.5 L 431 774.5 L 427.5 779 L 415.5 780 L 408 774.5 L 407 770 Q 412.4 768.5 414 771.5 L 416.5 775 Q 423.5 776.5 425 772.5 Q 425.5 767.5 421.5 767 Q 413.8 766.5 410 763 L 408 755.5 L 412.5 750 L 414.5 749 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9647058823529412" d="M 443.5 749 Q 454.3 747.3 458 752.5 L 460 759.5 L 458.5 759 Q 453.1 760.9 454 757.5 L 451.5 754 Q 445.4 753.2 443 755 L 442 757.5 L 442 771.5 Q 443.3 776.3 450.5 775 L 455.5 769 Q 460 768 461 770.5 L 456.5 778 Q 452.8 781.3 444.5 780 L 436 773.5 L 435 757.5 L 441.5 750 L 443.5 749 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9647058823529412" d="M 473 749 Q 478.4 747.5 480 750.5 Q 485.5 761 488 774.5 L 491 779.5 L 484.5 780 L 482 774 L 470.5 774 L 470 776.5 L 467.5 780 L 462 780 L 462 777.5 L 473 749 Z M 477 758 L 473 766 L 473 768 L 480 768 L 477 758 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9647058823529412" d="M 493 749 L 500.5 749 L 501 750.5 L 512.5 769 L 513 749 Q 518.4 747.5 520 750.5 L 519 751.5 L 519 780 L 512.5 780 L 512 778.5 L 500.5 761 L 500 780 L 493 780 L 493 776.5 L 494 775.5 L 494 765.5 L 493 764.5 L 493 749 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9647058823529412" d="M 536 749 L 543.5 749 L 544 750.5 L 552.5 771 L 560 749 L 568.5 749 L 569 749.5 L 569 780 L 562 780 L 562 768.5 Q 564.7 766.8 563 760.5 L 561 761.5 L 555 780 Q 550.4 781.3 549 778.5 Q 547.4 768.1 542.5 761 L 542 780 L 536.5 780 L 536 779.5 L 536 749 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9647058823529412" d="M 574 749 L 594.5 749 L 595 754 L 581 754 L 581 759.5 Q 578.7 760.8 581.5 762 L 593 762 L 593 767 L 581.5 767 L 580 768.5 Q 578.8 773.8 581.5 775 L 595 775 L 595 780 L 574 780 L 574 749 Z " />`;
      svg += `</g>`;

      // 3. Render QR code patterns inside (centered)
      if (this.settings.dotsType === 'uniform-pills') {
        const pills = this.findPillGroups(matrix);
        svg += this.generatePillsSVG(pills, cellSize, qrX, this.settings.fgColor, qrY);
      } else {
        svg += this.generateStandardPatternSVG(matrix, cellSize, qrX, this.settings.dotsType, this.settings.fgColor, qrY);
      }
      svg += this.generateAdvancedCornerSVG(cellSize, qrX, undefined, qrY);

    } else if (hasFrame && frameType === 'scan-oval') {
      // === SCAN-OVAL FRAME MODE ===
      // Using the exact SVG provided by user - scaling from 1024 to current size
      const scale = size / 1024;
      const frameColor = this.settings.isGradient ? 'url(#qrMainGradient)' : this.settings.fgColor;

      // QR code positioning (centered, ~40% of size to fit inside oval frame)
      const qrSize = size * 0.40;
      const qrX = (size - qrSize) / 2;
      const qrY = (size - qrSize) / 2 - (size * 0.06); // above center for text space
      const cellSize = qrSize / this.moduleCount;

      // White container for QR code (with padding)
      const qrPadding = size * 0.02;
      const whiteContainerSize = qrSize + (qrPadding * 2);
      const whiteContainerX = qrX - qrPadding;
      const whiteContainerY = qrY - qrPadding;

      // 1. Draw background
      if (!this.settings.bgTransparent) {
        svg += `<rect width="100%" height="100%" fill="${this.settings.bgColor}" />`;
      }

      // 2. Embed the EXACT user-provided SVG frame paths (scaled)
      svg += `<g transform="scale(${scale})">`;
      // Main oval frame path from user's SVG
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.996078431372549" d="M 448.5 137 L 480.5 137 L 481.5 138 L 491.5 138 L 534.5 146 L 578.5 159 L 581.5 161 L 584.5 161 L 669.5 190 L 715.5 209 L 741.5 223 Q 769.3 239.7 791 262.5 Q 808.2 280.8 821 303.5 L 831 323.5 L 845 360.5 L 845 363.5 L 859 403.5 L 891 507.5 L 897 539.5 L 898 574.5 L 897 575.5 L 897 584.5 L 896 585.5 L 895 597.5 L 889 621.5 L 874 656.5 Q 863.6 675.6 850 691.5 L 816.5 725 L 813.5 727 L 715.5 824 Q 696.8 841.8 674.5 856 Q 651.7 870.7 622.5 879 L 596.5 884 L 559.5 885 L 558.5 884 L 547.5 884 L 546.5 883 L 519.5 880 L 458.5 867 L 398.5 851 L 333.5 830 L 308.5 820 L 283.5 806 Q 263.7 792.8 248 775.5 Q 231.4 757.6 219 735.5 L 203 702.5 L 187 660.5 L 157 568.5 L 145 525.5 L 138 488.5 L 137 452.5 L 138 451.5 L 138 441.5 L 139 440.5 L 141 423.5 L 149 395.5 Q 160.6 365.6 178 341.5 L 200 314.5 L 302.5 211 Q 330.4 180.9 367.5 160 Q 386 150.5 407.5 144 L 424.5 140 L 436.5 139 L 437.5 138 L 447.5 138 L 448.5 137 Z M 407 731 L 400 734 L 397 740 L 398 749 L 405 753 L 416 756 L 418 759 Q 419 764 416 765 Q 406 767 404 762 L 404 759 L 396 759 L 398 767 L 408 772 Q 416 773 421 770 L 426 764 L 425 755 L 417 748 L 408 746 Q 404 745 405 741 L 410 737 L 417 739 L 418 742 L 419 743 L 426 743 L 424 737 Q 420 729 407 731 Z M 442 731 L 434 735 L 429 746 Q 427 758 432 765 Q 436 770 443 772 Q 451 773 456 770 Q 461 767 463 760 L 456 759 L 454 762 L 450 765 L 443 764 L 437 757 Q 435 746 439 742 Q 441 736 451 738 L 455 744 L 456 745 L 463 745 L 461 739 Q 457 729 442 731 Z M 478 731 L 471 748 L 465 769 L 463 771 L 472 771 L 475 763 L 476 761 L 488 761 L 491 770 L 492 771 L 499 771 L 487 733 L 486 731 L 483 732 L 478 731 Z M 505 731 L 503 733 L 503 771 L 504 771 L 511 771 L 512 746 L 525 770 L 527 771 Q 532 770 534 772 Q 536 771 534 770 L 534 734 L 535 733 L 528 731 L 527 758 L 512 733 L 510 731 L 507 732 L 505 731 Z M 556 731 L 556 772 L 559 771 L 563 772 L 564 745 L 572 770 L 573 771 L 578 771 L 587 745 L 587 771 L 595 771 L 594 770 L 594 737 L 595 734 L 594 731 L 592 732 L 587 731 L 584 734 L 576 757 Q 577 760 574 759 L 574 756 L 566 732 L 556 731 Z M 603 731 L 601 733 L 601 771 L 627 771 L 628 766 L 627 764 L 612 764 Q 610 766 609 764 L 609 754 L 625 754 L 625 748 L 609 748 L 609 738 L 625 738 L 626 739 Q 629 737 627 731 L 624 732 Q 612 734 605 731 L 603 731 Z " />`;
      // Inner dot for letter A
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.996078431372549" d="M 481.5 740 L 486 755 L 477.5 755 L 477 752.5 L 481.5 740 Z " />`;
      svg += `</g>`;

      // 3. Draw white container for QR code
      svg += `<rect x="${whiteContainerX}" y="${whiteContainerY}" width="${whiteContainerSize}" height="${whiteContainerSize}" rx="${whiteContainerSize * 0.02}" fill="white" />`;

      // 4. Render QR code patterns inside (centered)
      if (this.settings.dotsType === 'uniform-pills') {
        const pills = this.findPillGroups(matrix);
        svg += this.generatePillsSVG(pills, cellSize, qrX, this.settings.fgColor, qrY);
      } else {
        svg += this.generateStandardPatternSVG(matrix, cellSize, qrX, this.settings.dotsType, this.settings.fgColor, qrY);
      }
      svg += this.generateAdvancedCornerSVG(cellSize, qrX, undefined, qrY);

    } else if (hasFrame && frameType === 'scan-rect') {
      // === SCAN-RECT FRAME MODE ===
      // Using the exact SVG provided by user - scaling from 1024 to current size
      const scale = size / 1024;
      const frameColor = this.settings.isGradient ? 'url(#qrMainGradient)' : this.settings.fgColor;

      // QR code positioning (centered in the top portion, above text area)
      const qrSize = size * 0.52;
      const qrX = (size - qrSize) / 2;
      const qrY = size * 0.18; // Position in upper area of frame
      const cellSize = qrSize / this.moduleCount;

      // White container for QR code (with padding)
      const qrPadding = size * 0.02;
      const whiteContainerSize = qrSize + (qrPadding * 2);
      const whiteContainerX = qrX - qrPadding;
      const whiteContainerY = qrY - qrPadding;

      // 1. Draw background
      if (!this.settings.bgTransparent) {
        svg += `<rect width="100%" height="100%" fill="${this.settings.bgColor}" />`;
      }

      // 2. Embed the EXACT user-provided SVG frame paths (scaled)
      svg += `<g transform="scale(${scale})">`;
      // Main rectangular frame path from user's SVG
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.996078431372549" d="M 225.5 122 L 797.5 122 Q 816.3 125.2 825 138.5 L 831 152.5 L 831 684 L 805.5 684 L 805 683.5 L 805 154.5 L 799.5 148 L 222.5 148 L 218 151.5 L 217 153.5 L 217 676 L 190.5 676 L 190 675.5 L 190 157.5 L 194 143.5 L 206.5 129 L 216.5 124 L 225.5 122 Z " />`;
      // Bottom section with SCAN ME
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.996078431372549" d="M 191.5 688 Q 193 690.5 198.5 689 L 200.5 689 L 787.5 689 Q 809.4 693.6 821 708.5 L 831 724.5 L 835 738.5 L 835 845 L 275.5 845 L 255.5 840 L 240.5 833 Q 223.4 823.1 211 808.5 Q 196.7 793.3 191 769.5 Q 192.3 764.8 190 763.5 L 190 689.5 L 191.5 688 Z M 376 738 L 370 740 L 362 750 L 363 761 L 371 767 L 382 770 L 386 774 Q 387 778 384 779 Q 370 781 364 775 L 362 776 L 362 787 L 372 790 Q 386 792 393 787 L 399 779 Q 400 770 397 766 L 394 762 L 377 755 Q 374 756 375 752 L 380 748 Q 390 747 395 752 L 396 751 L 396 740 L 389 738 L 376 738 Z M 424 738 L 415 742 Q 406 748 404 760 Q 403 772 408 780 Q 413 788 424 790 Q 436 792 443 788 L 445 786 L 445 776 L 434 780 L 427 779 L 423 777 Q 418 774 417 768 Q 416 758 420 754 L 423 751 L 431 748 Q 439 748 444 752 L 445 752 L 445 742 Q 438 736 424 738 Z M 464 739 L 449 788 L 450 789 L 462 789 L 463 788 L 465 779 L 467 777 L 481 777 L 482 779 L 484 788 L 486 789 L 498 789 L 483 743 L 483 739 L 464 739 Z M 503 739 L 503 789 L 504 789 L 515 789 L 515 760 L 514 759 L 515 757 L 530 787 L 533 789 L 546 789 L 546 740 L 546 739 L 534 739 L 534 768 L 535 769 Q 536 771 533 770 L 533 768 L 519 741 L 518 739 L 503 739 Z M 569 739 L 569 789 L 580 789 L 581 788 L 581 762 L 580 761 L 581 755 L 591 783 L 592 784 L 600 784 L 610 760 L 610 757 L 611 757 L 611 789 L 623 789 L 623 739 L 606 739 L 596 765 L 587 741 L 586 739 L 569 739 Z M 633 739 L 633 789 L 668 789 L 669 784 Q 669 779 669 779 L 646 779 L 646 769 L 666 769 L 666 760 L 665 758 L 647 759 Q 644 758 646 757 L 646 749 L 667 749 L 667 740 L 667 739 L 633 739 Z " />`;
      // Inner dot for letter A
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.996078431372549" d="M 473.5 749 L 479 766.5 L 468 767 L 473.5 749 Z " />`;
      svg += `</g>`;

      // 3. Draw white container for QR code
      svg += `<rect x="${whiteContainerX}" y="${whiteContainerY}" width="${whiteContainerSize}" height="${whiteContainerSize}" rx="${whiteContainerSize * 0.02}" fill="white" />`;

      // 4. Render QR code patterns inside
      if (this.settings.dotsType === 'uniform-pills') {
        const pills = this.findPillGroups(matrix);
        svg += this.generatePillsSVG(pills, cellSize, qrX, this.settings.fgColor, qrY);
      } else {
        svg += this.generateStandardPatternSVG(matrix, cellSize, qrX, this.settings.dotsType, this.settings.fgColor, qrY);
      }
      svg += this.generateAdvancedCornerSVG(cellSize, qrX, undefined, qrY);

    } else if (hasFrame && frameType === 'device') {
      // === DEVICE FRAME MODE ===
      // Using the exact SVG provided by user - scaling from 1024 to current size
      // White screen area: X=260-769, Y=227-711 (with SCAN ME text at bottom Y=752-798)
      const scale = size / 1024;
      const frameColor = this.settings.isGradient ? 'url(#qrMainGradient)' : this.settings.fgColor;

      // QR code positioning (centered in the white screen area)
      // Screen area is from Y=227 to Y=711, center at ~469 (0.458 of 1024)
      const qrSize = size * 0.42; // Size to fit in screen area with padding
      const qrX = (size - qrSize) / 2;
      const qrY = size * 0.26; // Centered in white screen area
      const cellSize = qrSize / this.moduleCount;

      // White container for QR code (with padding)
      const qrPadding = size * 0.02;
      const whiteContainerSize = qrSize + (qrPadding * 2);
      const whiteContainerX = qrX - qrPadding;
      const whiteContainerY = qrY - qrPadding;

      // 1. Draw background
      if (!this.settings.bgTransparent) {
        svg += `<rect width="100%" height="100%" fill="${this.settings.bgColor}" />`;
      }

      // 2. Embed the EXACT user-provided SVG frame paths (scaled)
      svg += `<g transform="scale(${scale})">`;
      // Main device frame path from user's SVG (includes outer frame, inner screen cutout, and SCAN ME text)
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.996078431372549" d="M 179.5 132 L 847.5 132 Q 861.9 135.1 870 144.5 L 878 157.5 L 880 165.5 L 880 830.5 Q 876.4 848.4 863.5 857 Q 856.6 862.1 846.5 864 L 180.5 864 Q 162.5 861 154 848.5 Q 148.9 842.1 147 832.5 L 147 163.5 Q 150.8 147.3 162.5 139 Q 169.1 133.6 179.5 132 Z M 277 227 L 268 231 Q 262 235 260 244 L 260 695 L 263 702 Q 267 709 277 711 L 754 711 L 763 706 L 769 695 L 769 244 L 765 235 Q 761 229 754 227 L 277 227 Z M 394 752 L 390 754 L 384 761 Q 383 769 386 773 L 393 777 L 404 781 Q 407 782 406 788 L 402 791 L 393 791 L 385 786 L 384 796 L 393 799 L 403 799 L 411 795 L 414 790 Q 416 782 413 779 L 409 774 L 393 768 L 392 763 L 396 760 Q 407 758 411 764 L 412 764 L 412 756 Q 406 750 394 752 Z M 438 752 L 428 757 Q 422 762 420 770 Q 418 784 424 791 Q 429 796 438 799 Q 451 801 456 795 L 456 787 L 449 791 Q 439 792 435 789 Q 430 786 428 780 Q 427 771 430 767 L 439 760 Q 450 758 455 764 L 457 764 Q 455 762 456 757 Q 451 750 438 752 Z M 476 752 L 473 756 L 473 759 L 459 797 L 460 798 L 467 798 L 469 792 L 470 788 L 486 788 L 489 796 L 489 798 L 497 798 L 482 754 Q 483 750 476 752 Z M 506 752 L 504 754 L 504 788 L 504 790 L 504 798 L 513 798 L 512 796 L 513 767 L 534 797 L 535 798 L 540 798 L 540 753 L 540 752 L 532 752 L 532 781 L 512 754 Q 513 750 506 752 Z M 565 752 L 562 793 L 561 794 L 561 798 L 569 798 L 570 795 L 572 766 L 584 797 L 587 798 L 601 767 L 601 778 L 602 779 L 602 792 L 603 793 L 603 798 L 611 798 L 610 793 L 608 760 L 607 759 L 607 752 L 599 752 L 587 778 Q 588 781 585 780 L 583 773 L 574 754 L 574 752 L 565 752 Z M 623 752 L 623 798 L 651 798 L 653 793 L 653 790 L 644 790 L 642 790 L 640 791 L 631 791 L 631 779 L 645 779 L 646 778 L 646 771 L 631 771 L 631 760 L 652 760 L 652 753 L 652 752 L 623 752 Z " />`;
      // Inner dot for letter A
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.996078431372549" d="M 477 763 Q 480.3 761.7 479 766.5 L 484 779.5 L 473 780 L 477 763 Z " />`;
      svg += `</g>`;

      // 3. Draw white container for QR code
      svg += `<rect x="${whiteContainerX}" y="${whiteContainerY}" width="${whiteContainerSize}" height="${whiteContainerSize}" rx="${whiteContainerSize * 0.02}" fill="white" />`;

      // 4. Render QR code patterns inside
      if (this.settings.dotsType === 'uniform-pills') {
        const pills = this.findPillGroups(matrix);
        svg += this.generatePillsSVG(pills, cellSize, qrX, this.settings.fgColor, qrY);
      } else {
        svg += this.generateStandardPatternSVG(matrix, cellSize, qrX, this.settings.dotsType, this.settings.fgColor, qrY);
      }
      svg += this.generateAdvancedCornerSVG(cellSize, qrX, undefined, qrY);

    } else if (hasFrame && frameType === 'badge') {
      // === BADGE FRAME MODE ===
      // Using the exact SVG provided by user - scaling from 503 to current size
      // White area for QR is from ~135 to ~346 horizontally, ~140 to ~350 vertically
      const scale = size / 503;
      const frameColor = this.settings.isGradient ? 'url(#qrMainGradient)' : this.settings.fgColor;

      // QR code positioning - inside the white square area (below SCAN ME text)
      // White area in original SVG: x=135-346, y=140-350 (approximately 211x210 units)
      // QR should be smaller to fit with padding
      const qrSize = size * 0.36; // Smaller QR to prevent overflow
      const qrX = (size - qrSize) / 2; // Centered horizontally
      const qrY = size * 0.30; // Position in white area (below SCAN ME text)
      const cellSize = qrSize / this.moduleCount;

      // 1. Draw background
      if (!this.settings.bgTransparent) {
        svg += `<rect width="100%" height="100%" fill="${this.settings.bgColor}" />`;
      }

      // 2. Embed the EXACT user-provided SVG frame paths (scaled)
      svg += `<g transform="scale(${scale})">`;
      // Main circular badge frame with white inner area
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 223.5 47 L 232 47.5 L 223.5 48 L 223.5 47 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 233.5 47 L 243 47.5 L 233.5 48 L 233.5 47 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 246.5 47 L 259 47.5 L 246.5 48 L 246.5 47 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 214.5 48 L 219 48.5 L 208.5 50 L 208.5 49 Q 213.3 50.2 214.5 48 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 263.5 48 L 268 48.5 L 263.5 49 L 263.5 48 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 269.5 49 L 273 49.5 L 269.5 50 L 269.5 49 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 203.5 50 L 206 50.5 L 193.5 54 L 194.5 52 L 203.5 50 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 279.5 51 L 281.5 51 L 298 55 L 297.5 58 L 297 56 L 285.5 53 L 283.5 54 L 283.5 52 L 279.5 54 L 279.5 51 Z " />`;
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 190.5 53 L 192 53.5 L 179.5 58 L 180.5 56 L 190.5 53 Z " />`;
      // Outer circular frame paths (simplified - main structure)
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="1" d="M 224.5 48 L 256.5 48 L 264.5 50 L 271.5 50 L 283.5 54 L 289.5 54 L 297.5 58 L 301.5 58 L 315.5 64 Q 317 61.5 318.5 65 L 327.5 70 L 330 70 Q 328.8 73 332.5 72 L 336 73 L 337.5 76 L 338.5 75 L 343.5 80 L 344.5 79 L 347.5 82 L 356 87.5 Q 354.7 91.7 359.5 90 L 369 98.5 Q 368.3 100.8 370.5 100 L 373 104 L 377 106.5 Q 376.3 108.8 378.5 108 L 392 124.5 L 390 125.5 L 393 126 L 393 128 Q 395.7 126.9 395 129.5 L 398 135 Q 400.7 133.9 400 136.5 L 402 140.5 L 404 143.5 L 410 153.5 L 409.5 155 L 411 155.5 L 411 157.5 Q 410.3 160.1 413 159 L 413 161.5 L 422 184.5 Q 419.5 186 423 187.5 Q 423.8 189.8 421.5 189 L 413 184 L 413 182 Q 410.3 183.1 411 180.5 Q 408.3 182.4 405.5 177 L 402.5 175 L 399 173 L 399 171 Q 396 172 397 169 L 394 169 L 394 167.5 L 380 157.5 L 379.5 156 L 378 156.5 Q 378.8 154.3 376.5 155 L 367 147.5 Q 367.8 145.3 365.5 146 L 361 142.5 L 361 119.5 L 359 114.5 L 359.5 113 Q 356.9 113.8 358 110.5 L 355 109.5 L 353 106.5 L 351 106.5 L 350.5 105 L 348.5 106 L 345.5 104 L 344.5 105 L 314 105 L 312 109.5 L 315.5 113 L 344.5 113 L 345.5 114 Q 346.8 111.8 348 114.5 L 349.5 117 L 353 119.5 L 352.5 136 L 348 132.5 L 348 130.5 L 348 122.5 L 349 121.5 L 341.5 118 L 328.5 118 L 327.5 119 L 294.5 119 L 289.5 118 L 288.5 119 L 153.5 119 Q 152 116.5 146.5 118 L 142.5 119 L 140.5 118 L 134 120 L 132 128.5 L 134 134.5 L 134 136.5 Q 135.8 142.7 133 144.5 L 133 343.5 L 134 345.5 Q 131.5 347 135 348.5 L 136.5 351 L 139 352.5 L 138.5 354 L 140.5 353 L 142 356 L 145 357.5 L 142.5 358 L 135.5 358 L 131 354.5 L 129 351.5 L 128 350.5 L 128 316.5 L 125.5 314 L 121 315 L 121 322.5 L 120 323.5 L 121 326.5 L 120 327.5 L 120 340.5 L 121 341.5 L 121 354.5 L 123 358.5 L 122 362.5 L 123 362.5 L 123.5 360 L 126.5 364 L 128.5 363 L 130.5 366 L 132.5 365 Q 134.8 367.7 140.5 367 L 141.5 366 L 153.5 366 L 156.5 367 L 166 373.5 Q 165.2 376.1 168.5 375 L 183 387.5 L 183.5 389 Q 185 386.5 186.5 390 L 194 395 Q 192.9 397.7 195.5 397 L 202 401 Q 200.9 403.7 203.5 403 L 209 407.5 Q 208.2 410.1 211.5 409 L 217 413.5 L 216.5 415 L 220.5 416 L 228.5 424 Q 229.8 421.8 231 424.5 L 226.5 425 L 219.5 423 L 210.5 423 Q 207.2 420.3 200.5 421 L 198.5 419 L 192.5 419 L 189.5 417 L 185.5 417 L 182.5 415 L 170.5 412 L 157 405.5 L 157.5 404 L 154.5 404 L 146.5 400 L 126 387 Q 127.1 384.3 124.5 385 L 120 382 Q 121.1 379.3 118.5 380 L 114 377 L 114 375 Q 111.3 376.1 112 373.5 L 109 371.5 L 110 369.5 L 108.5 370 L 107 370 L 107 368 L 105 368 L 105 366 Q 102.3 367.1 103 364.5 Q 97 360.6 95 354 L 92 352.5 L 74 324.5 L 74.5 323 L 73 322.5 L 73.5 321 Q 71.3 321.8 72 319.5 L 63 300.5 L 63 295 L 61 294.5 L 61 292.5 L 59 289.5 L 59 284.5 L 57 281.5 L 57 276.5 L 54 265.5 L 54 256.5 L 52 245.5 L 52 227.5 L 53 226.5 L 54 209.5 L 55 208.5 L 57 191.5 L 59 188.5 L 59 184.5 L 61 181.5 L 63 172.5 L 76 144.5 L 88 125.5 L 96.5 115 Q 98.8 115.8 98 113.5 L 99.5 111 L 101 111.5 Q 99.9 108.2 102.5 109 L 107.5 103 L 111 101.5 Q 108.3 99.8 112.5 98 L 114 98 L 114 96 Q 116.7 97.1 116 94.5 Q 117.8 96.1 119.5 93 L 122 92.5 L 120 91.5 L 123 90.5 Q 122.3 88.3 124.5 89 L 129.5 84 L 131 84.5 L 133.5 81 L 135.5 81 L 149.5 71 L 173.5 60 L 200.5 52 L 205.5 52 L 209.5 50 L 217.5 50 L 224.5 48 Z M 135 104 L 129 108 L 126 108 L 122 116 L 120 120 L 121 121 L 121 158 L 123 157 L 125 158 L 127 157 L 128 156 L 128 122 L 130 119 Q 129 116 132 117 L 131 116 L 133 116 L 133 114 L 136 113 L 170 113 L 173 110 L 172 108 L 170 105 L 136 105 L 135 104 Z " />`;
      // SCAN ME text - S
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 208.5 123 Q 211.8 121.9 211 124.5 L 208.5 125 Q 206.3 124.3 207 126.5 L 213 130.5 L 214 132.5 Q 213 136 207.5 135 Q 203 133 206.5 131 L 208.5 134 L 212 132.5 L 210.5 130 L 207 129 L 207 127 Q 204.3 128.1 205 125.5 L 208.5 123 Z " />`;
      // SCAN ME text - C
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 218.5 123 L 220.5 123 L 224 124.5 L 223.5 127 Q 222.5 124 217.5 125 L 218 126.5 Q 216.5 132.5 219.5 134 L 223.5 131 L 224 134 L 218.5 135 Q 214.2 133.3 217 131.5 L 216 125.5 L 218.5 123 Z " />`;
      // SCAN ME text - A
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 230.5 123 L 233 124.5 L 235 131.5 L 232.5 132 Q 228.8 131.3 228 133.5 Q 228.8 135.8 226.5 135 L 228 132.5 L 227 131.5 Q 226.3 129.3 228.5 130 L 233 131 L 231.5 125 L 231 127 Q 228 128 229 125 L 231 124.5 L 230.5 123 Z " />`;
      // SCAN ME text - N
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 238.5 123 L 239.5 125 L 241 124.5 L 244.5 131 Q 247.1 129.6 246.5 125 L 247 131.5 L 247 133.5 Q 247.8 135.8 245.5 135 L 245.5 133 L 243 131.5 L 241 126 L 239 126.5 L 239 128.5 L 240 133.5 L 238 134.5 L 238.5 123 Z " />`;
      // SCAN ME text - M
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 254 123 L 257 123.5 L 255 124 L 255.5 126 L 258 125 L 260.5 132 L 261.5 130 L 262 132.5 L 260.5 135 L 256.5 127 L 256 135 L 254 134.5 L 254 123 Z " />`;
      // SCAN ME text - E
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 263 123 Q 267.5 121.3 266 126.5 L 266 128.5 Q 267.5 136.1 264 135 L 263.5 127 L 262.5 129 L 262 127.5 L 265 125.5 L 263 125 L 263 123 Z " />`;
      // SCAN ME text - continuation
      svg += `<path fill="${frameColor}" stroke="${frameColor}" stroke-width="0" opacity="0.9411764705882353" d="M 269.5 123 L 271.5 123 L 276 123.5 Q 271.4 122.9 270 125.5 Q 268.6 130.1 274.5 128 L 274.5 129 Q 270.8 128.3 270 130.5 L 271.5 134 L 276 134.5 L 269 135 L 269.5 123 Z " />`;
      svg += `</g>`;

      // 3. Draw white container for QR code (already part of SVG frame design)
      // The white area is built into the frame SVG, so we just render QR on top

      // 4. Render QR code patterns inside the white area
      if (this.settings.dotsType === 'uniform-pills') {
        const pills = this.findPillGroups(matrix);
        svg += this.generatePillsSVG(pills, cellSize, qrX, this.settings.fgColor, qrY);
      } else {
        svg += this.generateStandardPatternSVG(matrix, cellSize, qrX, this.settings.dotsType, this.settings.fgColor, qrY);
      }
      svg += this.generateAdvancedCornerSVG(cellSize, qrX, undefined, qrY);

    } else if (hasFrame) {
      // === OTHER FRAMES - Keep for future ===
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