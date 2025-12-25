/**
 * Nexus QR - ChatGPT Apps SDK Server
 *
 * This server provides:
 * 1. MCP endpoint for tool calls from ChatGPT
 * 2. Static UI served in iframe within ChatGPT
 * 3. API endpoints for QR generation
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
  handleGenerateSocialQR,
  handleGeneratePaymentQR,
  handleGenerateEmailQR,
  handleGenerateSMSQR,
  handleGenerateEventQR,
  handleGenerateLocationQR,
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
  res.json({ status: 'ok', service: 'nexus-qr-chatgpt-app' });
});

// MCP Tools listing endpoint
app.get('/mcp/tools', (req, res) => {
  res.json({ tools });
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
      case 'generate_qr_code':
        result = await handleGenerateQRCode(params);
        break;

      case 'generate_wifi_qr':
        result = await handleGenerateWiFiQR(params);
        break;

      case 'generate_contact_qr':
        result = await handleGenerateContactQR(params);
        break;

      case 'generate_social_qr':
        result = await handleGenerateSocialQR(params);
        break;

      case 'generate_payment_qr':
        result = await handleGeneratePaymentQR(params);
        break;

      case 'generate_email_qr':
        result = await handleGenerateEmailQR(params);
        break;

      case 'generate_sms_qr':
        result = await handleGenerateSMSQR(params);
        break;

      case 'generate_event_qr':
        result = await handleGenerateEventQR(params);
        break;

      case 'generate_location_qr':
        result = await handleGenerateLocationQR(params);
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

// Direct API endpoints for each QR type
app.post('/api/qr/basic', async (req, res) => {
  const result = await handleGenerateQRCode(req.body);
  res.json(result);
});

app.post('/api/qr/wifi', async (req, res) => {
  const result = await handleGenerateWiFiQR(req.body);
  res.json(result);
});

app.post('/api/qr/contact', async (req, res) => {
  const result = await handleGenerateContactQR(req.body);
  res.json(result);
});

app.post('/api/qr/social', async (req, res) => {
  const result = await handleGenerateSocialQR(req.body);
  res.json(result);
});

app.post('/api/qr/payment', async (req, res) => {
  const result = await handleGeneratePaymentQR(req.body);
  res.json(result);
});

app.post('/api/qr/email', async (req, res) => {
  const result = await handleGenerateEmailQR(req.body);
  res.json(result);
});

app.post('/api/qr/sms', async (req, res) => {
  const result = await handleGenerateSMSQR(req.body);
  res.json(result);
});

app.post('/api/qr/event', async (req, res) => {
  const result = await handleGenerateEventQR(req.body);
  res.json(result);
});

app.post('/api/qr/location', async (req, res) => {
  const result = await handleGenerateLocationQR(req.body);
  res.json(result);
});

// ChatGPT Apps SDK manifest
app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.json({
    schema_version: 'v1',
    name_for_human: 'Nexus QR',
    name_for_model: 'nexus_qr',
    description_for_human: 'Generate beautiful QR codes for URLs, WiFi, contacts, social media, payments, and more.',
    description_for_model: 'A powerful QR code generator that creates QR codes for various purposes including URLs, WiFi networks (auto-connect), vCard contacts, social media profiles (Instagram, Twitter, LinkedIn, etc.), payment methods (UPI, Bitcoin, PayPal), email, SMS, calendar events, and locations. The generated QR codes can be customized with colors and sizes.',
    auth: {
      type: 'none',
    },
    api: {
      type: 'openapi',
      url: `${process.env.BASE_URL || 'http://localhost:3001'}/openapi.json`,
    },
    logo_url: `${process.env.BASE_URL || 'http://localhost:3001'}/logo.png`,
    contact_email: 'support@nexusqr.app',
    legal_info_url: `${process.env.BASE_URL || 'http://localhost:3001'}/legal`,
  });
});

// OpenAPI spec for ChatGPT
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Nexus QR API',
      description: 'Generate QR codes for various purposes',
      version: '1.0.0',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3001',
      },
    ],
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
                    content: { type: 'string', description: 'URL or text to encode' },
                    size: { type: 'number', description: 'Size in pixels (100-2000)' },
                    color: { type: 'string', description: 'Foreground color (hex)' },
                    backgroundColor: { type: 'string', description: 'Background color (hex)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'QR code generated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      qrCode: { type: 'string', description: 'Base64 encoded QR code image' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/qr/wifi': {
        post: {
          operationId: 'generateWiFiQR',
          summary: 'Generate a WiFi QR code for auto-connect',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ssid', 'password'],
                  properties: {
                    ssid: { type: 'string', description: 'WiFi network name' },
                    password: { type: 'string', description: 'WiFi password' },
                    security: { type: 'string', enum: ['WPA', 'WEP', 'nopass'] },
                    hidden: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'WiFi QR code generated',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } },
            },
          },
        },
      },
      '/api/qr/contact': {
        post: {
          operationId: 'generateContactQR',
          summary: 'Generate a vCard QR code',
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
          responses: {
            '200': {
              description: 'Contact QR code generated',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } },
            },
          },
        },
      },
      '/api/qr/social': {
        post: {
          operationId: 'generateSocialQR',
          summary: 'Generate a social media profile QR code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['platform', 'username'],
                  properties: {
                    platform: {
                      type: 'string',
                      enum: ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'youtube', 'spotify', 'telegram', 'whatsapp', 'snapchat', 'discord', 'pinterest'],
                    },
                    username: { type: 'string' },
                    message: { type: 'string', description: 'Pre-filled message for WhatsApp' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Social media QR code generated',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } },
            },
          },
        },
      },
      '/api/qr/payment': {
        post: {
          operationId: 'generatePaymentQR',
          summary: 'Generate a payment QR code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['method', 'address'],
                  properties: {
                    method: { type: 'string', enum: ['upi', 'bitcoin', 'paypal'] },
                    address: { type: 'string', description: 'UPI ID, Bitcoin address, or PayPal email' },
                    amount: { type: 'string' },
                    currency: { type: 'string' },
                    note: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Payment QR code generated',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/QRResponse' } } },
            },
          },
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
      },
    },
  });
});

// Serve the UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Nexus QR ChatGPT App Server running on port ${PORT}`);
  console.log(`MCP Tools: http://localhost:${PORT}/mcp/tools`);
  console.log(`OpenAPI: http://localhost:${PORT}/openapi.json`);
  console.log(`AI Plugin: http://localhost:${PORT}/.well-known/ai-plugin.json`);
});
