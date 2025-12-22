import React, { useState } from 'react';
import { Play, Copy, Check, ChevronDown, Code, Send, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  name: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  exampleResponse: object;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'create-qr',
    method: 'POST',
    path: '/api/v1/qr',
    name: 'Create QR Code',
    description: 'Generate a new QR code with custom styling',
    body: [
      { name: 'url', type: 'string', required: true, description: 'Target URL for the QR code' },
      { name: 'style', type: 'string', required: false, description: 'Style preset (modern, classic, minimal)' },
      { name: 'size', type: 'number', required: false, description: 'Size in pixels (default: 300)' },
      { name: 'color', type: 'string', required: false, description: 'Foreground color (hex)' },
      { name: 'background', type: 'string', required: false, description: 'Background color (hex)' },
      { name: 'logo_url', type: 'string', required: false, description: 'URL of logo to embed' }
    ],
    exampleResponse: {
      success: true,
      data: {
        id: 'qr_abc123xyz',
        short_url: 'https://nxqr.io/abc123',
        qr_image_url: 'https://cdn.nexusqr.com/qr/abc123.png',
        created_at: '2024-01-15T10:30:00Z'
      }
    }
  },
  {
    id: 'get-qr',
    method: 'GET',
    path: '/api/v1/qr/{id}',
    name: 'Get QR Code',
    description: 'Retrieve details of a specific QR code',
    params: [
      { name: 'id', type: 'string', required: true, description: 'QR code ID' }
    ],
    exampleResponse: {
      success: true,
      data: {
        id: 'qr_abc123xyz',
        url: 'https://example.com',
        short_url: 'https://nxqr.io/abc123',
        qr_image_url: 'https://cdn.nexusqr.com/qr/abc123.png',
        scans: 1250,
        created_at: '2024-01-15T10:30:00Z',
        is_active: true
      }
    }
  },
  {
    id: 'list-qr',
    method: 'GET',
    path: '/api/v1/qr',
    name: 'List QR Codes',
    description: 'Get all QR codes for your account',
    params: [
      { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 20, max: 100)' },
      { name: 'sort', type: 'string', required: false, description: 'Sort by field (created_at, scans)' }
    ],
    exampleResponse: {
      success: true,
      data: {
        items: [
          { id: 'qr_abc123xyz', url: 'https://example.com', scans: 1250 },
          { id: 'qr_def456uvw', url: 'https://test.com', scans: 890 }
        ],
        pagination: { page: 1, limit: 20, total: 45, pages: 3 }
      }
    }
  },
  {
    id: 'update-qr',
    method: 'PATCH',
    path: '/api/v1/qr/{id}',
    name: 'Update QR Code',
    description: 'Update QR code destination or settings',
    params: [
      { name: 'id', type: 'string', required: true, description: 'QR code ID' }
    ],
    body: [
      { name: 'url', type: 'string', required: false, description: 'New target URL' },
      { name: 'is_active', type: 'boolean', required: false, description: 'Enable/disable QR code' }
    ],
    exampleResponse: {
      success: true,
      data: {
        id: 'qr_abc123xyz',
        url: 'https://new-destination.com',
        updated_at: '2024-01-16T14:20:00Z'
      }
    }
  },
  {
    id: 'delete-qr',
    method: 'DELETE',
    path: '/api/v1/qr/{id}',
    name: 'Delete QR Code',
    description: 'Permanently delete a QR code',
    params: [
      { name: 'id', type: 'string', required: true, description: 'QR code ID' }
    ],
    exampleResponse: {
      success: true,
      message: 'QR code deleted successfully'
    }
  },
  {
    id: 'get-analytics',
    method: 'GET',
    path: '/api/v1/qr/{id}/analytics',
    name: 'Get QR Analytics',
    description: 'Get detailed scan analytics for a QR code',
    params: [
      { name: 'id', type: 'string', required: true, description: 'QR code ID' },
      { name: 'period', type: 'string', required: false, description: 'Time period (7d, 30d, 90d, 1y)' }
    ],
    exampleResponse: {
      success: true,
      data: {
        total_scans: 1250,
        unique_scans: 980,
        scans_by_date: [
          { date: '2024-01-14', scans: 45 },
          { date: '2024-01-15', scans: 62 }
        ],
        top_locations: [
          { country: 'US', city: 'New York', scans: 320 },
          { country: 'UK', city: 'London', scans: 180 }
        ],
        top_devices: [
          { device: 'iPhone', scans: 540 },
          { device: 'Android', scans: 420 }
        ]
      }
    }
  },
  {
    id: 'bulk-create',
    method: 'POST',
    path: '/api/v1/qr/bulk',
    name: 'Bulk Create QR Codes',
    description: 'Create multiple QR codes in a single request',
    body: [
      { name: 'qr_codes', type: 'array', required: true, description: 'Array of QR code objects' }
    ],
    exampleResponse: {
      success: true,
      data: {
        created: 10,
        failed: 0,
        items: [
          { id: 'qr_abc123xyz', url: 'https://example1.com' },
          { id: 'qr_def456uvw', url: 'https://example2.com' }
        ]
      }
    }
  }
];

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  POST: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  PUT: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  PATCH: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  DELETE: { bg: 'bg-red-500/20', text: 'text-red-400' }
};

