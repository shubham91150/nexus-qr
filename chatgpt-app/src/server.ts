/**
 * Nexus QR - ChatGPT Apps SDK Server
 *
 * This server provides:
 * 1. MCP endpoint for tool calls from ChatGPT
 * 2. Static UI served in iframe within ChatGPT
 * 3. API endpoints for ALL QR generation types
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { tools } from './tools.js';
import {
  handleGenerateQRCode,
  handleGenerateWiFiQR,
  handleGenerateContactQR,
  handleGeneratePhoneQR,
  handleGenerateSMSQR,
  handleGenerateEmailQR,
  handleGenerateSocialQR,
  handleGenerateYouTubeQR,
  handleGenerateZoomQR,
  handleGenerateGoogleMeetQR,
  handleGenerateSkypeQR,
  handleGenerateFaceTimeQR,
  handleGeneratePaymentQR,
  handleGenerateGoogleReviewQR,
  handleGenerateCouponQR,
  handleGenerateMenuQR,
  handleGenerateAppStoreQR,
  handleGenerateEventQR,
  handleGenerateLocationQR,
  handleGeneratePDFQR,
  handleGenerateBulkQR,
  handleGenerateDynamicQR,
} from './qr-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'nexus-qr-chatgpt-app', tools: tools.length });
});

// MCP Tools listing endpoint
app.get('/mcp/tools', (req, res) => {
  res.json({ tools, count: tools.length });
});

// MCP Tool execution endpoint
app.post('/mcp/execute', async (req, res) => {
  const { tool, params } = req.body;

  if (!tool || !params) {
    return res.status(400).json({
      success: false,
      message: 'Missing tool or params in request body',
    });
  }

  try {
    let result;

    switch (tool) {
      // Basic
      case 'generate_qr_code':
        result = await handleGenerateQRCode(params);
        break;

      // Connectivity
      case 'generate_wifi_qr':
        result = await handleGenerateWiFiQR(params);
        break;

      // Contact & Communication
      case 'generate_contact_qr':
        result = await handleGenerateContactQR(params);
        break;
      case 'generate_phone_qr':
        result = await handleGeneratePhoneQR(params);
        break;
      case 'generate_sms_qr':
        result = await handleGenerateSMSQR(params);
        break;
      case 'generate_email_qr':
        result = await handleGenerateEmailQR(params);
        break;

      // Social Media
      case 'generate_social_qr':
        result = await handleGenerateSocialQR(params);
        break;
      case 'generate_youtube_qr':
        result = await handleGenerateYouTubeQR(params);
        break;

      // Video Conferencing
      case 'generate_zoom_qr':
        result = await handleGenerateZoomQR(params);
        break;
      case 'generate_googlemeet_qr':
        result = await handleGenerateGoogleMeetQR(params);
        break;
      case 'generate_skype_qr':
        result = await handleGenerateSkypeQR(params);
        break;
      case 'generate_facetime_qr':
        result = await handleGenerateFaceTimeQR(params);
        break;

      // Payments
      case 'generate_payment_qr':
        result = await handleGeneratePaymentQR(params);
        break;

      // Business
      case 'generate_googlereview_qr':
        result = await handleGenerateGoogleReviewQR(params);
        break;
      case 'generate_coupon_qr':
        result = await handleGenerateCouponQR(params);
        break;
      case 'generate_menu_qr':
        result = await handleGenerateMenuQR(params);
        break;

      // Apps
      case 'generate_appstore_qr':
        result = await handleGenerateAppStoreQR(params);
        break;

      // Calendar & Events
      case 'generate_event_qr':
        result = await handleGenerateEventQR(params);
        break;

      // Location
      case 'generate_location_qr':
        result = await handleGenerateLocationQR(params);
        break;

      // Documents
      case 'generate_pdf_qr':
        result = await handleGeneratePDFQR(params);
        break;

      // Bulk
      case 'generate_bulk_qr':
        result = await handleGenerateBulkQR(params);
        break;

      // Dynamic
      case 'generate_dynamic_qr':
        result = await handleGenerateDynamicQR(params);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Unknown tool: ${tool}`,
        });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

// ==================== DIRECT API ENDPOINTS ====================

// Basic
app.post('/api/qr/basic', async (req, res) => {
  const result = await handleGenerateQRCode(req.body);
  res.json(result);
});

// Connectivity
app.post('/api/qr/wifi', async (req, res) => {
  const result = await handleGenerateWiFiQR(req.body);
  res.json(result);
});

// Contact & Communication
app.post('/api/qr/contact', async (req, res) => {
  const result = await handleGenerateContactQR(req.body);
  res.json(result);
});

app.post('/api/qr/phone', async (req, res) => {
  const result = await handleGeneratePhoneQR(req.body);
  res.json(result);
});

app.post('/api/qr/sms', async (req, res) => {
  const result = await handleGenerateSMSQR(req.body);
  res.json(result);
});

app.post('/api/qr/email', async (req, res) => {
  const result = await handleGenerateEmailQR(req.body);
  res.json(result);
});

// Social Media
app.post('/api/qr/social', async (req, res) => {
  const result = await handleGenerateSocialQR(req.body);
  res.json(result);
});

app.post('/api/qr/youtube', async (req, res) => {
  const result = await handleGenerateYouTubeQR(req.body);
  res.json(result);
});

// Video Conferencing
app.post('/api/qr/zoom', async (req, res) => {
  const result = await handleGenerateZoomQR(req.body);
  res.json(result);
});

app.post('/api/qr/googlemeet', async (req, res) => {
  const result = await handleGenerateGoogleMeetQR(req.body);
  res.json(result);
});

app.post('/api/qr/skype', async (req, res) => {
  const result = await handleGenerateSkypeQR(req.body);
  res.json(result);
});

app.post('/api/qr/facetime', async (req, res) => {
  const result = await handleGenerateFaceTimeQR(req.body);
  res.json(result);
});

// Payments
app.post('/api/qr/payment', async (req, res) => {
  const result = await handleGeneratePaymentQR(req.body);
  res.json(result);
});

// Business
app.post('/api/qr/googlereview', async (req, res) => {
  const result = await handleGenerateGoogleReviewQR(req.body);
  res.json(result);
});

app.post('/api/qr/coupon', async (req, res) => {
  const result = await handleGenerateCouponQR(req.body);
  res.json(result);
});

app.post('/api/qr/menu', async (req, res) => {
  const result = await handleGenerateMenuQR(req.body);
  res.json(result);
});

// Apps
app.post('/api/qr/appstore', async (req, res) => {
  const result = await handleGenerateAppStoreQR(req.body);
  res.json(result);
});

// Calendar & Events
app.post('/api/qr/event', async (req, res) => {
  const result = await handleGenerateEventQR(req.body);
  res.json(result);
});

// Location
app.post('/api/qr/location', async (req, res) => {
  const result = await handleGenerateLocationQR(req.body);
  res.json(result);
});

// Documents
app.post('/api/qr/pdf', async (req, res) => {
  const result = await handleGeneratePDFQR(req.body);
  res.json(result);
});

// Bulk
app.post('/api/qr/bulk', async (req, res) => {
  const result = await handleGenerateBulkQR(req.body);
  res.json(result);
});

// Dynamic
app.post('/api/qr/dynamic', async (req, res) => {
  const result = await handleGenerateDynamicQR(req.body);
  res.json(result);
});

// ==================== CHATGPT PLUGIN MANIFEST ====================

app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.json({
    schema_version: 'v1',
    name_for_human: 'Nexus QR',
    name_for_model: 'nexus_qr',
    description_for_human: 'Generate professional QR codes for URLs, WiFi, contacts, social media, payments, video calls, and more.',
    description_for_model: `A comprehensive QR code generator with 22 different tools:

BASIC: URLs, text content
CONNECTIVITY: WiFi auto-connect
CONTACT: vCard, phone calls, SMS, email
SOCIAL MEDIA: Instagram, Twitter, LinkedIn, Facebook, TikTok, YouTube, Spotify, Telegram, WhatsApp, Snapchat, Discord, Pinterest
VIDEO CALLS: Zoom meetings, Google Meet, Skype, FaceTime
PAYMENTS: UPI (India), Bitcoin, PayPal
BUSINESS: Google Reviews, Coupons/Discounts, Restaurant Menus
APPS: iOS App Store, Google Play, Huawei AppGallery
CALENDAR: Events with reminders
LOCATION: Geographic coordinates
DOCUMENTS: PDF links
ADVANCED: Bulk generation (up to 50), Dynamic/Trackable QR codes`,
    auth: {
      type: 'none',
    },
    api: {
      type: 'openapi',
      url: `${process.env.BASE_URL || 'http://localhost:3001'}/openapi.json`,
    },
    logo_url: `${process.env.BASE_URL || 'http://localhost:3001'}/logo.svg`,
    contact_email: 'support@nexusqr.app',
    legal_info_url: `${process.env.BASE_URL || 'http://localhost:3001'}/legal`,
  });
});

// ==================== OPENAPI SPEC ====================

app.get('/openapi.json', (req, res) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Nexus QR API',
      description: 'Comprehensive QR code generation API with 22 different QR types',
      version: '2.0.0',
    },
    servers: [{ url: baseUrl }],
    paths: {
      '/api/qr/basic': {
        post: {
          operationId: 'generateBasicQR',
          summary: 'Generate a basic QR code for URL or text',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    content: { type: 'string' },
                    size: { type: 'number' },
                    color: { type: 'string' },
                    backgroundColor: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'QR code generated', content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } } } },
        },
      },
      '/api/qr/wifi': {
        post: {
          operationId: 'generateWiFiQR',
          summary: 'Generate WiFi auto-connect QR code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ssid', 'password'],
                  properties: {
                    ssid: { type: 'string' },
                    password: { type: 'string' },
                    security: { type: 'string', enum: ['WPA', 'WPA2', 'WPA3', 'WEP', 'nopass'] },
                    hidden: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'WiFi QR generated', content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } } } },
        },
      },
      '/api/qr/contact': {
        post: {
          operationId: 'generateContactQR',
          summary: 'Generate vCard contact QR code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['firstName'],
                  properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    phone: { type: 'string' },
                    email: { type: 'string' },
                    company: { type: 'string' },
                    title: { type: 'string' },
                    website: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Contact QR generated', content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } } } },
        },
      },
      '/api/qr/social': {
        post: {
          operationId: 'generateSocialQR',
          summary: 'Generate social media profile QR code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['platform', 'username'],
                  properties: {
                    platform: { type: 'string', enum: ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'youtube', 'spotify', 'telegram', 'whatsapp', 'snapchat', 'discord', 'pinterest'] },
                    username: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Social QR generated', content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } } } },
        },
      },
      '/api/qr/payment': {
        post: {
          operationId: 'generatePaymentQR',
          summary: 'Generate payment QR code (UPI, Bitcoin, PayPal)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['method', 'address'],
                  properties: {
                    method: { type: 'string', enum: ['upi', 'bitcoin', 'paypal'] },
                    address: { type: 'string' },
                    amount: { type: 'string' },
                    currency: { type: 'string' },
                    note: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Payment QR generated', content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } } } },
        },
      },
      '/api/qr/zoom': {
        post: {
          operationId: 'generateZoomQR',
          summary: 'Generate Zoom meeting QR code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['meetingId'],
                  properties: {
                    meetingId: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Zoom QR generated', content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } } } },
        },
      },
      '/api/qr/event': {
        post: {
          operationId: 'generateEventQR',
          summary: 'Generate calendar event QR code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'startDate', 'endDate'],
                  properties: {
                    title: { type: 'string' },
                    location: { type: 'string' },
                    startDate: { type: 'string' },
                    endDate: { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Event QR generated', content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } } } },
        },
      },
      '/api/qr/bulk': {
        post: {
          operationId: 'generateBulkQR',
          summary: 'Generate multiple QR codes at once (max 50)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          content: { type: 'string' },
                        },
                      },
                    },
                    size: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Bulk QR codes generated', content: { 'application/json': { schema: { $ref: '#/components/schemas/BulkQRResponse' } } } } },
        },
      },
    },
    components: {
      schemas: {
        QRResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            qrCode: { type: 'string', description: 'Base64 encoded PNG image' },
            message: { type: 'string' },
          },
        },
        BulkQRResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            qrCodes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  qrCode: { type: 'string' },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  });
});

// Serve the UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Legal page (placeholder)
app.get('/legal', (req, res) => {
  res.send(`
    <html>
      <head><title>Nexus QR - Legal</title></head>
      <body style="font-family: sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
        <h1>Terms of Service</h1>
        <p>Nexus QR provides QR code generation services. By using this service, you agree to use it responsibly.</p>
        <h1>Privacy Policy</h1>
        <p>We do not store any QR code content. All generation happens in real-time.</p>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Nexus QR - ChatGPT App Server                    ║
╠════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                               ║
║                                                            ║
║  Endpoints:                                                ║
║  • Health:     http://localhost:${PORT}/health                ║
║  • MCP Tools:  http://localhost:${PORT}/mcp/tools             ║
║  • OpenAPI:    http://localhost:${PORT}/openapi.json          ║
║  • AI Plugin:  http://localhost:${PORT}/.well-known/ai-plugin.json ║
║                                                            ║
║  Total Tools: ${tools.length}                                         ║
╚════════════════════════════════════════════════════════════╝
  `);
});
