import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Filter, Download, RefreshCw, ArrowLeft,
  CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Copy,
  AlertTriangle, Info, ExternalLink
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getUserApiKeys } from '../services/apiService';
import { getApiLogs, getApiLogsStats, ApiRequestLog } from '../services/apiExtendedService';

interface ApiLog {
  id: string;
  requestId: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  status: number;
  responseTime: number;
  ip: string;
  userAgent: string;
  apiKeyName: string;
  apiKeyPrefix: string;
  requestBody?: Record<string, unknown> | null;
  errorCode?: number | null;
  errorMessage?: string;
}

// Error message helper
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

// Convert ApiRequestLog to ApiLog format
function convertToApiLog(log: ApiRequestLog): ApiLog {
  return {
    id: log.id,
    requestId: log.request_id,
    timestamp: log.created_at,
    method: log.method as ApiLog['method'],
    endpoint: log.endpoint,
    status: log.status_code,
    responseTime: log.response_time_ms,
    ip: log.ip_address,
    userAgent: log.user_agent,
    apiKeyName: log.api_key_name,
    apiKeyPrefix: log.api_key_prefix,
    requestBody: log.request_body || null,
    errorCode: log.error_code || null,
    errorMessage: log.status_code >= 400 ? getErrorMessage(log.status_code) : undefined
  };
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

  // Load data from database - real API logs
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load API keys
      const keys = await getUserApiKeys(user.id);
      setApiKeys(keys.map(k => ({ id: k.id, name: k.name })));

      // Load real API logs from api_usage table
      const apiLogs = await getApiLogs(user.id, {
        limit: 200,
        method: selectedMethod !== 'all' ? selectedMethod : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        apiKeyId: selectedApiKey !== 'all' ? selectedApiKey : undefined,
        search: searchQuery || undefined
      });

      if (apiLogs && apiLogs.length > 0) {
        // Convert to ApiLog format
        const convertedLogs = apiLogs.map(convertToApiLog);
        setLogs(convertedLogs);
      } else {
        // No logs found - show empty state
        setLogs([]);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user, selectedMethod, selectedStatus, selectedApiKey, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      <div className="max-w-[1000px] mx-auto pt-6 pb-20 px-4">
        {/* Header - Matching Home Page Style */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">API Request Logs</h1>
              <p className="text-xs text-gray-500 font-medium">View and debug your API requests</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        <div className="bg-white rounded-[24px] shadow-card p-4 mb-6">
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
          <div className="bg-white rounded-[20px] shadow-card p-4">
            <div className="text-2xl font-bold text-gray-900">{filteredLogs.length}</div>
            <div className="text-sm text-gray-500">Total Requests</div>
          </div>
          <div className="bg-white rounded-[20px] shadow-card p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {filteredLogs.filter(l => l.status >= 200 && l.status < 300).length}
            </div>
            <div className="text-sm text-gray-500">Successful</div>
          </div>
          <div className="bg-white rounded-[20px] shadow-card p-4">
            <div className="text-2xl font-bold text-red-600">
              {filteredLogs.filter(l => l.status >= 400).length}
            </div>
            <div className="text-sm text-gray-500">Errors</div>
          </div>
          <div className="bg-white rounded-[20px] shadow-card p-4">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(filteredLogs.reduce((sum, l) => sum + l.responseTime, 0) / filteredLogs.length || 0)}ms
            </div>
            <div className="text-sm text-gray-500">Avg Response Time</div>
          </div>
        </div>

        {/* Logs List */}
        <div className="bg-white rounded-[24px] shadow-card overflow-hidden">
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
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Request ID</span>
                                    <div className="flex items-center gap-2">
                                      <code className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{log.requestId}</code>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(log.requestId, `reqid-${log.id}`);
                                        }}
                                        className="text-gray-400 hover:text-indigo-600"
                                      >
                                        {copied === `reqid-${log.id}` ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">IP Address</span>
                                    <span className="font-mono text-gray-700">{log.ip}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Response Time</span>
                                    <span className={`font-medium ${
                                      log.responseTime < 100 ? 'text-emerald-600' :
                                      log.responseTime < 300 ? 'text-amber-600' :
                                      'text-red-600'
                                    }`}>{log.responseTime}ms</span>
                                  </div>
                                </div>

                                {/* User Agent Section */}
                                <div className="mt-4">
                                  <span className="text-sm font-medium text-gray-700 block mb-2">User Agent</span>
                                  <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-600 font-mono break-all">
                                    {log.userAgent}
                                  </div>
                                </div>

                                {/* Request Body */}
                                {log.requestBody && Object.keys(log.requestBody).length > 0 && (
                                  <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700">Request Body</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(JSON.stringify(log.requestBody, null, 2), `req-${log.id}`);
                                        }}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                      >
                                        {copied === `req-${log.id}` ? 'Copied!' : <><Copy className="w-3 h-3" /> Copy</>}
                                      </button>
                                    </div>
                                    <pre className="bg-gray-900 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto max-h-64">
                                      {JSON.stringify(log.requestBody, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>

                              {/* Response Details */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Response</h4>

                                {/* Status Badge */}
                                <div className="flex items-center gap-3 mb-4">
                                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${getStatusColor(log.status)}`}>
                                    {getStatusIcon(log.status)}
                                    {log.status}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {log.status >= 200 && log.status < 300 ? 'Success' :
                                     log.status >= 400 && log.status < 500 ? 'Client Error' :
                                     log.status >= 500 ? 'Server Error' : 'Redirect'}
                                  </span>
                                </div>

                                {/* Error Details */}
                                {(log.errorMessage || log.errorCode) && (
                                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg mb-4">
                                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <div className="text-sm font-medium text-red-800">
                                        {log.errorCode ? `Error Code: ${log.errorCode}` : 'Error'}
                                      </div>
                                      <div className="text-sm text-red-600">{log.errorMessage}</div>
                                    </div>
                                  </div>
                                )}

                                {/* Success Response */}
                                {log.status >= 200 && log.status < 300 && (
                                  <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <div className="text-sm font-medium text-emerald-800">Request Successful</div>
                                      <div className="text-sm text-emerald-600">
                                        QR code generated successfully in {log.responseTime}ms
                                      </div>
                                    </div>
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
              <p className="text-gray-500">
                {searchQuery || selectedMethod !== 'all' || selectedStatus !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'API request logs will appear here when you start using the API'
                }
              </p>
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
