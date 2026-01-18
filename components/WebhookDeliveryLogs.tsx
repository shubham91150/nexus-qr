import React, { useState, useEffect } from 'react';
import {
  Webhook, Search, Filter, Download, RefreshCw, ArrowLeft,
  CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Copy,
  AlertTriangle, RotateCcw, ExternalLink, Send, Eye, Zap
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface WebhookDelivery {
  id: string;
  webhookId: string;
  webhookName: string;
  webhookUrl: string;
  eventType: string;
  status: 'delivered' | 'failed' | 'pending' | 'retrying';
  httpStatus: number | null;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  createdAt: string;
  deliveredAt: string | null;
  duration: number | null;
  requestHeaders: Record<string, string>;
  requestBody: object;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  errorMessage?: string;
}

interface RetryAttempt {
  attempt: number;
  timestamp: string;
  status: 'success' | 'failed';
  httpStatus: number | null;
  duration: number;
  errorMessage?: string;
}

// Generate mock webhook deliveries
const generateMockDeliveries = (count: number = 50): WebhookDelivery[] => {
  const eventTypes = ['qr.created', 'qr.scanned', 'qr.updated', 'qr.deleted', 'scan.milestone'];
  const webhookNames = ['Production Webhook', 'Slack Integration', 'Analytics Service', 'CRM Sync'];
  const statuses: WebhookDelivery['status'][] = ['delivered', 'delivered', 'delivered', 'failed', 'retrying', 'pending'];

  return Array.from({ length: count }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isDelivered = status === 'delivered';
    const isFailed = status === 'failed';
    const httpStatus = isDelivered ? 200 : isFailed ? [400, 401, 404, 500, 502, 503][Math.floor(Math.random() * 6)] : null;

    return {
      id: `del_${Date.now()}_${i}`,
      webhookId: `wh_${Math.random().toString(36).substring(2, 10)}`,
      webhookName: webhookNames[Math.floor(Math.random() * webhookNames.length)],
      webhookUrl: `https://api.example.com/webhooks/${Math.random().toString(36).substring(2, 8)}`,
      eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      status,
      httpStatus,
      attempts: status === 'delivered' ? 1 : status === 'retrying' ? Math.floor(Math.random() * 3) + 1 : status === 'failed' ? 5 : 0,
      maxAttempts: 5,
      nextRetryAt: status === 'retrying' ? new Date(Date.now() + Math.random() * 3600000).toISOString() : null,
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      deliveredAt: isDelivered ? new Date(Date.now() - Math.random() * 86400000 * 7 + 1000).toISOString() : null,
      duration: isDelivered ? Math.floor(Math.random() * 500) + 50 : isFailed ? Math.floor(Math.random() * 5000) + 1000 : null,
      requestHeaders: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${Math.random().toString(36).substring(2, 66)}`,
        'X-Webhook-ID': `wh_${Math.random().toString(36).substring(2, 10)}`,
        'X-Event-Type': eventTypes[Math.floor(Math.random() * eventTypes.length)],
        'User-Agent': 'NexusQR-Webhook/1.0'
      },
      requestBody: {
        event: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        timestamp: new Date().toISOString(),
        data: {
          qr_id: `qr_${Math.random().toString(36).substring(2, 10)}`,
          url: 'https://example.com',
          scans: Math.floor(Math.random() * 1000)
        }
      },
      responseHeaders: isDelivered ? { 'Content-Type': 'application/json' } : undefined,
      responseBody: isDelivered ? JSON.stringify({ received: true }) : undefined,
      errorMessage: isFailed ? getErrorMessage(httpStatus!) : undefined
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

function getErrorMessage(status: number): string {
  const errors: Record<number, string> = {
    400: 'Bad Request - Invalid payload format',
    401: 'Unauthorized - Invalid webhook signature',
    404: 'Not Found - Endpoint does not exist',
    500: 'Internal Server Error',
    502: 'Bad Gateway - Upstream server error',
    503: 'Service Unavailable - Server temporarily unavailable'
  };
  return errors[status] || 'Unknown error occurred';
}

// Generate mock retry attempts
const generateRetryAttempts = (delivery: WebhookDelivery): RetryAttempt[] => {
  if (delivery.attempts <= 1 && delivery.status === 'delivered') {
    return [{
      attempt: 1,
      timestamp: delivery.deliveredAt!,
      status: 'success',
      httpStatus: 200,
      duration: delivery.duration!
    }];
  }

  return Array.from({ length: delivery.attempts }, (_, i) => {
    const isLast = i === delivery.attempts - 1;
    const isSuccess = isLast && delivery.status === 'delivered';

    return {
      attempt: i + 1,
      timestamp: new Date(new Date(delivery.createdAt).getTime() + (i * 300000 * Math.pow(2, i))).toISOString(),
      status: isSuccess ? 'success' : 'failed',
      httpStatus: isSuccess ? 200 : [400, 500, 502, 503][Math.floor(Math.random() * 4)],
      duration: Math.floor(Math.random() * 3000) + 100,
      errorMessage: !isSuccess ? 'Connection timeout' : undefined
    };
  });
};

interface WebhookDeliveryLogsProps {
  onBack: () => void;
}

const WebhookDeliveryLogs: React.FC<WebhookDeliveryLogsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedWebhook, setSelectedWebhook] = useState<string>('all');
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    setDeliveries(generateMockDeliveries(80));
    setLoading(false);
  };

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setDeliveries(prev => prev.map(d =>
      d.id === deliveryId
        ? { ...d, status: 'delivered' as const, httpStatus: 200, deliveredAt: new Date().toISOString(), attempts: d.attempts + 1 }
        : d
    ));
    setRetryingId(null);
  };

  const filteredDeliveries = deliveries.filter(d => {
    const matchesSearch = searchQuery === '' ||
      d.webhookName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.webhookUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.eventType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEvent = selectedEvent === 'all' || d.eventType === selectedEvent;
    const matchesStatus = selectedStatus === 'all' || d.status === selectedStatus;
    const matchesWebhook = selectedWebhook === 'all' || d.webhookName === selectedWebhook;

    return matchesSearch && matchesEvent && matchesStatus && matchesWebhook;
  });

  const webhookNames = [...new Set(deliveries.map(d => d.webhookName))];
  const eventTypes = [...new Set(deliveries.map(d => d.eventType))];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'retrying': return <RotateCcw className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      delivered: 'bg-emerald-100 text-emerald-700',
      failed: 'bg-red-100 text-red-700',
      retrying: 'bg-amber-100 text-amber-700',
      pending: 'bg-gray-100 text-gray-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getEventBadge = (event: string) => {
    const colors: Record<string, string> = {
      'qr.created': 'bg-gray-900 text-blue-400',
      'qr.scanned': 'bg-gray-900 text-purple-400',
      'qr.updated': 'bg-gray-900 text-amber-400',
      'qr.deleted': 'bg-gray-900 text-red-400',
      'scan.milestone': 'bg-gray-900 text-emerald-400'
    };
    return colors[event] || 'bg-gray-900 text-gray-400';
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
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const stats = {
    total: filteredDeliveries.length,
    delivered: filteredDeliveries.filter(d => d.status === 'delivered').length,
    failed: filteredDeliveries.filter(d => d.status === 'failed').length,
    retrying: filteredDeliveries.filter(d => d.status === 'retrying').length,
    pending: filteredDeliveries.filter(d => d.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-5 h-5 animate-spin text-white" />
          </div>
          <p className="text-gray-500">Loading webhook deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                  <Webhook className="w-4 h-4 text-white" />
                </div>
                Webhook Delivery Logs
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Monitor and debug webhook deliveries</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-12 sm:ml-0">
            {/* View Mode Toggle */}
            <div className="flex bg-[#f5f5f5] rounded-full p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'timeline' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Timeline
              </button>
            </div>

            <button
              onClick={loadData}
              className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
            <button className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-900 text-white rounded-full text-xs sm:text-sm font-medium hover:bg-gray-800">
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#f5f5f5] rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-gray-900" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.delivered}</span>
            </div>
            <div className="text-sm text-gray-500">Delivered</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#f5f5f5] rounded-full flex items-center justify-center">
                <XCircle className="w-4 h-4 text-gray-900" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.failed}</span>
            </div>
            <div className="text-sm text-gray-500">Failed</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#f5f5f5] rounded-full flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-gray-900" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.retrying}</span>
            </div>
            <div className="text-sm text-gray-500">Retrying</div>
          </div>
          <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#f5f5f5] rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-gray-900" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.pending}</span>
            </div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-[20px] shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by webhook name, URL, or event..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-colors ${
                showFilters ? 'bg-gray-900 text-white' : 'bg-[#f5f5f5] text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Events</option>
                  {eventTypes.map(event => (
                    <option key={event} value={event}>{event}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                  <option value="retrying">Retrying</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook</label>
                <select
                  value={selectedWebhook}
                  onChange={(e) => setSelectedWebhook(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Webhooks</option>
                  {webhookNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Deliveries List */}
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Webhook
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Attempts
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDeliveries.slice(0, 50).map((delivery) => {
                    const { relative } = formatTimestamp(delivery.createdAt);
                    const isExpanded = expandedDelivery === delivery.id;
                    const retryAttempts = generateRetryAttempts(delivery);

                    return (
                      <React.Fragment key={delivery.id}>
                        <tr
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-purple-50' : ''}`}
                          onClick={() => setExpandedDelivery(isExpanded ? null : delivery.id)}
                        >
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getEventBadge(delivery.eventType)}`}>
                              {delivery.eventType}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{delivery.webhookName}</div>
                            <code className="text-xs text-gray-400 truncate block max-w-xs">{delivery.webhookUrl}</code>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(delivery.status)}`}>
                              {getStatusIcon(delivery.status)}
                              {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                            </span>
                            {delivery.httpStatus && (
                              <span className="ml-2 text-xs text-gray-500">({delivery.httpStatus})</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: delivery.maxAttempts }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${
                                    i < delivery.attempts
                                      ? delivery.status === 'delivered' && i === delivery.attempts - 1
                                        ? 'bg-emerald-500'
                                        : 'bg-red-400'
                                      : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-xs text-gray-500">
                                {delivery.attempts}/{delivery.maxAttempts}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">{relative}</div>
                            {delivery.duration && (
                              <div className="text-xs text-gray-500">{delivery.duration}ms</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {delivery.status === 'failed' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRetry(delivery.id);
                                  }}
                                  disabled={retryingId === delivery.id}
                                  className="p-1.5 bg-gray-900 text-white hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
                                  title="Retry"
                                >
                                  {retryingId === delivery.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-6 py-6 bg-gray-50">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Retry Timeline */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-purple-500" />
                                    Delivery Attempts
                                  </h4>
                                  <div className="space-y-3">
                                    {retryAttempts.map((attempt, i) => (
                                      <div key={i} className="flex items-start gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                          attempt.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'
                                        }`}>
                                          {attempt.status === 'success' ? (
                                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                                          ) : (
                                            <XCircle className="w-3 h-3 text-red-600" />
                                          )}
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">
                                              Attempt {attempt.attempt}
                                            </span>
                                            <span className="text-xs text-gray-500">{attempt.duration}ms</span>
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {new Date(attempt.timestamp).toLocaleString()}
                                          </div>
                                          {attempt.errorMessage && (
                                            <div className="text-xs text-red-600 mt-1">{attempt.errorMessage}</div>
                                          )}
                                          {attempt.httpStatus && (
                                            <span className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs ${
                                              attempt.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                              HTTP {attempt.httpStatus}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}

                                    {delivery.status === 'retrying' && delivery.nextRetryAt && (
                                      <div className="flex items-start gap-3 opacity-50">
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                          <Clock className="w-3 h-3 text-gray-500" />
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-gray-500">
                                            Next retry
                                          </span>
                                          <div className="text-xs text-gray-400">
                                            {new Date(delivery.nextRetryAt).toLocaleString()}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Request */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-gray-700">Request</h4>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(JSON.stringify(delivery.requestBody, null, 2), `req-${delivery.id}`);
                                      }}
                                      className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                                    >
                                      {copied === `req-${delivery.id}` ? 'Copied!' : <><Copy className="w-3 h-3" /> Copy</>}
                                    </button>
                                  </div>

                                  <div className="mb-3">
                                    <div className="text-xs text-gray-500 mb-1">Headers</div>
                                    <div className="bg-gray-900 rounded-lg p-2 text-xs font-mono overflow-x-auto max-h-24">
                                      {Object.entries(delivery.requestHeaders).map(([key, value]) => (
                                        <div key={key} className="text-gray-300">
                                          <span className="text-purple-400">{key}</span>: <span className="text-green-400">{value.substring(0, 40)}{value.length > 40 ? '...' : ''}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs text-gray-500 mb-1">Body</div>
                                    <pre className="bg-gray-900 rounded-lg p-2 text-xs text-green-400 font-mono overflow-x-auto max-h-32">
                                      {JSON.stringify(delivery.requestBody, null, 2)}
                                    </pre>
                                  </div>
                                </div>

                                {/* Response */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Response</h4>

                                  {delivery.errorMessage && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg mb-3">
                                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                                      <div>
                                        <div className="text-sm font-medium text-red-800">Error</div>
                                        <div className="text-sm text-red-600">{delivery.errorMessage}</div>
                                      </div>
                                    </div>
                                  )}

                                  {delivery.responseBody ? (
                                    <>
                                      <div className="mb-3">
                                        <div className="text-xs text-gray-500 mb-1">Status</div>
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                          <CheckCircle className="w-3 h-3" />
                                          {delivery.httpStatus} OK
                                        </span>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Body</div>
                                        <pre className="bg-gray-900 rounded-lg p-2 text-xs text-green-400 font-mono overflow-x-auto max-h-32">
                                          {delivery.responseBody}
                                        </pre>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-center py-8 text-gray-400">
                                      <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">No response received</p>
                                    </div>
                                  )}

                                  {delivery.status === 'failed' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRetry(delivery.id);
                                      }}
                                      disabled={retryingId === delivery.id}
                                      className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
                                    >
                                      {retryingId === delivery.id ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Send className="w-4 h-4" />
                                      )}
                                      Retry Delivery
                                    </button>
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
          ) : (
            /* Timeline View */
            <div className="p-6">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-6">
                  {filteredDeliveries.slice(0, 30).map((delivery) => {
                    const { date, time, relative } = formatTimestamp(delivery.createdAt);

                    return (
                      <div key={delivery.id} className="relative pl-10">
                        <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white ${
                          delivery.status === 'delivered' ? 'bg-emerald-500' :
                          delivery.status === 'failed' ? 'bg-red-500' :
                          delivery.status === 'retrying' ? 'bg-amber-500' :
                          'bg-gray-400'
                        }`} />

                        <div className="bg-[#f5f5f5] rounded-[16px] p-4 hover:bg-gray-200 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getEventBadge(delivery.eventType)}`}>
                                  {delivery.eventType}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(delivery.status)}`}>
                                  {getStatusIcon(delivery.status)}
                                  {delivery.status}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-900">{delivery.webhookName}</div>
                              <code className="text-xs text-gray-400">{delivery.webhookUrl}</code>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-900">{relative}</div>
                              <div className="text-xs text-gray-500">{time}</div>
                            </div>
                          </div>

                          {delivery.errorMessage && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                              <AlertTriangle className="w-4 h-4" />
                              {delivery.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {filteredDeliveries.length === 0 && (
            <div className="p-12 text-center">
              <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No deliveries found</h3>
              <p className="text-gray-500">Try adjusting your filters or search query</p>
            </div>
          )}

          {filteredDeliveries.length > 50 && viewMode === 'list' && (
            <div className="p-4 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Showing 50 of {filteredDeliveries.length} deliveries.
                <button className="text-purple-600 font-medium ml-2 hover:underline">
                  Load More
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Retry Strategy Info */}
        <div className="mt-6 bg-white rounded-[20px] shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            Retry Strategy
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#f5f5f5] rounded-[12px] p-4">
              <div className="text-2xl font-bold text-gray-900">5</div>
              <div className="text-sm text-gray-500">Max Attempts</div>
            </div>
            <div className="bg-[#f5f5f5] rounded-[12px] p-4 overflow-hidden">
              <div className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Exponential</div>
              <div className="text-sm text-gray-500">Backoff Strategy</div>
            </div>
            <div className="bg-[#f5f5f5] rounded-[12px] p-4">
              <div className="text-2xl font-bold text-gray-900">30s → 8m</div>
              <div className="text-sm text-gray-500">Retry Intervals</div>
            </div>
            <div className="bg-[#f5f5f5] rounded-[12px] p-4">
              <div className="text-2xl font-bold text-gray-900">30s</div>
              <div className="text-sm text-gray-500">Request Timeout</div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Failed webhooks are automatically retried with exponential backoff: 30s, 2m, 4m, 8m.
            After 5 failed attempts, the delivery is marked as failed and you can manually retry.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebhookDeliveryLogs;
