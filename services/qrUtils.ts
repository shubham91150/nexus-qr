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