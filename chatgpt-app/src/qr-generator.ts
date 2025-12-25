/**
 * Nexus QR - QR Code Generation Handlers
 *
 * This module contains ALL QR code generation logic for each tool.
 */

import QRCode from 'qrcode';

// QR Code options interface
interface QROptions {
  width?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
}

// Generate QR code as base64 data URL
async function generateQRBase64(content: string, options: QROptions = {}): Promise<string> {
  const qrOptions = {
    width: options.width || 400,
    margin: options.margin || 2,
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
  };

  return await QRCode.toDataURL(content, qrOptions);
}

// Result type
type QRResult = { success: boolean; qrCode?: string; message: string };

// ==================== BASIC QR CODES ====================

export async function handleGenerateQRCode(params: {
  content: string;
  type?: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}): Promise<QRResult> {
  try {
    const qrCode = await generateQRBase64(params.content, {
      width: params.size || 400,
      color: {
        dark: params.color || '#000000',
        light: params.backgroundColor || '#ffffff',
      },
    });

    return {
      success: true,
      qrCode,
      message: `QR code generated successfully for: ${params.content.substring(0, 50)}${params.content.length > 50 ? '...' : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== CONNECTIVITY ====================

export async function handleGenerateWiFiQR(params: {
  ssid: string;
  password: string;
  security?: string;
  hidden?: boolean;
}): Promise<QRResult> {
  try {
    const security = params.security || 'WPA';
    const hidden = params.hidden ? 'true' : 'false';
    const wifiString = `WIFI:T:${security};S:${params.ssid};P:${params.password};H:${hidden};;`;

    const qrCode = await generateQRBase64(wifiString, {
      errorCorrectionLevel: 'M',
    });

    return {
      success: true,
      qrCode,
      message: `WiFi QR code generated for network: ${params.ssid}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate WiFi QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== CONTACT & COMMUNICATION ====================

export async function handleGenerateContactQR(params: {
  firstName: string;
  lastName?: string;
  phone?: string;
  workPhone?: string;
  fax?: string;
  email?: string;
  workEmail?: string;
  company?: string;
  title?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}): Promise<QRResult> {
  try {
    let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';

    const fullName = [params.firstName, params.lastName].filter(Boolean).join(' ');
    vcard += `N:${params.lastName || ''};${params.firstName};;;\n`;
    vcard += `FN:${fullName}\n`;

    if (params.company) vcard += `ORG:${params.company}\n`;
    if (params.title) vcard += `TITLE:${params.title}\n`;
    if (params.phone) vcard += `TEL;TYPE=CELL:${params.phone}\n`;
    if (params.workPhone) vcard += `TEL;TYPE=WORK:${params.workPhone}\n`;
    if (params.fax) vcard += `TEL;TYPE=FAX:${params.fax}\n`;
    if (params.email) vcard += `EMAIL;TYPE=HOME:${params.email}\n`;
    if (params.workEmail) vcard += `EMAIL;TYPE=WORK:${params.workEmail}\n`;
    if (params.website) vcard += `URL:${params.website}\n`;

    if (params.street || params.city || params.state || params.zip || params.country) {
      vcard += `ADR;TYPE=WORK:;;${params.street || ''};${params.city || ''};${params.state || ''};${params.zip || ''};${params.country || ''}\n`;
    }

    vcard += 'END:VCARD';

    const qrCode = await generateQRBase64(vcard, {
      errorCorrectionLevel: 'M',
    });

    return {
      success: true,
      qrCode,
      message: `Contact QR code generated for: ${fullName}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate contact QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function handleGeneratePhoneQR(params: {
  phone: string;
}): Promise<QRResult> {
  try {
    const phoneUri = `tel:${params.phone}`;
    const qrCode = await generateQRBase64(phoneUri);

    return {
      success: true,
      qrCode,
      message: `Phone call QR code generated for: ${params.phone}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate phone QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function handleGenerateSMSQR(params: {
  phone: string;
  message?: string;
}): Promise<QRResult> {
  try {
    let sms = `sms:${params.phone}`;
    if (params.message) {
      sms += `?body=${encodeURIComponent(params.message)}`;
    }

    const qrCode = await generateQRBase64(sms);

    return {
      success: true,
      qrCode,
      message: `SMS QR code generated for: ${params.phone}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate SMS QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function handleGenerateEmailQR(params: {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
}): Promise<QRResult> {
  try {
    let mailto = `mailto:${params.to}`;
    const queryParams: string[] = [];

    if (params.cc) queryParams.push(`cc=${encodeURIComponent(params.cc)}`);
    if (params.bcc) queryParams.push(`bcc=${encodeURIComponent(params.bcc)}`);
    if (params.subject) queryParams.push(`subject=${encodeURIComponent(params.subject)}`);
    if (params.body) queryParams.push(`body=${encodeURIComponent(params.body)}`);

    if (queryParams.length > 0) {
      mailto += `?${queryParams.join('&')}`;
    }

    const qrCode = await generateQRBase64(mailto);

    return {
      success: true,
      qrCode,
      message: `Email QR code generated for: ${params.to}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate email QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== SOCIAL MEDIA ====================

export async function handleGenerateSocialQR(params: {
  platform: string;
  username: string;
  message?: string;
}): Promise<QRResult> {
  try {
    let url: string;
    const username = params.username.replace('@', '');

    switch (params.platform.toLowerCase()) {
      case 'instagram':
        url = `https://instagram.com/${username}`;
        break;
      case 'twitter':
        url = `https://twitter.com/${username}`;
        break;
      case 'linkedin':
        url = `https://linkedin.com/in/${username}`;
        break;
      case 'facebook':
        url = `https://facebook.com/${username}`;
        break;
      case 'tiktok':
        url = `https://tiktok.com/@${username}`;
        break;
      case 'youtube':
        url = `https://youtube.com/@${username}`;
        break;
      case 'spotify':
        url = `https://open.spotify.com/user/${username}`;
        break;
      case 'telegram':
        url = `https://t.me/${username}`;
        break;
      case 'whatsapp':
        const phone = username.replace(/[^0-9]/g, '');
        url = params.message
          ? `https://wa.me/${phone}?text=${encodeURIComponent(params.message)}`
          : `https://wa.me/${phone}`;
        break;
      case 'snapchat':
        url = `https://snapchat.com/add/${username}`;
        break;
      case 'discord':
        url = `https://discord.gg/${username}`;
        break;
      case 'pinterest':
        url = `https://pinterest.com/${username}`;
        break;
      default:
        return {
          success: false,
          message: `Unsupported platform: ${params.platform}`,
        };
    }

    const qrCode = await generateQRBase64(url);

    return {
      success: true,
      qrCode,
      message: `${params.platform} QR code generated for: @${username}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate social QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function handleGenerateYouTubeQR(params: {
  url: string;
  type?: string;
}): Promise<QRResult> {
  try {
    const qrCode = await generateQRBase64(params.url);

    return {
      success: true,
      qrCode,
      message: `YouTube ${params.type || 'video'} QR code generated`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate YouTube QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== VIDEO CONFERENCING ====================

export async function handleGenerateZoomQR(params: {
  meetingId: string;
  password?: string;
}): Promise<QRResult> {
  try {
    const zoomId = params.meetingId.replace(/\s/g, '');
    let zoomUrl = `https://zoom.us/j/${zoomId}`;
    if (params.password) {
      zoomUrl += `?pwd=${encodeURIComponent(params.password)}`;
    }

    const qrCode = await generateQRBase64(zoomUrl);

    return {
      success: true,
      qrCode,
      message: `Zoom meeting QR code generated for ID: ${zoomId}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate Zoom QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function handleGenerateGoogleMeetQR(params: {
  meetingCode: string;
}): Promise<QRResult> {
  try {
    let meetUrl = params.meetingCode;

    // If not a full URL, construct it
    if (!meetUrl.startsWith('http')) {
      const code = meetUrl.replace(/[^a-zA-Z-]/g, '').toLowerCase();
      meetUrl = `https://meet.google.com/${code}`;
    }

    const qrCode = await generateQRBase64(meetUrl);

    return {
      success: true,
      qrCode,
      message: `Google Meet QR code generated`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate Google Meet QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function handleGenerateSkypeQR(params: {
  username: string;
  action?: string;
}): Promise<QRResult> {
  try {
    const action = params.action || 'chat';
    const skypeUri = `skype:${params.username}?${action}`;

    const qrCode = await generateQRBase64(skypeUri);

    return {
      success: true,
      qrCode,
      message: `Skype ${action} QR code generated for: ${params.username}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate Skype QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function handleGenerateFaceTimeQR(params: {
  contact: string;
  type?: string;
}): Promise<QRResult> {
  try {
    const ftType = params.type || 'video';
    const ftUri = ftType === 'audio' ? `facetime-audio:${params.contact}` : `facetime:${params.contact}`;

    const qrCode = await generateQRBase64(ftUri);

    return {
      success: true,
      qrCode,
      message: `FaceTime ${ftType} call QR code generated for: ${params.contact}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate FaceTime QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== PAYMENTS ====================

export async function handleGeneratePaymentQR(params: {
  method: string;
  address: string;
  amount?: string;
  currency?: string;
  note?: string;
  merchantName?: string;
}): Promise<QRResult> {
  try {
    let paymentString: string;

    switch (params.method.toLowerCase()) {
      case 'upi':
        paymentString = `upi://pay?pa=${encodeURIComponent(params.address)}`;
        if (params.merchantName) paymentString += `&pn=${encodeURIComponent(params.merchantName)}`;
        if (params.amount) paymentString += `&am=${params.amount}`;
        if (params.note) paymentString += `&tn=${encodeURIComponent(params.note)}`;
        paymentString += '&cu=INR';
        break;

      case 'bitcoin':
        paymentString = `bitcoin:${params.address}`;
        const btcParams: string[] = [];
        if (params.amount) btcParams.push(`amount=${params.amount}`);
        if (params.note) btcParams.push(`label=${encodeURIComponent(params.note)}`);
        if (btcParams.length > 0) paymentString += `?${btcParams.join('&')}`;
        break;

      case 'paypal':
        paymentString = `https://paypal.me/${encodeURIComponent(params.address)}`;
        if (params.amount) {
          paymentString += `/${params.amount}${params.currency || 'USD'}`;
        }
        break;

      default:
        return {
          success: false,
          message: `Unsupported payment method: ${params.method}`,
        };
    }

    const qrCode = await generateQRBase64(paymentString);

    return {
      success: true,
      qrCode,
      message: `${params.method.toUpperCase()} payment QR code generated`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate payment QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== BUSINESS ====================

export async function handleGenerateGoogleReviewQR(params: {
  placeId: string;
  businessName?: string;
}): Promise<QRResult> {
  try {
    const reviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(params.placeId)}`;

    const qrCode = await generateQRBase64(reviewUrl);

    return {
      success: true,
      qrCode,
      message: `Google Review QR code generated${params.businessName ? ` for: ${params.businessName}` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate Google Review QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function handleGenerateCouponQR(params: {
  code: string;
  discount: string;
  expiry?: string;
  terms?: string;
  minPurchase?: string;
}): Promise<QRResult> {
  try {
    let couponText = `COUPON: ${params.code}\n${params.discount}`;
    if (params.expiry) couponText += `\nValid till: ${params.expiry}`;
    if (params.minPurchase) couponText += `\nMin. Purchase: ${params.minPurchase}`;
    if (params.terms) couponText += `\n\nTerms: ${params.terms}`;

    const qrCode = await generateQRBase64(couponText);

    return {
      success: true,
      qrCode,
      message: `Coupon QR code generated: ${params.code} - ${params.discount}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate coupon QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function handleGenerateMenuQR(params: {
  url: string;
  restaurantName?: string;
}): Promise<QRResult> {
  try {
    let menuUrl = params.url;
    if (!menuUrl.startsWith('http')) {
      menuUrl = `https://${menuUrl}`;
    }

    const qrCode = await generateQRBase64(menuUrl);

    return {
      success: true,
      qrCode,
      message: `Menu QR code generated${params.restaurantName ? ` for: ${params.restaurantName}` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate menu QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== APPS ====================

export async function handleGenerateAppStoreQR(params: {
  iosUrl?: string;
  androidUrl?: string;
  huaweiUrl?: string;
  appName?: string;
}): Promise<QRResult> {
  try {
    // Prefer iOS URL, then Android, then Huawei
    const appUrl = params.iosUrl || params.androidUrl || params.huaweiUrl;

    if (!appUrl) {
      return {
        success: false,
        message: 'At least one app store URL is required',
      };
    }

    const qrCode = await generateQRBase64(appUrl);

    return {
      success: true,
      qrCode,
      message: `App Store QR code generated${params.appName ? ` for: ${params.appName}` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate App Store QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== CALENDAR & EVENTS ====================

export async function handleGenerateEventQR(params: {
  title: string;
  location?: string;
  startDate: string;
  endDate: string;
  description?: string;
  reminder?: number;
}): Promise<QRResult> {
  try {
    // Format dates for iCal
    const formatDate = (date: string) => {
      // Handle various date formats
      const d = new Date(date);
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('Z', '');
    };

    let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n';
    ical += `SUMMARY:${params.title}\n`;
    ical += `DTSTART:${formatDate(params.startDate)}\n`;
    ical += `DTEND:${formatDate(params.endDate)}\n`;
    if (params.location) ical += `LOCATION:${params.location}\n`;
    if (params.description) ical += `DESCRIPTION:${params.description}\n`;
    if (params.reminder) {
      ical += `BEGIN:VALARM\nTRIGGER:-PT${params.reminder}M\nACTION:DISPLAY\nDESCRIPTION:Reminder\nEND:VALARM\n`;
    }
    ical += 'END:VEVENT\nEND:VCALENDAR';

    const qrCode = await generateQRBase64(ical);

    return {
      success: true,
      qrCode,
      message: `Event QR code generated for: ${params.title}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate event QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== LOCATION ====================

export async function handleGenerateLocationQR(params: {
  latitude: number;
  longitude: number;
  label?: string;
  address?: string;
}): Promise<QRResult> {
  try {
    const geo = `geo:${params.latitude},${params.longitude}`;

    const qrCode = await generateQRBase64(geo);

    return {
      success: true,
      qrCode,
      message: `Location QR code generated for: ${params.label || `${params.latitude}, ${params.longitude}`}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate location QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== DOCUMENTS ====================

export async function handleGeneratePDFQR(params: {
  url: string;
  title?: string;
}): Promise<QRResult> {
  try {
    let pdfUrl = params.url;
    if (!pdfUrl.startsWith('http')) {
      pdfUrl = `https://${pdfUrl}`;
    }

    const qrCode = await generateQRBase64(pdfUrl);

    return {
      success: true,
      qrCode,
      message: `PDF QR code generated${params.title ? ` for: ${params.title}` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate PDF QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== BULK GENERATION ====================

export async function handleGenerateBulkQR(params: {
  items: Array<{ name: string; content: string }>;
  size?: number;
}): Promise<{ success: boolean; qrCodes?: Array<{ name: string; qrCode: string }>; message: string }> {
  try {
    if (params.items.length > 50) {
      return {
        success: false,
        message: 'Maximum 50 QR codes can be generated at once',
      };
    }

    const qrCodes = await Promise.all(
      params.items.map(async (item) => {
        const qrCode = await generateQRBase64(item.content, {
          width: params.size || 300,
        });
        return { name: item.name, qrCode };
      })
    );

    return {
      success: true,
      qrCodes,
      message: `${qrCodes.length} QR codes generated successfully`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate bulk QR codes: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ==================== DYNAMIC QR ====================

export async function handleGenerateDynamicQR(params: {
  url: string;
  title: string;
  trackLocation?: boolean;
  trackDevice?: boolean;
  trackTime?: boolean;
}): Promise<QRResult> {
  try {
    // For now, generate a static QR. In production, this would create a
    // redirect URL through your backend for tracking
    // Example: https://nexusqr.app/r/abc123 -> params.url

    // Generate a unique short code (in production, save to database)
    const shortCode = Math.random().toString(36).substring(2, 8);
    const trackingUrl = `https://nexusqr.app/r/${shortCode}`;

    // For demo, just use the original URL
    const qrCode = await generateQRBase64(params.url);

    return {
      success: true,
      qrCode,
      message: `Dynamic QR code generated for: ${params.title}. Note: For full tracking features, deploy with Nexus QR backend.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate dynamic QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
