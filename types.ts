export type QRType = 'text' | 'url' | 'wifi' | 'contact' | 'email' | 'phone' | 'geo' | 'event' | 'social' | 'ai' | 'bulk' | 'sms' | 'appstore' | 'whatsapp' | 'youtube' | 'bitcoin' | 'coupon' | 'upi' | 'paypal' | 'telegram' | 'spotify' | 'instagram' | 'twitter' | 'linkedin' | 'zoom' | 'facebook' | 'tiktok' | 'pinterest' | 'snapchat' | 'discord' | 'skype' | 'facetime' | 'googlemeet' | 'googlereview' | 'pdf' | 'menu' | 'audio' | 'video' | 'images' | 'document';

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

  // Frame
  frameType: 'none' | 'circle' | 'rounded-box' | 'square-box';
  frameText?: string;

  // Logo
  logoImage: string | null;
  logoSize: number;
  logoPadding: number;
  logoUseCustomColors: boolean;  // false = auto match QR colors, true = use custom colors
  logoForegroundColor: string;   // Custom foreground color for logo
  logoBackgroundColor: string;   // Custom background color for logo
  logoShape: 'auto' | 'square' | 'circle' | 'rounded';  // Shape of logo padding
}

export interface QRContentData {
  type: QRType;
  value: string;
  url?: string; // Optional URL field for direct URL content types
  wifi?: { ssid: string; pass: string; type: string; hidden: boolean };
  contact?: {
    // Basic Info
    firstName: string;
    lastName: string;
    title: string;      // Job Title
    company: string;
    // Phone Numbers
    mobile: string;
    phone: string;      // Work phone
    fax: string;
    // Emails
    email: string;      // Personal
    workEmail: string;
    // Address
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    // Web & Social
    website: string;
    // Profile Photo
    photo: string;
    // Legacy support
    fn?: string;
    org?: string;
  };
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
  // Media file types
  audio?: { url: string; title?: string; artist?: string; isUploading?: boolean };
  video?: { url: string; title?: string; isUploading?: boolean };
  images?: { urls: string[]; filePaths?: string[]; previewUrls?: string[]; title?: string; isUploading?: boolean };
  document?: { url: string; title?: string; fileType?: string; isUploading?: boolean };
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