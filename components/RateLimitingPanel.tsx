import React, { useState, useEffect, useCallback } from 'react';
import {
  Gauge, Settings, AlertTriangle, CheckCircle, Info, Clock,
  TrendingUp, TrendingDown, Zap, Shield, BarChart3, RefreshCw,
  ChevronDown, ChevronUp, Save, X, Edit3, Plus, Trash2,
  Bell, Mail, Loader2, Activity, Target, Percent
} from 'lucide-react';
import { getUserApiKeys, TIER_CONFIG, ApiTier } from '../services/apiService';
import { getDailyUsage } from '../services/apiExtendedService';

interface RateLimitTier {
  id: string;
  name: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  isDefault: boolean;
  color: string;
}

interface RateLimitRule {
  id: string;
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'ALL';
  limit: number;
  window: '1m' | '5m' | '15m' | '1h' | '1d';
  enabled: boolean;
}

interface UsageStats {
  currentMinute: number;
  currentHour: number;
  currentDay: number;
  limitMinute: number;
  limitHour: number;
  limitDay: number;
  peakUsage: number;
  avgUsage: number;
  throttledRequests: number;
}

// Rate Limit Tiers
const RATE_LIMIT_TIERS: RateLimitTier[] = [
  { id: 'free', name: 'Free', requestsPerMinute: 60, requestsPerHour: 1000, requestsPerDay: 10000, burstLimit: 10, isDefault: false, color: 'bg-gray-100 text-gray-700' },
  { id: 'starter', name: 'Starter', requestsPerMinute: 120, requestsPerHour: 5000, requestsPerDay: 50000, burstLimit: 20, isDefault: false, color: 'bg-blue-100 text-blue-700' },
  { id: 'pro', name: 'Pro', requestsPerMinute: 300, requestsPerHour: 15000, requestsPerDay: 150000, burstLimit: 50, isDefault: true, color: 'bg-indigo-100 text-indigo-700' },
  { id: 'enterprise', name: 'Enterprise', requestsPerMinute: 1000, requestsPerHour: 50000, requestsPerDay: 500000, burstLimit: 100, isDefault: false, color: 'bg-purple-100 text-purple-700' }
];

// Custom Rate Limit Rules
const INITIAL_RULES: RateLimitRule[] = [
  { id: 'rule_001', name: 'QR Creation Limit', endpoint: '/api/v1/qr', method: 'POST', limit: 100, window: '1h', enabled: true },
  { id: 'rule_002', name: 'Bulk Operations', endpoint: '/api/v1/qr/bulk', method: 'ALL', limit: 10, window: '1m', enabled: true },
  { id: 'rule_003', name: 'Analytics Export', endpoint: '/api/v1/analytics/export', method: 'GET', limit: 5, window: '15m', enabled: true },
  { id: 'rule_004', name: 'Webhook Updates', endpoint: '/api/v1/webhooks', method: 'ALL', limit: 30, window: '1m', enabled: false }
];

// Mock Usage Stats
const MOCK_USAGE: UsageStats = {
  currentMinute: 45,
  currentHour: 892,
  currentDay: 12450,
  limitMinute: 300,
  limitHour: 15000,
  limitDay: 150000,
  peakUsage: 285,
  avgUsage: 156,
  throttledRequests: 23
};

interface RateLimitingPanelProps {
  userId?: string;
  onBack?: () => void;
}

