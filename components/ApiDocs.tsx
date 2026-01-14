import React, { useState } from 'react';
import {
  Search, Book, Map, Layout, Users, ChevronDown, ChevronRight,
  Copy, Check, Lightbulb, ArrowLeft, ArrowRight, ExternalLink,
  Code, Terminal, Key, Shield, Zap, Globe, Clock, Server,
  FileJson, Package, AlertTriangle, CheckCircle2, XCircle, Info
} from 'lucide-react';

// Sidebar Navigation Item
interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, badge, onClick, children }) => {
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
        <span className="text-sm font-medium flex-1">{label}</span>
        {badge && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-medium rounded-full">
            {badge}
          </span>
        )}
        {hasChildren && (
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? '' : '-rotate-90'}`} />
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

// Code Block with syntax highlighting
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

  // Simple syntax highlighting
  const highlightCode = (code: string) => {
    return code
      .replace(/(function|const|let|var|return|if|else|typeof|new|async|await|export|import|from)/g, '<span class="text-[#c586c0]">$1</span>')
      .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="text-[#ce9178]">$1</span>')
      .replace(/(\d+)/g, '<span class="text-[#b5cea8]">$1</span>')
      .replace(/(\/\/.*$)/gm, '<span class="text-[#6a9955]">$1</span>')
      .replace(/(\.\w+)\(/g, '<span class="text-[#dcdcaa]">$1</span>(')
      .replace(/(Math|console|JSON|Promise)/g, '<span class="text-[#4ec9b0]">$1</span>');
  };

  return (
    <div className="bg-[#1e1e2e] rounded-xl overflow-hidden relative group">
      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-1.5 bg-gray-700/50 hover:bg-gray-600 rounded-lg transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code
          className="text-xs font-mono leading-relaxed text-gray-300"
          dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
        />
      </pre>
    </div>
  );
};

// Tip/Callout Box
interface TipBoxProps {
  children: React.ReactNode;
}

const TipBox: React.FC<TipBoxProps> = ({ children }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
      <Lightbulb className="w-4 h-4 text-amber-600" />
    </div>
    <div>
      <div className="text-sm font-semibold text-amber-800 mb-1">Tip</div>
      <div className="text-xs text-amber-700">{children}</div>
    </div>
  </div>
);

// Warning Box
const WarningBox: React.FC<TipBoxProps> = ({ children }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
      <AlertTriangle className="w-4 h-4 text-red-600" />
    </div>
    <div>
      <div className="text-sm font-semibold text-red-800 mb-1">Warning</div>
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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span className={`${colors[method]} text-white text-[10px] font-bold px-2 py-1 rounded`}>
          {method}
        </span>
        <code className="text-xs font-mono text-gray-700 flex-1">{path}</code>
        <span className="text-xs text-gray-500 hidden md:block">{description}</span>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
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
  const [activeTab, setActiveTab] = useState('code');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const sections = [
    { id: 'quickstart', label: 'Quickstart' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'endpoints', label: 'Endpoints' },
    { id: 'errors', label: 'Error Codes' },
    { id: 'examples', label: 'Code Examples' },
  ];

  const handleBack = () => {
    if (onBack) onBack();
    else window.history.back();
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 hidden lg:block">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Fast search"
              className="w-full pl-9 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Main Nav */}
          <div className="space-y-1 mb-6">
            <NavItem icon={<Book className="w-4 h-4" />} label="Documentation" active />
            <NavItem icon={<Map className="w-4 h-4" />} label="Roadmap" />
            <NavItem icon={<Layout className="w-4 h-4" />} label="Templates" />
            <NavItem icon={<Users className="w-4 h-4" />} label="Community" />
          </div>

          {/* Intro Section */}
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Intro
          </div>
          <NavItem label="Getting started">
            <SubNavItem label="Install" active={activeSection === 'quickstart'} onClick={() => setActiveSection('quickstart')} />
            <SubNavItem label="Quickstart" onClick={() => setActiveSection('quickstart')} />
            <SubNavItem label="Usage" onClick={() => setActiveSection('authentication')} />
            <SubNavItem label="Layout" onClick={() => setActiveSection('endpoints')} />
            <SubNavItem label="Themes" onClick={() => setActiveSection('examples')} />
            <SubNavItem label="Private packages" />
          </NavItem>

          {/* Advanced Section */}
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-3">
            Advanced Usage
          </div>
          <NavItem label="Overview">
            <SubNavItem label="Components" onClick={() => setActiveSection('endpoints')} />
            <SubNavItem label="Error Handling" onClick={() => setActiveSection('errors')} />
          </NavItem>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {/* Top Header */}
          <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors lg:hidden"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#1a1f2e] rounded-lg flex items-center justify-center">
                  <Code className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-900">NexusQR</span>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">v1.0</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button className="text-xs text-gray-600 hover:text-gray-900">Community</button>
              <button className="text-xs text-gray-600 hover:text-gray-900">Reference</button>
              <button className="text-xs text-gray-600 hover:text-gray-900">Blog</button>
              <button className="text-xs text-gray-600 hover:text-gray-900">Sign In</button>
              <button className="px-3 py-1.5 bg-[#1a1f2e] text-white text-xs rounded-lg hover:bg-gray-800">
                Sign Up
              </button>
            </div>
          </header>

          {/* Content Area */}
          <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
              {['Live example', 'Figma Design', 'Code'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab.toLowerCase()
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'Code' && <Check className="w-3 h-3 inline mr-1" />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Quick Start Code */}
            <div className="mb-6">
              <CodeBlock
                language="javascript"
                code={`function createQRCode(data) {
  if (typeof data !== 'string' || data.length === 0) {
    return 'Invalid input';
  }

  const response = fetch('${baseUrl}/api/v1/qr', {
    method: 'POST',
    headers: {
      'X-API-Key': 'nxqr_live_xxxx',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type: 'url', content: data })
  });

  return response.json();
}

