import React, { useState } from 'react';
import {
  Search, Book, Key, Shield, ChevronDown, ChevronRight,
  Copy, Check, Lightbulb, ArrowLeft, ArrowRight,
  Code, Zap, Clock, Server, AlertTriangle, CheckCircle2, XCircle, Play, FileText,
  Database, Globe, Link, QrCode, Webhook, BarChart3, Settings, Hash, List
} from 'lucide-react';

// Code Block
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1e1e2e] rounded-[16px] overflow-hidden relative group">
      {language && (
        <div className="px-4 py-2 bg-[#252536] border-b border-gray-700/50 flex items-center justify-between">
          <span className="text-[10px] text-gray-400 uppercase font-medium">{language}</span>
          <button
            onClick={handleCopy}
            className="p-1.5 bg-gray-700/50 hover:bg-gray-600 rounded-full transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
          </button>
        </div>
      )}
      {!language && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-2 bg-gray-700/50 hover:bg-gray-600 rounded-full transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-xs font-mono leading-relaxed text-gray-300 whitespace-pre-wrap break-all">{code}</code>
      </pre>
    </div>
  );
};

// Tip Box
const TipBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white rounded-[20px] p-4 flex gap-3 shadow-sm">
    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
      <Lightbulb className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-semibold text-gray-900 mb-1">Tip</div>
      <div className="text-xs text-gray-600">{children}</div>
    </div>
  </div>
);

// Warning Box
const WarningBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white rounded-[20px] p-4 flex gap-3 shadow-sm">
    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
      <AlertTriangle className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-semibold text-gray-900 mb-1">Warning</div>
      <div className="text-xs text-gray-600">{children}</div>
    </div>
  </div>
);

// Info Box
const InfoBox: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title = "Note" }) => (
  <div className="bg-white rounded-[20px] p-4 flex gap-3 shadow-sm">
    <div className="w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center flex-shrink-0">
      <FileText className="w-5 h-5 text-gray-900" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-semibold text-gray-900 mb-1">{title}</div>
      <div className="text-xs text-gray-600">{children}</div>
    </div>
  </div>
);

// Section Header
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  </div>
);

