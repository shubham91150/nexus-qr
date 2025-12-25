/**
 * Nexus QR - QR Code Generation Handlers
 *
 * This module contains the actual QR code generation logic for each tool.
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

// Tool handlers
export async function handleGenerateQRCode(params: {
  content: string;
  type?: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}): Promise<{ success: boolean; qrCode?: string; message: string }> {
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

export async function handleGenerateWiFiQR(params: {
  ssid: string;
  password: string;
  security?: string;
  hidden?: boolean;
}): Promise<{ success: boolean; qrCode?: string; message: string }> {
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

export async function handleGenerateContactQR(params: {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  website?: string;
}): Promise<{ success: boolean; qrCode?: string; message: string }> {
  try {
    let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';

    const fullName = [params.firstName, params.lastName].filter(Boolean).join(' ');
    vcard += `N:${params.lastName || ''};${params.firstName};;;\n`;
    vcard += `FN:${fullName}\n`;

    if (params.company) vcard += `ORG:${params.company}\n`;
    if (params.title) vcard += `TITLE:${params.title}\n`;
    if (params.phone) vcard += `TEL;TYPE=CELL:${params.phone}\n`;
    if (params.email) vcard += `EMAIL:${params.email}\n`;
    if (params.website) vcard += `URL:${params.website}\n`;

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

export async function handleGenerateSocialQR(params: {
  platform: string;
  username: string;
  message?: string;
}): Promise<{ success: boolean; qrCode?: string; message: string }> {
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

    const qrCode = await generateQRBase64(url, {
      errorCorrectionLevel: 'M',
    });

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

export async function handleGeneratePaymentQR(params: {
  method: string;
  address: string;
  amount?: string;
  currency?: string;
  note?: string;
}): Promise<{ success: boolean; qrCode?: string; message: string }> {
  try {
    let paymentString: string;

    switch (params.method.toLowerCase()) {
      case 'upi':
        paymentString = `upi://pay?pa=${encodeURIComponent(params.address)}`;
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

    const qrCode = await generateQRBase64(paymentString, {
      errorCorrectionLevel: 'M',
    });

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

export async function handleGenerateEmailQR(params: {
  to: string;
  subject?: string;
  body?: string;
}): Promise<{ success: boolean; qrCode?: string; message: string }> {
  try {
    let mailto = `mailto:${params.to}`;
    const queryParams: string[] = [];

    if (params.subject) queryParams.push(`subject=${encodeURIComponent(params.subject)}`);
    if (params.body) queryParams.push(`body=${encodeURIComponent(params.body)}`);

    if (queryParams.length > 0) {
      mailto += `?${queryParams.join('&')}`;
    }

    const qrCode = await generateQRBase64(mailto, {
      errorCorrectionLevel: 'M',
    });

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

export async function handleGenerateSMSQR(params: {
  phone: string;
  message?: string;
}): Promise<{ success: boolean; qrCode?: string; message: string }> {
  try {
    let sms = `sms:${params.phone}`;
    if (params.message) {
      sms += `?body=${encodeURIComponent(params.message)}`;
    }

    const qrCode = await generateQRBase64(sms, {
      errorCorrectionLevel: 'M',
    });

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

export async function handleGenerateEventQR(params: {
  title: string;
  location?: string;
  startDate: string;
  endDate: string;
  description?: string;
}): Promise<{ success: boolean; qrCode?: string; message: string }> {
  try {
    // Format dates for iCal (remove dashes and colons)
    const formatDate = (date: string) => date.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n';
    ical += `SUMMARY:${params.title}\n`;
    ical += `DTSTART:${formatDate(params.startDate)}\n`;
    ical += `DTEND:${formatDate(params.endDate)}\n`;
    if (params.location) ical += `LOCATION:${params.location}\n`;
    if (params.description) ical += `DESCRIPTION:${params.description}\n`;
    ical += 'END:VEVENT\nEND:VCALENDAR';

    const qrCode = await generateQRBase64(ical, {
      errorCorrectionLevel: 'M',
    });

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

export async function handleGenerateLocationQR(params: {
  latitude: number;
  longitude: number;
  label?: string;
}): Promise<{ success: boolean; qrCode?: string; message: string }> {
  try {
    const geo = `geo:${params.latitude},${params.longitude}`;

    const qrCode = await generateQRBase64(geo, {
      errorCorrectionLevel: 'M',
    });

    return {
      success: true,
      qrCode,
      message: `Location QR code generated for coordinates: ${params.latitude}, ${params.longitude}${params.label ? ` (${params.label})` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate location QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
