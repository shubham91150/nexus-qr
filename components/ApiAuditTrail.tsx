'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Download,
  Clock,
  User,
  Globe,
  Key,
  Activity,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
  MapPin,
  Monitor,
  Server,
  Link,
  UserPlus,
  Lock,
  Edit2,
  Trash2,
  Plus,
  Copy,
  Check,
  ArrowUpRight,
  ArrowLeft
} from 'lucide-react';
import { getAuditEvents, getAuditStats, AuditEvent } from '../services/apiExtendedService';

interface ApiAuditTrailProps {
  onBack: () => void;
  userId?: string;
}

interface DisplayEvent {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
    type: 'user' | 'api_key' | 'system';
    apiKeyPrefix?: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  status: 'success' | 'failure' | 'warning';
  details: {
    ip: string;
    userAgent: string;
    location?: string;
    changes?: { field: string; oldValue: string; newValue: string }[];
    reason?: string;
  };
  metadata: Record<string, unknown>;
}

const actionCategories = [
  { id: 'all', label: 'All Actions' },
  { id: 'api_key', label: 'API Keys' },
  { id: 'qr_code', label: 'QR Codes' },
  { id: 'team', label: 'Team' },
  { id: 'auth', label: 'Authentication' },
  { id: 'settings', label: 'Settings' },
  { id: 'webhook', label: 'Webhooks' }
];

const getActionIcon = (action: string): React.ElementType => {
  if (action.includes('created') || action.includes('added')) return Plus;
  if (action.includes('deleted') || action.includes('removed')) return Trash2;
  if (action.includes('updated') || action.includes('changed')) return Edit2;
  if (action.includes('invited')) return UserPlus;
  if (action.includes('login')) return Lock;
  if (action.includes('rate_limited')) return AlertTriangle;
  if (action.includes('rotated')) return RefreshCw;
  return Activity;
};

const getActionColor = (action: string, status: string): string => {
  if (status === 'failure') return 'bg-red-100 text-red-600';
  if (status === 'warning') return 'bg-amber-100 text-amber-600';
  if (action.includes('created') || action.includes('added')) return 'bg-emerald-100 text-emerald-600';
  if (action.includes('deleted') || action.includes('removed')) return 'bg-red-100 text-red-600';
  if (action.includes('updated')) return 'bg-blue-100 text-blue-600';
  return 'bg-gray-100 text-gray-600';
};

const transformEvent = (event: AuditEvent): DisplayEvent => ({
  id: event.id,
  timestamp: event.created_at,
  actor: {
    id: event.actor_id,
    name: event.actor_name || 'Unknown',
    email: event.actor_email || '',
    type: event.actor_type,
    apiKeyPrefix: event.api_key_prefix || undefined,
  },
  action: event.action,
  resource: {
    type: event.resource_type,
    id: event.resource_id || '',
    name: event.resource_name || undefined,
  },
  status: event.status,
  details: {
    ip: event.ip_address || 'Unknown',
    userAgent: event.user_agent || 'Unknown',
    location: event.location || undefined,
    changes: event.changes || undefined,
    reason: event.reason || undefined,
  },
  metadata: event.metadata || {},
});

