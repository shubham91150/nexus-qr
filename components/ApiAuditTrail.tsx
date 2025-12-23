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
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { getAuditEvents, getAuditStats, AuditEvent } from '../services/apiExtendedService';

interface ApiAuditTrailProps {
  onBack: () => void;
  userId?: string;
}

// Transform API data to display format
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

// Action icons
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

// Action colors
const getActionColor = (action: string, status: string): string => {
  if (status === 'failure') return 'bg-red-500/20 text-red-400';
  if (status === 'warning') return 'bg-amber-500/20 text-amber-400';
  if (action.includes('created') || action.includes('added')) return 'bg-emerald-500/20 text-emerald-400';
  if (action.includes('deleted') || action.includes('removed')) return 'bg-red-500/20 text-red-400';
  if (action.includes('updated')) return 'bg-blue-500/20 text-blue-400';
  return 'bg-slate-500/20 text-slate-400';
};

// Transform API event to display format
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

  // Fetch events
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

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Filter events (client-side for search)
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

  // Format action name
  const formatAction = (action: string): string => {
    return action.split('.').map(part =>
      part.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    ).join(' → ');
  };

  // Format relative time
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

  // Get actor icon
  const getActorIcon = (type: string): React.ElementType => {
    switch (type) {
      case 'user': return User;
      case 'api_key': return Key;
      case 'system': return Server;
      default: return User;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to API Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Audit Trail</h1>
              <p className="text-slate-400">Track all API and account activities</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchEvents(true)}
              disabled={refreshing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-slate-400">Total Events</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.success}</div>
                <div className="text-sm text-slate-400">Successful</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.warning}</div>
                <div className="text-sm text-slate-400">Warnings</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.failure}</div>
                <div className="text-sm text-slate-400">Failures</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by actor, action, or resource..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg"
            >
              {actionCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="failure">Failure</option>
            </select>

            <div className="flex bg-slate-700 rounded-lg p-1">
              {(['today', 'week', 'month'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    dateRange === range
                      ? 'bg-violet-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-violet-500 animate-spin" />
            <p className="text-slate-400">Loading audit events...</p>
          </div>
        ) : (
          <>
            {/* Event List */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-700">
                {filteredEvents.map(event => {
                  const ActionIcon = getActionIcon(event.action);
                  const ActorIcon = getActorIcon(event.actor.type);
                  const isExpanded = expandedEvent === event.id;

                  return (
                    <div key={event.id} className="hover:bg-slate-700/30">
                      {/* Event Row */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                      >
                        <div className="flex items-center gap-4">
                          {/* Status Icon */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActionColor(event.action, event.status)}`}>
                            <ActionIcon className="w-5 h-5" />
                          </div>

                          {/* Main Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatAction(event.action)}</span>
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                event.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                                event.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {event.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
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

                          {/* Time & Expand */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm text-slate-400">{formatRelativeTime(event.timestamp)}</div>
                              <div className="text-xs text-slate-500">{event.details.ip}</div>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 bg-slate-900/50 border-t border-slate-700">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Actor Details */}
                            <div>
                              <h4 className="text-sm font-medium text-slate-400 mb-3">Actor Details</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <ActorIcon className="w-4 h-4 text-slate-500" />
                                  <span className="text-sm">{event.actor.name}</span>
                                </div>
                                {event.actor.email && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm text-slate-400">{event.actor.email}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Globe className="w-4 h-4 text-slate-500" />
                                  <span className="text-sm text-slate-400">{event.details.ip}</span>
                                  {event.details.location && (
                                    <>
                                      <span className="text-slate-600">•</span>
                                      <MapPin className="w-3 h-3 text-slate-500" />
                                      <span className="text-sm text-slate-400">{event.details.location}</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Monitor className="w-4 h-4 text-slate-500" />
                                  <span className="text-xs text-slate-500 truncate max-w-xs">{event.details.userAgent}</span>
                                </div>
                              </div>
                            </div>

                            {/* Event Details */}
                            <div>
                              <h4 className="text-sm font-medium text-slate-400 mb-3">Event Details</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-slate-500" />
                                  <span className="text-sm">{new Date(event.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Link className="w-4 h-4 text-slate-500" />
                                  <span className="text-sm">Resource: {event.resource.type}/{event.resource.id}</span>
                                </div>
                                {event.details.reason && (
                                  <div className="flex items-center gap-2">
                                    <Info className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm text-slate-400">{event.details.reason}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Changes */}
                            {event.details.changes && event.details.changes.length > 0 && (
                              <div className="col-span-2">
                                <h4 className="text-sm font-medium text-slate-400 mb-3">Changes</h4>
                                <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                                  {event.details.changes.map((change, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                      <span className="font-mono text-slate-400">{change.field}:</span>
                                      <span className="text-red-400 line-through">{change.oldValue}</span>
                                      <ArrowUpRight className="w-3 h-3 text-slate-500" />
                                      <span className="text-emerald-400">{change.newValue}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Metadata */}
                            {Object.keys(event.metadata).length > 0 && (
                              <div className="col-span-2">
                                <h4 className="text-sm font-medium text-slate-400 mb-3">Metadata</h4>
                                <div className="flex items-center gap-2">
                                  <pre className="flex-1 bg-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto">
                                    {JSON.stringify(event.metadata, null, 2)}
                                  </pre>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(JSON.stringify(event.metadata, null, 2), event.id);
                                    }}
                                    className="p-2 hover:bg-slate-700 rounded-lg shrink-0"
                                  >
                                    {copied === event.id ? (
                                      <Check className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-4 h-4 text-slate-400" />
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

              {/* Pagination */}
              <div className="p-4 border-t border-slate-700 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Showing {filteredEvents.length} of {stats.total} events
                </span>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">
                    Previous
                  </button>
                  <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
                <p className="text-slate-400">
                  {stats.total === 0
                    ? 'No audit events recorded yet. Events will appear here as you use the API.'
                    : 'Try adjusting your filters to see more events.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
