# Nexus QR - ChatGPT App

Generate professional QR codes directly in ChatGPT conversations.

## Features

- **URL/Text QR Codes** - Any website, link, or text
- **WiFi QR Codes** - Auto-connect to WiFi networks
- **Contact vCards** - Business card QR codes
- **Social Media** - Instagram, Twitter, LinkedIn, etc.
- **Payments** - UPI, Bitcoin, PayPal
- **Email & SMS** - Pre-filled messages
- **Events** - Calendar event QR codes
- **Location** - Geo coordinates

## Architecture

```
chatgpt-app/
├── src/
│   ├── server.ts        # HTTP server with API endpoints
│   ├── mcp-server.ts    # MCP server for ChatGPT tools
│   ├── tools.ts         # Tool definitions
│   └── qr-generator.ts  # QR generation logic
├── public/
│   ├── index.html       # UI for ChatGPT iframe
│   └── logo.svg         # App logo
├── app-manifest.json    # ChatGPT Apps SDK manifest
├── package.json
└── tsconfig.json
```

## How It Works

1. **User asks ChatGPT**: "Create a QR code for my website"
2. **ChatGPT calls your MCP tool**: `generate_qr_code({ content: "https://..." })`
3. **Your server generates QR**: Using the `qrcode` library
4. **Response sent to ChatGPT**: Base64 image + message
5. **ChatGPT shows result**: Displays QR code to user

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Install Dependencies

```bash
cd chatgpt-app
npm install
```

### Run Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3001`

### Test MCP Tools

```bash
# List available tools
curl http://localhost:3001/mcp/tools

# Generate a QR code
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "generate_qr_code", "params": {"content": "https://example.com"}}'
```

## Deployment

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

### Deploy to Railway

```bash
railway init
railway up
```

### Deploy to Render

1. Connect your GitHub repo
2. Set build command: `npm run build`
3. Set start command: `npm start`

## Submit to ChatGPT App Store

### Step 1: Deploy Your App

Deploy to a public URL (e.g., `https://nexusqr-chatgpt.vercel.app`)

### Step 2: Update Configuration

Update `BASE_URL` in your environment:

```env
BASE_URL=https://nexusqr-chatgpt.vercel.app
PORT=3001
```

### Step 3: Submit to OpenAI

1. Go to [OpenAI Developer Portal](https://platform.openai.com/apps)
2. Click "Create New App"
3. Fill in app details:
   - Name: Nexus QR
   - Description: Generate QR codes for URLs, WiFi, contacts, and more
   - Category: Productivity / Utilities
4. Provide endpoints:
   - Plugin manifest: `https://your-domain/.well-known/ai-plugin.json`
   - OpenAPI spec: `https://your-domain/openapi.json`
5. Upload logo (512x512 PNG)
6. Submit for review

### Step 4: Wait for Approval

OpenAI reviews submissions. Once approved, your app will be available in the ChatGPT App Store!

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/mcp/tools` | GET | List available tools |
| `/mcp/execute` | POST | Execute a tool |
| `/api/qr/basic` | POST | Generate basic QR |
| `/api/qr/wifi` | POST | Generate WiFi QR |
| `/api/qr/contact` | POST | Generate contact QR |
| `/api/qr/social` | POST | Generate social QR |
| `/api/qr/payment` | POST | Generate payment QR |
| `/.well-known/ai-plugin.json` | GET | ChatGPT plugin manifest |
| `/openapi.json` | GET | OpenAPI specification |

## Example Tool Calls

### Basic QR Code

```json
{
  "tool": "generate_qr_code",
  "params": {
    "content": "https://nexusqr.app",
    "size": 400,
    "color": "#000000"
  }
}
```

### WiFi QR Code

```json
{
  "tool": "generate_wifi_qr",
  "params": {
    "ssid": "MyNetwork",
    "password": "secretpass",
    "security": "WPA"
  }
}
```

### Contact QR Code

```json
{
  "tool": "generate_contact_qr",
  "params": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "company": "Acme Inc"
  }
}
```

### Social Media QR Code

```json
{
  "tool": "generate_social_qr",
  "params": {
    "platform": "instagram",
    "username": "nexusqr"
  }
}
```

### Payment QR Code (UPI)

```json
{
  "tool": "generate_payment_qr",
  "params": {
    "method": "upi",
    "address": "merchant@upi",
    "amount": "100",
    "note": "Payment for order"
  }
}
```

## License

MIT License - See LICENSE file for details.

## Support

- Email: support@nexusqr.app
- Website: https://nexusqr.app
- GitHub Issues: [Report a bug](https://github.com/nexusqr/chatgpt-app/issues)
