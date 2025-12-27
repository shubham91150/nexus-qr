import { QRContentData } from '../types';

// Validation patterns
const patterns = {
  url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?(\?[^\s]*)?$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]{6,20}$/,
  youtubeUrl: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i,
  spotifyUrl: /^(https?:\/\/)?(open\.)?spotify\.com\/.+$/i,
  upiId: /^[\w\.\-]+@[\w]+$/,
  bitcoinAddress: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
};

// Validate content based on type
export function validateContent(contentData: QRContentData): { isValid: boolean; error: string | null } {
  const { type, value } = contentData;

  switch (type) {
    case 'url':
      if (!value || value.trim() === '') {
        return { isValid: false, error: null }; // Empty is ok, just don't show QR
      }
      if (!patterns.url.test(value)) {
        return { isValid: false, error: 'Please enter a valid URL' };
      }
      return { isValid: true, error: null };

    case 'text':
      // Text type accepts anything
      return { isValid: true, error: null };

    case 'wifi':
      // WiFi needs at least SSID
      if (!contentData.wifi?.ssid || contentData.wifi.ssid.trim() === '') {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'contact':
      // Contact needs at least first name or last name
      if (!contentData.contact?.firstName && !contentData.contact?.lastName) {
        return { isValid: false, error: null };
      }
      // Validate emails if provided
      if (contentData.contact?.email && !patterns.email.test(contentData.contact.email)) {
        return { isValid: false, error: 'Please enter a valid email address' };
      }
      if (contentData.contact?.workEmail && !patterns.email.test(contentData.contact.workEmail)) {
        return { isValid: false, error: 'Please enter a valid work email address' };
      }
      // Validate phones if provided
      if (contentData.contact?.mobile && !patterns.phone.test(contentData.contact.mobile)) {
        return { isValid: false, error: 'Please enter a valid mobile number' };
      }
      if (contentData.contact?.phone && !patterns.phone.test(contentData.contact.phone)) {
        return { isValid: false, error: 'Please enter a valid phone number' };
      }
      // Validate website if provided
      if (contentData.contact?.website && !patterns.url.test(contentData.contact.website)) {
        return { isValid: false, error: 'Please enter a valid website URL' };
      }
      return { isValid: true, error: null };

    case 'sms':
      if (!contentData.sms?.phone || contentData.sms.phone.trim() === '') {
        return { isValid: false, error: null };
      }
      if (!patterns.phone.test(contentData.sms.phone)) {
        return { isValid: false, error: 'Please enter a valid phone number' };
      }
      return { isValid: true, error: null };

    case 'whatsapp':
      if (!contentData.whatsapp?.phone || contentData.whatsapp.phone.trim() === '') {
        return { isValid: false, error: null };
      }
      if (!patterns.phone.test(contentData.whatsapp.phone)) {
        return { isValid: false, error: 'Please enter a valid phone number' };
      }
      return { isValid: true, error: null };

    case 'youtube':
      if (!contentData.youtube?.url || contentData.youtube.url.trim() === '') {
        return { isValid: false, error: null };
      }
      if (!patterns.youtubeUrl.test(contentData.youtube.url)) {
        return { isValid: false, error: 'Please enter a valid YouTube URL' };
      }
      return { isValid: true, error: null };

    case 'spotify':
      if (!contentData.spotify?.url || contentData.spotify.url.trim() === '') {
        return { isValid: false, error: null };
      }
      if (!patterns.spotifyUrl.test(contentData.spotify.url)) {
        return { isValid: false, error: 'Please enter a valid Spotify URL' };
      }
      return { isValid: true, error: null };

    case 'bitcoin':
      if (!contentData.bitcoin?.address || contentData.bitcoin.address.trim() === '') {
        return { isValid: false, error: null };
      }
      if (!patterns.bitcoinAddress.test(contentData.bitcoin.address)) {
        return { isValid: false, error: 'Please enter a valid Bitcoin address' };
      }
      return { isValid: true, error: null };

    case 'upi':
      if (!contentData.upi?.vpa || contentData.upi.vpa.trim() === '') {
        return { isValid: false, error: null };
      }
      if (!patterns.upiId.test(contentData.upi.vpa)) {
        return { isValid: false, error: 'Please enter a valid UPI ID' };
      }
      return { isValid: true, error: null };

    case 'geo':
      if (!contentData.geo?.lat && !contentData.geo?.lng) {
        return { isValid: false, error: null };
      }
      if (contentData.geo?.lat) {
        const lat = parseFloat(contentData.geo.lat);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          return { isValid: false, error: 'Latitude must be between -90 and 90' };
        }
      }
      if (contentData.geo?.lng) {
        const lng = parseFloat(contentData.geo.lng);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          return { isValid: false, error: 'Longitude must be between -180 and 180' };
        }
      }
      return { isValid: true, error: null };

    case 'appstore':
      // At least one URL should be provided
      if (!contentData.appstore?.iosUrl && !contentData.appstore?.androidUrl) {
        return { isValid: false, error: null };
      }
      if (contentData.appstore?.iosUrl && !patterns.url.test(contentData.appstore.iosUrl)) {
        return { isValid: false, error: 'Please enter a valid iOS App Store URL' };
      }
      if (contentData.appstore?.androidUrl && !patterns.url.test(contentData.appstore.androidUrl)) {
        return { isValid: false, error: 'Please enter a valid Google Play Store URL' };
      }
      if (contentData.appstore?.huaweiUrl && !patterns.url.test(contentData.appstore.huaweiUrl)) {
        return { isValid: false, error: 'Please enter a valid Huawei AppGallery URL' };
      }
      return { isValid: true, error: null };

    case 'pdf':
      if (!contentData.pdf?.url || contentData.pdf.url.trim() === '') {
        return { isValid: false, error: null };
      }
      if (!patterns.url.test(contentData.pdf.url)) {
        return { isValid: false, error: 'Please enter a valid PDF URL' };
      }
      return { isValid: true, error: null };

    case 'menu':
      if (!contentData.menu?.url || contentData.menu.url.trim() === '') {
        return { isValid: false, error: null };
      }
      if (!patterns.url.test(contentData.menu.url)) {
        return { isValid: false, error: 'Please enter a valid menu URL' };
      }
      return { isValid: true, error: null };

    // Types that don't need validation or just need non-empty values
    case 'event':
      if (!contentData.event?.title) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'coupon':
      if (!contentData.coupon?.code) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'paypal':
      if (!contentData.paypal?.email) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'telegram':
      if (!contentData.telegram?.username) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'instagram':
      if (!contentData.instagram?.username) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'twitter':
      if (!contentData.twitter?.username) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'linkedin':
      if (!contentData.linkedin?.username) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'facebook':
      if (!contentData.facebook?.username) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'tiktok':
      if (!contentData.tiktok?.username) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'pinterest':
      if (!contentData.pinterest?.username) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'snapchat':
      if (!contentData.snapchat?.username) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'discord':
      if (!contentData.discord?.inviteCode) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'skype':
      if (!contentData.skype?.username) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'facetime':
      if (!contentData.facetime?.contact) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'zoom':
      if (!contentData.zoom?.meetingId) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'googlemeet':
      if (!contentData.googlemeet?.meetingCode) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'googlereview':
      if (!contentData.googlereview?.placeId) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'audio':
      if (!contentData.audio?.url) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'video':
      if (!contentData.video?.url) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'images':
      if (!contentData.images?.urls || contentData.images.urls.length === 0) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    case 'document':
      if (!contentData.document?.url) {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };

    default:
      // For any other type, check if value is provided
      if (!value || value.trim() === '') {
        return { isValid: false, error: null };
      }
      return { isValid: true, error: null };
  }
}
