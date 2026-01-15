'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Code,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  Save,
  History,
  Settings,
  Send,
  Globe,
  Lock,
  FileJson,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  Zap,
  Shield,
  Key,
  FolderOpen,
  File,
  Bookmark,
  Star,
  MoreVertical,
  ArrowRight,
  Box,
  Layers,
  Hash,
  Type,
  ToggleLeft,
  List,
  ArrowLeft
} from 'lucide-react';

interface ApiTestingSandboxProps {
  onBack?: () => void;
}

// Types
interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

interface RequestHistory {
  id: string;
  timestamp: Date;
  method: string;
  endpoint: string;
  status: number;
  duration: number;
  success: boolean;
}

interface SavedRequest {
  id: string;
  name: string;
  method: string;
  endpoint: string;
  headers: Header[];
  queryParams: QueryParam[];
  body: string;
  starred: boolean;
}

// HTTP Methods
const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type HttpMethod = typeof httpMethods[number];

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500',
  POST: 'bg-blue-500',
  PUT: 'bg-amber-500',
  PATCH: 'bg-purple-500',
  DELETE: 'bg-red-500'
};

// Preset endpoints
const presetEndpoints = [
  { method: 'POST', path: '/qr-codes', name: 'Create QR Code', body: JSON.stringify({ content: 'https://example.com', type: 'url', size: 300 }, null, 2) },
  { method: 'GET', path: '/qr-codes/{id}', name: 'Get QR Code', body: '' },
  { method: 'GET', path: '/qr-codes', name: 'List QR Codes', body: '' },
  { method: 'PATCH', path: '/qr-codes/{id}', name: 'Update QR Code', body: JSON.stringify({ name: 'Updated Name' }, null, 2) },
  { method: 'DELETE', path: '/qr-codes/{id}', name: 'Delete QR Code', body: '' },
  { method: 'GET', path: '/analytics/{id}', name: 'Get Analytics', body: '' },
  { method: 'POST', path: '/webhooks', name: 'Create Webhook', body: JSON.stringify({ url: 'https://example.com/webhook', events: ['qr.scanned'] }, null, 2) },
  { method: 'GET', path: '/account', name: 'Get Account Info', body: '' }
];

// Mock response generator
const generateMockResponse = (method: string, endpoint: string): { status: number; data: any; headers: Record<string, string> } => {
  const baseResponse = {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': `req_${Math.random().toString(36).substr(2, 9)}`,
      'X-RateLimit-Limit': '1000',
      'X-RateLimit-Remaining': '999',
      'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString()
    }
  };

  if (endpoint.includes('/qr-codes') && method === 'POST') {
    return {
      ...baseResponse,
      status: 201,
      data: {
        success: true,
        data: {
          id: `qr_${Math.random().toString(36).substr(2, 9)}`,
          content: 'https://example.com',
          type: 'url',
          short_url: `https://nxqr.io/${Math.random().toString(36).substr(2, 6)}`,
          image_url: 'https://cdn.nexusqr.com/qr/sample.png',
          created_at: new Date().toISOString(),
          settings: {
            size: 300,
            color: '#000000',
            background: '#ffffff',
            error_correction: 'M'
          }
        }
      }
    };
  }

  if (endpoint.includes('/qr-codes') && method === 'GET' && !endpoint.includes('{id}')) {
    return {
      ...baseResponse,
      status: 200,
      data: {
        success: true,
        data: [
          { id: 'qr_abc123', content: 'https://example.com', total_scans: 1542, created_at: '2024-01-10T10:00:00Z' },
          { id: 'qr_def456', content: 'https://mysite.com', total_scans: 892, created_at: '2024-01-12T14:30:00Z' },
          { id: 'qr_ghi789', content: 'Contact vCard', total_scans: 234, created_at: '2024-01-15T09:15:00Z' }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          total_pages: 1
        }
      }
    };
  }

  if (endpoint.includes('/analytics')) {
    return {
      ...baseResponse,
      status: 200,
      data: {
        success: true,
        data: {
          total_scans: 15420,
          unique_visitors: 8932,
          avg_daily_scans: 124,
          top_countries: [
            { country: 'US', scans: 5420 },
            { country: 'UK', scans: 2180 },
            { country: 'DE', scans: 1850 }
          ],
          devices: {
            mobile: 72,
            desktop: 23,
            tablet: 5
          },
          peak_hour: 14
        }
      }
    };
  }

  if (endpoint.includes('/account')) {
    return {
      ...baseResponse,
      status: 200,
      data: {
        success: true,
        data: {
          id: 'acc_123456',
          email: 'developer@example.com',
          plan: 'professional',
          created_at: '2023-06-15T10:00:00Z',
          usage: {
            qr_codes: { used: 450, limit: 1000 },
            api_calls: { used: 15420, limit: 100000 },
            storage: { used_mb: 2400, limit_mb: 10240 }
          }
        }
      }
    };
  }

  // Default response
  return {
    ...baseResponse,
    status: 200,
    data: {
      success: true,
      data: {
        id: `${Math.random().toString(36).substr(2, 9)}`,
        message: 'Request processed successfully'
      }
    }
  };
};

