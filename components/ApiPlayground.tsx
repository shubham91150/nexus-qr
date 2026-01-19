import React, { useState } from 'react';
import { Play, Copy, Check, ChevronDown, Code, Send, RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff, FlaskConical, Rocket, Lightbulb, Pencil, ArrowLeft } from 'lucide-react';

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

// Method badge colors (black bg with colored text)
const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-gray-900 text-emerald-400',
  POST: 'bg-gray-900 text-blue-400',
  PUT: 'bg-gray-900 text-amber-400',
  PATCH: 'bg-gray-900 text-orange-400',
  DELETE: 'bg-gray-900 text-red-400'
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
  const [showApiKey, setShowApiKey] = useState(false);

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
    <div className="min-h-screen bg-[#F0F0F0] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-[20px] shadow-sm p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-gray-900">API Playground</h1>
                  <p className="text-xs text-gray-500">Test API endpoints in real-time</p>
                </div>
              </div>
            </div>

            {/* Environment Toggle - Centered */}
            <div className="flex items-center justify-center flex-1">
              <div className="flex items-center gap-1 bg-[#f5f5f5] rounded-full p-1">
                <button
                  onClick={() => setEnvironment('sandbox')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    environment === 'sandbox'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5 flex-shrink-0" />
                  Sandbox
                </button>
                <button
                  onClick={() => setEnvironment('production')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    environment === 'production'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Rocket className="w-3.5 h-3.5 flex-shrink-0" />
                  Production
                </button>
              </div>
            </div>

            <div className="w-10 h-10 hidden sm:block"></div>
          </div>
        </div>

        {/* API Key Input */}
        <div className="bg-white rounded-[20px] shadow-sm p-5 mb-6">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            API Key
          </label>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder={environment === 'sandbox' ? 'nxqr_test_xxxx...' : 'nxqr_live_xxxx...'}
                className="w-full bg-[#f5f5f5] border-0 rounded-full px-4 py-2.5 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:text-gray-600 focus:outline-none transition-colors"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className={`px-4 py-2 rounded-full text-xs font-medium ${
              environment === 'sandbox'
                ? 'bg-[#f5f5f5] text-gray-700'
                : 'bg-gray-900 text-white'
            }`}>
              {environment === 'sandbox' ? 'Test Mode' : 'Live Mode'}
            </div>
          </div>
          {environment === 'sandbox' && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-[#f5f5f5] rounded-[12px]">
              <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs text-gray-600">Use test API keys (nxqr_test_xxx) in sandbox mode. No real data will be affected.</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Request */}
          <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Request</h2>

              {/* Endpoint Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between bg-[#f5f5f5] rounded-[12px] px-4 py-3 text-left hover:bg-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${METHOD_COLORS[selectedEndpoint.method]}`}>
                      {selectedEndpoint.method}
                    </span>
                    <span className="text-gray-900 font-mono text-xs">{selectedEndpoint.path}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-[16px] shadow-xl z-50 max-h-80 overflow-y-auto">
                    {API_ENDPOINTS.map((endpoint) => (
                      <button
                        key={endpoint.id}
                        onClick={() => handleEndpointSelect(endpoint)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          selectedEndpoint.id === endpoint.id ? 'bg-gray-50' : ''
                        }`}
                      >
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${METHOD_COLORS[endpoint.method]}`}>
                          {endpoint.method}
                        </span>
                        <div>
                          <div className="text-gray-900 font-mono text-xs">{endpoint.path}</div>
                          <div className="text-gray-400 text-xs">{endpoint.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-gray-500 text-xs mt-3">{selectedEndpoint.description}</p>
            </div>

            {/* Parameters */}
            {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Path & Query Parameters</h3>
                <div className="space-y-3">
                  {selectedEndpoint.params.map((param) => (
                    <div key={param.name}>
                      <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                        <span className="font-mono text-gray-900">{param.name}</span>
                        {param.required && <span className="bg-gray-900 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full">required</span>}
                        <span className="text-gray-400 text-[10px]">({param.type})</span>
                      </label>
                      <input
                        type="text"
                        value={params[param.name] || ''}
                        onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                        placeholder={param.description}
                        className="w-full bg-[#f5f5f5] border-0 rounded-[12px] px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Body */}
            {selectedEndpoint.body && selectedEndpoint.body.length > 0 && (
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Request Body (JSON)</h3>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="w-full bg-[#1e1e2e] border-0 rounded-[12px] px-3 py-3 text-gray-300 text-xs font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  placeholder="Enter JSON body..."
                />
              </div>
            )}

            {/* cURL */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-900">cURL</h3>
                <button
                  onClick={() => copyToClipboard(generateCurl())}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-[#1e1e2e] rounded-[12px] p-3 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                {generateCurl()}
              </pre>
            </div>

            {/* Send Button */}
            <div className="p-5">
              <button
                onClick={handleSendRequest}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-full transition-all"
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
          <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Response</h2>
              {response && (
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    response.status >= 200 && response.status < 300
                      ? 'bg-gray-900 text-emerald-400'
                      : 'bg-gray-900 text-red-400'
                  }`}>
                    {response.status >= 200 && response.status < 300
                      ? <CheckCircle className="w-3 h-3" />
                      : <AlertCircle className="w-3 h-3" />
                    }
                    {response.status}
                  </span>
                  <span className="text-gray-400 text-xs">{response.time}ms</span>
                </div>
              )}
            </div>

            <div className="p-5">
              {response ? (
                <div className="relative">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2))}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-900 transition-colors bg-gray-700/50 rounded-full"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <pre className="bg-[#1e1e2e] rounded-[12px] p-4 text-xs text-gray-300 font-mono overflow-auto max-h-[500px]">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center mb-4">
                    <Code className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">No response yet</p>
                  <p className="text-xs text-gray-500">Send a request to see the response here</p>
                </div>
              )}
            </div>

            {/* Response Schema */}
            {selectedEndpoint && (
              <div className="p-5 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Expected Response Schema</h3>
                <div className="bg-[#f5f5f5] rounded-[12px] p-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">success</span>
                      <span className="bg-gray-900 text-emerald-400 px-2 py-0.5 rounded-full text-[10px]">boolean</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">data</span>
                      <span className="bg-gray-900 text-blue-400 px-2 py-0.5 rounded-full text-[10px]">object</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">error</span>
                      <span className="bg-gray-900 text-red-400 px-2 py-0.5 rounded-full text-[10px]">object (on failure)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">meta</span>
                      <span className="bg-gray-900 text-purple-400 px-2 py-0.5 rounded-full text-[10px]">object (pagination)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-white rounded-[20px] shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            Quick Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#f5f5f5] rounded-[16px] p-4">
              <h4 className="text-gray-900 font-medium text-xs mb-2">Sandbox Mode</h4>
              <p className="text-gray-500 text-xs">Use test API keys (nxqr_test_xxx) to test endpoints without affecting production data.</p>
            </div>
            <div className="bg-[#f5f5f5] rounded-[16px] p-4">
              <h4 className="text-gray-900 font-medium text-xs mb-2">Rate Limits</h4>
              <p className="text-gray-500 text-xs">Sandbox has relaxed rate limits. Production limits depend on your plan tier.</p>
            </div>
            <div className="bg-[#f5f5f5] rounded-[16px] p-4">
              <h4 className="text-gray-900 font-medium text-xs mb-2">Error Handling</h4>
              <p className="text-gray-500 text-xs">All errors include error codes. Check the API docs for complete error reference.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;
