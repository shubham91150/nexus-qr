/**
 * Nexus QR - MCP Server for ChatGPT Apps SDK
 *
 * This server implements the Model Context Protocol (MCP) to expose
 * ALL QR code generation capabilities to ChatGPT.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { tools, ToolName } from './tools.js';
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

// Create MCP server
const server = new Server(
  {
    name: 'nexus-qr',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name as ToolName) {
      // Basic
      case 'generate_qr_code':
        result = await handleGenerateQRCode(args as any);
        break;

      // Connectivity
      case 'generate_wifi_qr':
        result = await handleGenerateWiFiQR(args as any);
        break;

      // Contact & Communication
      case 'generate_contact_qr':
        result = await handleGenerateContactQR(args as any);
        break;
      case 'generate_phone_qr':
        result = await handleGeneratePhoneQR(args as any);
        break;
      case 'generate_sms_qr':
        result = await handleGenerateSMSQR(args as any);
        break;
      case 'generate_email_qr':
        result = await handleGenerateEmailQR(args as any);
        break;

      // Social Media
      case 'generate_social_qr':
        result = await handleGenerateSocialQR(args as any);
        break;
      case 'generate_youtube_qr':
        result = await handleGenerateYouTubeQR(args as any);
        break;

      // Video Conferencing
      case 'generate_zoom_qr':
        result = await handleGenerateZoomQR(args as any);
        break;
      case 'generate_googlemeet_qr':
        result = await handleGenerateGoogleMeetQR(args as any);
        break;
      case 'generate_skype_qr':
        result = await handleGenerateSkypeQR(args as any);
        break;
      case 'generate_facetime_qr':
        result = await handleGenerateFaceTimeQR(args as any);
        break;

      // Payments
      case 'generate_payment_qr':
        result = await handleGeneratePaymentQR(args as any);
        break;

      // Business
      case 'generate_googlereview_qr':
        result = await handleGenerateGoogleReviewQR(args as any);
        break;
      case 'generate_coupon_qr':
        result = await handleGenerateCouponQR(args as any);
        break;
      case 'generate_menu_qr':
        result = await handleGenerateMenuQR(args as any);
        break;

      // Apps
      case 'generate_appstore_qr':
        result = await handleGenerateAppStoreQR(args as any);
        break;

      // Calendar & Events
      case 'generate_event_qr':
        result = await handleGenerateEventQR(args as any);
        break;

      // Location
      case 'generate_location_qr':
        result = await handleGenerateLocationQR(args as any);
        break;

      // Documents
      case 'generate_pdf_qr':
        result = await handleGeneratePDFQR(args as any);
        break;

      // Bulk
      case 'generate_bulk_qr':
        result = await handleGenerateBulkQR(args as any);
        break;

      // Dynamic
      case 'generate_dynamic_qr':
        result = await handleGenerateDynamicQR(args as any);
        break;

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }

    // Return the result
    if (result.success && result.qrCode) {
      return {
        content: [
          {
            type: 'text',
            text: result.message,
          },
          {
            type: 'image',
            data: result.qrCode.replace(/^data:image\/png;base64,/, ''),
            mimeType: 'image/png',
          },
        ],
      };
    } else if (result.success && 'qrCodes' in result) {
      // Bulk QR response
      return {
        content: [
          {
            type: 'text',
            text: result.message,
          },
          ...result.qrCodes!.map((qr: { name: string; qrCode: string }) => ({
            type: 'text' as const,
            text: `\n${qr.name}:`,
          })),
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: result.message,
          },
        ],
        isError: !result.success,
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

// Run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Nexus QR MCP Server v2.0.0 running on stdio (${tools.length} tools available)`);
}

main().catch(console.error);
