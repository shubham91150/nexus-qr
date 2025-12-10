import { QRContentData } from "../types";

export const generatePayload = (data: QRContentData): string => {
  switch (data.type) {
    case 'url':
    case 'text':
    case 'social':
    case 'ai':
      return data.value;

    case 'bulk':
      // For preview purposes, return the first item or a placeholder
      if (data.bulk && data.bulk.items.length > 0) {
        return data.bulk.items[0].value;
      }
      return "Bulk Generation Mode";

    case 'wifi':
      if (!data.wifi) return '';
      // WIFI:T:WPA;S:mynetwork;P:mypass;;
      const { ssid, pass, type, hidden } = data.wifi;
      return `WIFI:T:${type};S:${ssid};P:${pass};H:${hidden};;`;

    case 'contact':
      if (!data.contact) return '';
      const { fn, phone, email, org } = data.contact;
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${fn}\nTEL:${phone}\nEMAIL:${email}\nORG:${org}\nEND:VCARD`;

    case 'email':
      if (!data.email) return '';
      const { to, subject, body } = data.email;
      return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    case 'phone':
      return `tel:${data.value}`;

    case 'geo':
      if (!data.geo) return '';
      return `geo:${data.geo.lat},${data.geo.lng}`;
      
    case 'event':
      if (!data.event) return '';
      const { title, location, start, end } = data.event;
      // Basic iCal format
      return `BEGIN:VEVENT\nSUMMARY:${title}\nLOCATION:${location}\nDTSTART:${start.replace(/[-:]/g, '')}\nDTEND:${end.replace(/[-:]/g, '')}\nEND:VEVENT`;

    case 'sms':
      if (!data.sms) return '';
      const smsPhone = data.sms.phone || '';
      const smsMessage = data.sms.message || '';
      if (smsMessage) {
        return `sms:${smsPhone}?body=${encodeURIComponent(smsMessage)}`;
      }
      return `sms:${smsPhone}`;

    case 'appstore':
      if (!data.appstore) return '';
      // For static QR, use iOS URL as primary (most common), fallback to Android
      // Dynamic QR can handle device detection server-side
      return data.appstore.iosUrl || data.appstore.androidUrl || '';

    case 'whatsapp':
      if (!data.whatsapp) return '';
      const waPhone = data.whatsapp.phone?.replace(/[^0-9]/g, '') || '';
      const waMessage = data.whatsapp.message || '';
      if (waMessage) {
        return `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;
      }
      return `https://wa.me/${waPhone}`;

    case 'youtube':
      if (!data.youtube) return '';
      return data.youtube.url || '';

    case 'bitcoin':
      if (!data.bitcoin) return '';
      const btcAddress = data.bitcoin.address || '';
      const btcAmount = data.bitcoin.amount;
      const btcLabel = data.bitcoin.label;
      let btcUri = `bitcoin:${btcAddress}`;
      const btcParams: string[] = [];
      if (btcAmount) btcParams.push(`amount=${btcAmount}`);
      if (btcLabel) btcParams.push(`label=${encodeURIComponent(btcLabel)}`);
      if (btcParams.length > 0) btcUri += `?${btcParams.join('&')}`;
      return btcUri;

    case 'coupon':
      if (!data.coupon) return '';
      const couponCode = data.coupon.code || '';
      const couponDiscount = data.coupon.discount || '';
      const couponExpiry = data.coupon.expiry || '';
      const couponTerms = data.coupon.terms || '';
      let couponText = `COUPON: ${couponCode}\n${couponDiscount}`;
      if (couponExpiry) couponText += `\nValid till: ${couponExpiry}`;
      if (couponTerms) couponText += `\n${couponTerms}`;
      return couponText;

    case 'upi':
      if (!data.upi) return '';
      const upiVpa = data.upi.vpa || '';
      const upiName = data.upi.name || '';
      const upiAmount = data.upi.amount || '';
      const upiNote = data.upi.note || '';
      // UPI deep link format
      let upiUri = `upi://pay?pa=${encodeURIComponent(upiVpa)}`;
      if (upiName) upiUri += `&pn=${encodeURIComponent(upiName)}`;
      if (upiAmount) upiUri += `&am=${upiAmount}`;
      if (upiNote) upiUri += `&tn=${encodeURIComponent(upiNote)}`;
      upiUri += '&cu=INR';
      return upiUri;

    case 'paypal':
      if (!data.paypal) return '';
      const paypalEmail = data.paypal.email || '';
      const paypalAmount = data.paypal.amount || '';
      const paypalCurrency = data.paypal.currency || 'USD';
      // PayPal.me link format
      let paypalUrl = `https://paypal.me/${encodeURIComponent(paypalEmail)}`;
      if (paypalAmount) paypalUrl += `/${paypalAmount}${paypalCurrency}`;
      return paypalUrl;

    case 'telegram':
      if (!data.telegram) return '';
      const tgUsername = data.telegram.username?.replace('@', '') || '';
      const tgType = data.telegram.type || 'user';
      // Telegram deep link
      if (tgType === 'group' || tgType === 'channel') {
        return `https://t.me/${tgUsername}`;
      }
      return `https://t.me/${tgUsername}`;

    case 'spotify':
      if (!data.spotify) return '';
      // Return the Spotify URL directly
      return data.spotify.url || '';

    case 'instagram':
      if (!data.instagram) return '';
      const igUsername = data.instagram.username?.replace('@', '') || '';
      return `https://instagram.com/${igUsername}`;

    case 'twitter':
      if (!data.twitter) return '';
      const twUsername = data.twitter.username?.replace('@', '') || '';
      return `https://twitter.com/${twUsername}`;

    case 'linkedin':
      if (!data.linkedin) return '';
      const liUsername = data.linkedin.username || '';
      const liType = data.linkedin.type || 'profile';
      if (liType === 'company') {
        return `https://linkedin.com/company/${liUsername}`;
      }
      // Handle both "in/username" and just "username" formats
      if (liUsername.startsWith('in/')) {
        return `https://linkedin.com/${liUsername}`;
      }
      return `https://linkedin.com/in/${liUsername}`;

    case 'zoom':
      if (!data.zoom) return '';
      const zoomId = data.zoom.meetingId?.replace(/\s/g, '') || '';
      const zoomPwd = data.zoom.password || '';
      // Zoom join link format
      let zoomUrl = `https://zoom.us/j/${zoomId}`;
      if (zoomPwd) zoomUrl += `?pwd=${encodeURIComponent(zoomPwd)}`;
      return zoomUrl;

    default:
      return data.value;
  }
};

export const encryptPayload = (payload: string, key: string, method: 'AES' | 'TripleDES'): string => {
  if (!window.CryptoJS || !key) return payload;
  
  try {
    if (method === 'AES') {
      return window.CryptoJS.AES.encrypt(payload, key).toString();
    } else {
      return window.CryptoJS.TripleDES.encrypt(payload, key).toString();
    }
  } catch (e) {
    console.error("Encryption failed", e);
    return payload;
  }
};