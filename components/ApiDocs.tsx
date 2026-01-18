import React, { useState } from 'react';
import {
  Search, Book, Key, Shield, ChevronDown, ChevronRight,
  Copy, Check, Lightbulb, ArrowLeft, ArrowRight,
  Code, Zap, Clock, Server, AlertTriangle, CheckCircle2, XCircle, Play, FileText
} from 'lucide-react';

// Code Block
const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1e1e2e] rounded-[20px] overflow-hidden relative group">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-2 bg-gray-700/50 hover:bg-gray-600 rounded-full transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
        </button>
      </div>
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

// Endpoint Card with pill-shaped badge (black bg, colored text)
interface EndpointCardProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
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
          <p className="text-xs text-gray-600 mb-3">{description}</p>
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
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleBack = () => {
    if (onBack) onBack();
    else window.history.back();
  };

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

        {/* Quick Start Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Quick Start</h2>
              <p className="text-xs text-gray-500">Create your first QR code</p>
            </div>
          </div>
          <CodeBlock
            code={`curl -X POST ${baseUrl}/api/v1/qr \\
  -H "X-API-Key: nxqr_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"url","content":"https://example.com"}'`}
          />
        </div>

        {/* Tip */}
        <div className="mb-4">
          <TipBox>
            Get your API key from the <strong>API Dashboard</strong> to start making requests.
          </TipBox>
        </div>

        {/* Authentication Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Authentication</h2>
              <p className="text-xs text-gray-500">Include API key in headers</p>
            </div>
          </div>
          <CodeBlock
            code={`X-API-Key: nxqr_live_xxxxxxxxxxxx

// Or using Bearer token
Authorization: Bearer nxqr_live_xxxxxxxxxxxx`}
          />
        </div>

        {/* Warning */}
        <div className="mb-4">
          <WarningBox>
            Never expose your API key in client-side code. Use server-side requests only.
          </WarningBox>
        </div>

        {/* API Endpoints Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">API Endpoints</h2>
              <p className="text-xs text-gray-500">Available REST endpoints</p>
            </div>
          </div>

          <div className="space-y-2">
            <EndpointCard method="POST" path="/api/v1/qr" description="Create a new QR code with specified content and options.">
              <CodeBlock
                code={`{
  "type": "url",
  "content": "https://example.com",
  "title": "My QR Code",
  "is_dynamic": true
}`}
              />
            </EndpointCard>

            <EndpointCard method="GET" path="/api/v1/qr" description="List all QR codes. Supports pagination with page and limit params." />

            <EndpointCard method="GET" path="/api/v1/qr/{id}" description="Get details of a specific QR code by ID." />

            <EndpointCard method="PATCH" path="/api/v1/qr/{id}" description="Update an existing QR code content or settings.">
              <CodeBlock code={`{ "content": "https://new-url.com" }`} />
            </EndpointCard>

            <EndpointCard method="DELETE" path="/api/v1/qr/{id}" description="Permanently delete a QR code. This cannot be undone." />
          </div>
        </div>

        {/* Rate Limits Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Rate Limits</h2>
              <p className="text-xs text-gray-500">Monthly request quotas</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { plan: 'Free', requests: '100', bulk: false },
              { plan: 'Starter', requests: '5,000', bulk: false },
              { plan: 'Pro', requests: '50,000', bulk: true },
              { plan: 'Enterprise', requests: 'Unlimited', bulk: true },
            ].map((row, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-full">
                <span className="text-xs font-medium text-gray-900 ml-2">{row.plan}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-600">{row.requests}/mo</span>
                  {row.bulk ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Codes Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Error Codes</h2>
              <p className="text-xs text-gray-500">Common errors and solutions</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { code: '1001', error: 'Invalid API Key', solution: 'Check key or generate new' },
              { code: '1002', error: 'Expired API Key', solution: 'Generate new key' },
              { code: '2001', error: 'Rate Limit Exceeded', solution: 'Wait or upgrade plan' },
              { code: '3001', error: 'Invalid Request', solution: 'Check JSON syntax' },
            ].map((row, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-full">
                <div className="flex items-center gap-3 ml-2">
                  <span className="text-[10px] bg-gray-900 text-red-400 px-2 py-0.5 rounded-full font-mono">{row.code}</span>
                  <span className="text-xs text-gray-900">{row.error}</span>
                </div>
                <span className="text-xs text-gray-500 mr-2">{row.solution}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
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
