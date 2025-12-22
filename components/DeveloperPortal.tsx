import React, { useState } from 'react';
import {
  Code, Book, Key, Zap, Terminal, Globe, Webhook, BarChart3,
  ArrowRight, ExternalLink, Play, Copy, Check, Search,
  FileText, MessageSquare, Github, Slack, ChevronRight,
  Sparkles, Shield, Clock, Users, Star, TrendingUp,
  Package, Cpu, Database, Lock, RefreshCw, Activity
} from 'lucide-react';

interface QuickLink {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
}

interface CodeExample {
  language: string;
  label: string;
  code: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Quick setup guide to make your first API call',
    icon: Zap,
    href: '#getting-started',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    description: 'Complete endpoint documentation',
    icon: Book,
    href: '#api-reference',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'sdk-libraries',
    title: 'SDK Libraries',
    description: 'Official SDKs for popular languages',
    icon: Package,
    href: '#sdks',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    id: 'api-playground',
    title: 'API Playground',
    description: 'Test endpoints in your browser',
    icon: Terminal,
    href: '#playground',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    description: 'Real-time event notifications',
    icon: Webhook,
    href: '#webhooks',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  {
    id: 'changelog',
    title: 'Changelog',
    description: 'Latest updates and changes',
    icon: RefreshCw,
    href: '#changelog',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  }
];

const CODE_EXAMPLES: CodeExample[] = [
  {
    language: 'curl',
    label: 'cURL',
    code: `curl -X POST https://api.nexusqr.com/v1/qr \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com", "type": "dynamic"}'`
  },
  {
    language: 'javascript',
    label: 'Node.js',
    code: `const nexusqr = require('nexusqr');

const client = new nexusqr.Client('YOUR_API_KEY');

const qr = await client.qr.create({
  url: 'https://example.com',
  type: 'dynamic'
});

console.log(qr.short_url);`
  },
  {
    language: 'python',
    label: 'Python',
    code: `import nexusqr

client = nexusqr.Client('YOUR_API_KEY')

qr = client.qr.create(
    url='https://example.com',
    type='dynamic'
)

print(qr.short_url)`
  }
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Generate QR codes in under 100ms with our globally distributed infrastructure'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption and granular API key permissions'
  },
  {
    icon: BarChart3,
    title: 'Rich Analytics',
    description: 'Track scans in real-time with geographic, device, and time-based insights'
  },
  {
    icon: Globe,
    title: '99.99% Uptime',
    description: 'Redundant infrastructure across multiple regions ensures reliability'
  }
];

const SDK_LIBRARIES = [
  { name: 'Node.js', icon: '⬢', color: 'text-green-600', install: 'npm install nexusqr' },
  { name: 'Python', icon: '🐍', color: 'text-blue-600', install: 'pip install nexusqr' },
  { name: 'PHP', icon: '🐘', color: 'text-purple-600', install: 'composer require nexusqr/nexusqr-php' },
  { name: 'Go', icon: '🔷', color: 'text-cyan-600', install: 'go get github.com/nexusqr/nexusqr-go' },
  { name: 'Ruby', icon: '💎', color: 'text-red-600', install: 'gem install nexusqr' },
  { name: 'Java', icon: '☕', color: 'text-amber-600', install: 'implementation "com.nexusqr:sdk:1.0"' }
];

interface DeveloperPortalProps {
  onNavigate?: (section: string) => void;
}

const DeveloperPortal: React.FC<DeveloperPortalProps> = ({ onNavigate }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentExample = CODE_EXAMPLES.find(e => e.language === selectedLanguage) || CODE_EXAMPLES[0];

  const copyCode = () => {
    navigator.clipboard.writeText(currentExample.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-indigo-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              API Version 1.0 Now Available
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Build with the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                NexusQR API
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Create, manage, and track QR codes programmatically. Our RESTful API
              powers millions of QR codes worldwide.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => onNavigate?.('getting-started')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate?.('api-reference')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors border border-white/20"
              >
                <Book className="w-4 h-4" />
                View Documentation
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm"
              />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 rounded text-xs text-gray-400">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Quick Start Code */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <div className="flex gap-1">
                {CODE_EXAMPLES.map((example) => (
                  <button
                    key={example.language}
                    onClick={() => setSelectedLanguage(example.language)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedLanguage === example.language
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {example.label}
                  </button>
                ))}
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code className="text-green-400 font-mono">{currentExample.code}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">
          Explore the Documentation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_LINKS.map((link) => {
            const LinkIcon = link.icon;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate?.(link.id)}
                className="group p-6 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-2xl text-left transition-all hover:border-gray-600 hover:shadow-xl"
              >
                <div className={`w-12 h-12 ${link.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                  <LinkIcon className={`w-6 h-6 ${link.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  {link.title}
                  <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </h3>
                <p className="text-gray-400 text-sm">{link.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">
          Why Developers Choose NexusQR
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, idx) => {
            const FeatureIcon = feature.icon;
            return (
              <div key={idx} className="text-center">
                <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FeatureIcon className="w-7 h-7 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SDK Libraries */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-3xl border border-indigo-500/20 p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Official SDK Libraries
            </h2>
            <p className="text-gray-400">
              Get started quickly with our official SDKs for popular programming languages
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SDK_LIBRARIES.map((sdk) => (
              <button
                key={sdk.name}
                className="group p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center transition-all"
              >
                <span className="text-3xl mb-2 block">{sdk.icon}</span>
                <span className="text-white font-medium block mb-1">{sdk.name}</span>
                <code className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  {sdk.install.split(' ').slice(-1)}
                </code>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '500M+', label: 'API Calls / Month' },
            { value: '99.99%', label: 'Uptime SLA' },
            { value: '<50ms', label: 'Avg Response Time' },
            { value: '10,000+', label: 'Active Developers' }
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Building?
          </h2>
          <p className="text-indigo-100 mb-8 max-w-xl mx-auto">
            Create a free account and get your API key in minutes.
            No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-medium hover:bg-gray-100 transition-colors">
              <Key className="w-4 h-4" />
              Get Your API Key
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors">
              <Github className="w-4 h-4" />
              View on GitHub
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">API Reference</a>
              <a href="#" className="hover:text-white transition-colors">SDKs</a>
              <a href="#" className="hover:text-white transition-colors">Status</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 text-gray-400 hover:text-white transition-colors">
                <Slack className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 text-gray-400 hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperPortal;
