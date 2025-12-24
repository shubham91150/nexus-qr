import React, { useState, useEffect } from 'react';
import {
  Key, Copy, Eye, EyeOff, Trash2, RefreshCw, Plus,
  Activity, Zap, Shield, ChevronRight, Check,
  Clock, TrendingUp, Globe, ArrowLeft, Play, FileText, Book,
  Users, Rocket
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
  onTeamAccessClick: () => void;
  onOnboardingClick: () => void;
  onSecurityClick?: () => void;
}

const ApiDashboard: React.FC<ApiDashboardProps> = ({
  onBack, onWebhooksClick, onDocsClick, onPlaygroundClick, onAnalyticsClick,
  onLogsClick, onTeamAccessClick, onOnboardingClick, onSecurityClick
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
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">API Dashboard</h1>
            <p className="text-xs text-gray-500 font-medium">Manage keys & monitor usage</p>
          </div>
        </div>
        <button
          onClick={onOnboardingClick}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-all"
        >
          <Rocket className="w-4 h-4" />
          Getting Started
        </button>
      </div>

      {/* Stats Cards - Matching Home Page Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-[24px] shadow-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">This Month</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{formatNumber(totalUsage.totalRequests)}</div>
          <div className="text-sm text-gray-500">API Requests</div>
        </div>

        <div className="bg-white rounded-[24px] shadow-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-medium">Active</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{totalUsage.activeKeys}</div>
          <div className="text-sm text-gray-500">of {totalUsage.totalKeys} API Keys</div>
        </div>

        <div className="bg-white rounded-[24px] shadow-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full font-medium">Plan</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">Free</div>
          <div className="text-sm text-gray-500">100 requests/month</div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-white rounded-[24px] shadow-card overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">API Keys</h2>
              <p className="text-xs text-gray-500">Manage your API keys for programmatic access</p>
            </div>
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
      <div className="bg-white rounded-[24px] shadow-card overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">API Plans</h2>
              <p className="text-xs text-gray-500">Choose the plan that fits your needs</p>
            </div>
          </div>
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

      {/* Quick Actions - Simplified */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
          <Zap className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-semibold text-gray-800">Quick Actions</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* API Playground - Test endpoints */}
        <button
          onClick={onPlaygroundClick}
          className="bg-white rounded-[20px] shadow-card p-5 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Play className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                API Playground
              </h3>
              <p className="text-sm text-gray-500">Test & debug endpoints</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
          </div>
        </button>

        {/* Analytics - Usage, performance, quota all in one */}
        <button
          onClick={onAnalyticsClick}
          className="bg-white rounded-[20px] shadow-card p-5 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                Analytics & Usage
              </h3>
              <p className="text-sm text-gray-500">Stats, quota & performance</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
          </div>
        </button>

        {/* Request Logs - Includes audit trail */}
        <button
          onClick={onLogsClick}
          className="bg-white rounded-[20px] shadow-card p-5 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">
                Logs & Activity
              </h3>
              <p className="text-sm text-gray-500">Requests & audit trail</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 transition-colors" />
          </div>
        </button>

        {/* Documentation */}
        <button
          onClick={onDocsClick}
          className="bg-white rounded-[20px] shadow-card p-5 hover:shadow-lg transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Book className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                Documentation
              </h3>
              <p className="text-sm text-gray-500">API reference & guides</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </div>
        </button>

        {/* Webhooks */}
        <button
          onClick={onWebhooksClick}
          className="bg-white rounded-[20px] shadow-card p-5 hover:shadow-lg transition-all group text-left"
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

        {/* Team Access */}
        <button
          onClick={onTeamAccessClick}
          className="bg-white rounded-[20px] shadow-card p-5 hover:shadow-lg transition-all group text-left"
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
      </div>

      {/* Security Settings - Consolidated */}
      {onSecurityClick && (
        <button
          onClick={onSecurityClick}
          className="w-full bg-white rounded-[20px] shadow-card p-5 hover:shadow-lg transition-all group text-left mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                Security Settings
              </h3>
              <p className="text-sm text-gray-500">Rate limits, IP whitelist, CORS & key management</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
          </div>
        </button>
      )}

      {/* Help Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Need Help?</h3>
            <p className="text-white/80 text-sm">Contact our developer support team for assistance</p>
          </div>
          <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Get Support
          </button>
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
