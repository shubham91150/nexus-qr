import React, { useState } from 'react';
import {
  Search, Book, Key, Shield, ChevronDown, ChevronRight,
  Copy, Check, Lightbulb, ArrowLeft, ArrowRight,
  Code, Terminal, Zap, Globe, Clock, Server,
  AlertTriangle, CheckCircle2, XCircle, Play, FileText
} from 'lucide-react';

// Sidebar Navigation Item
interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, children }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = !!children;

  return (
    <div>
      <button
        onClick={() => hasChildren ? setExpanded(!expanded) : onClick?.()}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
          active ? 'bg-[#1a1f2e] text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {icon && <span className={active ? 'text-white' : 'text-gray-400'}>{icon}</span>}
        <span className="text-xs font-medium flex-1">{label}</span>
        {hasChildren && (
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        )}
      </button>
      {hasChildren && expanded && (
        <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3">
          {children}
        </div>
      )}
    </div>
  );
};

// Sub navigation item
const SubNavItem: React.FC<{ label: string; active?: boolean; onClick?: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
      active ? 'text-[#1a1f2e] font-medium bg-gray-100' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {label}
  </button>
);

// Code Block
interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'javascript' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1e1e2e] rounded-xl overflow-hidden relative group">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-1.5 bg-gray-700/50 hover:bg-gray-600 rounded-lg transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-xs font-mono leading-relaxed text-gray-300">{code}</code>
      </pre>
    </div>
  );
};

// Tip Box
const TipBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
      <Lightbulb className="w-4 h-4 text-amber-600" />
    </div>
    <div>
      <div className="text-xs font-semibold text-amber-800 mb-1">Tip</div>
      <div className="text-xs text-amber-700">{children}</div>
    </div>
  </div>
);

// Warning Box
const WarningBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
      <AlertTriangle className="w-4 h-4 text-red-600" />
    </div>
    <div>
      <div className="text-xs font-semibold text-red-800 mb-1">Warning</div>
      <div className="text-xs text-red-700">{children}</div>
    </div>
  </div>
);

// Endpoint Card
interface EndpointCardProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  children?: React.ReactNode;
}

