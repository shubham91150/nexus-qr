import React, { useState } from 'react';
import {
  Code, Copy, Check, ChevronRight, ChevronDown,
  Terminal, Zap, Key, Globe, FileJson, Shield,
  Book, ExternalLink, ArrowLeft, AlertTriangle,
  Rocket, Lock, Clock, Server, Layers, CheckCircle2,
  XCircle, Info, Sparkles, ArrowRight, Package
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

  const languageColors: Record<string, string> = {
    bash: 'text-green-400',
    json: 'text-amber-400',
    javascript: 'text-yellow-400',
    python: 'text-blue-400',
    php: 'text-purple-400',
    http: 'text-cyan-400'
  };

  return (
    <div className="bg-[#0d1117] rounded-2xl overflow-hidden shadow-lg border border-gray-800/50">
      {title && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-gray-800/50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-sm text-gray-400 ml-2 font-medium">{title}</span>
          </div>
          <span className={`text-xs font-mono uppercase ${languageColors[language] || 'text-gray-500'}`}>{language}</span>
        </div>
      )}
      <div className="relative group">
        <pre className="p-4 sm:p-5 overflow-x-auto text-sm leading-relaxed">
          <code className="text-gray-300 font-mono text-[13px]">{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
          title="Copy to clipboard"
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

  const methodConfig = {
    GET: { bg: 'bg-emerald-500', border: 'border-emerald-500/30', bgLight: 'bg-emerald-50' },
    POST: { bg: 'bg-blue-500', border: 'border-blue-500/30', bgLight: 'bg-blue-50' },
    PATCH: { bg: 'bg-amber-500', border: 'border-amber-500/30', bgLight: 'bg-amber-50' },
    DELETE: { bg: 'bg-rose-500', border: 'border-rose-500/30', bgLight: 'bg-rose-50' }
  };

  const config = methodConfig[method];

  return (
    <div className={`border-2 ${expanded ? config.border : 'border-gray-200'} rounded-2xl overflow-hidden transition-all hover:shadow-md`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-gray-50/50 transition-all text-left`}
      >
        <span className={`${config.bg} text-white text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg tracking-wide shadow-sm`}>
          {method}
        </span>
        <code className="text-sm sm:text-base font-mono text-gray-700 flex-1 truncate">{path}</code>
        <span className="text-xs sm:text-sm text-gray-500 hidden lg:block max-w-xs truncate">{description}</span>
        <div className={`p-1.5 rounded-lg ${expanded ? 'bg-gray-100' : ''} transition-colors`}>
          {expanded ? (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          )}
        </div>
      </button>
      {expanded && (
        <div className={`border-t-2 ${config.border} p-4 sm:p-6 ${config.bgLight}`}>
          <p className="text-gray-600 mb-4 lg:hidden text-sm">{description}</p>
          {children}
        </div>
      )}
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, color }) => (
  <div className="group relative bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 hover:shadow-xl hover:border-transparent transition-all duration-300 hover:-translate-y-1">
    <div className={`w-12 h-12 sm:w-14 sm:h-14 ${color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
      {icon}
    </div>
    <h3 className="font-bold text-gray-900 mb-2 text-base sm:text-lg">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
  </div>
);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 sm:mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm sm:text-base font-medium">Back to Dashboard</span>
          </button>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4 sm:mb-6">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                <span className="text-xs sm:text-sm text-white/90 font-medium">REST API v1.0</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 sm:mb-4 tracking-tight">
                Nexus QR API
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-white/80 max-w-xl leading-relaxed">
                Build powerful QR code solutions with our REST API. Create, manage, and track QR codes programmatically.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-6 sm:mt-8">
                <a href="#quickstart" className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base">
                  <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
                  Quick Start
                </a>
                <a href="#endpoints" className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20 text-sm sm:text-base">
                  <Book className="w-4 h-4 sm:w-5 sm:h-5" />
                  View Endpoints
                </a>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="w-72 h-72 bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <pre className="text-xs text-white/90 font-mono leading-relaxed">
{`curl -X POST /api/v1/qr \\
  -H "X-API-Key: nxqr_..." \\
  -d '{"type": "url"}'

{
  "id": "abc123",
  "short_code": "Xy7Kp",
  "qr_image": "data:..."
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">

        {/* Quick Start Section */}
        <section id="quickstart" className="mb-16 sm:mb-24 scroll-mt-8">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-4 sm:mb-6 shadow-lg">
              <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3 sm:mb-4">Quick Start</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">Get started in minutes with three simple steps</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <FeatureCard
              icon={<Key className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
              title="1. Get API Key"
              description="Create an API key from your dashboard to authenticate all requests"
              color="bg-gradient-to-br from-indigo-500 to-indigo-600"
            />
            <FeatureCard
              icon={<Terminal className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
              title="2. Make Request"
              description="Use your API key in headers to authenticate your API calls"
              color="bg-gradient-to-br from-emerald-500 to-emerald-600"
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
              title="3. Get QR Code"
              description="Receive your QR code image in the response, ready to use"
              color="bg-gradient-to-br from-purple-500 to-purple-600"
            />
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

        {/* Authentication Section */}
        <section className="mb-16 sm:mb-24">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mb-4 sm:mb-6 shadow-lg">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3 sm:mb-4">Authentication</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">Secure your API requests with API key authentication</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2 text-base sm:text-lg">Header Authentication</h3>
                <p className="text-sm sm:text-base text-gray-600">Include your API key in every request header for authentication</p>
              </div>
            </div>
            <CodeBlock
              language="http"
              code={`X-API-Key: nxqr_live_xxxxxxxxxxxx

# Or using Bearer token
Authorization: Bearer nxqr_live_xxxxxxxxxxxx`}
            />
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 sm:p-6 flex gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <div>
              <h4 className="font-bold text-amber-800 mb-1 text-sm sm:text-base">Keep your API key secure</h4>
              <p className="text-xs sm:text-sm text-amber-700 leading-relaxed">
                Never expose your API key in client-side code or public repositories. Use environment variables and server-side requests only.
              </p>
            </div>
          </div>
        </section>

        {/* Rate Limits Section */}
        <section className="mb-16 sm:mb-24">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl mb-4 sm:mb-6 shadow-lg">
              <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3 sm:mb-4">Rate Limits</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">Understand the API limits for each subscription tier</p>
          </div>

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm min-w-[500px]">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">Plan</th>
                    <th className="text-center px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">Requests/Month</th>
                    <th className="text-center px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">Bulk API</th>
                    <th className="text-center px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">Webhooks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { plan: 'Free', requests: '100', bulk: false, webhooks: false },
                    { plan: 'Starter', requests: '5,000', bulk: false, webhooks: false },
                    { plan: 'Pro', requests: '50,000', bulk: true, webhooks: true },
                    { plan: 'Enterprise', requests: 'Unlimited', bulk: true, webhooks: true }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">{row.plan}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                        <span className="text-gray-600 font-mono text-xs sm:text-sm">{row.requests}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                        {row.bulk ? (
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                        {row.webhooks ? (
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 flex gap-3">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-blue-700">
              Rate limit headers included in every response:{' '}
              <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono">X-RateLimit-Limit</code>,{' '}
              <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono">X-RateLimit-Remaining</code>,{' '}
              <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono">X-RateLimit-Used</code>
            </p>
          </div>
        </section>

        {/* Endpoints Section */}
        <section id="endpoints" className="mb-16 sm:mb-24 scroll-mt-8">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl mb-4 sm:mb-6 shadow-lg">
              <Server className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3 sm:mb-4">API Endpoints</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">Complete reference for all available API endpoints</p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* Create QR */}
            <Endpoint method="POST" path="/api/v1/qr" description="Create a new QR code">
              <h4 className="font-bold text-gray-900 mb-3 text-sm sm:text-base flex items-center gap-2">
                <FileJson className="w-4 h-4 text-blue-500" />
                Request Body
              </h4>
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

              <h4 className="font-bold text-gray-900 mt-6 sm:mt-8 mb-4 text-sm sm:text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                Content Type Examples
              </h4>
              <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-500" /> URL
                  </p>
                  <CodeBlock language="json" code={`{ "type": "url", "content": "https://example.com" }`} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-500" /> vCard
                  </p>
                  <CodeBlock language="json" code={`{
  "type": "vcard",
  "content": {
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com"
  }
}`} />
                </div>
              </div>

              <h4 className="font-bold text-gray-900 mt-6 sm:mt-8 mb-3 text-sm sm:text-base flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-emerald-500" />
                Response
              </h4>
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
              <h4 className="font-bold text-gray-900 mb-3 text-sm sm:text-base">Query Parameters</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {[
                  { param: 'page', desc: 'Page number (default: 1)' },
                  { param: 'limit', desc: 'Items per page (max: 100)' },
                  { param: 'type', desc: 'Filter by content type' },
                  { param: 'is_active', desc: 'Filter by active status' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100">
                    <code className="text-xs sm:text-sm font-mono text-indigo-600 font-semibold">{item.param}</code>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
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
              <h4 className="font-bold text-gray-900 mb-3 text-sm sm:text-base">Request Body</h4>
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
              <h4 className="font-bold text-gray-900 mb-3 text-sm sm:text-base">Response</h4>
              <CodeBlock
                language="json"
                code={`{
  "qr_id": "uuid",
  "period_days": 30,
  "total_scans": 1250,
  "unique_visitors": 890,
  "scans_by_date": { "2024-01-01": 45, "2024-01-02": 52 },
  "scans_by_country": { "US": 450, "IN": 320, "UK": 180 },
  "scans_by_device": { "mobile": 980, "desktop": 200, "tablet": 70 }
}`}
              />
            </Endpoint>

            {/* Bulk Create */}
            <Endpoint method="POST" path="/api/v1/qr/bulk" description="Create multiple QR codes (Pro+)">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-purple-700 font-medium">Available on Pro and Enterprise plans only</p>
              </div>

              <h4 className="font-bold text-gray-900 mb-3 text-sm sm:text-base">Request Body</h4>
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
              <p className="text-xs sm:text-sm text-gray-500 mt-3">Maximum 100 items per request</p>
            </Endpoint>
          </div>
        </section>

        {/* Error Codes Section */}
        <section className="mb-16 sm:mb-24">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-rose-400 to-red-500 rounded-2xl mb-4 sm:mb-6 shadow-lg">
              <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3 sm:mb-4">Error Codes</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">Understand and handle API errors effectively</p>
          </div>

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

          <div className="mt-8 sm:mt-12 space-y-6 sm:space-y-8">
            {/* Error tables */}
            {[
              {
                title: 'Authentication Errors (1xxx)',
                color: 'from-red-500 to-rose-500',
                errors: [
                  { code: '1001', http: '401', error: 'Invalid API Key', solution: 'Check for typos or generate a new key' },
                  { code: '1002', http: '401', error: 'Expired API Key', solution: 'Generate a new API key from dashboard' },
                  { code: '1003', http: '401', error: 'Inactive API Key', solution: 'Re-activate from API Dashboard' },
                  { code: '1004', http: '401', error: 'Missing API Key', solution: 'Add X-API-Key header to request' }
                ]
              },
              {
                title: 'Authorization Errors (2xxx)',
                color: 'from-orange-500 to-amber-500',
                errors: [
                  { code: '2001', http: '403', error: 'Permission Denied', solution: 'Upgrade your plan' },
                  { code: '2002', http: '429', error: 'Rate Limit Exceeded', solution: 'Wait for reset or upgrade' },
                  { code: '2003', http: '403', error: 'IP Not Whitelisted', solution: 'Add IP in API settings' }
                ]
              },
              {
                title: 'Validation Errors (3xxx)',
                color: 'from-yellow-500 to-amber-500',
                errors: [
                  { code: '3001', http: '400', error: 'Invalid Request Body', solution: 'Validate JSON syntax' },
                  { code: '3002', http: '400', error: 'Missing Required Field', solution: 'Add required field' },
                  { code: '3003', http: '400', error: 'Invalid QR Type', solution: 'Use valid type' },
                  { code: '3004', http: '400', error: 'Invalid URL', solution: 'Include https://' }
                ]
              }
            ].map((section, idx) => (
              <div key={idx}>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <div className={`w-2 h-6 rounded-full bg-gradient-to-b ${section.color}`}></div>
                  {section.title}
                </h3>
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden min-w-[500px]">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-bold text-gray-600 uppercase">Code</th>
                          <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-bold text-gray-600 uppercase">HTTP</th>
                          <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-bold text-gray-600 uppercase">Error</th>
                          <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-bold text-gray-600 uppercase">Solution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {section.errors.map((err, errIdx) => (
                          <tr key={errIdx} className="hover:bg-gray-50/50">
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono font-semibold">{err.code}</code>
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                              <code className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-mono font-semibold">{err.http}</code>
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-900 font-medium">{err.error}</td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-600">{err.solution}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 sm:mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Code className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-blue-800 mb-1 text-sm sm:text-base">Handling Errors</h4>
              <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
                Always check the <code className="bg-blue-100 px-1.5 rounded font-mono">success</code> field in response.
                Use <code className="bg-blue-100 px-1.5 rounded font-mono">request_id</code> when contacting support.
                Implement exponential backoff for 5xx errors.
              </p>
            </div>
          </div>
        </section>

        {/* Code Examples Section */}
        <section className="mb-16 sm:mb-24">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl mb-4 sm:mb-6 shadow-lg">
              <Book className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3 sm:mb-4">Code Examples</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">Ready-to-use code snippets for popular languages</p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow">
                  <span className="text-xs sm:text-sm font-bold text-white">JS</span>
                </div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg">JavaScript / Node.js</h3>
              </div>
              <CodeBlock
                language="javascript"
                code={`const response = await fetch('${baseUrl}/api/v1/qr', {
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
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow">
                  <span className="text-xs sm:text-sm font-bold text-white">PY</span>
                </div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg">Python</h3>
              </div>
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
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow">
                  <span className="text-xs sm:text-sm font-bold text-white">PHP</span>
                </div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg">PHP</h3>
              </div>
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

$data = json_decode(curl_exec($ch), true);
echo $data['qr_image']; // Base64 QR image`}
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-sm rounded-2xl sm:rounded-3xl mb-4 sm:mb-6 mx-auto">
              <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3 sm:mb-4">Ready to Get Started?</h2>
            <p className="text-base sm:text-lg text-white/80 mb-6 sm:mb-8 max-w-xl mx-auto">
              Create your API key and start building powerful QR code solutions today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <a
                href="/api"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <Key className="w-4 h-4 sm:w-5 sm:h-5" />
                Get API Key
              </a>
              <a
                href="mailto:support@nexusqr.com"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold hover:bg-white/20 transition-all border border-white/20 text-sm sm:text-base"
              >
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                Contact Support
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 py-6 sm:py-8 mt-8 sm:mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Nexus QR API v1.0 • Built with care for developers
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
