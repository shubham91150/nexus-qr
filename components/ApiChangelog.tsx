import React, { useState } from 'react';
import {
  History, Tag, Plus, Minus, RefreshCw, AlertTriangle,
  ChevronDown, ChevronUp, Search, Filter, Calendar,
  Zap, Bug, Shield, Sparkles, ArrowRight, ExternalLink,
  CheckCircle, Clock, Book, ArrowLeft
} from 'lucide-react';

type ChangeType = 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';

interface Change {
  type: ChangeType;
  description: string;
  breaking?: boolean;
}

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description?: string;
  changes: Change[];
  isLatest?: boolean;
  isMajor?: boolean;
}

const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: '1.5.0',
    date: '2024-12-20',
    title: 'Enhanced Analytics & Webhook Improvements',
    description: 'Major analytics update with new metrics and improved webhook reliability.',
    isLatest: true,
    isMajor: true,
    changes: [
      { type: 'added', description: 'Real-time scan analytics with geographic heatmaps' },
      { type: 'added', description: 'Device and browser breakdown in analytics responses' },
      { type: 'added', description: 'Webhook retry configuration with exponential backoff' },
      { type: 'added', description: 'New `scan.milestone` webhook event type' },
      { type: 'changed', description: 'Increased webhook timeout from 10s to 30s' },
      { type: 'changed', description: 'Analytics API now returns UTC timestamps by default' },
      { type: 'fixed', description: 'Fixed race condition in bulk QR code creation' },
      { type: 'fixed', description: 'Corrected timezone handling in date range filters' },
      { type: 'deprecated', description: '`GET /v1/qr/{id}/stats` - use `/v1/qr/{id}/analytics` instead', breaking: true }
    ]
  },
  {
    version: '1.4.2',
    date: '2024-12-10',
    title: 'Security Patch',
    changes: [
      { type: 'security', description: 'Fixed potential XSS vulnerability in QR code titles' },
      { type: 'security', description: 'Enhanced API key hashing algorithm' },
      { type: 'fixed', description: 'Fixed edge case in rate limiting for burst requests' }
    ]
  },
  {
    version: '1.4.1',
    date: '2024-12-01',
    title: 'Bug Fixes',
    changes: [
      { type: 'fixed', description: 'Fixed pagination offset calculation in list endpoints' },
      { type: 'fixed', description: 'Corrected content-type header in error responses' },
      { type: 'fixed', description: 'Fixed webhook signature verification for empty payloads' }
    ]
  },
  {
    version: '1.4.0',
    date: '2024-11-15',
    title: 'Dynamic QR Codes & Custom Domains',
    isMajor: true,
    changes: [
      { type: 'added', description: 'Custom domain support for short URLs' },
      { type: 'added', description: 'QR code expiration settings with `expires_at` field' },
      { type: 'added', description: 'Maximum scan limit with `max_scans` field' },
      { type: 'added', description: 'Password protection for QR codes' },
      { type: 'changed', description: 'Default QR code size increased to 500px' },
      { type: 'deprecated', description: '`size` parameter in query string - use request body instead' }
    ]
  },
  {
    version: '1.3.0',
    date: '2024-10-20',
    title: 'Batch Operations',
    isMajor: true,
    changes: [
      { type: 'added', description: 'Bulk create endpoint: `POST /v1/qr/bulk`' },
      { type: 'added', description: 'Bulk update endpoint: `PATCH /v1/qr/bulk`' },
      { type: 'added', description: 'Bulk delete endpoint: `DELETE /v1/qr/bulk`' },
      { type: 'added', description: 'Async job status endpoint for long-running operations' },
      { type: 'changed', description: 'Rate limits now apply per-endpoint instead of globally' }
    ]
  },
  {
    version: '1.2.0',
    date: '2024-09-15',
    title: 'QR Code Styling',
    changes: [
      { type: 'added', description: 'Custom colors with `style.color` and `style.background`' },
      { type: 'added', description: 'Logo overlay with `style.logo` object' },
      { type: 'added', description: 'Corner styles: square, rounded, dots' },
      { type: 'added', description: 'Pattern styles: square, rounded, dots, classy' },
      { type: 'added', description: 'PNG, SVG, and PDF output formats' }
    ]
  },
  {
    version: '1.1.0',
    date: '2024-08-01',
    title: 'Webhooks & API Keys',
    changes: [
      { type: 'added', description: 'Webhook support with signature verification' },
      { type: 'added', description: 'Multiple API key support with scopes' },
      { type: 'added', description: 'Test/sandbox environment with `nxqr_test_` keys' },
      { type: 'changed', description: 'API key format changed to include environment prefix', breaking: true }
    ]
  },
  {
    version: '1.0.0',
    date: '2024-07-01',
    title: 'Initial Release',
    isMajor: true,
    changes: [
      { type: 'added', description: 'QR code creation with `POST /v1/qr`' },
      { type: 'added', description: 'QR code retrieval with `GET /v1/qr/{id}`' },
      { type: 'added', description: 'QR code listing with pagination' },
      { type: 'added', description: 'QR code update and delete operations' },
      { type: 'added', description: 'Basic scan analytics' },
      { type: 'added', description: 'Rate limiting (1000 requests/hour)' }
    ]
  }
];

