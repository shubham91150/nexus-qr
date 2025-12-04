export type QRType = 'text' | 'url' | 'wifi' | 'contact' | 'email' | 'phone' | 'geo' | 'event' | 'social' | 'ai' | 'bulk';

export interface QRStyleConfig {
  size: number;
  padding: number; // Added padding
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  
  // Colors
  fgColor: string;
  bgColor: string;
  isGradient: boolean;
  gradientType: 'linear' | 'radial';
  fgColor2: string;
  gradientRotation: number;
  bgTransparent: boolean;
  
  // Custom Corner Colors
  customCornerColor: boolean;
  cornerSquareColor: string;
  cornerDotColor: string;
  
  // Patterns (Updated for Custom Engine)
  dotsType: 'square' | 'circle' | 'square-dots' | 'uniform-pills' | 'sharp-diamond' | 'mixed';
  
  // Corners (Updated for Custom Engine)
  cornerSquareType: 'square' | 'circle' | 'rounded' | 'three-sided' | 'two-sided';
  cornerDotType: 'square' | 'dot'; 
  
  // Logo
  logoImage: string | null;
  logoSize: number;
  logoPadding: number;
  logoBackground: 'transparent' | 'solid';
}

export interface QRContentData {
  type: QRType;
  value: string;
  wifi?: { ssid: string; pass: string; type: string; hidden: boolean };
  contact?: { fn: string; phone: string; email: string; org: string };
  email?: { to: string; subject: string; body: string };
  geo?: { lat: string; lng: string };
  event?: { title: string; location: string; start: string; end: string };
  bulk?: {
    items: Array<{ name: string; value: string }>;
    rawInput: string;
  };
}

// Global types for libraries loaded via script tags
declare global {
  interface Window {
    qrcode: any; // The raw matrix generator
    CryptoJS: any;
    JSZip: any;
    Papa: any;
    QRCodeStyling: any;
  }
}