import React, { useState } from 'react';
import {
  Code, Copy, Check, ChevronRight, ChevronDown,
  Terminal, Zap, Key, Globe, FileJson, Shield,
  Play, Book, ExternalLink, ArrowLeft, AlertTriangle
} from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'bash', title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-sm text-gray-400">{title}</span>
          <span className="text-xs text-gray-500 uppercase">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 overflow-x-auto text-sm">
          <code className="text-gray-300 font-mono">{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
};

interface EndpointProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  children?: React.ReactNode;
}

const Endpoint: React.FC<EndpointProps> = ({ method, path, description, children }) => {
  const [expanded, setExpanded] = useState(false);

  const methodColors = {
    GET: 'bg-green-500',
    POST: 'bg-blue-500',
    PATCH: 'bg-yellow-500',
    DELETE: 'bg-red-500'
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span className={`${methodColors[method]} text-white text-xs font-bold px-2 py-1 rounded`}>
          {method}
        </span>
        <code className="text-sm font-mono text-gray-700 flex-1">{path}</code>
        <span className="text-sm text-gray-500 hidden md:block">{description}</span>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-gray-600 mb-4 md:hidden">{description}</p>
          {children}
        </div>
      )}
    </div>
  );
};

interface ApiDocsProps {
  onBack?: () => void;
}