export default function ApiTestingSandbox({ onBack }: ApiTestingSandboxProps) {
  // Request state
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [endpoint, setEndpoint] = useState('/qr-codes');
  const [headers, setHeaders] = useState<Header[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'Authorization', value: 'Bearer your_api_key_here', enabled: true }
  ]);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([
    { key: 'page', value: '1', enabled: false },
    { key: 'limit', value: '20', enabled: false }
  ]);
  const [body, setBody] = useState('');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth'>('params');

  // Response state
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'code'>('body');

  // History & saved
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Environment
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [apiKey, setApiKey] = useState('nxqr_test_xxxxxxxxxxxxxxxxxxxxxxxx');
  const [showApiKey, setShowApiKey] = useState(false);

  // Copied state
  const [copied, setCopied] = useState<string | null>(null);

  // Base URL based on environment
  const baseUrl = environment === 'sandbox'
    ? 'https://api-sandbox.nexusqr.com/v1'
    : 'https://api.nexusqr.com/v1';

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Add header
  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  // Remove header
  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  // Update header
  const updateHeader = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  // Add query param
  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '', enabled: true }]);
  };

  // Remove query param
  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  // Update query param
  const updateQueryParam = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newParams = [...queryParams];
    newParams[index] = { ...newParams[index], [field]: value };
    setQueryParams(newParams);
  };

  // Send request
  const sendRequest = async () => {
    setIsLoading(true);
    setResponse(null);
    setResponseStatus(null);
    setResponseTime(null);

    const startTime = Date.now();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const mockResponse = generateMockResponse(method, endpoint);
    const duration = Date.now() - startTime;

    setResponse(mockResponse.data);
    setResponseStatus(mockResponse.status);
    setResponseHeaders(mockResponse.headers);
    setResponseTime(duration);
    setIsLoading(false);

    // Add to history
    const historyItem: RequestHistory = {
      id: `hist_${Date.now()}`,
      timestamp: new Date(),
      method,
      endpoint,
      status: mockResponse.status,
      duration,
      success: mockResponse.status >= 200 && mockResponse.status < 300
    };
    setHistory([historyItem, ...history.slice(0, 49)]);
  };

  // Load preset
  const loadPreset = (preset: typeof presetEndpoints[0]) => {
    setMethod(preset.method as HttpMethod);
    setEndpoint(preset.path);
    setBody(preset.body);
  };

  // Save request
  const saveRequest = () => {
    const newSaved: SavedRequest = {
      id: `saved_${Date.now()}`,
      name: `${method} ${endpoint}`,
      method,
      endpoint,
      headers,
      queryParams,
      body,
      starred: false
    };
    setSavedRequests([newSaved, ...savedRequests]);
  };

  // Load saved request
  const loadSavedRequest = (saved: SavedRequest) => {
    setMethod(saved.method as HttpMethod);
    setEndpoint(saved.endpoint);
    setHeaders(saved.headers);
    setQueryParams(saved.queryParams);
    setBody(saved.body);
    setShowSaved(false);
  };

  // Generate code snippet
  const generateCodeSnippet = (lang: 'curl' | 'nodejs' | 'python' | 'php'): string => {
    const enabledHeaders = headers.filter(h => h.enabled && h.key);
    const enabledParams = queryParams.filter(p => p.enabled && p.key);
    const queryString = enabledParams.length > 0
      ? '?' + enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
      : '';

    switch (lang) {
      case 'curl':
        let curl = `curl -X ${method} "${baseUrl}${endpoint}${queryString}"`;
        enabledHeaders.forEach(h => {
          curl += ` \\\n  -H "${h.key}: ${h.value}"`;
        });
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
          curl += ` \\\n  -d '${body.replace(/\n/g, '')}'`;
        }
        return curl;

      case 'nodejs':
        return `const response = await fetch('${baseUrl}${endpoint}${queryString}', {
  method: '${method}',
  headers: {
${enabledHeaders.map(h => `    '${h.key}': '${h.value}'`).join(',\n')}
  }${body && ['POST', 'PUT', 'PATCH'].includes(method) ? `,
  body: JSON.stringify(${body})` : ''}
});

const data = await response.json();
console.log(data);`;

      case 'python':
        return `import requests

response = requests.${method.toLowerCase()}(
    '${baseUrl}${endpoint}${queryString}',
    headers={
${enabledHeaders.map(h => `        '${h.key}': '${h.value}'`).join(',\n')}
    }${body && ['POST', 'PUT', 'PATCH'].includes(method) ? `,
    json=${body}` : ''}
)

print(response.json())`;

      case 'php':
        return `<?php
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, '${baseUrl}${endpoint}${queryString}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method}');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
${enabledHeaders.map(h => `    '${h.key}: ${h.value}'`).join(',\n')}
]);${body && ['POST', 'PUT', 'PATCH'].includes(method) ? `
curl_setopt($ch, CURLOPT_POSTFIELDS, '${body.replace(/\n/g, '').replace(/'/g, "\\'")}');` : ''}