const EndpointCard: React.FC<EndpointCardProps> = ({ method, path, description, children }) => {
  const [expanded, setExpanded] = useState(false);
  const colors = {
    GET: 'bg-emerald-500',
    POST: 'bg-blue-500',
    PATCH: 'bg-amber-500',
    DELETE: 'bg-red-500'
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className={`${colors[method]} text-white text-[10px] font-bold px-2 py-0.5 rounded`}>
          {method}
        </span>
        <code className="text-xs font-mono text-gray-700 flex-1">{path}</code>
        <span className="text-xs text-gray-500 hidden md:block">{description}</span>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="border-t border-gray-100 p-3 bg-gray-50">
          <p className="text-xs text-gray-600 mb-3 md:hidden">{description}</p>
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
  const [activeSection, setActiveSection] = useState('quickstart');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleBack = () => {
    if (onBack) onBack();
    else window.history.back();
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 min-h-screen p-4 hidden lg:block fixed">
          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search docs..."
              className="w-full pl-9 pr-3 py-2 bg-gray-100 border-0 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Main Nav */}
          <div className="space-y-1 mb-5">
            <NavItem icon={<Book className="w-4 h-4" />} label="Documentation" active />
            <NavItem icon={<Play className="w-4 h-4" />} label="API Playground" />
            <NavItem icon={<FileText className="w-4 h-4" />} label="Changelog" />
          </div>

          {/* Getting Started */}
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Getting Started
          </div>
          <NavItem label="Introduction">
            <SubNavItem label="Quick Start" active={activeSection === 'quickstart'} onClick={() => setActiveSection('quickstart')} />
            <SubNavItem label="Authentication" active={activeSection === 'auth'} onClick={() => setActiveSection('auth')} />
            <SubNavItem label="Rate Limits" active={activeSection === 'limits'} onClick={() => setActiveSection('limits')} />
          </NavItem>

          {/* API Reference */}
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-3">
            API Reference
          </div>
          <NavItem label="Endpoints">
            <SubNavItem label="Create QR" active={activeSection === 'create'} onClick={() => setActiveSection('create')} />
            <SubNavItem label="List QR Codes" active={activeSection === 'list'} onClick={() => setActiveSection('list')} />
            <SubNavItem label="Get QR Code" active={activeSection === 'get'} onClick={() => setActiveSection('get')} />
            <SubNavItem label="Update QR" active={activeSection === 'update'} onClick={() => setActiveSection('update')} />
            <SubNavItem label="Delete QR" active={activeSection === 'delete'} onClick={() => setActiveSection('delete')} />
          </NavItem>

          {/* Resources */}
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-3">
            Resources
          </div>
          <NavItem label="Error Codes" onClick={() => setActiveSection('errors')} />
          <NavItem label="Code Examples" onClick={() => setActiveSection('examples')} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:ml-56">
          {/* Top Header */}
          <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#1a1f2e] rounded-lg flex items-center justify-center">
                  <Code className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Nexus QR API</span>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">v1.0</span>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="max-w-3xl mx-auto px-4 py-6">

            {/* Quick Start Section */}
            <section className="mb-8">
              <h1 className="text-sm font-semibold text-gray-900 mb-2">Quick Start</h1>
              <p className="text-xs text-gray-600 mb-4">
                Get started with the Nexus QR API in minutes. Create your first QR code with a simple API call.
              </p>

              <CodeBlock
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

            {/* Tip */}
            <div className="mb-8">
              <TipBox>
                Get your API key from the <strong>API Dashboard</strong> to start making requests.
              </TipBox>
            </div>

            {/* Authentication */}
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                Authentication
              </h2>
              <p className="text-xs text-gray-600 mb-4">
                Include your API key in the request header for authentication.
              </p>
              <CodeBlock
                code={`X-API-Key: nxqr_live_xxxxxxxxxxxx

// Or using Bearer token
Authorization: Bearer nxqr_live_xxxxxxxxxxxx`}
              />
            </section>

            {/* Warning */}
            <div className="mb-8">
              <WarningBox>
                Never expose your API key in client-side code. Use server-side requests only.
              </WarningBox>
            </div>

            {/* Endpoints */}
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Server className="w-4 h-4 text-gray-400" />
                API Endpoints
              </h2>

              <div className="space-y-2">
                <EndpointCard method="POST" path="/api/v1/qr" description="Create a new QR code">
                  <CodeBlock
                    code={`{
  "type": "url",
  "content": "https://example.com",
  "title": "My QR Code",
  "is_dynamic": true
}`}
                  />
                </EndpointCard>

                <EndpointCard method="GET" path="/api/v1/qr" description="List all QR codes">
                  <p className="text-xs text-gray-600">Query: page, limit, type, is_active</p>
                </EndpointCard>

                <EndpointCard method="GET" path="/api/v1/qr/{id}" description="Get a specific QR code" />

                <EndpointCard method="PATCH" path="/api/v1/qr/{id}" description="Update a QR code">
                  <CodeBlock code={`{ "content": "https://new-url.com" }`} />
                </EndpointCard>

                <EndpointCard method="DELETE" path="/api/v1/qr/{id}" description="Delete a QR code" />
              </div>
            </section>

            {/* Rate Limits */}
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Rate Limits
              </h2>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-600 uppercase">Plan</th>
                      <th className="text-center px-4 py-2 text-[10px] font-semibold text-gray-600 uppercase">Requests/Month</th>
                      <th className="text-center px-4 py-2 text-[10px] font-semibold text-gray-600 uppercase">Bulk API</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { plan: 'Free', requests: '100', bulk: false },
                      { plan: 'Starter', requests: '5,000', bulk: false },
                      { plan: 'Pro', requests: '50,000', bulk: true },
                      { plan: 'Enterprise', requests: 'Unlimited', bulk: true },
                    ].map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-xs font-medium text-gray-900">{row.plan}</td>
                        <td className="px-4 py-2 text-xs text-gray-600 text-center">{row.requests}</td>
                        <td className="px-4 py-2 text-center">
                          {row.bulk ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Error Codes */}
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                Error Codes
              </h2>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-600 uppercase">Code</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-600 uppercase">Error</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-600 uppercase">Solution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { code: '1001', error: 'Invalid API Key', solution: 'Check key or generate new' },
                      { code: '1002', error: 'Expired API Key', solution: 'Generate new key' },
                      { code: '2001', error: 'Rate Limit Exceeded', solution: 'Wait or upgrade plan' },
                      { code: '3001', error: 'Invalid Request', solution: 'Check JSON syntax' },
                    ].map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                          <code className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{row.code}</code>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-900">{row.error}</td>
                        <td className="px-4 py-2 text-xs text-gray-600">{row.solution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Next Steps */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              <button className="flex items-center gap-2 text-xs text-gray-900 font-medium">
                API Playground
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApiDocs;