const ApiDocs: React.FC<ApiDocsProps> = ({ onBack }) => {
  const baseUrl = window.location.origin;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Code className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nexus QR API</h1>
            <p className="text-gray-500">v1.0</p>
          </div>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl">
          Build powerful QR code solutions with our REST API. Create, manage, and track QR codes programmatically.
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          Quick Start
        </h2>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
              <Key className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">1. Get API Key</h3>
            <p className="text-sm text-gray-500">Create an API key from your dashboard</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <Terminal className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">2. Make Request</h3>
            <p className="text-sm text-gray-500">Use your key to authenticate API calls</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <Globe className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">3. Get QR Code</h3>
            <p className="text-sm text-gray-500">Receive QR code image in response</p>
          </div>
        </div>

        <CodeBlock
          title="Create your first QR code"
          language="bash"
          code={`curl -X POST ${baseUrl}/api/v1/qr \\
  -H "X-API-Key: nxqr_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "url",
    "content": "https://example.com",
    "title": "My First QR Code"
  }'`}
        />
      </section>

      {/* Authentication */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-green-500" />
          Authentication
        </h2>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <p className="text-gray-600 mb-4">
            All API requests require authentication using an API key. Include your key in the request header:
          </p>
          <CodeBlock
            language="http"
            code={`X-API-Key: nxqr_live_xxxxxxxxxxxx

# Or using Bearer token
Authorization: Bearer nxqr_live_xxxxxxxxxxxx`}
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 mb-1">Keep your API key secure</h4>
            <p className="text-sm text-amber-700">
              Never expose your API key in client-side code or public repositories. Use environment variables.
            </p>
          </div>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="mb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Rate Limits</h2>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden min-w-[400px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Plan</th>
                <th className="text-left px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Requests</th>
                <th className="text-left px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Bulk</th>
                <th className="text-left px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Webhooks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">Free</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">100</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-red-500">No</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-red-500">No</td>
              </tr>
              <tr>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">Starter</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">5,000</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-red-500">No</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-red-500">No</td>
              </tr>
              <tr>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">Pro</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">50,000</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-500">Yes</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-500">Yes</td>
              </tr>
              <tr>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">Enterprise</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">Unlimited</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-500">Yes</td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-500">Yes</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">
          Rate limit headers are included in every response:
          <code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs ml-1 sm:ml-2">X-RateLimit-Limit</code>,
          <code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs ml-1">X-RateLimit-Remaining</code>,
          <code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs ml-1">X-RateLimit-Used</code>
        </p>
      </section>

      {/* Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FileJson className="w-6 h-6 text-blue-500" />
          Endpoints
        </h2>

        <div className="space-y-4">
          {/* Create QR */}
          <Endpoint method="POST" path="/api/v1/qr" description="Create a new QR code">
            <h4 className="font-semibold text-gray-900 mb-3">Request Body</h4>
            <CodeBlock
              language="json"
              code={`{
  "type": "url" | "text" | "vcard" | "wifi" | "email" | "sms" | "phone",
  "content": "string or object",
  "title": "My QR Code",
  "is_dynamic": true,
  "options": {
    "width": 400,
    "margin": 2,
    "color": "#000000",
    "background": "#ffffff",
    "format": "png" | "svg" | "base64"
  }
}`}
            />

            <h4 className="font-semibold text-gray-900 mt-6 mb-3">Content Types</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">URL</h5>
                <CodeBlock language="json" code={`{ "type": "url", "content": "https://example.com" }`} />
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">vCard</h5>
                <CodeBlock language="json" code={`{
  "type": "vcard",
  "content": {
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "company": "Acme Inc"
  }
}`} />
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">WiFi</h5>
                <CodeBlock language="json" code={`{
  "type": "wifi",
  "content": {
    "ssid": "MyNetwork",
    "password": "secret123",
    "encryption": "WPA"
  }
}`} />
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Email</h5>
                <CodeBlock language="json" code={`{
  "type": "email",
  "content": {
    "address": "hello@example.com",
    "subject": "Hello",
    "body": "Message content"
  }
}`} />
              </div>
            </div>

            <h4 className="font-semibold text-gray-900 mt-6 mb-3">Response</h4>
            <CodeBlock
              language="json"
              code={`{
  "id": "uuid",
  "short_code": "abc123",
  "title": "My QR Code",
  "type": "url",
  "is_dynamic": true,
  "redirect_url": "${baseUrl}/r/abc123",
  "qr_image": "data:image/png;base64,...",
  "created_at": "2024-01-01T00:00:00Z"
}`}
            />
          </Endpoint>

          {/* List QR Codes */}
          <Endpoint method="GET" path="/api/v1/qr" description="List all QR codes">
            <h4 className="font-semibold text-gray-900 mb-3">Query Parameters</h4>
            <table className="w-full text-sm mb-4">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2 font-mono text-indigo-600">page</td>
                  <td className="py-2 text-gray-500">Page number (default: 1)</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono text-indigo-600">limit</td>
                  <td className="py-2 text-gray-500">Items per page (default: 20, max: 100)</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono text-indigo-600">type</td>
                  <td className="py-2 text-gray-500">Filter by content type</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono text-indigo-600">is_active</td>
                  <td className="py-2 text-gray-500">Filter by active status (true/false)</td>
                </tr>
              </tbody>
            </table>

            <CodeBlock
              title="Example Request"
              language="bash"
              code={`curl "${baseUrl}/api/v1/qr?page=1&limit=10&type=url" \\
  -H "X-API-Key: nxqr_live_your_api_key"`}
            />
          </Endpoint>

          {/* Get QR Code */}
          <Endpoint method="GET" path="/api/v1/qr/{id}" description="Get a specific QR code">
            <CodeBlock
              title="Example Request"
              language="bash"
              code={`curl "${baseUrl}/api/v1/qr/uuid-here" \\
  -H "X-API-Key: nxqr_live_your_api_key"`}
            />
          </Endpoint>

          {/* Update QR Code */}
          <Endpoint method="PATCH" path="/api/v1/qr/{id}" description="Update a QR code">
            <h4 className="font-semibold text-gray-900 mb-3">Request Body</h4>
            <CodeBlock
              language="json"
              code={`{
  "content": "https://new-url.com",
  "title": "Updated Title",
  "is_active": true
}`}
            />
          </Endpoint>

          {/* Delete QR Code */}
          <Endpoint method="DELETE" path="/api/v1/qr/{id}" description="Delete a QR code">
            <CodeBlock
              title="Example Request"
              language="bash"
              code={`curl -X DELETE "${baseUrl}/api/v1/qr/uuid-here" \\
  -H "X-API-Key: nxqr_live_your_api_key"`}
            />
          </Endpoint>

          {/* Get Analytics */}
          <Endpoint method="GET" path="/api/v1/qr/{id}/analytics" description="Get scan analytics">
            <h4 className="font-semibold text-gray-900 mb-3">Query Parameters</h4>
            <table className="w-full text-sm mb-4">
              <tbody>
                <tr>
                  <td className="py-2 font-mono text-indigo-600">days</td>
                  <td className="py-2 text-gray-500">Number of days to fetch (default: 30)</td>
                </tr>
              </tbody>
            </table>

            <h4 className="font-semibold text-gray-900 mb-3">Response</h4>
            <CodeBlock
              language="json"
              code={`{
  "qr_id": "uuid",
  "period_days": 30,
  "total_scans": 1250,
  "unique_visitors": 890,
  "scans_by_date": {
    "2024-01-01": 45,
    "2024-01-02": 52
  },
  "scans_by_country": {
    "US": 450,
    "IN": 320,
    "UK": 180
  },
  "scans_by_device": {
    "mobile": 980,
    "desktop": 200,
    "tablet": 70
  },
  "recent_scans": [...]
}`}
            />
          </Endpoint>

          {/* Bulk Create */}
          <Endpoint method="POST" path="/api/v1/qr/bulk" description="Create multiple QR codes (Pro+)">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 flex gap-2">
              <Zap className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <p className="text-sm text-purple-700">Available on Pro and Enterprise plans only</p>
            </div>

            <h4 className="font-semibold text-gray-900 mb-3">Request Body</h4>
            <CodeBlock
              language="json"
              code={`{
  "items": [
    { "type": "url", "content": "https://example1.com", "title": "QR 1" },
    { "type": "url", "content": "https://example2.com", "title": "QR 2" },
    { "type": "vcard", "content": { "name": "John" }, "title": "Contact" }
  ]
}`}
            />

            <p className="text-sm text-gray-500 mt-4">Maximum 100 items per request</p>
          </Endpoint>
        </div>
      </section>

      {/* Error Codes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          Error Codes
        </h2>

        <p className="text-gray-600 mb-6">
          All API errors include a structured response with an error code, message, and details to help you debug issues.
        </p>

        <CodeBlock
          title="Error Response Format"
          language="json"
          code={`{
  "success": false,
  "error": {
    "code": 1001,
    "message": "Invalid API key",
    "details": "The provided API key does not exist or has been revoked"
  },
  "request_id": "req_abc123xyz"
}`}
        />

        <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Authentication Errors (1xxx)</h3>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Code</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">HTTP</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Error</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Solution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">1001</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">401</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Invalid API Key</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Check for typos or generate a new key.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">1002</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">401</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Expired API Key</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Generate a new API key from dashboard.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">1003</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">401</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Inactive API Key</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Re-activate from API Dashboard.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">1004</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">401</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Missing API Key</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Add X-API-Key header to request.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Authorization Errors (2xxx)</h3>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Code</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">HTTP</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Error</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Solution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">2001</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">403</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Permission Denied</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Upgrade your plan.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">2002</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-orange-100 text-orange-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">429</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Rate Limit Exceeded</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Wait for reset or upgrade.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">2003</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">403</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">IP Not Whitelisted</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Add IP in API settings.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Validation Errors (3xxx)</h3>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Code</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">HTTP</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Error</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Solution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">3001</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">400</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Invalid Request Body</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Validate JSON syntax.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">3002</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">400</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Missing Field</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Add required field.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">3003</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">400</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Invalid QR Type</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Use valid type.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">3004</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">400</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Invalid URL</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Include https://</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">3005</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">400</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Invalid Email</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Use valid email.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">3006</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">400</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Invalid Phone</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Use +1 format.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">3007</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">400</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Content Too Long</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Reduce content.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Resource Errors (4xxx)</h3>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Code</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">HTTP</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Error</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Solution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">4001</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">404</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">QR Not Found</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Verify QR ID.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">4002</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">404</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Resource Not Found</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Check resource ID.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Server Errors (5xxx)</h3>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
          <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Code</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">HTTP</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Error</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Solution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">5001</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">500</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Server Error</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Retry later.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">5002</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">500</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Database Error</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Retry in seconds.</td>
              </tr>
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">5003</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">500</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">QR Generation Failed</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Check content, retry.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Idempotency Errors (6xxx)</h3>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Code</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">HTTP</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Error</th>
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">Solution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
              <tr>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">6001</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3"><code className="bg-orange-100 text-orange-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">409</code></td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">Key Reused</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600">Use unique key.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Code className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-1">Handling Errors</h4>
            <p className="text-sm text-blue-700">
              Always check the <code className="bg-blue-100 px-1 rounded">success</code> field in response.
              Use <code className="bg-blue-100 px-1 rounded">request_id</code> when contacting support.
              Implement exponential backoff for 5xx errors.
            </p>
          </div>
        </div>
      </section>

      {/* SDKs */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Book className="w-6 h-6 text-purple-500" />
          Code Examples
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center text-xs font-bold">JS</span>
              JavaScript / Node.js
            </h3>
            <CodeBlock
              language="javascript"
              code={`// Using fetch
const response = await fetch('${baseUrl}/api/v1/qr', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.NEXUS_QR_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'url',
    content: 'https://example.com',
    title: 'My QR Code'
  })
});

const data = await response.json();
console.log(data.qr_image); // Base64 QR image`}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-xs font-bold text-white">PY</span>
              Python
            </h3>
            <CodeBlock
              language="python"
              code={`import requests

response = requests.post(
    '${baseUrl}/api/v1/qr',
    headers={
        'X-API-Key': 'nxqr_live_your_api_key',
        'Content-Type': 'application/json'
    },
    json={
        'type': 'url',
        'content': 'https://example.com',
        'title': 'My QR Code'
    }
)

data = response.json()
print(data['qr_image'])  # Base64 QR image`}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-xs font-bold text-white">PHP</span>
              PHP
            </h3>
            <CodeBlock
              language="php"
              code={`<?php
$ch = curl_init('${baseUrl}/api/v1/qr');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'X-API-Key: nxqr_live_your_api_key',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'type' => 'url',
        'content' => 'https://example.com',
        'title' => 'My QR Code'
    ])
]);

$response = curl_exec($ch);
$data = json_decode($response, true);
echo $data['qr_image']; // Base64 QR image`}
            />
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
          <p className="text-white/80 mb-6">
            Our team is here to help you integrate with the Nexus QR API. Check out our resources or get in touch.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="/api"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-medium hover:bg-gray-100 transition-colors"
            >
              <Key className="w-4 h-4" />
              Get API Key
            </a>
            <a
              href="mailto:support@nexusqr.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ApiDocs;
