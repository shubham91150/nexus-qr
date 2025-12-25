/**
 * Nexus QR - MCP Server for ChatGPT Apps SDK
 *
 * This server implements the Model Context Protocol (MCP) to expose
 * QR code generation capabilities to ChatGPT.
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
  handleGenerateSocialQR,
  handleGeneratePaymentQR,
  handleGenerateEmailQR,
  handleGenerateSMSQR,
  handleGenerateEventQR,
  handleGenerateLocationQR,
} from './qr-generator.js';

// Create MCP server
const server = new Server(
  {
    name: 'nexus-qr',
    version: '1.0.0',
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
      case 'generate_qr_code':
        result = await handleGenerateQRCode(args as any);
        break;

      case 'generate_wifi_qr':
        result = await handleGenerateWiFiQR(args as any);
        break;

      case 'generate_contact_qr':
        result = await handleGenerateContactQR(args as any);
        break;

      case 'generate_social_qr':
        result = await handleGenerateSocialQR(args as any);
        break;

      case 'generate_payment_qr':
        result = await handleGeneratePaymentQR(args as any);
        break;

      case 'generate_email_qr':
        result = await handleGenerateEmailQR(args as any);
        break;

      case 'generate_sms_qr':
        result = await handleGenerateSMSQR(args as any);
        break;

      case 'generate_event_qr':
        result = await handleGenerateEventQR(args as any);
        break;

      case 'generate_location_qr':
        result = await handleGenerateLocationQR(args as any);
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
  console.error('Nexus QR MCP Server running on stdio');
}

main().catch(console.error);