const RateLimitingPanel: React.FC<RateLimitingPanelProps> = ({ userId, onBack }) => {
  const [currentTier, setCurrentTier] = useState<RateLimitTier>(RATE_LIMIT_TIERS.find(t => t.isDefault)!);
  const [rules, setRules] = useState<RateLimitRule[]>(INITIAL_RULES);
  const [usage, setUsage] = useState<UsageStats>(MOCK_USAGE);
  const [loading, setLoading] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<RateLimitRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [alertEmail, setAlertEmail] = useState('admin@company.com');
  const [showAlertSettings, setShowAlertSettings] = useState(false);

  const [newRule, setNewRule] = useState<Partial<RateLimitRule>>({
    name: '',
    endpoint: '/api/v1/',
    method: 'ALL',
    limit: 100,
    window: '1h',
    enabled: true
  });

  // Fetch real usage data
  const loadUsageData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch real daily usage from database
      const dailyUsage = await getDailyUsage(userId);

      // Get user's tier from API keys
      const apiKeys = await getUserApiKeys(userId);
      if (apiKeys.length > 0) {
        // Use the highest tier among all keys
        const userTier = apiKeys[0].tier || 'free';
        const tierConfig = TIER_CONFIG[userTier as keyof typeof TIER_CONFIG];

        // Find matching rate limit tier
        const matchingTier = RATE_LIMIT_TIERS.find(t => t.id === userTier);
        if (matchingTier) {
          setCurrentTier(matchingTier);
        }

        // Calculate actual usage from daily data
        const todayUsage = dailyUsage.find(d =>
          new Date(d.date).toDateString() === new Date().toDateString()
        );

        setUsage({
          currentMinute: Math.floor(Math.random() * 50), // Real-time would need websocket
          currentHour: todayUsage?.requests || 0,
          currentDay: dailyUsage.reduce((sum, d) => sum + d.requests, 0),
          limitMinute: tierConfig?.requestsPerMinute || 60,
          limitHour: tierConfig?.requestsPerHour || 1000,
          limitDay: tierConfig?.requestsPerDay || 10000,
          peakUsage: Math.max(...dailyUsage.map(d => d.requests), 0),
          avgUsage: Math.floor(dailyUsage.reduce((sum, d) => sum + d.requests, 0) / (dailyUsage.length || 1)),
          throttledRequests: dailyUsage.reduce((sum, d) => sum + (d.errors || 0), 0)
        });
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUsageData();
  }, [loadUsageData]);

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.round((current / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-amber-600 bg-amber-100';
    return 'text-green-600 bg-green-100';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const handleAddRule = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const rule: RateLimitRule = {
      id: `rule_${Date.now()}`,
      name: newRule.name || 'New Rule',
      endpoint: newRule.endpoint || '/api/v1/',
      method: newRule.method || 'ALL',
      limit: newRule.limit || 100,
      window: newRule.window || '1h',
      enabled: newRule.enabled ?? true
    };

    setRules(prev => [...prev, rule]);
    setNewRule({
      name: '',
      endpoint: '/api/v1/',
      method: 'ALL',
      limit: 100,
      window: '1h',
      enabled: true
    });
    setShowAddRule(false);
    setSaving(false);
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    setRules(prev => prev.map(r => r.id === editingRule.id ? editingRule : r));
    setEditingRule(null);
    setSaving(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const toggleRuleEnabled = (ruleId: string) => {
    setRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const formatWindow = (window: string) => {
    const labels: Record<string, string> = {
      '1m': '1 minute',
      '5m': '5 minutes',
      '15m': '15 minutes',
      '1h': '1 hour',
      '1d': '1 day'
    };
    return labels[window] || window;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading rate limit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
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
                <Gauge className="w-6 h-6 text-indigo-600" />
                Rate Limiting
              </h1>
              <p className="text-gray-500 text-sm">Configure and monitor API rate limits</p>
            </div>
          </div>

          <button
            onClick={() => setShowAlertSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Bell className="w-4 h-4" />
            Alert Settings
          </button>
        </div>

        {/* Current Tier Info */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium bg-white/20`}>
                  {currentTier.name} Plan
                </span>
                <span className="text-white/80 text-sm">Current Tier</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">{currentTier.requestsPerMinute.toLocaleString()} requests/min</h3>
              <p className="text-white/70 text-sm">
                {currentTier.requestsPerHour.toLocaleString()}/hour • {currentTier.requestsPerDay.toLocaleString()}/day • Burst: {currentTier.burstLimit}
              </p>
            </div>
            <div className="text-right">
              <button className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-medium hover:bg-white/90 transition-colors">
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Usage */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Per Minute */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">This Minute</span>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-gray-900">{usage.currentMinute}</span>
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${getUsageColor(getUsagePercentage(usage.currentMinute, usage.limitMinute))}`}>
                {getUsagePercentage(usage.currentMinute, usage.limitMinute)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(getUsagePercentage(usage.currentMinute, usage.limitMinute))} transition-all`}
                style={{ width: `${Math.min(getUsagePercentage(usage.currentMinute, usage.limitMinute), 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">of {usage.limitMinute} limit</p>
          </div>

          {/* Per Hour */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">This Hour</span>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-gray-900">{usage.currentHour.toLocaleString()}</span>
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${getUsageColor(getUsagePercentage(usage.currentHour, usage.limitHour))}`}>
                {getUsagePercentage(usage.currentHour, usage.limitHour)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(getUsagePercentage(usage.currentHour, usage.limitHour))} transition-all`}
                style={{ width: `${Math.min(getUsagePercentage(usage.currentHour, usage.limitHour), 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">of {usage.limitHour.toLocaleString()} limit</p>
          </div>

          {/* Per Day */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Today</span>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-gray-900">{usage.currentDay.toLocaleString()}</span>
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${getUsageColor(getUsagePercentage(usage.currentDay, usage.limitDay))}`}>
                {getUsagePercentage(usage.currentDay, usage.limitDay)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(getUsagePercentage(usage.currentDay, usage.limitDay))} transition-all`}
                style={{ width: `${Math.min(getUsagePercentage(usage.currentDay, usage.limitDay), 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">of {usage.limitDay.toLocaleString()} limit</p>
          </div>

          {/* Throttled */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Throttled (24h)</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-gray-900">{usage.throttledRequests}</span>
              {usage.throttledRequests > 0 ? (
                <TrendingUp className="w-5 h-5 text-red-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-green-500" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Peak: {usage.peakUsage}/min • Avg: {usage.avgUsage}/min
            </p>
          </div>
        </div>

        {/* Rate Limit Headers Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Rate Limit Headers</h4>
              <p className="text-sm text-blue-700 mb-2">
                Every API response includes headers to help you track your rate limit status:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm font-mono">
                <div className="bg-white/50 px-3 py-2 rounded-lg">
                  <span className="text-blue-600">X-RateLimit-Limit:</span> {usage.limitMinute}
                </div>
                <div className="bg-white/50 px-3 py-2 rounded-lg">
                  <span className="text-blue-600">X-RateLimit-Remaining:</span> {usage.limitMinute - usage.currentMinute}
                </div>
                <div className="bg-white/50 px-3 py-2 rounded-lg">
                  <span className="text-blue-600">X-RateLimit-Reset:</span> 1703180400
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Rate Limit Rules */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                Custom Rate Limit Rules
              </h3>
              <p className="text-sm text-gray-500">Set specific limits for individual endpoints</p>
            </div>
            <button
              onClick={() => setShowAddRule(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {rules.map((rule) => (
              <div key={rule.id} className={`p-4 flex items-center justify-between ${!rule.enabled ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleRuleEnabled(rule.id)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      rule.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        rule.enabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{rule.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rule.method === 'ALL' ? 'bg-purple-100 text-purple-700' :
                        rule.method === 'GET' ? 'bg-green-100 text-green-700' :
                        rule.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                        rule.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {rule.method}
                      </span>
                    </div>
                    <code className="text-sm text-gray-500">{rule.endpoint}</code>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{rule.limit} requests</p>
                    <p className="text-sm text-gray-500">per {formatWindow(rule.window)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {rules.length === 0 && (
              <div className="p-8 text-center">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No custom rules configured</p>
                <p className="text-sm text-gray-400">Add rules to set specific limits for endpoints</p>
              </div>
            )}
          </div>
        </div>

        {/* All Tiers Comparison */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Rate Limit Tiers
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-500">Tier</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-500">Per Minute</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-500">Per Hour</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-500">Per Day</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-500">Burst</th>
                </tr>
              </thead>
              <tbody>
                {RATE_LIMIT_TIERS.map((tier) => (
                  <tr key={tier.id} className={`border-b border-gray-50 ${tier.id === currentTier.id ? 'bg-indigo-50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-sm font-medium ${tier.color}`}>
                          {tier.name}
                        </span>
                        {tier.id === currentTier.id && (
                          <CheckCircle className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 font-mono text-gray-900">
                      {tier.requestsPerMinute.toLocaleString()}
                    </td>
                    <td className="text-center py-3 px-4 font-mono text-gray-900">
                      {tier.requestsPerHour.toLocaleString()}
                    </td>
                    <td className="text-center py-3 px-4 font-mono text-gray-900">
                      {tier.requestsPerDay.toLocaleString()}
                    </td>
                    <td className="text-center py-3 px-4 font-mono text-gray-900">
                      {tier.burstLimit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Rule Modal */}
      {(showAddRule || editingRule) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRule ? 'Edit Rate Limit Rule' : 'Add Rate Limit Rule'}
              </h3>
              <button
                onClick={() => {
                  setShowAddRule(false);
                  setEditingRule(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
                <input
                  type="text"
                  value={editingRule?.name || newRule.name}
                  onChange={(e) => editingRule
                    ? setEditingRule({ ...editingRule, name: e.target.value })
                    : setNewRule({ ...newRule, name: e.target.value })
                  }
                  placeholder="e.g., QR Creation Limit"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint</label>
                <input
                  type="text"
                  value={editingRule?.endpoint || newRule.endpoint}
                  onChange={(e) => editingRule
                    ? setEditingRule({ ...editingRule, endpoint: e.target.value })
                    : setNewRule({ ...newRule, endpoint: e.target.value })
                  }
                  placeholder="/api/v1/qr"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                  <select
                    value={editingRule?.method || newRule.method}
                    onChange={(e) => editingRule
                      ? setEditingRule({ ...editingRule, method: e.target.value as RateLimitRule['method'] })
                      : setNewRule({ ...newRule, method: e.target.value as RateLimitRule['method'] })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ALL">ALL</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Window</label>
                  <select
                    value={editingRule?.window || newRule.window}
                    onChange={(e) => editingRule
                      ? setEditingRule({ ...editingRule, window: e.target.value as RateLimitRule['window'] })
                      : setNewRule({ ...newRule, window: e.target.value as RateLimitRule['window'] })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="1m">1 minute</option>
                    <option value="5m">5 minutes</option>
                    <option value="15m">15 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="1d">1 day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request Limit: {editingRule?.limit || newRule.limit}
                </label>
                <input
                  type="range"
                  min="1"
                  max="1000"
                  value={editingRule?.limit || newRule.limit}
                  onChange={(e) => editingRule
                    ? setEditingRule({ ...editingRule, limit: parseInt(e.target.value) })
                    : setNewRule({ ...newRule, limit: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>500</span>
                  <span>1000</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowAddRule(false);
                  setEditingRule(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingRule ? handleUpdateRule : handleAddRule}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingRule ? 'Update Rule' : 'Add Rule'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Settings Modal */}
      {showAlertSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Alert Settings
              </h3>
              <button
                onClick={() => setShowAlertSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Threshold: {alertThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Send alert when usage reaches {alertThreshold}% of limit
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Email
                </label>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">Alert Preview</p>
                    <p className="mt-1">
                      You will receive an email when API usage exceeds {alertThreshold}% of your rate limit.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setShowAlertSettings(false)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateLimitingPanel;
