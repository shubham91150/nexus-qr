export type QRType = 'text' | 'url' | 'wifi' | 'contact' | 'email' | 'phone' | 'geo' | 'event' | 'social' | 'ai' | 'bulk' | 'sms' | 'appstore' | 'whatsapp' | 'youtube' | 'bitcoin' | 'coupon' | 'upi' | 'paypal' | 'telegram' | 'spotify' | 'instagram' | 'twitter' | 'linkedin' | 'zoom' | 'facebook' | 'tiktok' | 'pinterest' | 'snapchat' | 'discord' | 'skype' | 'facetime' | 'googlemeet' | 'googlereview' | 'pdf' | 'menu';

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
  sms?: { phone: string; message: string };
  appstore?: {
    iosUrl: string;
    androidUrl: string;
    huaweiUrl?: string;
    appName?: string;
  };
  whatsapp?: { phone: string; message: string };
  youtube?: { url: string };
  bitcoin?: { address: string; amount?: string; label?: string };
  coupon?: { code: string; discount: string; expiry?: string; terms?: string };
  upi?: { vpa: string; name?: string; amount?: string; note?: string };
  paypal?: { email: string; amount?: string; currency?: string; description?: string };
  telegram?: { username: string; type: 'user' | 'group' | 'channel' };
  spotify?: { url: string; type: 'track' | 'album' | 'playlist' | 'artist' };
  instagram?: { username: string };
  twitter?: { username: string };
  linkedin?: { username: string; type: 'profile' | 'company' };
  zoom?: { meetingId: string; password?: string };
  facebook?: { username: string; type: 'profile' | 'page' | 'group' };
  tiktok?: { username: string };
  pinterest?: { username: string; board?: string };
  snapchat?: { username: string };
  discord?: { inviteCode: string };
  skype?: { username: string; type: 'chat' | 'call' };
  facetime?: { contact: string; type: 'video' | 'audio' };
  googlemeet?: { meetingCode: string };
  googlereview?: { placeId: string; businessName?: string };
  pdf?: { url: string; title?: string };
  menu?: { url: string; restaurantName?: string };
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