// Parameter Table
const ParameterTable: React.FC<{ params: Array<{ name: string; type: string; required: boolean; description: string }> }> = ({ params }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-2 px-3 font-semibold text-gray-700">Parameter</th>
          <th className="text-left py-2 px-3 font-semibold text-gray-700">Type</th>
          <th className="text-left py-2 px-3 font-semibold text-gray-700">Required</th>
          <th className="text-left py-2 px-3 font-semibold text-gray-700">Description</th>
        </tr>
      </thead>
      <tbody>
        {params.map((param, idx) => (
          <tr key={idx} className="border-b border-gray-100">
            <td className="py-2 px-3 font-mono text-gray-900">{param.name}</td>
            <td className="py-2 px-3">
              <span className="bg-gray-900 text-gray-300 px-2 py-0.5 rounded-full text-[10px]">{param.type}</span>
            </td>
            <td className="py-2 px-3">
              {param.required ? (
                <span className="bg-gray-900 text-amber-400 px-2 py-0.5 rounded-full text-[10px]">Required</span>
              ) : (
                <span className="bg-[#f5f5f5] text-gray-500 px-2 py-0.5 rounded-full text-[10px]">Optional</span>
              )}
            </td>
            <td className="py-2 px-3 text-gray-600">{param.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Endpoint Card with detailed info
interface EndpointCardProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  description: string;
  children?: React.ReactNode;
}

const EndpointCard: React.FC<EndpointCardProps> = ({ method, path, description, children }) => {
  const [expanded, setExpanded] = useState(false);
  const textColors = {
    GET: 'text-emerald-400',
    POST: 'text-blue-400',
    PATCH: 'text-amber-400',
    PUT: 'text-orange-400',
    DELETE: 'text-red-400'
  };

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span className={`bg-gray-900 ${textColors[method]} text-[10px] font-bold px-3 py-1 rounded-full`}>
          {method}
        </span>
        <code className="text-xs font-mono text-gray-700 flex-1 truncate">{path}</code>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <p className="text-xs text-gray-600 mb-4">{description}</p>
          {children}
        </div>
      )}
    </div>
  );
};

// Navigation Tab
const NavTab: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
      active ? 'bg-gray-900 text-white' : 'bg-[#f5f5f5] text-gray-600 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

interface ApiDocsProps {
  onBack?: () => void;
}

const ApiDocs: React.FC<ApiDocsProps> = ({ onBack }) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const [activeSection, setActiveSection] = useState('quickstart');

  const handleBack = () => {
    if (onBack) onBack();
    else window.history.back();
  };

  const sections = [
    { id: 'quickstart', label: 'Quick Start' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'endpoints', label: 'Endpoints' },
    { id: 'qrtypes', label: 'QR Types' },
    { id: 'webhooks', label: 'Webhooks' },
    { id: 'pagination', label: 'Pagination' },
    { id: 'errors', label: 'Errors' },
    { id: 'sdks', label: 'SDKs' },
  ];

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-[1000px] mx-auto pt-6 pb-20 px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">API Documentation</h1>
              <p className="text-xs text-gray-500">Complete API reference guide</p>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 bg-white px-3 py-1.5 rounded-full shadow-sm">v1.0</span>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-[20px] p-3 shadow-sm mb-4 overflow-x-auto">
          <div className="flex gap-2">
            {sections.map((section) => (
              <NavTab
                key={section.id}
                active={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </NavTab>
            ))}
          </div>
        </div>

        {/* Base URL */}
        <div className="bg-white rounded-[20px] p-4 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f5f5f5] rounded-full flex items-center justify-center">
              <Globe className="w-4 h-4 text-gray-900" />
            </div>
            <div className="flex-1">
              <span className="text-xs text-gray-500">Base URL</span>
              <code className="block text-xs font-mono text-gray-900">{baseUrl}/api/v1</code>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(`${baseUrl}/api/v1`)}
              className="p-2 bg-[#f5f5f5] hover:bg-gray-200 rounded-full transition-colors"
            >
              <Copy className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Quick Start Section */}
        {activeSection === 'quickstart' && (
          <>
            <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
              <SectionHeader
                icon={<Zap className="w-5 h-5 text-white" />}
                title="Quick Start"
                description="Get started with the NexusQR API in minutes"
              />

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">1. Get your API Key</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Navigate to the API Dashboard and generate a new API key. Keep this key secure and never expose it in client-side code.
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">2. Make your first request</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Create your first QR code using the following cURL command:
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`curl -X POST ${baseUrl}/api/v1/qr \\
  -H "X-API-Key: nxqr_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "url",
    "content": "https://example.com",
    "title": "My First QR Code"
  }'`}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">3. Response</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    A successful request returns the created QR code object:
                  </p>
                  <CodeBlock
                    language="json"
                    code={`{
  "success": true,
  "data": {
    "id": "qr_abc123xyz",
    "type": "url",
    "content": "https://example.com",
    "title": "My First QR Code",
    "short_url": "https://nxqr.io/abc123",
    "qr_image_url": "https://api.nexusqr.com/qr/abc123.png",
    "is_dynamic": true,
    "scans": 0,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}`}
                  />
                </div>
              </div>
            </div>

            <TipBox>
              Get your API key from the <strong>API Dashboard</strong> to start making requests. Test keys start with <code className="bg-gray-100 px-1 rounded">nxqr_test_</code> and live keys with <code className="bg-gray-100 px-1 rounded">nxqr_live_</code>.
            </TipBox>
          </>
        )}

        {/* Authentication Section */}
        {activeSection === 'authentication' && (
          <>
            <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
              <SectionHeader
                icon={<Shield className="w-5 h-5 text-white" />}
                title="Authentication"
                description="Secure your API requests with authentication"
              />

              <div className="space-y-4">
                <p className="text-xs text-gray-600">
                  All API requests must be authenticated using your API key. You can authenticate using either the <code className="bg-gray-100 px-1 rounded">X-API-Key</code> header or Bearer token.
                </p>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Option 1: X-API-Key Header (Recommended)</h3>
                  <CodeBlock
                    language="http"
                    code={`GET /api/v1/qr HTTP/1.1
Host: ${baseUrl.replace('https://', '').replace('http://', '')}
X-API-Key: nxqr_live_xxxxxxxxxxxx
Content-Type: application/json`}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Option 2: Bearer Token</h3>
                  <CodeBlock
                    language="http"
                    code={`GET /api/v1/qr HTTP/1.1
Host: ${baseUrl.replace('https://', '').replace('http://', '')}
Authorization: Bearer nxqr_live_xxxxxxxxxxxx
Content-Type: application/json`}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">API Key Types</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-[#f5f5f5] rounded-full">
                      <span className="bg-gray-900 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-mono">nxqr_live_*</span>
                      <span className="text-xs text-gray-700">Production key - Use for live applications</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[#f5f5f5] rounded-full">
                      <span className="bg-gray-900 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-mono">nxqr_test_*</span>
                      <span className="text-xs text-gray-700">Test key - Use for development and testing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <WarningBox>
              Never expose your API key in client-side code, public repositories, or share it with unauthorized users. Rotate your keys immediately if compromised.
            </WarningBox>

            <div className="mt-4">
              <InfoBox title="Key Permissions">
                API keys can be configured with specific permissions. By default, keys have full access. Contact support for custom permission scopes.
              </InfoBox>
            </div>
          </>
        )}

        {/* Endpoints Section */}
        {activeSection === 'endpoints' && (
          <>
            <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
              <SectionHeader
                icon={<Server className="w-5 h-5 text-white" />}
                title="API Endpoints"
                description="Complete list of available REST endpoints"
              />

              <div className="space-y-3">
                {/* Create QR Code */}
                <EndpointCard
                  method="POST"
                  path="/api/v1/qr"
                  description="Create a new QR code with specified content and customization options."
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Request Body Parameters</h4>
                      <ParameterTable params={[
                        { name: 'type', type: 'string', required: true, description: 'QR code type: url, text, email, phone, sms, wifi, vcard' },
                        { name: 'content', type: 'string', required: true, description: 'The content to encode in the QR code' },
                        { name: 'title', type: 'string', required: false, description: 'A friendly name for the QR code' },
                        { name: 'is_dynamic', type: 'boolean', required: false, description: 'Create a dynamic QR code (default: true)' },
                        { name: 'folder_id', type: 'string', required: false, description: 'ID of the folder to place the QR code in' },
                        { name: 'style', type: 'object', required: false, description: 'Customization options for QR appearance' },
                      ]} />
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Example Request</h4>
                      <CodeBlock
                        language="json"
                        code={`{
  "type": "url",
  "content": "https://example.com",
  "title": "My Website QR",
  "is_dynamic": true,
  "style": {
    "foreground": "#000000",
    "background": "#FFFFFF",
    "logo_url": "https://example.com/logo.png"
  }
}`}
                      />
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Response (201 Created)</h4>
                      <CodeBlock
                        language="json"
                        code={`{
  "success": true,
  "data": {
    "id": "qr_abc123xyz",
    "type": "url",
    "content": "https://example.com",
    "title": "My Website QR",
    "short_url": "https://nxqr.io/abc123",
    "qr_image_url": "https://api.nexusqr.com/qr/abc123.png",
    "is_dynamic": true,
    "scans": 0,
    "created_at": "2024-01-15T10:30:00Z"
  }
}`}
                      />
                    </div>
                  </div>
                </EndpointCard>

                {/* List QR Codes */}
                <EndpointCard
                  method="GET"
                  path="/api/v1/qr"
                  description="Retrieve a paginated list of all your QR codes with optional filtering."
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Query Parameters</h4>
                      <ParameterTable params={[
                        { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
                        { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
                        { name: 'type', type: 'string', required: false, description: 'Filter by QR code type' },
                        { name: 'folder_id', type: 'string', required: false, description: 'Filter by folder' },
                        { name: 'search', type: 'string', required: false, description: 'Search by title or content' },
                        { name: 'sort', type: 'string', required: false, description: 'Sort by: created_at, scans, title' },
                        { name: 'order', type: 'string', required: false, description: 'Sort order: asc, desc (default: desc)' },
                      ]} />
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Example Request</h4>
                      <CodeBlock
                        language="bash"
                        code={`curl "${baseUrl}/api/v1/qr?page=1&limit=10&type=url&sort=scans&order=desc" \\
  -H "X-API-Key: nxqr_live_xxxxxxxxxxxx"`}
                      />
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Response</h4>
                      <CodeBlock
                        language="json"
                        code={`{
  "success": true,
  "data": [
    {
      "id": "qr_abc123",
      "type": "url",
      "title": "Website QR",
      "scans": 1250,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "total_pages": 5
  }
}`}
                      />
                    </div>
                  </div>
                </EndpointCard>

                {/* Get Single QR Code */}
                <EndpointCard
                  method="GET"
                  path="/api/v1/qr/{id}"
                  description="Retrieve detailed information about a specific QR code by its ID."
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Path Parameters</h4>
                      <ParameterTable params={[
                        { name: 'id', type: 'string', required: true, description: 'The unique QR code ID (e.g., qr_abc123xyz)' },
                      ]} />
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Query Parameters</h4>
                      <ParameterTable params={[
                        { name: 'include_analytics', type: 'boolean', required: false, description: 'Include scan analytics data' },
                      ]} />
                    </div>
                  </div>
                </EndpointCard>

                {/* Update QR Code */}
                <EndpointCard
                  method="PATCH"
                  path="/api/v1/qr/{id}"
                  description="Update an existing QR code's content, settings, or appearance. Only dynamic QR codes can have their content updated."
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Request Body</h4>
                      <ParameterTable params={[
                        { name: 'content', type: 'string', required: false, description: 'New content (dynamic QR codes only)' },
                        { name: 'title', type: 'string', required: false, description: 'New title for the QR code' },
                        { name: 'is_active', type: 'boolean', required: false, description: 'Enable or disable the QR code' },
                        { name: 'folder_id', type: 'string', required: false, description: 'Move to a different folder' },
                      ]} />
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Example</h4>
                      <CodeBlock
                        language="json"
                        code={`{
  "content": "https://new-destination.com",
  "title": "Updated QR Code"
}`}
                      />
                    </div>
                  </div>
                </EndpointCard>

                {/* Delete QR Code */}
                <EndpointCard
                  method="DELETE"
                  path="/api/v1/qr/{id}"
                  description="Permanently delete a QR code. This action cannot be undone. All scan data will be lost."
                >
                  <div className="space-y-4">
                    <WarningBox>
                      This action is irreversible. All scan analytics and history will be permanently deleted.
                    </WarningBox>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Response (204 No Content)</h4>
                      <p className="text-xs text-gray-600">Returns empty response on successful deletion.</p>
                    </div>
                  </div>
                </EndpointCard>

                {/* Get Analytics */}
                <EndpointCard
                  method="GET"
                  path="/api/v1/qr/{id}/analytics"
                  description="Retrieve detailed scan analytics for a specific QR code including location, device, and time data."
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Query Parameters</h4>
                      <ParameterTable params={[
                        { name: 'period', type: 'string', required: false, description: '7d, 30d, 90d, 1y, all (default: 30d)' },
                        { name: 'group_by', type: 'string', required: false, description: 'day, week, month (default: day)' },
                      ]} />
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Response</h4>
                      <CodeBlock
                        language="json"
                        code={`{
  "success": true,
  "data": {
    "total_scans": 1250,
    "unique_scans": 980,
    "scans_by_date": [...],
    "scans_by_location": [...],
    "scans_by_device": [...],
    "top_referrers": [...]
  }
}`}
                      />
                    </div>
                  </div>
                </EndpointCard>

                {/* Bulk Operations */}
                <EndpointCard
                  method="POST"
                  path="/api/v1/qr/bulk"
                  description="Create multiple QR codes in a single request. Available on Pro and Enterprise plans."
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Request Body</h4>
                      <CodeBlock
                        language="json"
                        code={`{
  "qr_codes": [
    { "type": "url", "content": "https://example1.com", "title": "QR 1" },
    { "type": "url", "content": "https://example2.com", "title": "QR 2" },
    { "type": "url", "content": "https://example3.com", "title": "QR 3" }
  ]
}`}
                      />
                    </div>
                  </div>
                </EndpointCard>
              </div>
            </div>
          </>
        )}

        {/* QR Types Section */}
        {activeSection === 'qrtypes' && (
          <>
            <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
              <SectionHeader
                icon={<QrCode className="w-5 h-5 text-white" />}
                title="QR Code Types"
                description="Supported QR code content types and formats"
              />

              <div className="space-y-4">
                {[
                  {
                    type: 'url',
                    name: 'URL / Website',
                    description: 'Link to any website or web page',
                    example: '{ "type": "url", "content": "https://example.com" }'
                  },
                  {
                    type: 'text',
                    name: 'Plain Text',
                    description: 'Any text content up to 4,296 characters',
                    example: '{ "type": "text", "content": "Hello World!" }'
                  },
                  {
                    type: 'email',
                    name: 'Email',
                    description: 'Pre-filled email with recipient, subject, and body',
                    example: '{ "type": "email", "content": { "to": "hello@example.com", "subject": "Hello", "body": "Hi there!" } }'
                  },
                  {
                    type: 'phone',
                    name: 'Phone Number',
                    description: 'Direct dial phone number',
                    example: '{ "type": "phone", "content": "+1234567890" }'
                  },
                  {
                    type: 'sms',
                    name: 'SMS Message',
                    description: 'Pre-filled SMS with recipient and message',
                    example: '{ "type": "sms", "content": { "phone": "+1234567890", "message": "Hello!" } }'
                  },
                  {
                    type: 'wifi',
                    name: 'WiFi Network',
                    description: 'Connect to WiFi network automatically',
                    example: '{ "type": "wifi", "content": { "ssid": "NetworkName", "password": "pass123", "security": "WPA" } }'
                  },
                  {
                    type: 'vcard',
                    name: 'Contact Card',
                    description: 'Digital business card with contact information',
                    example: '{ "type": "vcard", "content": { "name": "John Doe", "phone": "+1234567890", "email": "john@example.com" } }'
                  },
                  {
                    type: 'location',
                    name: 'Location',
                    description: 'Geographic coordinates for maps',
                    example: '{ "type": "location", "content": { "latitude": 40.7128, "longitude": -74.0060 } }'
                  },
                ].map((item, idx) => (
                  <div key={idx} className="bg-[#f5f5f5] rounded-[16px] p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-gray-900 text-white px-2 py-0.5 rounded-full text-[10px] font-mono">{item.type}</span>
                      <span className="text-xs font-semibold text-gray-900">{item.name}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{item.description}</p>
                    <CodeBlock language="json" code={item.example} />
                  </div>
                ))}
              </div>
            </div>

            <TipBox>
              Dynamic QR codes can have their content updated anytime without changing the QR image. Static QR codes encode the content directly and cannot be modified after creation.
            </TipBox>
          </>
        )}

        {/* Webhooks Section */}
        {activeSection === 'webhooks' && (
          <>
            <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
              <SectionHeader
                icon={<Webhook className="w-5 h-5 text-white" />}
                title="Webhooks"
                description="Real-time event notifications for your application"
              />

              <div className="space-y-4">
                <p className="text-xs text-gray-600">
                  Webhooks allow you to receive real-time HTTP notifications when events occur in your NexusQR account.
                </p>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Available Events</h3>
                  <div className="space-y-2">
                    {[
                      { event: 'qr.created', description: 'A new QR code was created' },
                      { event: 'qr.updated', description: 'A QR code was modified' },
                      { event: 'qr.deleted', description: 'A QR code was deleted' },
                      { event: 'qr.scanned', description: 'A QR code was scanned' },
                      { event: 'scan.milestone', description: 'QR code reached a scan milestone (100, 500, 1000, etc.)' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-[#f5f5f5] rounded-full">
                        <span className="bg-gray-900 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-mono">{item.event}</span>
                        <span className="text-xs text-gray-700">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Webhook Payload Example</h3>
                  <CodeBlock
                    language="json"
                    code={`{
  "event": "qr.scanned",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "qr_id": "qr_abc123xyz",
    "scan_id": "scan_xyz789",
    "location": {
      "country": "US",
      "city": "New York",
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "device": {
      "type": "mobile",
      "os": "iOS",
      "browser": "Safari"
    },
    "referrer": "direct"
  }
}`}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Verifying Webhook Signatures</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    All webhooks include a signature header for verification. Validate this to ensure the webhook is from NexusQR.
                  </p>
                  <CodeBlock
                    language="javascript"
                    code={`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from('sha256=' + expectedSig)
  );
}`}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Retry Policy</h3>
                  <p className="text-xs text-gray-600">
                    Failed webhook deliveries are automatically retried with exponential backoff: 30s, 2m, 4m, 8m, 16m. After 5 failed attempts, the delivery is marked as failed.
                  </p>
                </div>
              </div>
            </div>

            <InfoBox title="Webhook Endpoints">
              Use the <code className="bg-gray-100 px-1 rounded">POST /api/v1/webhooks</code> endpoint to create and manage webhook subscriptions programmatically.
            </InfoBox>
          </>
        )}

        {/* Pagination Section */}
        {activeSection === 'pagination' && (
          <>
            <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
              <SectionHeader
                icon={<List className="w-5 h-5 text-white" />}
                title="Pagination"
                description="Handle large datasets with cursor-based pagination"
              />

              <div className="space-y-4">
                <p className="text-xs text-gray-600">
                  All list endpoints support pagination to efficiently handle large datasets. The API uses offset-based pagination with configurable page size.
                </p>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Pagination Parameters</h3>
                  <ParameterTable params={[
                    { name: 'page', type: 'integer', required: false, description: 'Page number starting from 1 (default: 1)' },
                    { name: 'limit', type: 'integer', required: false, description: 'Number of items per page (default: 20, max: 100)' },
                  ]} />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Response Format</h3>
                  <CodeBlock
                    language="json"
                    code={`{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 156,
    "total_pages": 8,
    "has_next": true,
    "has_prev": true
  }
}`}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Example: Fetching All Pages</h3>
                  <CodeBlock
                    language="javascript"
                    code={`async function fetchAllQRCodes() {
  let allCodes = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      \`\${BASE_URL}/api/v1/qr?page=\${page}&limit=100\`,
      { headers: { 'X-API-Key': API_KEY } }
    );
    const data = await response.json();

    allCodes = [...allCodes, ...data.data];
    hasMore = data.pagination.has_next;
    page++;
  }

  return allCodes;
}`}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Errors Section */}
        {activeSection === 'errors' && (
          <>
            <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
              <SectionHeader
                icon={<AlertTriangle className="w-5 h-5 text-white" />}
                title="Error Handling"
                description="Understanding API errors and how to handle them"
              />

              <div className="space-y-4">
                <p className="text-xs text-gray-600">
                  The API uses standard HTTP status codes and returns detailed error messages in JSON format.
                </p>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Error Response Format</h3>
                  <CodeBlock
                    language="json"
                    code={`{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or has been revoked",
    "details": {
      "key_prefix": "nxqr_live_xxx..."
    }
  }
}`}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">HTTP Status Codes</h3>
                  <div className="space-y-2">
                    {[
                      { code: '200', status: 'OK', description: 'Request successful' },
                      { code: '201', status: 'Created', description: 'Resource created successfully' },
                      { code: '204', status: 'No Content', description: 'Resource deleted successfully' },
                      { code: '400', status: 'Bad Request', description: 'Invalid request parameters' },
                      { code: '401', status: 'Unauthorized', description: 'Missing or invalid API key' },
                      { code: '403', status: 'Forbidden', description: 'Insufficient permissions' },
                      { code: '404', status: 'Not Found', description: 'Resource not found' },
                      { code: '429', status: 'Too Many Requests', description: 'Rate limit exceeded' },
                      { code: '500', status: 'Server Error', description: 'Internal server error' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#f5f5f5] rounded-full">
                        <div className="flex items-center gap-3">
                          <span className={`bg-gray-900 px-2 py-0.5 rounded-full text-[10px] font-mono ${
                            item.code.startsWith('2') ? 'text-emerald-400' :
                            item.code.startsWith('4') ? 'text-amber-400' :
                            'text-red-400'
                          }`}>{item.code}</span>
                          <span className="text-xs font-medium text-gray-900">{item.status}</span>
                        </div>
                        <span className="text-xs text-gray-500">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Error Codes Reference</h3>
                  <div className="space-y-2">
                    {[
                      { code: 'INVALID_API_KEY', description: 'API key is invalid or malformed' },
                      { code: 'EXPIRED_API_KEY', description: 'API key has expired' },
                      { code: 'RATE_LIMIT_EXCEEDED', description: 'Too many requests, try again later' },
                      { code: 'INVALID_REQUEST', description: 'Request body is invalid JSON' },
                      { code: 'MISSING_REQUIRED_FIELD', description: 'Required field is missing' },
                      { code: 'RESOURCE_NOT_FOUND', description: 'The requested resource does not exist' },
                      { code: 'QUOTA_EXCEEDED', description: 'Monthly quota has been exceeded' },
                      { code: 'PERMISSION_DENIED', description: 'API key lacks required permissions' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#f5f5f5] rounded-full">
                        <span className="bg-gray-900 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-mono">{item.code}</span>
                        <span className="text-xs text-gray-600 flex-1 ml-4">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
              <SectionHeader
                icon={<Clock className="w-5 h-5 text-white" />}
                title="Rate Limits"
                description="Request quotas and throttling"
              />

              <div className="space-y-4">
                <p className="text-xs text-gray-600">
                  Rate limits vary by plan. Exceeding your limit returns HTTP 429 with a Retry-After header.
                </p>

                <div className="space-y-2">
                  {[
                    { plan: 'Free', requests: '100/month', rateLimit: '10/min', bulk: false },
                    { plan: 'Starter', requests: '5,000/month', rateLimit: '60/min', bulk: false },
                    { plan: 'Pro', requests: '50,000/month', rateLimit: '300/min', bulk: true },
                    { plan: 'Enterprise', requests: 'Unlimited', rateLimit: 'Custom', bulk: true },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#f5f5f5] rounded-full">
                      <span className="text-xs font-medium text-gray-900 ml-2">{row.plan}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-600">{row.requests}</span>
                        <span className="text-xs text-gray-400">{row.rateLimit}</span>
                        {row.bulk ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Rate Limit Headers</h3>
                  <CodeBlock
                    language="http"
                    code={`X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1705312200
Retry-After: 45`}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* SDKs Section */}
        {activeSection === 'sdks' && (
          <>
            <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
              <SectionHeader
                icon={<Code className="w-5 h-5 text-white" />}
                title="SDKs & Libraries"
                description="Official and community client libraries"
              />

              <div className="space-y-4">
                <p className="text-xs text-gray-600">
                  Use our official SDKs to integrate NexusQR into your application quickly.
                </p>

                {/* JavaScript/Node.js */}
                <div className="bg-[#f5f5f5] rounded-[16px] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-gray-900 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold">JavaScript</span>
                    <span className="text-xs font-semibold text-gray-900">Node.js / Browser</span>
                  </div>
                  <CodeBlock
                    language="bash"
                    code="npm install @nexusqr/sdk"
                  />
                  <div className="mt-3">
                    <CodeBlock
                      language="javascript"
                      code={`import { NexusQR } from '@nexusqr/sdk';

const client = new NexusQR('nxqr_live_xxxxxxxxxxxx');

// Create a QR code
const qr = await client.qr.create({
  type: 'url',
  content: 'https://example.com',
  title: 'My Website'
});

// List all QR codes
const qrCodes = await client.qr.list({ limit: 10 });

// Get analytics
const analytics = await client.qr.analytics('qr_abc123');`}
                    />
                  </div>
                </div>

                {/* Python */}
                <div className="bg-[#f5f5f5] rounded-[16px] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-gray-900 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold">Python</span>
                    <span className="text-xs font-semibold text-gray-900">Python 3.8+</span>
                  </div>
                  <CodeBlock
                    language="bash"
                    code="pip install nexusqr"
                  />
                  <div className="mt-3">
                    <CodeBlock
                      language="python"
                      code={`from nexusqr import NexusQR

client = NexusQR(api_key="nxqr_live_xxxxxxxxxxxx")

# Create a QR code
qr = client.qr.create(
    type="url",
    content="https://example.com",
    title="My Website"
)

# List all QR codes
qr_codes = client.qr.list(limit=10)

# Get analytics
analytics = client.qr.analytics("qr_abc123")`}
                    />
                  </div>
                </div>

                {/* cURL */}
                <div className="bg-[#f5f5f5] rounded-[16px] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-gray-900 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold">cURL</span>
                    <span className="text-xs font-semibold text-gray-900">Command Line</span>
                  </div>
                  <CodeBlock
                    language="bash"
                    code={`# Create a QR code
curl -X POST ${baseUrl}/api/v1/qr \\
  -H "X-API-Key: nxqr_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"type": "url", "content": "https://example.com"}'

# List all QR codes
curl "${baseUrl}/api/v1/qr?limit=10" \\
  -H "X-API-Key: nxqr_live_xxxxxxxxxxxx"

# Get a specific QR code
curl "${baseUrl}/api/v1/qr/qr_abc123" \\
  -H "X-API-Key: nxqr_live_xxxxxxxxxxxx"`}
                  />
                </div>

                {/* PHP */}
                <div className="bg-[#f5f5f5] rounded-[16px] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-gray-900 text-purple-400 px-2 py-0.5 rounded-full text-[10px] font-bold">PHP</span>
                    <span className="text-xs font-semibold text-gray-900">PHP 8.0+</span>
                  </div>
                  <CodeBlock
                    language="bash"
                    code="composer require nexusqr/php-sdk"
                  />
                  <div className="mt-3">
                    <CodeBlock
                      language="php"
                      code={`<?php
use NexusQR\\Client;

$client = new Client('nxqr_live_xxxxxxxxxxxx');

// Create a QR code
$qr = $client->qr->create([
    'type' => 'url',
    'content' => 'https://example.com',
    'title' => 'My Website'
]);

// List all QR codes
$qrCodes = $client->qr->list(['limit' => 10]);`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <TipBox>
              All SDKs support both synchronous and asynchronous operations. Check the SDK documentation for async/await patterns.
            </TipBox>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs text-gray-600 hover:bg-gray-50 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full text-xs font-medium hover:bg-gray-800">
            API Playground
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
