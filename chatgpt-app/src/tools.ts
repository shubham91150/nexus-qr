/**
 * Nexus QR - MCP Tools for ChatGPT Apps SDK
 *
 * These tools define the capabilities that ChatGPT can use to generate QR codes.
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

export const GenerateWiFiQRSchema = z.object({
  ssid: z.string().describe('WiFi network name (SSID)'),
  password: z.string().describe('WiFi password'),
  security: z.enum(['WPA', 'WEP', 'nopass']).default('WPA').describe('Security type'),
  hidden: z.boolean().default(false).describe('Is the network hidden?'),
});

export const GenerateContactQRSchema = z.object({
  firstName: z.string().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  phone: z.string().optional().describe('Phone number'),
  email: z.string().optional().describe('Email address'),
  company: z.string().optional().describe('Company name'),
  title: z.string().optional().describe('Job title'),
  website: z.string().optional().describe('Website URL'),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional().describe('Address details'),
});

export const GenerateSocialQRSchema = z.object({
  platform: z.enum([
    'instagram', 'twitter', 'linkedin', 'facebook', 'tiktok',
    'youtube', 'spotify', 'telegram', 'whatsapp', 'snapchat',
    'discord', 'pinterest'
  ]).describe('Social media platform'),
  username: z.string().describe('Username or profile identifier'),
  message: z.string().optional().describe('Pre-filled message (for WhatsApp, SMS)'),
});

export const GeneratePaymentQRSchema = z.object({
  method: z.enum(['upi', 'bitcoin', 'paypal']).describe('Payment method'),
  address: z.string().describe('Payment address/ID (UPI ID, Bitcoin address, PayPal email)'),
  amount: z.string().optional().describe('Payment amount'),
  currency: z.string().optional().describe('Currency code (USD, INR, etc.)'),
  note: z.string().optional().describe('Payment note/description'),
});

export const GenerateBulkQRSchema = z.object({
  items: z.array(z.object({
    name: z.string().describe('Identifier for this QR code'),
    content: z.string().describe('Content to encode'),
  })).min(1).max(100).describe('List of items to generate QR codes for'),
  format: z.enum(['png', 'svg']).default('png').describe('Output format'),
});

// Tool definitions for MCP
export const tools = [
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
  {
    name: 'generate_wifi_qr',
    description: 'Generate a QR code for WiFi network. When scanned, it will automatically connect the device to the WiFi network.',
    inputSchema: {
      type: 'object',
      properties: {
        ssid: {
          type: 'string',
          description: 'WiFi network name (SSID)',
        },
        password: {
          type: 'string',
          description: 'WiFi password',
        },
        security: {
          type: 'string',
          enum: ['WPA', 'WEP', 'nopass'],
          default: 'WPA',
          description: 'Security type',
        },
        hidden: {
          type: 'boolean',
          default: false,
          description: 'Is the network hidden?',
        },
      },
      required: ['ssid', 'password'],
    },
  },
  {
    name: 'generate_contact_qr',
    description: 'Generate a vCard QR code for contact information. When scanned, it will allow saving the contact directly to the phone.',
    inputSchema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          description: 'First name',
        },
        lastName: {
          type: 'string',
          description: 'Last name',
        },
        phone: {
          type: 'string',
          description: 'Phone number',
        },
        email: {
          type: 'string',
          description: 'Email address',
        },
        company: {
          type: 'string',
          description: 'Company name',
        },
        title: {
          type: 'string',
          description: 'Job title',
        },
        website: {
          type: 'string',
          description: 'Website URL',
        },
      },
      required: ['firstName'],
    },
  },
  {
    name: 'generate_social_qr',
    description: 'Generate a QR code for social media profiles. Supports Instagram, Twitter, LinkedIn, Facebook, TikTok, YouTube, Spotify, Telegram, WhatsApp, Snapchat, Discord, and Pinterest.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: [
            'instagram', 'twitter', 'linkedin', 'facebook', 'tiktok',
            'youtube', 'spotify', 'telegram', 'whatsapp', 'snapchat',
            'discord', 'pinterest'
          ],
          description: 'Social media platform',
        },
        username: {
          type: 'string',
          description: 'Username or profile identifier (without @)',
        },
        message: {
          type: 'string',
          description: 'Pre-filled message (only for WhatsApp)',
        },
      },
      required: ['platform', 'username'],
    },
  },
  {
    name: 'generate_payment_qr',
    description: 'Generate a QR code for payments. Supports UPI (India), Bitcoin, and PayPal.',
    inputSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['upi', 'bitcoin', 'paypal'],
          description: 'Payment method',
        },
        address: {
          type: 'string',
          description: 'Payment address (UPI ID, Bitcoin address, or PayPal email)',
        },
        amount: {
          type: 'string',
          description: 'Payment amount (optional)',
        },
        currency: {
          type: 'string',
          description: 'Currency code like USD, INR (optional)',
        },
        note: {
          type: 'string',
          description: 'Payment note or description (optional)',
        },
      },
      required: ['method', 'address'],
    },
  },
  {
    name: 'generate_email_qr',
    description: 'Generate a QR code that opens email composer with pre-filled recipient, subject, and body.',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        subject: {
          type: 'string',
          description: 'Email subject',
        },
        body: {
          type: 'string',
          description: 'Email body text',
        },
      },
      required: ['to'],
    },
  },
  {
    name: 'generate_sms_qr',
    description: 'Generate a QR code that opens SMS composer with pre-filled phone number and message.',
    inputSchema: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Phone number',
        },
        message: {
          type: 'string',
          description: 'Pre-filled message text',
        },
      },
      required: ['phone'],
    },
  },
  {
    name: 'generate_event_qr',
    description: 'Generate a QR code for calendar event. When scanned, it will add the event to the calendar.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Event title',
        },
        location: {
          type: 'string',
          description: 'Event location',
        },
        startDate: {
          type: 'string',
          description: 'Start date and time (ISO format: 2024-12-25T10:00:00)',
        },
        endDate: {
          type: 'string',
          description: 'End date and time (ISO format: 2024-12-25T11:00:00)',
        },
        description: {
          type: 'string',
          description: 'Event description',
        },
      },
      required: ['title', 'startDate', 'endDate'],
    },
  },
  {
    name: 'generate_location_qr',
    description: 'Generate a QR code for a geographic location. When scanned, it will open the location in maps.',
    inputSchema: {
      type: 'object',
      properties: {
        latitude: {
          type: 'number',
          description: 'Latitude coordinate',
        },
        longitude: {
          type: 'number',
          description: 'Longitude coordinate',
        },
        label: {
          type: 'string',
          description: 'Location label/name',
        },
      },
      required: ['latitude', 'longitude'],
    },
  },
];

// Type for tool names
export type ToolName =
  | 'generate_qr_code'
  | 'generate_wifi_qr'
  | 'generate_contact_qr'
  | 'generate_social_qr'
  | 'generate_payment_qr'
  | 'generate_email_qr'
  | 'generate_sms_qr'
  | 'generate_event_qr'
  | 'generate_location_qr';
