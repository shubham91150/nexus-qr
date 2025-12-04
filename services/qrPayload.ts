import { QRContentData } from "../types";

export const generatePayload = (data: QRContentData): string => {
  switch (data.type) {
    case 'url':
    case 'text':
    case 'social':
      return data.value;

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