/**
 * Nexus QR - MCP Tools for ChatGPT Apps SDK
 *
 * These tools define ALL capabilities that ChatGPT can use to generate QR codes.
 * Each tool maps to a specific QR code generation function.
 */

import { z } from 'zod';

// Tool schemas for validation
export const GenerateQRCodeSchema = z.object({
  content: z.string().describe('The content to encode in the QR code (URL, text, etc.)'),
  type: z.enum([
    'url', 'text', 'wifi', 'contact', 'email', 'phone', 'sms',
    'whatsapp', 'instagram', 'twitter', 'linkedin', 'youtube',
    'spotify', 'telegram', 'bitcoin', 'upi', 'paypal'
  ]).default('text').describe('Type of QR code content'),
  style: z.object({
    size: z.number().min(100).max(2000).default(400).describe('Size of QR code in pixels'),
    color: z.string().default('#000000').describe('Foreground color (hex)'),
    backgroundColor: z.string().default('#ffffff').describe('Background color (hex)'),
    errorCorrection: z.enum(['L', 'M', 'Q', 'H']).default('M').describe('Error correction level'),
  }).optional().describe('QR code styling options'),
});

// Tool definitions for MCP - ALL FEATURES
export const tools = [
  // ==================== BASIC QR CODES ====================
  {
    name: 'generate_qr_code',
    description: 'Generate a QR code for any URL, text, or other content. Use this for simple QR codes with URLs, plain text, or when the user asks for a basic QR code.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to encode in the QR code (URL, text, etc.)',
        },
        type: {
          type: 'string',
          enum: ['url', 'text'],
          default: 'text',
          description: 'Type of QR code content',
        },
        size: {
          type: 'number',
          default: 400,
          description: 'Size of QR code in pixels (100-2000)',
        },
        color: {
          type: 'string',
          default: '#000000',
          description: 'Foreground color in hex format',
        },
        backgroundColor: {
          type: 'string',
          default: '#ffffff',
          description: 'Background color in hex format',
        },
      },
      required: ['content'],
    },
  },

  // ==================== CONNECTIVITY ====================
  {
    name: 'generate_wifi_qr',
    description: 'Generate a QR code for WiFi network. When scanned, it will automatically connect the device to the WiFi network. Perfect for homes, offices, cafes, hotels.',
    inputSchema: {
      type: 'object',
      properties: {
        ssid: { type: 'string', description: 'WiFi network name (SSID)' },
        password: { type: 'string', description: 'WiFi password' },
        security: { type: 'string', enum: ['WPA', 'WPA2', 'WPA3', 'WEP', 'nopass'], default: 'WPA', description: 'Security type' },
        hidden: { type: 'boolean', default: false, description: 'Is the network hidden?' },
      },
      required: ['ssid', 'password'],
    },
  },

  // ==================== CONTACT & COMMUNICATION ====================
  {
    name: 'generate_contact_qr',
    description: 'Generate a vCard QR code for contact information. When scanned, it will allow saving the contact directly to the phone. Great for business cards.',
    inputSchema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', description: 'First name' },
        lastName: { type: 'string', description: 'Last name' },
        phone: { type: 'string', description: 'Mobile phone number' },
        workPhone: { type: 'string', description: 'Work phone number' },
        fax: { type: 'string', description: 'Fax number' },
        email: { type: 'string', description: 'Personal email address' },
        workEmail: { type: 'string', description: 'Work email address' },
        company: { type: 'string', description: 'Company/Organization name' },
        title: { type: 'string', description: 'Job title' },
        website: { type: 'string', description: 'Website URL' },
        street: { type: 'string', description: 'Street address' },
        city: { type: 'string', description: 'City' },
        state: { type: 'string', description: 'State/Province' },
        zip: { type: 'string', description: 'ZIP/Postal code' },
        country: { type: 'string', description: 'Country' },
      },
      required: ['firstName'],
    },
  },
  {
    name: 'generate_phone_qr',
    description: 'Generate a QR code for phone call. When scanned, it will initiate a phone call to the specified number.',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Phone number to call (with country code)' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'generate_sms_qr',
    description: 'Generate a QR code that opens SMS composer with pre-filled phone number and message.',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Phone number' },
        message: { type: 'string', description: 'Pre-filled message text' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'generate_email_qr',
    description: 'Generate a QR code that opens email composer with pre-filled recipient, subject, and body.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        cc: { type: 'string', description: 'CC email addresses (comma separated)' },
        bcc: { type: 'string', description: 'BCC email addresses (comma separated)' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body text' },
      },
      required: ['to'],
    },
  },

  // ==================== SOCIAL MEDIA ====================
  {
    name: 'generate_social_qr',
    description: 'Generate a QR code for social media profiles. Supports Instagram, Twitter/X, LinkedIn, Facebook, TikTok, YouTube, Spotify, Telegram, WhatsApp, Snapchat, Discord, and Pinterest.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'youtube', 'spotify', 'telegram', 'whatsapp', 'snapchat', 'discord', 'pinterest'],
          description: 'Social media platform',
        },
        username: { type: 'string', description: 'Username or profile identifier (without @)' },
        message: { type: 'string', description: 'Pre-filled message (only for WhatsApp)' },
      },
      required: ['platform', 'username'],
    },
  },
  {
    name: 'generate_youtube_qr',
    description: 'Generate a QR code for YouTube content - video, channel, or playlist.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'YouTube URL (video, channel, or playlist)' },
        type: { type: 'string', enum: ['video', 'channel', 'playlist'], default: 'video', description: 'Type of YouTube content' },
      },
      required: ['url'],
    },
  },

  // ==================== VIDEO CONFERENCING ====================
  {
    name: 'generate_zoom_qr',
    description: 'Generate a QR code for Zoom meeting. When scanned, it will open the Zoom meeting.',
    inputSchema: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'Zoom meeting ID' },
        password: { type: 'string', description: 'Meeting password (optional)' },
      },
      required: ['meetingId'],
    },
  },
  {
    name: 'generate_googlemeet_qr',
    description: 'Generate a QR code for Google Meet. When scanned, it will open the Google Meet session.',
    inputSchema: {
      type: 'object',
      properties: {
        meetingCode: { type: 'string', description: 'Google Meet meeting code or full URL (e.g., abc-defg-hij)' },
      },
      required: ['meetingCode'],
    },
  },
  {
    name: 'generate_skype_qr',
    description: 'Generate a QR code for Skype chat or call.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Skype username' },
        action: { type: 'string', enum: ['chat', 'call'], default: 'chat', description: 'Action to perform' },
      },
      required: ['username'],
    },
  },
  {
    name: 'generate_facetime_qr',
    description: 'Generate a QR code for FaceTime video or audio call (Apple devices only).',
    inputSchema: {
      type: 'object',
      properties: {
        contact: { type: 'string', description: 'Phone number or Apple ID email' },
        type: { type: 'string', enum: ['video', 'audio'], default: 'video', description: 'FaceTime call type' },
      },
      required: ['contact'],
    },
  },

  // ==================== PAYMENTS ====================
  {
    name: 'generate_payment_qr',
    description: 'Generate a QR code for payments. Supports UPI (India), Bitcoin, and PayPal.',
    inputSchema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['upi', 'bitcoin', 'paypal'], description: 'Payment method' },
        address: { type: 'string', description: 'Payment address (UPI ID, Bitcoin address, or PayPal email/username)' },
        amount: { type: 'string', description: 'Payment amount (optional)' },
        currency: { type: 'string', description: 'Currency code like USD, INR, EUR (optional)' },
        note: { type: 'string', description: 'Payment note or description (optional)' },
        merchantName: { type: 'string', description: 'Merchant/Recipient name (optional)' },
      },
      required: ['method', 'address'],
    },
  },

  // ==================== BUSINESS ====================
  {
    name: 'generate_googlereview_qr',
    description: 'Generate a QR code for Google Reviews. When scanned, it will open the Google review page for a business.',
    inputSchema: {
      type: 'object',
      properties: {
        placeId: { type: 'string', description: 'Google Place ID of the business' },
        businessName: { type: 'string', description: 'Business name (for reference)' },
      },
      required: ['placeId'],
    },
  },
  {
    name: 'generate_coupon_qr',
    description: 'Generate a QR code for discount coupon or promotional offer.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Coupon/Discount code' },
        discount: { type: 'string', description: 'Discount description (e.g., "20% OFF", "$10 OFF")' },
        expiry: { type: 'string', description: 'Expiry date (optional)' },
        terms: { type: 'string', description: 'Terms and conditions (optional)' },
        minPurchase: { type: 'string', description: 'Minimum purchase amount (optional)' },
      },
      required: ['code', 'discount'],
    },
  },
  {
    name: 'generate_menu_qr',
    description: 'Generate a QR code for restaurant/cafe menu. Links to digital menu URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL of the digital menu' },
        restaurantName: { type: 'string', description: 'Restaurant/Cafe name (optional)' },
      },
      required: ['url'],
    },
  },

  // ==================== APPS ====================
  {
    name: 'generate_appstore_qr',
    description: 'Generate a QR code for mobile app download. Supports iOS App Store, Google Play Store, and Huawei AppGallery.',
    inputSchema: {
      type: 'object',
      properties: {
        iosUrl: { type: 'string', description: 'iOS App Store URL' },
        androidUrl: { type: 'string', description: 'Google Play Store URL' },
        huaweiUrl: { type: 'string', description: 'Huawei AppGallery URL (optional)' },
        appName: { type: 'string', description: 'App name (for reference)' },
      },
      required: [],
    },
  },

  // ==================== CALENDAR & EVENTS ====================
  {
    name: 'generate_event_qr',
    description: 'Generate a QR code for calendar event. When scanned, it will add the event to the calendar app.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        location: { type: 'string', description: 'Event location/venue' },
        startDate: { type: 'string', description: 'Start date and time (ISO format: 2024-12-25T10:00:00 or YYYY-MM-DD HH:MM)' },
        endDate: { type: 'string', description: 'End date and time (ISO format: 2024-12-25T11:00:00 or YYYY-MM-DD HH:MM)' },
        description: { type: 'string', description: 'Event description' },
        reminder: { type: 'number', description: 'Reminder in minutes before event (optional)' },
      },
      required: ['title', 'startDate', 'endDate'],
    },
  },

  // ==================== LOCATION ====================
  {
    name: 'generate_location_qr',
    description: 'Generate a QR code for a geographic location. When scanned, it will open the location in maps app.',
    inputSchema: {
      type: 'object',
      properties: {
        latitude: { type: 'number', description: 'Latitude coordinate' },
        longitude: { type: 'number', description: 'Longitude coordinate' },
        label: { type: 'string', description: 'Location name/label' },
        address: { type: 'string', description: 'Full address (alternative to coordinates)' },
      },
      required: ['latitude', 'longitude'],
    },
  },

  // ==================== DOCUMENTS & FILES ====================
  {
    name: 'generate_pdf_qr',
    description: 'Generate a QR code that links to a PDF document.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL of the PDF document' },
        title: { type: 'string', description: 'Document title (optional)' },
      },
      required: ['url'],
    },
  },

  // ==================== BULK GENERATION ====================
  {
    name: 'generate_bulk_qr',
    description: 'Generate multiple QR codes at once. Useful for batch generation of QR codes for inventory, products, or multiple URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Identifier/filename for this QR' },
              content: { type: 'string', description: 'Content to encode' },
            },
            required: ['name', 'content'],
          },
          description: 'List of items to generate QR codes for (max 50)',
        },
        size: { type: 'number', default: 300, description: 'Size of each QR code in pixels' },
      },
      required: ['items'],
    },
  },

  // ==================== DYNAMIC QR (TRACKABLE) ====================
  {
    name: 'generate_dynamic_qr',
    description: 'Generate a dynamic/trackable QR code that is saved to the database. The destination URL can be changed later without reprinting. Includes scan analytics. Requires user_id (API key) for authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Destination URL' },
        title: { type: 'string', description: 'QR code title/name for identification' },
        user_id: { type: 'string', description: 'User ID or API key for authentication. Required to save to database.' },
        custom_alias: { type: 'string', description: 'Custom short URL alias (optional, 3-30 chars, letters, numbers, hyphens)' },
      },
      required: ['url', 'title', 'user_id'],
    },
  },
  {
    name: 'update_dynamic_qr',
    description: 'Update the destination URL of an existing dynamic QR code. The QR code image stays the same, but it will redirect to the new URL.',
    inputSchema: {
      type: 'object',
      properties: {
        short_code: { type: 'string', description: 'The short code of the dynamic QR (e.g., "abc123" from nexusqr.app/r/abc123)' },
        new_url: { type: 'string', description: 'New destination URL' },
        user_id: { type: 'string', description: 'User ID or API key for authentication' },
      },
      required: ['short_code', 'new_url', 'user_id'],
    },
  },
  {
    name: 'get_dynamic_qr_analytics',
    description: 'Get scan analytics for a dynamic QR code including total scans, device types, countries, browsers, and recent scan history.',
    inputSchema: {
      type: 'object',
      properties: {
        short_code: { type: 'string', description: 'The short code of the dynamic QR' },
        user_id: { type: 'string', description: 'User ID or API key for authentication' },
      },
      required: ['short_code', 'user_id'],
    },
  },
  {
    name: 'list_dynamic_qrs',
    description: 'List all dynamic QR codes created by the user. Shows title, short URL, destination, scan count, and status.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'User ID or API key for authentication' },
        limit: { type: 'number', default: 20, description: 'Maximum number of QR codes to return (default 20, max 50)' },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'delete_dynamic_qr',
    description: 'Delete a dynamic QR code permanently. The short URL will no longer work after deletion.',
    inputSchema: {
      type: 'object',
      properties: {
        short_code: { type: 'string', description: 'The short code of the dynamic QR to delete' },
        user_id: { type: 'string', description: 'User ID or API key for authentication' },
      },
      required: ['short_code', 'user_id'],
    },
  },
  {
    name: 'toggle_dynamic_qr',
    description: 'Activate or deactivate a dynamic QR code. Deactivated QR codes will not redirect when scanned.',
    inputSchema: {
      type: 'object',
      properties: {
        short_code: { type: 'string', description: 'The short code of the dynamic QR' },
        is_active: { type: 'boolean', description: 'Set to true to activate, false to deactivate' },
        user_id: { type: 'string', description: 'User ID or API key for authentication' },
      },
      required: ['short_code', 'is_active', 'user_id'],
    },
  },
];

// Type for tool names
export type ToolName =
  | 'generate_qr_code'
  | 'generate_wifi_qr'
  | 'generate_contact_qr'
  | 'generate_phone_qr'
  | 'generate_sms_qr'
  | 'generate_email_qr'
  | 'generate_social_qr'
  | 'generate_youtube_qr'
  | 'generate_zoom_qr'
  | 'generate_googlemeet_qr'
  | 'generate_skype_qr'
  | 'generate_facetime_qr'
  | 'generate_payment_qr'
  | 'generate_googlereview_qr'
  | 'generate_coupon_qr'
  | 'generate_menu_qr'
  | 'generate_appstore_qr'
  | 'generate_event_qr'
  | 'generate_location_qr'
  | 'generate_pdf_qr'
  | 'generate_bulk_qr'
  | 'generate_dynamic_qr'
  | 'update_dynamic_qr'
  | 'get_dynamic_qr_analytics'
  | 'list_dynamic_qrs'
  | 'delete_dynamic_qr'
  | 'toggle_dynamic_qr';