export default function ApiAuditTrail({ onBack, userId }: ApiAuditTrailProps) {
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, warning: 0, failure: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchEvents = useCallback(async (showRefresh = false) => {
    if (!userId) return;

    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [eventsData, statsData] = await Promise.all([
        getAuditEvents(userId, {
          category: categoryFilter,
          status: statusFilter,
          dateRange: dateRange,
          search: searchQuery,
          limit: 50,
        }),
        getAuditStats(userId),
      ]);

      setEvents(eventsData.map(transformEvent));
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching audit events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, categoryFilter, statusFilter, dateRange, searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.actor.name.toLowerCase().includes(query) ||
      event.actor.email.toLowerCase().includes(query) ||
      event.action.toLowerCase().includes(query) ||
      event.resource.id.toLowerCase().includes(query)
    );
  });

  const formatAction = (action: string): string => {
    return action.split('.').map(part =>
      part.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    ).join(' → ');
  };

  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getActorIcon = (type: string): React.ElementType => {
    switch (type) {
      case 'user': return User;
      case 'api_key': return Key;
      case 'system': return Server;
      default: return User;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-xs text-gray-500">Loading audit events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-[1000px] mx-auto pt-6 pb-20 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">Audit Trail</h1>
              <p className="text-xs text-gray-500">Track all activities</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEvents(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <RefreshCw className={`w-3 h-3 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
              </div>
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Download className="w-3 h-3 text-gray-600" />
              </div>
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500">Total Events</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.success}</div>
                <div className="text-xs text-gray-500">Successful</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.warning}</div>
                <div className="text-xs text-gray-500">Warnings</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.failure}</div>
                <div className="text-xs text-gray-500">Failures</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[20px] p-4 mb-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2">
                <Search className="w-4 h-4 text-gray-500" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by actor, action, or resource..."
                className="w-full pl-14 pr-4 py-3 bg-gray-100 rounded-full text-sm focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 bg-gray-100 rounded-full text-xs focus:ring-2 focus:ring-violet-500"
            >
              {actionCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-gray-100 rounded-full text-xs focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="failure">Failure</option>
            </select>

            <div className="flex bg-gray-100 rounded-full p-1">
              {(['today', 'week', 'month'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-2 text-xs font-medium rounded-full transition-colors ${
                    dateRange === range
                      ? 'bg-violet-500 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Event List */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-sm">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No Events Found</h3>
              <p className="text-xs text-gray-500">
                {stats.total === 0
                  ? 'No audit events recorded yet'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div>
              {filteredEvents.map(event => {
                const ActionIcon = getActionIcon(event.action);
                const ActorIcon = getActorIcon(event.actor.type);
                const isExpanded = expandedEvent === event.id;

                return (
                  <div key={event.id} className="border-b border-gray-100 last:border-0">
                    <button
                      onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                      className="w-full p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActionColor(event.action, event.status)}`}>
                          <ActionIcon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{formatAction(event.action)}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              event.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                              event.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {event.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <ActorIcon className="w-3 h-3" />
                              {event.actor.type === 'api_key'
                                ? event.actor.apiKeyPrefix
                                : event.actor.name}
                            </span>
                            <span>•</span>
                            <span>{event.resource.type}: {event.resource.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs text-gray-500">{formatRelativeTime(event.timestamp)}</div>
                            <div className="text-[10px] text-gray-400">{event.details.ip}</div>
                          </div>
                          <div className={`w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          </div>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-3">Actor Details</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                                  <ActorIcon className="w-3 h-3 text-gray-600" />
                                </div>
                                <span className="text-xs text-gray-700">{event.actor.name}</span>
                              </div>
                              {event.actor.email && (
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User className="w-3 h-3 text-gray-600" />
                                  </div>
                                  <span className="text-xs text-gray-500">{event.actor.email}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                                  <Globe className="w-3 h-3 text-gray-600" />
                                </div>
                                <span className="text-xs text-gray-500">{event.details.ip}</span>
                                {event.details.location && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">{event.details.location}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-3">Event Details</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                                  <Clock className="w-3 h-3 text-gray-600" />
                                </div>
                                <span className="text-xs text-gray-700">{new Date(event.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                                  <Link className="w-3 h-3 text-gray-600" />
                                </div>
                                <span className="text-xs text-gray-500">{event.resource.type}/{event.resource.id}</span>
                              </div>
                              {event.details.reason && (
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                                    <Info className="w-3 h-3 text-gray-600" />
                                  </div>
                                  <span className="text-xs text-gray-500">{event.details.reason}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {event.details.changes && event.details.changes.length > 0 && (
                            <div className="col-span-2">
                              <h4 className="text-xs font-semibold text-gray-700 mb-3">Changes</h4>
                              <div className="bg-white rounded-[12px] p-3 space-y-2">
                                {event.details.changes.map((change, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className="font-mono text-gray-500">{change.field}:</span>
                                    <span className="text-red-500 line-through">{change.oldValue}</span>
                                    <ArrowUpRight className="w-3 h-3 text-gray-400" />
                                    <span className="text-emerald-600">{change.newValue}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {Object.keys(event.metadata).length > 0 && (
                            <div className="col-span-2">
                              <h4 className="text-xs font-semibold text-gray-700 mb-3">Metadata</h4>
                              <div className="flex items-center gap-2">
                                <pre className="flex-1 bg-gray-900 rounded-[12px] p-3 text-[10px] font-mono text-gray-300 overflow-x-auto">
                                  {JSON.stringify(event.metadata, null, 2)}
                                </pre>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(JSON.stringify(event.metadata, null, 2), event.id);
                                  }}
                                  className="p-2 hover:bg-gray-200 rounded-full shrink-0"
                                >
                                  {copied === event.id ? (
                                    <Check className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-500" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing {filteredEvents.length} of {stats.total} events
            </span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium transition-colors">
                Previous
              </button>
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