interface ApiPlaygroundProps {
  onBack: () => void;
  apiKey?: string;
}

const ApiPlayground: React.FC<ApiPlaygroundProps> = ({ onBack, apiKey }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [params, setParams] = useState<Record<string, string>>({});
  const [body, setBody] = useState<string>('');
  const [response, setResponse] = useState<{ status: number; data: object; time: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [userApiKey, setUserApiKey] = useState(apiKey || '');

  const baseUrl = environment === 'sandbox'
    ? '' // Use same origin for sandbox (local API)
    : ''; // Use same origin for production too

  // Get the actual API base URL
  const getApiBaseUrl = () => {
    // Use the current origin for API calls
    return window.location.origin;
  };

  const handleEndpointSelect = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setIsDropdownOpen(false);
    setParams({});
    setResponse(null);

    // Set default body for POST/PUT/PATCH based on endpoint
    if (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') {
      if (endpoint.id === 'create-qr') {
        // Default body for creating QR code - matches API spec
        setBody(JSON.stringify({
          type: 'url',
          content: 'https://example.com',
          title: 'My QR Code',
          is_dynamic: true,
          options: {
            width: 400,
            margin: 2,
            color: '#000000',
            background: '#ffffff',
            format: 'png',
            error_correction: 'M'
          }
        }, null, 2));
      } else if (endpoint.id === 'bulk-create') {
        setBody(JSON.stringify({
          items: [
            { type: 'url', content: 'https://example1.com', title: 'QR 1' },
            { type: 'url', content: 'https://example2.com', title: 'QR 2' }
          ]
        }, null, 2));
      } else if (endpoint.id === 'update-qr') {
        setBody(JSON.stringify({
          content: 'https://updated-url.com',
          title: 'Updated QR Code',
          is_active: true
        }, null, 2));
      } else {
        setBody('{}');
      }
    } else {
      setBody('');
    }
  };

  const buildUrl = (): string => {
    let path = selectedEndpoint.path;
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        path = path.replace(`{${key}}`, value);
      }
    });

    // Add query params for GET requests
    if (selectedEndpoint.method === 'GET' && selectedEndpoint.params) {
      const queryParams = selectedEndpoint.params
        .filter(p => !selectedEndpoint.path.includes(`{${p.name}}`))
        .map(p => params[p.name] ? `${p.name}=${encodeURIComponent(params[p.name])}` : null)
        .filter(Boolean);

      if (queryParams.length > 0) {
        path += `?${queryParams.join('&')}`;
      }
    }

    // Use actual API URL for display
    const displayUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${path}`
      : `https://your-domain.com${path}`;

    return displayUrl;
  };

  const generateCurl = (): string => {
    let curl = `curl -X ${selectedEndpoint.method} "${buildUrl()}"`;
    curl += ` \\\n  -H "X-API-Key: ${userApiKey || 'YOUR_API_KEY'}"`;
    curl += ` \\\n  -H "Content-Type: application/json"`;

    if (body && ['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method)) {
      // Format body for curl
      try {
        const parsedBody = JSON.parse(body);
        curl += ` \\\n  -d '${JSON.stringify(parsedBody)}'`;
      } catch {
        curl += ` \\\n  -d '${body.replace(/\n/g, '').replace(/'/g, "\\'")}'`;
      }
    }

    return curl;
  };

  const handleSendRequest = async () => {
    if (!userApiKey) {
      setResponse({
        status: 401,
        data: { error: { code: 'MISSING_API_KEY', message: 'Please enter your API key above' } },
        time: 0
      });
      return;
    }

    setIsLoading(true);
    const startTime = performance.now();

    try {
      // Build the actual request URL
      let requestPath = selectedEndpoint.path;

      // Replace path parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          requestPath = requestPath.replace(`{${key}}`, value);
        }
      });

      // Add query params for GET requests
      if (selectedEndpoint.method === 'GET' && selectedEndpoint.params) {
        const queryParams = selectedEndpoint.params
          .filter(p => !selectedEndpoint.path.includes(`{${p.name}}`))
          .map(p => params[p.name] ? `${p.name}=${encodeURIComponent(params[p.name])}` : null)
          .filter(Boolean);

        if (queryParams.length > 0) {
          requestPath += `?${queryParams.join('&')}`;
        }
      }

      const apiUrl = `${getApiBaseUrl()}${requestPath}`;

      // Prepare request options
      const requestOptions: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': userApiKey,
          'Authorization': `Bearer ${userApiKey}`
        }
      };

      // Add body for POST/PUT/PATCH requests
      if (body && ['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method)) {
        try {
          requestOptions.body = body;
          // Validate JSON
          JSON.parse(body);
        } catch (e) {
          setResponse({
            status: 400,
            data: { error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
            time: 0
          });
          setIsLoading(false);
          return;
        }
      }

      // Make the actual API call
      const res = await fetch(apiUrl, requestOptions);
      const endTime = performance.now();

      let responseData;
      const contentType = res.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await res.json();
      } else {
        const text = await res.text();
        responseData = { raw: text };
      }

      setResponse({
        status: res.status,
        data: responseData,
        time: Math.round(endTime - startTime)
      });

    } catch (error: any) {
      const endTime = performance.now();

      // Handle network errors or other exceptions
      setResponse({
        status: 0,
        data: {
          error: {
            code: 'NETWORK_ERROR',
            message: error.message || 'Failed to connect to API. Check if the server is running.',
            hint: 'This might be a CORS issue or the API server is not available.'
          }
        },
        time: Math.round(endTime - startTime)
      });
    }

    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Play className="w-6 h-6 text-purple-400" />
                API Playground
              </h1>
              <p className="text-gray-400 text-sm">Test API endpoints in real-time</p>
            </div>
          </div>

          {/* Environment Toggle */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setEnvironment('sandbox')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                environment === 'sandbox'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              🧪 Sandbox
            </button>
            <button
              onClick={() => setEnvironment('production')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                environment === 'production'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              🚀 Production
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Key
          </label>
          <div className="flex gap-4">
            <input
              type="password"
              value={userApiKey}
              onChange={(e) => setUserApiKey(e.target.value)}
              placeholder={environment === 'sandbox' ? 'nxqr_test_xxxx...' : 'nxqr_live_xxxx...'}
              className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              environment === 'sandbox'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {environment === 'sandbox' ? 'Test Mode' : 'Live Mode'}
            </div>
          </div>
          {environment === 'sandbox' && (
            <p className="text-amber-400/70 text-xs mt-2">
              💡 Use test API keys (nxqr_test_xxx) in sandbox mode. No real data will be affected.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Request */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Request</h2>

              {/* Endpoint Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-left hover:border-gray-500 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${METHOD_COLORS[selectedEndpoint.method].bg} ${METHOD_COLORS[selectedEndpoint.method].text}`}>
                      {selectedEndpoint.method}
                    </span>
                    <span className="text-white font-mono text-sm">{selectedEndpoint.path}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                    {API_ENDPOINTS.map((endpoint) => (
                      <button
                        key={endpoint.id}
                        onClick={() => handleEndpointSelect(endpoint)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors ${
                          selectedEndpoint.id === endpoint.id ? 'bg-gray-800' : ''
                        }`}
                      >
                        <span className={`px-2 py-1 rounded text-xs font-bold ${METHOD_COLORS[endpoint.method].bg} ${METHOD_COLORS[endpoint.method].text}`}>
                          {endpoint.method}
                        </span>
                        <div>
                          <div className="text-white font-mono text-sm">{endpoint.path}</div>
                          <div className="text-gray-400 text-xs">{endpoint.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-gray-400 text-sm mt-3">{selectedEndpoint.description}</p>
            </div>

            {/* Parameters */}
            {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Path & Query Parameters</h3>
                <div className="space-y-3">
                  {selectedEndpoint.params.map((param) => (
                    <div key={param.name}>
                      <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        <span className="font-mono">{param.name}</span>
                        {param.required && <span className="text-red-400 text-xs">*required</span>}
                        <span className="text-gray-500 text-xs">({param.type})</span>
                      </label>
                      <input
                        type="text"
                        value={params[param.name] || ''}
                        onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                        placeholder={param.description}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Body */}
            {selectedEndpoint.body && selectedEndpoint.body.length > 0 && (
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Request Body (JSON)</h3>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Enter JSON body..."
                />
              </div>
            )}

            {/* cURL */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-300">cURL</h3>
                <button
                  onClick={() => copyToClipboard(generateCurl())}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                {generateCurl()}
              </pre>
            </div>

            {/* Send Button */}
            <div className="p-4">
              <button
                onClick={handleSendRequest}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Response */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Response</h2>
              {response && (
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 text-sm ${
                    response.status >= 200 && response.status < 300
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}>
                    {response.status >= 200 && response.status < 300
                      ? <CheckCircle className="w-4 h-4" />
                      : <AlertCircle className="w-4 h-4" />
                    }
                    {response.status}
                  </span>
                  <span className="text-gray-500 text-sm">{response.time}ms</span>
                </div>
              )}
            </div>

            <div className="p-4">
              {response ? (
                <div className="relative">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2))}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <pre className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 font-mono overflow-auto max-h-[600px]">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Code className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg">No response yet</p>
                  <p className="text-sm">Send a request to see the response here</p>
                </div>
              )}
            </div>

            {/* Response Schema */}
            {selectedEndpoint && (
              <div className="p-4 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Expected Response Schema</h3>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">success</span>
                      <span className="text-emerald-400 ml-2">boolean</span>
                    </div>
                    <div>
                      <span className="text-gray-500">data</span>
                      <span className="text-blue-400 ml-2">object</span>
                    </div>
                    <div>
                      <span className="text-gray-500">error</span>
                      <span className="text-red-400 ml-2">object (on failure)</span>
                    </div>
                    <div>
                      <span className="text-gray-500">meta</span>
                      <span className="text-purple-400 ml-2">object (pagination)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">💡 Quick Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-purple-400 font-medium mb-2">Sandbox Mode</h4>
              <p className="text-gray-400 text-sm">Use test API keys (nxqr_test_xxx) to test endpoints without affecting production data.</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-purple-400 font-medium mb-2">Rate Limits</h4>
              <p className="text-gray-400 text-sm">Sandbox has relaxed rate limits. Production limits depend on your plan tier.</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-purple-400 font-medium mb-2">Error Handling</h4>
              <p className="text-gray-400 text-sm">All errors include error codes. Check the API docs for complete error reference.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;
