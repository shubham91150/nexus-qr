import React, { useState } from 'react';
import {
  AlertCircle, Search, Copy, Check, ChevronDown, ChevronUp,
  Info, AlertTriangle, XCircle, Shield, Clock, Zap,
  Server, Database, Globe, Key, FileText, Code, ExternalLink
} from 'lucide-react';

type ErrorCategory = 'authentication' | 'validation' | 'rate_limit' | 'resource' | 'server' | 'webhook';

interface ErrorCode {
  code: string;
  httpStatus: number;
  message: string;
  description: string;
  category: ErrorCategory;
  resolution: string;
  example?: {
    request?: string;
    response: string;
  };
}

const ERROR_CODES: ErrorCode[] = [
  // Authentication Errors (401)
  {
    code: 'AUTH_MISSING_KEY',
    httpStatus: 401,
    message: 'API key is missing',
    description: 'The request does not include an Authorization header with a valid API key.',
    category: 'authentication',
    resolution: 'Include your API key in the Authorization header: `Authorization: Bearer YOUR_API_KEY`',
    example: {
      response: `{
  "error": {
    "code": "AUTH_MISSING_KEY",
    "message": "API key is missing",
    "hint": "Include Authorization header with Bearer token"
  }
}`
    }
  },
  {
    code: 'AUTH_INVALID_KEY',
    httpStatus: 401,
    message: 'Invalid API key',
    description: 'The provided API key is not valid or has been revoked.',
    category: 'authentication',
    resolution: 'Check that your API key is correct and has not been revoked. Generate a new key if needed.',
    example: {
      response: `{
  "error": {
    "code": "AUTH_INVALID_KEY",
    "message": "Invalid API key",
    "hint": "Verify your API key or generate a new one"
  }
}`
    }
  },
  {
    code: 'AUTH_EXPIRED_KEY',
    httpStatus: 401,
    message: 'API key has expired',
    description: 'The API key has passed its expiration date.',
    category: 'authentication',
    resolution: 'Generate a new API key from your dashboard or rotate the existing key.',
  },
  {
    code: 'AUTH_INSUFFICIENT_SCOPE',
    httpStatus: 403,
    message: 'Insufficient permissions',
    description: 'The API key does not have the required scopes for this operation.',
    category: 'authentication',
    resolution: 'Update the API key scopes to include the required permission, e.g., `qr:write` for creating QR codes.',
  },
  {
    code: 'AUTH_IP_NOT_ALLOWED',
    httpStatus: 403,
    message: 'IP address not whitelisted',
    description: 'The request originated from an IP address not in the whitelist.',
    category: 'authentication',
    resolution: 'Add the IP address to your whitelist in the API settings.',
  },

  // Validation Errors (400)
  {
    code: 'VALIDATION_ERROR',
    httpStatus: 400,
    message: 'Validation failed',
    description: 'One or more request parameters failed validation.',
    category: 'validation',
    resolution: 'Check the `details` field for specific validation errors and correct your request.',
    example: {
      request: `{
  "url": "not-a-valid-url",
  "type": "invalid"
}`,
      response: `{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "url", "message": "Must be a valid URL" },
      { "field": "type", "message": "Must be 'static' or 'dynamic'" }
    ]
  }
}`
    }
  },
  {
    code: 'INVALID_JSON',
    httpStatus: 400,
    message: 'Invalid JSON in request body',
    description: 'The request body contains malformed JSON.',
    category: 'validation',
    resolution: 'Ensure your request body is valid JSON. Use a JSON validator to check syntax.',
  },
  {
    code: 'MISSING_REQUIRED_FIELD',
    httpStatus: 400,
    message: 'Required field is missing',
    description: 'A required field was not included in the request.',
    category: 'validation',
    resolution: 'Include all required fields. Check the API documentation for required parameters.',
  },
  {
    code: 'INVALID_URL',
    httpStatus: 400,
    message: 'Invalid URL format',
    description: 'The provided URL is not valid or uses an unsupported protocol.',
    category: 'validation',
    resolution: 'Use a valid HTTP or HTTPS URL.',
  },
  {
    code: 'URL_TOO_LONG',
    httpStatus: 400,
    message: 'URL exceeds maximum length',
    description: 'The destination URL exceeds the 2048 character limit.',
    category: 'validation',
    resolution: 'Use a URL shortener or reduce the URL length.',
  },

  // Rate Limit Errors (429)
  {
    code: 'RATE_LIMIT_EXCEEDED',
    httpStatus: 429,
    message: 'Rate limit exceeded',
    description: 'You have exceeded the allowed number of requests.',
    category: 'rate_limit',
    resolution: 'Wait until the rate limit resets. Check `X-RateLimit-Reset` header for reset time.',
    example: {
      response: `{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "retry_after": 60,
    "limit": 300,
    "remaining": 0,
    "reset_at": "2024-12-21T15:00:00Z"
  }
}`
    }
  },
  {
    code: 'BURST_LIMIT_EXCEEDED',
    httpStatus: 429,
    message: 'Burst limit exceeded',
    description: 'Too many requests in a short time period.',
    category: 'rate_limit',
    resolution: 'Implement request throttling. Space out your requests over time.',
  },
  {
    code: 'QUOTA_EXCEEDED',
    httpStatus: 429,
    message: 'Monthly quota exceeded',
    description: 'You have exceeded your monthly API quota.',
    category: 'rate_limit',
    resolution: 'Upgrade your plan or wait until the next billing cycle.',
  },

  // Resource Errors (404, 409, 410)
  {
    code: 'RESOURCE_NOT_FOUND',
    httpStatus: 404,
    message: 'Resource not found',
    description: 'The requested resource does not exist.',
    category: 'resource',
    resolution: 'Check that the resource ID is correct. The resource may have been deleted.',
    example: {
      response: `{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "QR code not found",
    "resource_type": "qr_code",
    "resource_id": "qr_abc123"
  }
}`
    }
  },
  {
    code: 'RESOURCE_ALREADY_EXISTS',
    httpStatus: 409,
    message: 'Resource already exists',
    description: 'A resource with the same identifier already exists.',
    category: 'resource',
    resolution: 'Use a different identifier or update the existing resource.',
  },
  {
    code: 'RESOURCE_DELETED',
    httpStatus: 410,
    message: 'Resource has been deleted',
    description: 'The requested resource was previously deleted.',
    category: 'resource',
    resolution: 'Create a new resource. Deleted resources cannot be restored.',
  },
  {
    code: 'QR_CODE_EXPIRED',
    httpStatus: 410,
    message: 'QR code has expired',
    description: 'The QR code has passed its expiration date.',
    category: 'resource',
    resolution: 'Create a new QR code or update the expiration date of the existing one.',
  },
  {
    code: 'MAX_SCANS_REACHED',
    httpStatus: 410,
    message: 'Maximum scans reached',
    description: 'The QR code has reached its maximum number of allowed scans.',
    category: 'resource',
    resolution: 'Increase the max_scans limit or create a new QR code.',
  },

  // Server Errors (500, 502, 503)
  {
    code: 'INTERNAL_ERROR',
    httpStatus: 500,
    message: 'Internal server error',
    description: 'An unexpected error occurred on our servers.',
    category: 'server',
    resolution: 'Retry the request. If the error persists, contact support with the request_id.',
    example: {
      response: `{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "request_id": "req_abc123xyz"
  }
}`
    }
  },
  {
    code: 'SERVICE_UNAVAILABLE',
    httpStatus: 503,
    message: 'Service temporarily unavailable',
    description: 'The service is temporarily unavailable due to maintenance or high load.',
    category: 'server',
    resolution: 'Wait and retry. Check the status page for any ongoing incidents.',
  },
  {
    code: 'DATABASE_ERROR',
    httpStatus: 500,
    message: 'Database error',
    description: 'An error occurred while accessing the database.',
    category: 'server',
    resolution: 'Retry the request. This is typically a transient error.',
  },

  // Webhook Errors
  {
    code: 'WEBHOOK_DELIVERY_FAILED',
    httpStatus: 422,
    message: 'Webhook delivery failed',
    description: 'Unable to deliver the webhook to your endpoint.',
    category: 'webhook',
    resolution: 'Ensure your webhook endpoint is accessible and returns a 2xx status code.',
  },
  {
    code: 'WEBHOOK_SIGNATURE_INVALID',
    httpStatus: 401,
    message: 'Invalid webhook signature',
    description: 'The webhook signature verification failed.',
    category: 'webhook',
    resolution: 'Verify you are using the correct webhook secret for signature verification.',
  },
  {
    code: 'WEBHOOK_TIMEOUT',
    httpStatus: 408,
    message: 'Webhook request timed out',
    description: 'Your webhook endpoint did not respond within the timeout period.',
    category: 'webhook',
    resolution: 'Ensure your endpoint responds within 30 seconds. Process webhooks asynchronously.',
  },
];