const CHANGE_TYPE_CONFIG: Record<ChangeType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  added: { label: 'Added', icon: Plus, color: 'text-green-600', bgColor: 'bg-green-100' },
  changed: { label: 'Changed', icon: RefreshCw, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  deprecated: { label: 'Deprecated', icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  removed: { label: 'Removed', icon: Minus, color: 'text-red-600', bgColor: 'bg-red-100' },
  fixed: { label: 'Fixed', icon: Bug, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  security: { label: 'Security', icon: Shield, color: 'text-rose-600', bgColor: 'bg-rose-100' }
};

interface ApiChangelogProps {
  onBack?: () => void;
}

const ApiChangelog: React.FC<ApiChangelogProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ChangeType | 'all'>('all');
  const [showBreakingOnly, setShowBreakingOnly] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<string[]>([CHANGELOG_DATA[0].version]);

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev =>
      prev.includes(version)
        ? prev.filter(v => v !== version)
        : [...prev, version]
    );
  };

  const filteredChangelog = CHANGELOG_DATA.map(entry => ({
    ...entry,
    changes: entry.changes.filter(change => {
      const matchesType = filterType === 'all' || change.type === filterType;
      const matchesBreaking = !showBreakingOnly || change.breaking;
      const matchesSearch = searchQuery === '' ||
        change.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesBreaking && matchesSearch;
    })
  })).filter(entry => entry.changes.length > 0 || searchQuery === '');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-[1000px] mx-auto pt-6 pb-20 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <History className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">API Changelog</h1>
              <p className="text-xs text-gray-500">Track all API changes</p>
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Book className="w-3 h-3 text-gray-600" />
            </div>
            Migration Guide
          </button>
        </div>

        {/* Latest Version Banner */}
        <div className="bg-[#E5FF00] rounded-[20px] p-5 mb-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gray-900/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-gray-900" />
                </div>
                <span className="text-xs font-medium text-gray-700">Latest Release</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Version {CHANGELOG_DATA[0].version}
              </h2>
              <p className="text-sm text-gray-700">{CHANGELOG_DATA[0].title}</p>
              <p className="text-xs text-gray-600 mt-2">
                Released {formatDate(CHANGELOG_DATA[0].date)}
              </p>
            </div>
            <span className="px-3 py-1.5 bg-gray-900 text-white rounded-full text-xs font-medium">
              {CHANGELOG_DATA[0].changes.length} changes
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[20px] p-4 mb-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search changes..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-100 border-0 rounded-full text-xs focus:ring-2 focus:ring-[#E5FF00] focus:bg-white transition-all"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ChangeType | 'all')}
              className="px-4 py-2.5 bg-gray-100 border-0 rounded-full text-xs focus:ring-2 focus:ring-[#E5FF00]"
            >
              <option value="all">All Changes</option>
              {Object.entries(CHANGE_TYPE_CONFIG).map(([type, config]) => (
                <option key={type} value={type}>{config.label}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-full cursor-pointer">
              <input
                type="checkbox"
                checked={showBreakingOnly}
                onChange={(e) => setShowBreakingOnly(e.target.checked)}
                className="w-4 h-4 rounded-full border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-xs text-gray-700">Breaking only</span>
            </label>
          </div>
        </div>

        {/* Changelog Timeline */}
        <div className="space-y-3">
          {filteredChangelog.map((entry) => {
            const isExpanded = expandedVersions.includes(entry.version);

            return (
              <div
                key={entry.version}
                className="bg-white rounded-[20px] shadow-sm overflow-hidden"
              >
                {/* Version Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleVersion(entry.version)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        entry.isMajor ? 'bg-[#E5FF00]' : 'bg-gray-100'
                      }`}>
                        <Tag className={`w-5 h-5 ${entry.isMajor ? 'text-gray-900' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            v{entry.version}
                          </h3>
                          {entry.isLatest && (
                            <span className="px-2 py-0.5 bg-[#E5FF00] text-gray-900 text-[10px] font-medium rounded-full">
                              Latest
                            </span>
                          )}
                          {entry.isMajor && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded-full">
                              Major
                            </span>
                          )}
                          {entry.changes.some(c => c.breaking) && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-medium rounded-full">
                              Breaking
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{entry.title}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.date)}
                      </div>
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Changes List */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {entry.description && (
                      <p className="text-xs text-gray-600 py-3">{entry.description}</p>
                    )}

                    <div className="space-y-2 pt-2">
                      {entry.changes.map((change, idx) => {
                        const config = CHANGE_TYPE_CONFIG[change.type];
                        const ChangeIcon = config.icon;

                        return (
                          <div
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-[16px] ${
                              change.breaking ? 'bg-red-50' : 'bg-gray-50'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor}`}>
                              <ChangeIcon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[10px] font-medium ${config.color}`}>
                                  {config.label}
                                </span>
                                {change.breaking && (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-medium rounded-full">
                                    Breaking
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-700">{change.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredChangelog.length === 0 && (
          <div className="bg-white rounded-[20px] p-8 shadow-sm text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <History className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No changes found</h3>
            <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Subscribe CTA */}
        <div className="mt-4 bg-gray-900 rounded-[20px] p-5 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Stay Updated</h3>
              <p className="text-xs text-gray-400">
                Get notified about new releases and breaking changes
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#E5FF00] text-gray-900 rounded-full text-xs font-medium hover:bg-[#d4ee00] transition-colors">
              <div className="w-6 h-6 bg-gray-900/10 rounded-full flex items-center justify-center">
                <ArrowRight className="w-3 h-3" />
              </div>
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiChangelog;