$response = curl_exec($ch);
curl_close($ch);

echo $response;`;

      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-gray-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-72 bg-white shadow-sm flex flex-col">
          {/* Back Button & Logo */}
          <div className="p-4 border-b border-gray-100">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                <Terminal className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h1 className="font-semibold text-sm text-gray-900">API Sandbox</h1>
                <p className="text-xs text-gray-500">Interactive Testing</p>
              </div>
            </div>
          </div>

          {/* Environment Selector */}
          <div className="p-4 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">Environment</div>
            <div className="flex bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setEnvironment('sandbox')}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all ${
                  environment === 'sandbox'
                    ? 'bg-[#E5FF00] text-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Sandbox
              </button>
              <button
                onClick={() => setEnvironment('production')}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all ${
                  environment === 'production'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Production
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {baseUrl}
            </div>
          </div>

          {/* Quick Endpoints */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs font-medium text-gray-500 mb-2 flex items-center justify-between">
              <span>Quick Endpoints</span>
              <button className="text-gray-400 hover:text-gray-900">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {presetEndpoints.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => loadPreset(preset)}
                  className="w-full flex items-center gap-2 p-2 rounded-[12px] hover:bg-gray-50 transition-colors text-left"
                >
                  <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${methodColors[preset.method as HttpMethod]} text-white`}>
                    {preset.method.slice(0, 3)}
                  </span>
                  <span className="text-xs text-gray-700 truncate flex-1">{preset.name}</span>
                </button>
              ))}
            </div>

            {/* Saved Requests */}
            <div className="mt-6">
              <button
                onClick={() => setShowSaved(!showSaved)}
                className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2 w-full"
              >
                {showSaved ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Bookmark className="w-3 h-3" />
                <span>Saved Requests</span>
                <span className="ml-auto text-gray-400">{savedRequests.length}</span>
              </button>
              {showSaved && savedRequests.length > 0 && (
                <div className="space-y-1">
                  {savedRequests.map(saved => (
                    <button
                      key={saved.id}
                      onClick={() => loadSavedRequest(saved)}
                      className="w-full flex items-center gap-2 p-2 rounded-[12px] hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${methodColors[saved.method as HttpMethod]} text-white`}>
                        {saved.method.slice(0, 3)}
                      </span>
                      <span className="text-xs text-gray-700 truncate flex-1">{saved.name}</span>
                      {saved.starred && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            <div className="mt-6">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2 w-full"
              >
                {showHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <History className="w-3 h-3" />
                <span>History</span>
                <span className="ml-auto text-gray-400">{history.length}</span>
              </button>
              {showHistory && history.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {history.slice(0, 10).map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setMethod(item.method as HttpMethod);
                        setEndpoint(item.endpoint);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-[12px] hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className={`w-2 h-2 rounded-full ${item.success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${methodColors[item.method as HttpMethod]} text-white`}>
                        {item.method.slice(0, 3)}
                      </span>
                      <span className="text-xs text-gray-500 truncate flex-1">{item.endpoint}</span>
                      <span className="text-xs text-gray-400">{item.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* API Key */}
          <div className="p-4 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Key className="w-3 h-3" />
              API Key
            </div>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 pr-16 bg-gray-100 border-0 rounded-full text-xs font-mono text-gray-700"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
              >
                {showApiKey ? (
                  <EyeOff className="w-3 h-3 text-gray-400" />
                ) : (
                  <Eye className="w-3 h-3 text-gray-400" />
                )}
              </button>
              <button
                onClick={() => copyToClipboard(apiKey, 'apikey')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
              >
                {copied === 'apikey' ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {/* Request Builder */}
          <div className="bg-white rounded-[20px] shadow-sm p-5 mb-4">
            {/* URL Bar */}
            <div className="flex gap-2">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className={`px-4 py-2.5 rounded-full font-bold text-white border-0 text-sm ${methodColors[method]} focus:ring-2 focus:ring-offset-2`}
              >
                {httpMethods.map(m => (
                  <option key={m} value={m} className="bg-gray-800">{m}</option>
                ))}
              </select>

              <div className="flex-1 flex bg-gray-100 rounded-full overflow-hidden">
                <span className="px-3 py-2.5 text-gray-400 text-xs bg-gray-200">
                  {baseUrl}
                </span>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/endpoint"
                  className="flex-1 px-3 py-2.5 bg-transparent border-0 focus:ring-0 font-mono text-xs text-gray-700"
                />
              </div>

              <button
                onClick={sendRequest}
                disabled={isLoading}
                className="px-6 py-2.5 bg-[#E5FF00] hover:bg-[#d4ee00] disabled:opacity-50 rounded-full font-semibold text-gray-900 flex items-center gap-2 transition-all text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send
                  </>
                )}
              </button>

              <button
                onClick={saveRequest}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                title="Save Request"
              >
                <Save className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Request Tabs */}
            <div className="mt-4">
              <div className="flex gap-1 border-b border-gray-200">
                {(['params', 'headers', 'body', 'auth'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-gray-900 border-b-2 border-[#E5FF00]'
                        : 'text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {tab}
                    {tab === 'params' && queryParams.filter(p => p.enabled).length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#E5FF00] text-gray-900 rounded-full">
                        {queryParams.filter(p => p.enabled).length}
                      </span>
                    )}
                    {tab === 'headers' && headers.filter(h => h.enabled).length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#E5FF00] text-gray-900 rounded-full">
                        {headers.filter(h => h.enabled).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 max-h-48 overflow-y-auto">
                {/* Query Params */}
                {activeTab === 'params' && (
                  <div className="space-y-2">
                    {queryParams.map((param, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={param.enabled}
                          onChange={(e) => updateQueryParam(i, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 bg-gray-100 text-[#E5FF00] focus:ring-[#E5FF00]"
                        />
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => updateQueryParam(i, 'key', e.target.value)}
                          placeholder="Key"
                          className="flex-1 px-3 py-2 bg-gray-100 border-0 rounded-full text-xs"
                        />
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => updateQueryParam(i, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 bg-gray-100 border-0 rounded-full text-xs"
                        />
                        <button
                          onClick={() => removeQueryParam(i)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addQueryParam}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Parameter
                    </button>
                  </div>
                )}

                {/* Headers */}
                {activeTab === 'headers' && (
                  <div className="space-y-2">
                    {headers.map((header, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={header.enabled}
                          onChange={(e) => updateHeader(i, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 bg-gray-100 text-[#E5FF00] focus:ring-[#E5FF00]"
                        />
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => updateHeader(i, 'key', e.target.value)}
                          placeholder="Header"
                          className="flex-1 px-3 py-2 bg-gray-100 border-0 rounded-full text-xs"
                        />
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => updateHeader(i, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 bg-gray-100 border-0 rounded-full text-xs"
                        />
                        <button
                          onClick={() => removeHeader(i)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addHeader}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Header
                    </button>
                  </div>
                )}

                {/* Body */}
                {activeTab === 'body' && (
                  <div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Request body (JSON)"
                      rows={6}
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded-[16px] font-mono text-xs resize-none text-gray-700"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => {
                          try {
                            setBody(JSON.stringify(JSON.parse(body), null, 2));
                          } catch (e) {
                            // Invalid JSON
                          }
                        }}
                        className="px-3 py-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        Format JSON
                      </button>
                    </div>
                  </div>
                )}

                {/* Auth */}
                {activeTab === 'auth' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-2">Authentication Type</label>
                        <select className="w-full px-3 py-2 bg-gray-100 border-0 rounded-full text-xs">
                          <option>Bearer Token</option>
                          <option>API Key</option>
                          <option>Basic Auth</option>
                          <option>OAuth 2.0</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Token</label>
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-100 border-0 rounded-full font-mono text-xs"
                        placeholder="Enter your API key"
                      />
                    </div>
                    <div className="p-3 bg-gray-50 rounded-[12px] text-xs text-gray-500">
                      The token will be added to the Authorization header as: <code className="text-cyan-600">Bearer {'{token}'}</code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Response Area */}
          <div className="flex-1 bg-white rounded-[20px] shadow-sm p-5 flex flex-col overflow-hidden">
            {/* Response Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold text-sm text-gray-900">Response</h2>
                {responseStatus && (
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-green-100 text-green-600'
                        : responseStatus >= 400
                        ? 'bg-red-100 text-red-600'
                        : 'bg-amber-100 text-amber-600'
                    }`}>
                      {responseStatus} {responseStatus === 200 ? 'OK' : responseStatus === 201 ? 'Created' : ''}
                    </span>
                    {responseTime && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {responseTime}ms
                      </span>
                    )}
                  </div>
                )}
              </div>

              {response && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(response, null, 2), 'response')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    {copied === 'response' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Response Tabs */}
            {response && (
              <div className="flex gap-1 border-b border-gray-200 mb-4">
                {(['body', 'headers', 'code'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setResponseTab(tab)}
                    className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                      responseTab === tab
                        ? 'text-gray-900 border-b-2 border-[#E5FF00]'
                        : 'text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {tab === 'code' ? 'Code Snippet' : tab}
                  </button>
                ))}
              </div>
            )}

            {/* Response Content */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p className="text-sm">Sending request...</p>
                </div>
              ) : response ? (
                <>
                  {responseTab === 'body' && (
                    <pre className="p-4 bg-gray-900 rounded-[16px] overflow-auto text-xs font-mono text-gray-300 h-full">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  )}

                  {responseTab === 'headers' && (
                    <div className="space-y-2">
                      {Object.entries(responseHeaders).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-[12px]">
                          <span className="font-medium text-cyan-600 min-w-48 text-xs">{key}</span>
                          <span className="text-gray-700 font-mono text-xs">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {responseTab === 'code' && (
                    <div className="space-y-4">
                      {(['curl', 'nodejs', 'python', 'php'] as const).map(lang => (
                        <div key={lang} className="bg-gray-900 rounded-[16px] overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                            <span className="text-xs font-medium text-white capitalize">{lang}</span>
                            <button
                              onClick={() => copyToClipboard(generateCodeSnippet(lang), lang)}
                              className="p-1 hover:bg-gray-700 rounded-full"
                            >
                              {copied === lang ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                          <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto">
                            {generateCodeSnippet(lang)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Terminal className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Ready to send a request</p>
                  <p className="text-xs text-gray-500">Select an endpoint and click Send to see the response</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