const CATEGORY_CONFIG: Record<ErrorCategory, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  authentication: { label: 'Authentication', icon: Key, color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' },
  validation: { label: 'Validation', icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200' },
  rate_limit: { label: 'Rate Limiting', icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' },
  resource: { label: 'Resource', icon: Database, color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' },
  server: { label: 'Server', icon: Server, color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-200' },
  webhook: { label: 'Webhook', icon: Globe, color: 'text-indigo-600', bgColor: 'bg-indigo-100', borderColor: 'border-indigo-200' }
};

interface ErrorCodesReferenceProps {
  onBack?: () => void;
}

const ErrorCodesReference: React.FC<ErrorCodesReferenceProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | 'all'>('all');
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredErrors = ERROR_CODES.filter(error => {
    const matchesSearch =
      error.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || error.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedErrors = filteredErrors.reduce((acc, error) => {
    if (!acc[error.category]) {
      acc[error.category] = [];
    }
    acc[error.category].push(error);
    return acc;
  }, {} as Record<ErrorCategory, ErrorCode[]>);

  const copyToClipboard = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getHttpStatusColor = (status: number) => {
    if (status >= 500) return 'text-purple-600 bg-purple-100';
    if (status >= 400) return 'text-red-600 bg-red-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-gray-600 rotate-90" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
                Error Codes Reference
              </h1>
              <p className="text-gray-500 text-sm">Understanding and handling API errors</p>
            </div>
          </div>
        </div>

        {/* Error Response Format */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-600" />
            Error Response Format
          </h3>
          <p className="text-gray-600 mb-4">
            All API errors return a consistent JSON structure with the following fields:
          </p>
          <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
            <pre className="text-sm font-mono text-green-400">{`{
  "error": {
    "code": "ERROR_CODE",       // Machine-readable error code
    "message": "Error message", // Human-readable message
    "details": [...],           // Optional: Validation errors
    "hint": "...",              // Optional: How to fix
    "request_id": "req_xxx"     // For support reference
  }
}`}</pre>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by error code or message..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ErrorCategory | 'all')}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
            const count = ERROR_CODES.filter(e => e.category === category).length;
            const CategoryIcon = config.icon;
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(isSelected ? 'all' : category as ErrorCategory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isSelected
                    ? `${config.bgColor} ${config.color} border-2 ${config.borderColor}`
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CategoryIcon className="w-4 h-4" />
                {config.label}
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  isSelected ? 'bg-white/50' : 'bg-gray-100'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error Codes List */}
        <div className="space-y-6">
          {Object.entries(groupedErrors).map(([category, errors]) => {
            const config = CATEGORY_CONFIG[category as ErrorCategory];
            const CategoryIcon = config.icon;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 ${config.bgColor} rounded-lg flex items-center justify-center`}>
                    <CategoryIcon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{config.label} Errors</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {errors.map((error, idx) => {
                    const isExpanded = expandedError === error.code;

                    return (
                      <div
                        key={error.code}
                        className={`border-b border-gray-100 last:border-0 ${
                          isExpanded ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedError(isExpanded ? null : error.code)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-mono font-semibold text-gray-900">
                                  {error.code}
                                </code>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getHttpStatusColor(error.httpStatus)}`}>
                                  {error.httpStatus}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(error.code, error.code);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                >
                                  {copiedCode === error.code ? (
                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                                  )}
                                </button>
                              </div>
                              <p className="text-gray-700 font-medium">{error.message}</p>
                              <p className="text-sm text-gray-500 mt-1">{error.description}</p>
                            </div>

                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-4">
                            {/* Resolution */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                              <h4 className="text-sm font-semibold text-green-800 mb-1 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                How to Fix
                              </h4>
                              <p className="text-sm text-green-700">{error.resolution}</p>
                            </div>

                            {/* Example */}
                            {error.example && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Example Response</h4>
                                <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                                  <pre className="text-sm font-mono text-green-400">
                                    {error.example.response}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {filteredErrors.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No errors found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Best Practices */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600" />
            Error Handling Best Practices
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Always check error codes</h4>
                <p className="text-sm text-gray-500">Use the machine-readable `code` field for error handling logic</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Implement retry logic</h4>
                <p className="text-sm text-gray-500">Use exponential backoff for 429 and 5xx errors</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Log request IDs</h4>
                <p className="text-sm text-gray-500">Save `request_id` for debugging and support requests</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Show user-friendly messages</h4>
                <p className="text-sm text-gray-500">Map error codes to user-friendly messages in your app</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorCodesReference;
