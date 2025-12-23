import React, { useState, useEffect } from 'react';
import {
  Key, Copy, Eye, EyeOff, Trash2, RefreshCw, Plus,
  Activity, Zap, Shield, Code, ChevronRight, Check,
  AlertCircle, Clock, TrendingUp, Globe, ArrowLeft, Play, FileText, Book,
  Users, Gauge, Link2, ClipboardList, PieChart, Rocket, Lock,
  Server, Wifi, Settings, RotateCcw, History, Package, AlertOctagon, Terminal
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  ApiKey,
  ApiUsageMonthly,
  TIER_CONFIG,
  generateApiKey,
  getUserApiKeys,
  updateApiKey,
  deleteApiKey,
  getApiKeyUsage,
  getCurrentMonthUsage,
  getUserTotalUsage,
  calculateUsagePercentage,
  formatNumber,
  getTierColor
} from '../services/apiService';

interface NewKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateKey: (name: string) => Promise<void>;
  newKey: string | null;
}

const NewKeyModal: React.FC<NewKeyModalProps> = ({ isOpen, onClose, onCreateKey, newKey }) => {
  const [keyName, setKeyName] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!keyName.trim()) return;
    setLoading(true);
    await onCreateKey(keyName);
    setLoading(false);
  };

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {!newKey ? (
          <>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create New API Key</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Key Name</label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Production App"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!keyName.trim() || loading}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Key
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">API Key Created!</h3>
              <p className="text-gray-500 text-sm mt-2">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 mb-4">
              <code className="text-green-400 text-sm break-all font-mono">{newKey}</code>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className={`flex-1 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Key'}
              </button>
              <button
                onClick={() => {
                  setKeyName('');
                  onClose();
                }}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface ApiDashboardProps {
  onBack: () => void;
  onWebhooksClick: () => void;
  onDocsClick: () => void;
  onPlaygroundClick: () => void;
  onAnalyticsClick: () => void;
  onLogsClick: () => void;
  onApiReferenceClick: () => void;
  onTeamAccessClick: () => void;
  onPerformanceClick: () => void;
  onDomainsClick: () => void;
  onAuditClick: () => void;
  onUsageQuotaClick: () => void;
  onOnboardingClick: () => void;
  onRateLimitingClick?: () => void;
  onIpWhitelistClick?: () => void;
  onCorsConfigClick?: () => void;
  onKeyRotationClick?: () => void;
  onKeyScopesClick?: () => void;
  onChangelogClick?: () => void;
  onStatusPageClick?: () => void;
  onSdkExamplesClick?: () => void;
  onPostmanExportClick?: () => void;
  onErrorCodesClick?: () => void;
  onDeveloperPortalClick?: () => void;
}

const ApiDashboard: React.FC<ApiDashboardProps> = ({
  onBack, onWebhooksClick, onDocsClick, onPlaygroundClick, onAnalyticsClick,
  onLogsClick, onApiReferenceClick, onTeamAccessClick, onPerformanceClick,
  onDomainsClick, onAuditClick, onUsageQuotaClick, onOnboardingClick,
  onRateLimitingClick, onIpWhitelistClick, onCorsConfigClick, onKeyRotationClick,
  onKeyScopesClick, onChangelogClick, onStatusPageClick, onSdkExamplesClick,
  onPostmanExportClick, onErrorCodesClick, onDeveloperPortalClick
}) => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [totalUsage, setTotalUsage] = useState({ totalRequests: 0, totalKeys: 0, activeKeys: 0 });
  const [keyUsage, setKeyUsage] = useState<Record<string, ApiUsageMonthly | null>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      loadApiKeys();
      loadTotalUsage();
    }
  }, [user]);

  const loadApiKeys = async () => {
    if (!user) return;
    setLoading(true);
    const keys = await getUserApiKeys(user.id);
    setApiKeys(keys);

    // Load usage for each key
    const usageMap: Record<string, ApiUsageMonthly | null> = {};
    for (const key of keys) {
      usageMap[key.id] = await getCurrentMonthUsage(key.id);
    }
    setKeyUsage(usageMap);
    setLoading(false);
  };

  const loadTotalUsage = async () => {
    if (!user) return;
    const usage = await getUserTotalUsage(user.id);
    setTotalUsage(usage);
  };

  const handleCreateKey = async (name: string) => {
    if (!user) return;
    const result = await generateApiKey(user.id, name, 'free');
    if (result) {
      setNewKey(result.key);
      await loadApiKeys();
      await loadTotalUsage();
    }
  };

  const handleToggleKey = async (keyId: string, isActive: boolean) => {
    await updateApiKey(keyId, { is_active: !isActive });
    await loadApiKeys();
  };

  const handleDeleteKey = async (keyId: string) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      await deleteApiKey(keyId);
      await loadApiKeys();
      await loadTotalUsage();
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">API Dashboard</h1>
            <p className="text-gray-600">Manage your API keys and monitor usage</p>
          </div>
        </div>
        <button
          onClick={onOnboardingClick}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200"
        >
          <Rocket className="w-4 h-4" />
          Getting Started
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">This Month</span>
          </div>
          <div className="text-3xl font-bold mb-1">{formatNumber(totalUsage.totalRequests)}</div>
          <div className="text-white/80 text-sm">API Requests</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">Active</span>
          </div>
          <div className="text-3xl font-bold mb-1">{totalUsage.activeKeys}</div>
          <div className="text-white/80 text-sm">of {totalUsage.totalKeys} API Keys</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">Plan</span>
          </div>
          <div className="text-3xl font-bold mb-1">Free</div>
          <div className="text-white/80 text-sm">100 requests/month</div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">API Keys</h2>
            <p className="text-gray-500 text-sm mt-1">Manage your API keys for programmatic access</p>
          </div>
          <button
            onClick={() => {
              setNewKey(null);
              setShowNewKeyModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Key
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading API keys...</p>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Keys Yet</h3>
            <p className="text-gray-500 mb-4">Create your first API key to start using the Nexus QR API</p>
            <button
              onClick={() => setShowNewKeyModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create API Key
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {apiKeys.map(key => {
              const usage = keyUsage[key.id];
              const usagePercent = usage ? calculateUsagePercentage(usage.request_count, key.rate_limit) : 0;
              const tierColor = getTierColor(key.tier);

              return (
                <div key={key.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{key.name}</h3>
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-full"
                          style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
                        >
                          {TIER_CONFIG[key.tier].name}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          key.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {key.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <code className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg font-mono">
                          {visibleKeys[key.id] ? key.key_prefix : '••••••••••••'}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(key.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                        >
                          {visibleKeys[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Usage Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-500">Usage this month</span>
                          <span className="font-medium text-gray-700">
                            {formatNumber(usage?.request_count || 0)} / {formatNumber(key.rate_limit)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${usagePercent}%`,
                              backgroundColor: usagePercent > 80 ? '#EF4444' : usagePercent > 50 ? '#F59E0B' : '#10B981'
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Created {new Date(key.created_at).toLocaleDateString()}
                        </span>
                        {key.last_used_at && (
                          <span className="flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5" />
                            Last used {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleKey(key.id, key.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          key.is_active
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={key.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pricing Tiers */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">API Plans</h2>
          <p className="text-gray-500 text-sm mt-1">Choose the plan that fits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
          {Object.entries(TIER_CONFIG).map(([tier, config]) => (
            <div
              key={tier}
              className={`border-2 rounded-2xl p-6 transition-all hover:shadow-lg ${
                tier === 'pro' ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200'
              }`}
            >
              {tier === 'pro' && (
                <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">
                  Most Popular
                </div>
              )}
              <div className="text-lg font-bold text-gray-900 mb-1">{config.name}</div>
              <div className="text-2xl font-bold text-gray-900 mb-4">
                {config.priceLabel}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                {config.requestsLabel} requests
              </div>
              <ul className="space-y-2 mb-6">
                {config.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-3 rounded-xl font-medium transition-colors ${
                  tier === 'free'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : tier === 'pro'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {tier === 'free' ? 'Current Plan' : tier === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <button
          onClick={onPlaygroundClick}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Play className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                API Playground
              </h3>
              <p className="text-sm text-gray-500">Test endpoints live</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
          </div>
        </button>

        <button
          onClick={onAnalyticsClick}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                Analytics
              </h3>
              <p className="text-sm text-gray-500">View usage insights</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
          </div>
        </button>

        <button
          onClick={onLogsClick}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">
                Request Logs
              </h3>
              <p className="text-sm text-gray-500">Debug API calls</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 transition-colors" />
          </div>
        </button>

        <button
          onClick={onUsageQuotaClick}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
              <PieChart className="w-6 h-6 text-rose-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                Usage & Quota
              </h3>
              <p className="text-sm text-gray-500">Monitor API limits</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-600 transition-colors" />
          </div>
        </button>

        <button
          onClick={onPerformanceClick}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
              <Gauge className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">
                Performance
              </h3>
              <p className="text-sm text-gray-500">API health metrics</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-600 transition-colors" />
          </div>
        </button>

        <button
          onClick={onAuditClick}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                Audit Trail
              </h3>
              <p className="text-sm text-gray-500">Activity history</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
          </div>
        </button>
      </div>

      {/* Team & Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <button
          onClick={onTeamAccessClick}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                Team Access
              </h3>
              <p className="text-sm text-gray-500">Manage members & roles</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </button>

        <button
          onClick={onDomainsClick}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <Link2 className="w-6 h-6 text-teal-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                Custom Domains
              </h3>
              <p className="text-sm text-gray-500">Branded API URLs</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-teal-600 transition-colors" />
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={onApiReferenceClick}
          className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Book className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">
                API Reference
              </h3>
              <p className="text-sm text-white/80">OpenAPI Docs</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
          </div>
        </button>

        <button
          onClick={onDocsClick}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Code className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                Quick Start
              </h3>
              <p className="text-sm text-gray-500">Integration guide</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </div>
        </button>

        <button
          onClick={onWebhooksClick}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                Webhooks
              </h3>
              <p className="text-sm text-gray-500">Real-time notifications</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </div>
        </button>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
          <h3 className="font-semibold mb-2">Need Help?</h3>
          <p className="text-white/80 text-sm mb-4">Contact our developer support team</p>
          <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Get Support
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Security Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {onRateLimitingClick && (
            <button
              onClick={onRateLimitingClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                    Rate Limiting
                  </h3>
                  <p className="text-sm text-gray-500">Configure API limits</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
              </div>
            </button>
          )}

          {onIpWhitelistClick && (
            <button
              onClick={onIpWhitelistClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Server className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                    IP Whitelist
                  </h3>
                  <p className="text-sm text-gray-500">Manage allowed IPs</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </div>
            </button>
          )}

          {onCorsConfigClick && (
            <button
              onClick={onCorsConfigClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">
                    CORS Config
                  </h3>
                  <p className="text-sm text-gray-500">Cross-origin settings</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 transition-colors" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* API Key Management */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">API Key Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {onKeyRotationClick && (
            <button
              onClick={onKeyRotationClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    Key Rotation
                  </h3>
                  <p className="text-sm text-gray-500">Rotate API keys securely</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </button>
          )}

          {onKeyScopesClick && (
            <button
              onClick={onKeyScopesClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                    Key Scopes
                  </h3>
                  <p className="text-sm text-gray-500">Manage permissions</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Resources & Documentation */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Resources & Documentation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {onSdkExamplesClick && (
            <button
              onClick={onSdkExamplesClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <Terminal className="w-6 h-6 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">
                    SDK Examples
                  </h3>
                  <p className="text-sm text-gray-500">Code snippets</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 transition-colors" />
              </div>
            </button>
          )}

          {onPostmanExportClick && (
            <button
              onClick={onPostmanExportClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    Postman Export
                  </h3>
                  <p className="text-sm text-gray-500">Download collection</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
              </div>
            </button>
          )}

          {onErrorCodesClick && (
            <button
              onClick={onErrorCodesClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertOctagon className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                    Error Codes
                  </h3>
                  <p className="text-sm text-gray-500">Reference guide</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
              </div>
            </button>
          )}

          {onChangelogClick && (
            <button
              onClick={onChangelogClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <History className="w-6 h-6 text-slate-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-slate-600 transition-colors">
                    Changelog
                  </h3>
                  <p className="text-sm text-gray-500">Version history</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-slate-600 transition-colors" />
              </div>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {onStatusPageClick && (
            <button
              onClick={onStatusPageClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    Status Page
                  </h3>
                  <p className="text-sm text-gray-500">System health & uptime</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              </div>
            </button>
          )}

          {onDeveloperPortalClick && (
            <button
              onClick={onDeveloperPortalClick}
              className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">
                    Developer Portal
                  </h3>
                  <p className="text-sm text-white/80">Full documentation</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* New Key Modal */}
      <NewKeyModal
        isOpen={showNewKeyModal}
        onClose={() => {
          setShowNewKeyModal(false);
          setNewKey(null);
        }}
        onCreateKey={handleCreateKey}
        newKey={newKey}
      />
    </div>
  );
};

export default ApiDashboard;
