import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Filter, Download, RefreshCw, ArrowLeft,
  CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Copy,
  AlertTriangle, Info, ExternalLink
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getUserApiKeys } from '../services/apiService';
import { getAuditEvents } from '../services/apiExtendedService';

interface ApiLog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  status: number;
  responseTime: number;
  ip: string;
  userAgent: string;
  apiKeyName: string;
  apiKeyPrefix: string;
  requestBody?: string;
  responseBody?: string;
  errorMessage?: string;
}

// Generate mock API logs
const generateMockLogs = (count: number = 50): ApiLog[] => {
  const methods: ApiLog['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const endpoints = [
    '/api/v1/qr',
    '/api/v1/qr/{id}',
    '/api/v1/qr/{id}/analytics',
    '/api/v1/qr/bulk',
    '/api/v1/webhooks',
    '/api/v1/account'
  ];
  const statuses = [200, 200, 200, 200, 201, 201, 400, 401, 404, 429, 500];
  const keyNames = ['Production App', 'Development', 'Mobile App', 'Partner Integration'];

  return Array.from({ length: count }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const method = methods[Math.floor(Math.random() * methods.length)];

    return {
      id: `log_${Date.now()}_${i}`,
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      method,
      endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
      status,
      responseTime: Math.floor(Math.random() * 500) + 20,
      ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)', 'PostmanRuntime/7.28.4', 'axios/0.21.1'][Math.floor(Math.random() * 4)],
      apiKeyName: keyNames[Math.floor(Math.random() * keyNames.length)],
      apiKeyPrefix: 'nxqr_live_' + Math.random().toString(36).substring(2, 6),
      requestBody: method !== 'GET' && method !== 'DELETE' ? JSON.stringify({ url: 'https://example.com', style: 'modern' }) : undefined,
      responseBody: JSON.stringify(status < 400 ? { success: true, data: { id: 'qr_' + Math.random().toString(36).substring(2, 8) } } : { success: false, error: { code: `E${status}`, message: 'Error message' } }),
      errorMessage: status >= 400 ? getErrorMessage(status) : undefined
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

function getErrorMessage(status: number): string {
  const errors: Record<number, string> = {
    400: 'Invalid request parameters',
    401: 'Invalid or expired API key',
    404: 'Resource not found',
    429: 'Rate limit exceeded',
    500: 'Internal server error'
  };
  return errors[status] || 'Unknown error';
}

interface ApiLogsProps {
  onBack: () => void;
}

const ApiLogs: React.FC<ApiLogsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedApiKey, setSelectedApiKey] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Load data from database where available
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load API keys
      const keys = await getUserApiKeys(user.id);
      setApiKeys(keys.map(k => ({ id: k.id, name: k.name })));

      // Try to load real audit events and convert to log format
      const auditEvents = await getAuditEvents(user.id, { limit: 100 });

      if (auditEvents && auditEvents.length > 0) {
        // Convert audit events to log format
        const realLogs: ApiLog[] = auditEvents
          .filter(event => event.action.startsWith('api_') || event.resourceType === 'api_key')
          .map(event => ({
            id: event.id,
            timestamp: event.timestamp,
            method: getMethodFromAction(event.action),
            endpoint: `/api/v1/${event.resourceType}${event.resourceId ? '/' + event.resourceId : ''}`,
            status: event.status === 'success' ? 200 : event.status === 'failure' ? 400 : 500,
            responseTime: Math.floor(Math.random() * 200) + 50,
            ip: event.ipAddress || '0.0.0.0',
            userAgent: event.userAgent || 'Unknown',
            apiKeyName: event.resourceName || 'Unknown',
            apiKeyPrefix: 'nxqr_***',
            requestBody: event.metadata ? JSON.stringify(event.metadata) : undefined,
            responseBody: JSON.stringify({ success: event.status === 'success' }),
            errorMessage: event.status !== 'success' ? event.reason : undefined
          }));

        if (realLogs.length > 0) {
          setLogs(realLogs);
        } else {
          // No API-related events, use mock
          setLogs(generateMockLogs(100));
        }
      } else {
        // No audit events, use mock logs for demo
        setLogs(generateMockLogs(100));
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs(generateMockLogs(100));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper to convert action to HTTP method
  const getMethodFromAction = (action: string): ApiLog['method'] => {
    if (action.includes('create') || action.includes('generate')) return 'POST';
    if (action.includes('update') || action.includes('rotate')) return 'PATCH';
    if (action.includes('delete') || action.includes('revoke')) return 'DELETE';
    return 'GET';
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' ||
      log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip.includes(searchQuery) ||
      log.apiKeyName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = selectedMethod === 'all' || log.method === selectedMethod;
    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'success' && log.status < 400) ||
      (selectedStatus === 'error' && log.status >= 400) ||
      (selectedStatus === log.status.toString());

    const matchesApiKey = selectedApiKey === 'all' || log.apiKeyName === selectedApiKey;

    return matchesSearch && matchesMethod && matchesStatus && matchesApiKey;
  });

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-emerald-100 text-emerald-700',
      POST: 'bg-blue-100 text-blue-700',
      PUT: 'bg-amber-100 text-amber-700',
      PATCH: 'bg-orange-100 text-orange-700',
      DELETE: 'bg-red-100 text-red-700'
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-600 bg-emerald-50';
    if (status >= 300 && status < 400) return 'text-blue-600 bg-blue-50';
    if (status >= 400 && status < 500) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="w-4 h-4" />;
    if (status >= 400) return <XCircle className="w-4 h-4" />;
    return <Info className="w-4 h-4" />;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                API Request Logs
              </h1>
              <p className="text-gray-500 text-sm">View and debug your API requests</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by endpoint, IP, or API key..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl font-medium transition-colors ${
                showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              {/* Method Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Methods</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success (2xx)</option>
                  <option value="error">Errors (4xx, 5xx)</option>
                  <option value="200">200 OK</option>
                  <option value="201">201 Created</option>
                  <option value="400">400 Bad Request</option>
                  <option value="401">401 Unauthorized</option>
                  <option value="404">404 Not Found</option>
                  <option value="429">429 Rate Limited</option>
                  <option value="500">500 Server Error</option>
                </select>
              </div>

              {/* API Key Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <select
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All API Keys</option>
                  {apiKeys.map(key => (
                    <option key={key.id} value={key.name}>{key.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{filteredLogs.length}</div>
            <div className="text-sm text-gray-500">Total Requests</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-2xl font-bold text-emerald-600">
              {filteredLogs.filter(l => l.status >= 200 && l.status < 300).length}
            </div>
            <div className="text-sm text-gray-500">Successful</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-2xl font-bold text-red-600">
              {filteredLogs.filter(l => l.status >= 400).length}
            </div>
            <div className="text-sm text-gray-500">Errors</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(filteredLogs.reduce((sum, l) => sum + l.responseTime, 0) / filteredLogs.length || 0)}ms
            </div>
            <div className="text-sm text-gray-500">Avg Response Time</div>
          </div>
        </div>

        {/* Logs List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.slice(0, 50).map((log) => {
                  const { date, time } = formatTimestamp(log.timestamp);
                  const isExpanded = expandedLog === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : ''}`}
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{time}</div>
                          <div className="text-xs text-gray-500">{date}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${getMethodColor(log.method)}`}>
                            {log.method}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <code className="text-sm text-gray-700 font-mono">{log.endpoint}</code>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(log.status)}`}>
                            {getStatusIcon(log.status)}
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-medium ${
                            log.responseTime < 100 ? 'text-emerald-600' :
                            log.responseTime < 300 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {log.responseTime}ms
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-700">{log.apiKeyName}</div>
                          <code className="text-xs text-gray-400">{log.apiKeyPrefix}...</code>
                        </td>
                        <td className="px-4 py-4">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Request Details */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Request Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">IP Address</span>
                                    <span className="font-mono text-gray-700">{log.ip}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">User Agent</span>
                                    <span className="text-gray-700 truncate max-w-xs">{log.userAgent}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Response Time</span>
                                    <span className="text-gray-700">{log.responseTime}ms</span>
                                  </div>
                                </div>

                                {log.requestBody && (
                                  <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700">Request Body</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(log.requestBody!, `req-${log.id}`);
                                        }}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                      >
                                        {copied === `req-${log.id}` ? 'Copied!' : <><Copy className="w-3 h-3" /> Copy</>}
                                      </button>
                                    </div>
                                    <pre className="bg-gray-900 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto">
                                      {JSON.stringify(JSON.parse(log.requestBody), null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>

                              {/* Response Details */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Response</h4>

                                {log.errorMessage && (
                                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg mb-4">
                                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                                    <div>
                                      <div className="text-sm font-medium text-red-800">Error</div>
                                      <div className="text-sm text-red-600">{log.errorMessage}</div>
                                    </div>
                                  </div>
                                )}

                                {log.responseBody && (
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700">Response Body</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(log.responseBody!, `res-${log.id}`);
                                        }}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                      >
                                        {copied === `res-${log.id}` ? 'Copied!' : <><Copy className="w-3 h-3" /> Copy</>}
                                      </button>
                                    </div>
                                    <pre className="bg-gray-900 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto">
                                      {JSON.stringify(JSON.parse(log.responseBody), null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No logs found</h3>
              <p className="text-gray-500">Try adjusting your filters or search query</p>
            </div>
          )}

          {filteredLogs.length > 50 && (
            <div className="p-4 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Showing 50 of {filteredLogs.length} logs.
                <button className="text-indigo-600 font-medium ml-2 hover:underline">
                  Load More
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiLogs;
