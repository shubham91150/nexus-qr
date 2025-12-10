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

    case 'facebook':
      if (!data.facebook) return '';
      // Sanitize username - allow alphanumeric, dots, and hyphens only
      const fbUsername = (data.facebook.username || '').replace(/[^a-zA-Z0-9.-]/g, '');
      const fbType = data.facebook.type || 'profile';
      if (!fbUsername) return '';
      if (fbType === 'page') {
        return `https://facebook.com/${fbUsername}`;
      } else if (fbType === 'group') {
        return `https://facebook.com/groups/${fbUsername}`;
      }
      return `https://facebook.com/${fbUsername}`;

    case 'tiktok':
      if (!data.tiktok) return '';
      // Sanitize username - allow alphanumeric, underscores, and dots only
      const ttUsername = (data.tiktok.username || '').replace('@', '').replace(/[^a-zA-Z0-9_.]/g, '');
      if (!ttUsername) return '';
      return `https://tiktok.com/@${ttUsername}`;

    case 'pinterest':
      if (!data.pinterest) return '';
      // Sanitize username - allow alphanumeric and underscores only
      const pinUsername = (data.pinterest.username || '').replace(/[^a-zA-Z0-9_]/g, '');
      const pinBoard = (data.pinterest.board || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!pinUsername) return '';
      if (pinBoard) {
        return `https://pinterest.com/${pinUsername}/${pinBoard}`;
      }
      return `https://pinterest.com/${pinUsername}`;

    case 'snapchat':
      if (!data.snapchat) return '';
      // Sanitize username - allow alphanumeric, underscores, hyphens, and dots only
      const snapUsername = (data.snapchat.username || '').replace(/[^a-zA-Z0-9_.-]/g, '');
      if (!snapUsername) return '';
      return `https://snapchat.com/add/${snapUsername}`;

    case 'discord':
      if (!data.discord) return '';
      const discordCode = data.discord.inviteCode?.trim() || '';
      // Validate full URLs - must start with official Discord domains
      if (discordCode.startsWith('https://discord.gg/') ||
          discordCode.startsWith('https://discord.com/invite/') ||
          discordCode.startsWith('http://discord.gg/') ||
          discordCode.startsWith('http://discord.com/invite/')) {
        return discordCode;
      }
      // Extract invite code from URL if pasted incorrectly
      const discordMatch = discordCode.match(/(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9-]+)/);
      if (discordMatch) {
        return `https://discord.gg/${discordMatch[1]}`;
      }
      // Treat as invite code - sanitize to alphanumeric and hyphens only
      const sanitizedDiscordCode = discordCode.replace(/[^a-zA-Z0-9-]/g, '');
      return `https://discord.gg/${sanitizedDiscordCode}`;

    case 'skype':
      if (!data.skype) return '';
      // Sanitize username - allow alphanumeric, underscores, dots, and hyphens only
      const skypeUser = (data.skype.username || '').replace(/[^a-zA-Z0-9_.-]/g, '');
      if (!skypeUser) return '';
      const skypeType = data.skype.type || 'chat';
      // Skype URI scheme
      if (skypeType === 'call') {
        return `skype:${skypeUser}?call`;
      }
      return `skype:${skypeUser}?chat`;

    case 'facetime':
      if (!data.facetime) return '';
      const ftContact = data.facetime.contact || '';
      const ftType = data.facetime.type || 'video';
      // FaceTime URI scheme
      if (ftType === 'audio') {
        return `facetime-audio:${ftContact}`;
      }
      return `facetime:${ftContact}`;

    case 'googlemeet':
      if (!data.googlemeet) return '';
      const meetCode = data.googlemeet.meetingCode?.trim() || '';
      // Validate full URLs - must start with official Google Meet domain
      if (meetCode.startsWith('https://meet.google.com/') ||
          meetCode.startsWith('http://meet.google.com/')) {
        return meetCode;
      }
      // Extract meeting code from URL if pasted incorrectly
      const meetMatch = meetCode.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
      if (meetMatch) {
        return `https://meet.google.com/${meetMatch[1]}`;
      }
      // Treat as meeting code - sanitize to valid format (xxx-xxxx-xxx)
      const sanitizedMeetCode = meetCode.replace(/[^a-zA-Z-]/g, '').toLowerCase();
      return `https://meet.google.com/${sanitizedMeetCode}`;

    case 'googlereview':
      if (!data.googlereview) return '';
      // Sanitize place ID - Google Place IDs contain alphanumeric chars, underscores, and hyphens
      const placeId = (data.googlereview.placeId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!placeId) return '';
      // Google Review URL format - encode the place ID for safety
      return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

    case 'pdf':
      if (!data.pdf) return '';
      const pdfUrl = data.pdf.url?.trim() || '';
      // Validate URL starts with http/https
      if (pdfUrl.startsWith('https://') || pdfUrl.startsWith('http://')) {
        return pdfUrl;
      }
      // Prepend https if no protocol
      return pdfUrl ? `https://${pdfUrl}` : '';

    case 'menu':
      if (!data.menu) return '';
      const menuUrl = data.menu.url?.trim() || '';
      // Validate URL starts with http/https
      if (menuUrl.startsWith('https://') || menuUrl.startsWith('http://')) {
        return menuUrl;
      }
      // Prepend https if no protocol
      return menuUrl ? `https://${menuUrl}` : '';

    // Media file types - return direct URLs
    case 'audio':
      if (!data.audio) return '';
      const audioUrl = data.audio.url?.trim() || '';
      if (audioUrl.startsWith('https://') || audioUrl.startsWith('http://')) {
        return audioUrl;
      }
      return audioUrl ? `https://${audioUrl}` : '';

    case 'video':
      if (!data.video) return '';
      const videoUrl = data.video.url?.trim() || '';
      if (videoUrl.startsWith('https://') || videoUrl.startsWith('http://')) {
        return videoUrl;
      }
      return videoUrl ? `https://${videoUrl}` : '';

    case 'images':
      if (!data.images || !data.images.urls || data.images.urls.length === 0) return '';
      // For image gallery, return the first image URL (or create a gallery page URL)
      const firstImageUrl = data.images.urls[0]?.trim() || '';
      if (firstImageUrl.startsWith('https://') || firstImageUrl.startsWith('http://')) {
        return firstImageUrl;
      }
      return firstImageUrl ? `https://${firstImageUrl}` : '';

    case 'document':
      if (!data.document) return '';
      const docUrl = data.document.url?.trim() || '';
      if (docUrl.startsWith('https://') || docUrl.startsWith('http://')) {
        return docUrl;
      }
      return docUrl ? `https://${docUrl}` : '';

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