const qrCode = createQRCode('https://example.com');
console.log('QR Code created:', qrCode);`}
              />
            </div>

            {/* Description */}
            <p className="text-xs text-gray-600 leading-relaxed mb-6">
              This code defines a <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">createQRCode</code> function that generates a QR code based on the given input. It then uses this function to create a QR code for a URL and prints the result to the console. The code includes comments and input error handling to ensure robust execution.
            </p>

            {/* Tip Box */}
            <div className="mb-8">
              <TipBox>
                You can use <a href="#" className="text-amber-700 underline font-medium">API Playground</a> to test endpoints interactively.
              </TipBox>
            </div>

            {/* Authentication Section */}
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                Authentication
              </h2>
              <p className="text-xs text-gray-600 mb-4">
                All API requests require authentication using an API key. Include your key in the request headers.
              </p>
              <CodeBlock
                language="http"
                code={`// Header Authentication
X-API-Key: nxqr_live_xxxxxxxxxxxx

// Or using Bearer token
Authorization: Bearer nxqr_live_xxxxxxxxxxxx`}
              />
            </section>

            {/* Warning */}
            <div className="mb-8">
              <WarningBox>
                Never expose your API key in client-side code or public repositories. Use environment variables and server-side requests only.
              </WarningBox>
            </div>

            {/* Endpoints Section */}
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Server className="w-4 h-4 text-gray-400" />
                API Endpoints
              </h2>

              <div className="space-y-3">
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
                  <p className="text-xs text-gray-600 mb-2">Query params: page, limit, type, is_active</p>
                </EndpointCard>

                <EndpointCard method="GET" path="/api/v1/qr/{id}" description="Get a specific QR code">
                  <p className="text-xs text-gray-600">Returns full QR code details including analytics.</p>
                </EndpointCard>

                <EndpointCard method="PATCH" path="/api/v1/qr/{id}" description="Update a QR code">
                  <CodeBlock
                    code={`{
  "content": "https://new-url.com",
  "title": "Updated Title"
}`}
                  />
                </EndpointCard>

                <EndpointCard method="DELETE" path="/api/v1/qr/{id}" description="Delete a QR code">
                  <p className="text-xs text-gray-600">Permanently deletes the QR code. This action cannot be undone.</p>
                </EndpointCard>
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
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase">Plan</th>
                      <th className="text-center px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase">Requests/Month</th>
                      <th className="text-center px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase">Bulk API</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { plan: 'Free', requests: '100', bulk: false },
                      { plan: 'Starter', requests: '5,000', bulk: false },
                      { plan: 'Pro', requests: '50,000', bulk: true },
                      { plan: 'Enterprise', requests: 'Unlimited', bulk: true },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-medium text-gray-900">{row.plan}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 text-center">{row.requests}</td>
                        <td className="px-4 py-3 text-center">
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
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase">Code</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase">Error</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase">Solution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { code: '1001', error: 'Invalid API Key', solution: 'Check for typos or generate a new key' },
                      { code: '1002', error: 'Expired API Key', solution: 'Generate a new API key from dashboard' },
                      { code: '2001', error: 'Rate Limit Exceeded', solution: 'Wait for reset or upgrade plan' },
                      { code: '3001', error: 'Invalid Request Body', solution: 'Validate JSON syntax' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <code className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{row.code}</code>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">{row.error}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{row.solution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Next Steps Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Intro
              </button>
              <button className="flex items-center gap-2 text-xs text-gray-900 font-medium hover:text-blue-600 transition-colors">
                Quickstart
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
