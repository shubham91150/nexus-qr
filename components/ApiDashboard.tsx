import React, { useState, useEffect } from 'react';
import {
  Key, Copy, Eye, EyeOff, Trash2, RefreshCw, Plus,
  Activity, Zap, Shield, ChevronRight, Check,
  Clock, TrendingUp, Globe, ArrowLeft, Play, FileText, Book,
  Users, Rocket, Code, Sun, Moon, BarChart3, ArrowUpRight,
  Cpu, Wifi, Monitor, Power
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[24px] max-w-md w-full p-8 shadow-2xl">
        {!newKey ? (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-[#E5FF00] rounded-2xl flex items-center justify-center">
                <Key className="w-7 h-7 text-gray-900" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Create API Key</h3>
                <p className="text-sm text-gray-500">Add a new key for your app</p>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Key Name</label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Production App"
                className="w-full px-5 py-4 bg-gray-100 border-0 rounded-2xl focus:ring-2 focus:ring-[#E5FF00] focus:bg-white transition-all text-gray-900 font-medium"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-5 py-4 bg-gray-100 rounded-2xl text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!keyName.trim() || loading}
                className="flex-1 px-5 py-4 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Create
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-[#E5FF00] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-gray-900" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Key Created!</h3>
              <p className="text-gray-500 mt-2">
                Copy your API key now. You won't see it again!
              </p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 mb-6">
              <code className="text-[#E5FF00] text-sm break-all font-mono">{newKey}</code>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className={`flex-1 px-5 py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-colors ${
                  copied
                    ? 'bg-[#E5FF00] text-gray-900'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied!' : 'Copy Key'}
              </button>
              <button
                onClick={() => {
                  setKeyName('');
                  onClose();
                }}
                className="flex-1 px-5 py-4 bg-gray-100 rounded-2xl text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
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

// Activity Bar Chart Component
const ActivityChart: React.FC<{ data: number[] }> = ({ data }) => {
  const maxValue = Math.max(...data);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((value, idx) => (
        <div
          key={idx}
          className="flex-1 bg-gray-900 rounded-t-sm transition-all hover:bg-[#E5FF00]"
          style={{ height: `${(value / maxValue) * 100}%`, minHeight: '4px' }}
        />
      ))}
    </div>
  );
};

// Semi-circular Gauge Component
const UsageGauge: React.FC<{ percentage: number; label: string }> = ({ percentage, label }) => {
  const rotation = (percentage / 100) * 180 - 90;
  return (
    <div className="relative w-full aspect-[2/1] flex items-center justify-center">
      {/* Background arc */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={percentage > 80 ? '#EF4444' : percentage > 50 ? '#F59E0B' : '#10B981'}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 2.51} 251`}
        />
      </svg>
      {/* Needle */}
      <div
        className="absolute bottom-0 left-1/2 w-1 h-16 bg-blue-600 rounded-full origin-bottom transition-transform duration-700"
        style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
      />
      {/* Center display */}
      <div className="absolute bottom-2 text-center">
        <div className="text-3xl font-bold text-gray-900">{percentage}%</div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
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

  // Sample activity data for chart
  const activityData = [12, 19, 15, 25, 22, 18, 30, 28, 24, 20, 35, 32, 28, 38];

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
    if (confirm('Are you sure you want to delete this API key?')) {
      await deleteApiKey(keyId);
      await loadApiKeys();
      await loadTotalUsage();
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const usagePercent = totalUsage.totalKeys > 0 ? Math.min(Math.round((totalUsage.totalRequests / 100) * 100), 100) : 0;

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-[1200px] mx-auto pt-6 pb-20 px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Dashboard</h1>
              <p className="text-sm text-gray-500">Manage your API keys & monitor usage</p>
            </div>
          </div>
          <button
            onClick={onOnboardingClick}
            className="flex items-center gap-2 px-5 py-3 bg-[#E5FF00] text-gray-900 rounded-2xl font-semibold hover:bg-[#d4ee00] transition-all shadow-sm"
          >
            <Rocket className="w-5 h-5" />
            Getting Started
          </button>
        </div>

        {/* User Greeting Card */}
        <div className="bg-[#E5FF00] rounded-[24px] p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-7 h-7 text-gray-700" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Hi, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Developer'}
              </h2>
              <p className="text-gray-700 font-medium">{totalUsage.activeKeys} keys active</p>
            </div>
          </div>
          <button className="w-10 h-10 flex items-center justify-center">
            <div className="flex flex-col gap-1">
              <div className="w-1 h-1 bg-gray-900 rounded-full" />
              <div className="w-1 h-1 bg-gray-900 rounded-full" />
              <div className="w-1 h-1 bg-gray-900 rounded-full" />
            </div>
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Usage Gauge Card */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-gray-700" />
                </div>
                <span className="font-bold text-gray-900">API Usage</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-600">Auto</span>
              </div>
            </div>
            <UsageGauge percentage={usagePercent} label="Monthly Quota" />
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">0 req</span>
              <span className="text-sm text-gray-500">100 req</span>
            </div>
          </div>

          {/* Total Requests Card */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="text-5xl font-bold text-gray-900">{formatNumber(totalUsage.totalRequests)}</div>
              <span className="px-3 py-1.5 bg-[#E5FF00] rounded-full text-sm font-bold text-gray-900">
                +{Math.floor(Math.random() * 50)}%
              </span>
            </div>
            <p className="text-gray-500 mb-6">
              Total API requests this month
              <br />
              <span className="text-sm">Jan 01 - Jan {new Date().getDate()}</span>
            </p>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center">
                  <Key className="w-4 h-4 text-white" />
                </div>
                <div className="w-8 h-8 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="w-8 h-8 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              </div>
              <button className="px-5 py-2.5 border-2 border-gray-200 rounded-full font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                SHARE
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions - Scene Cards Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={onPlaygroundClick}
            className="bg-[#A8C5DA] rounded-[20px] p-5 text-left hover:shadow-lg transition-all group relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-800/40 rounded-full" />
              <div className="w-1.5 h-1.5 bg-gray-800/40 rounded-full" />
            </div>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm">
              <Play className="w-5 h-5 text-gray-800" />
            </div>
            <div className="font-bold text-gray-900">Playground</div>
            <div className="text-sm text-gray-700">Test APIs</div>
          </button>

          <button
            onClick={onDocsClick}
            className="bg-white rounded-[20px] p-5 text-left hover:shadow-lg transition-all group relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            </div>
            <div className="w-10 h-10 bg-[#E5FF00] rounded-xl flex items-center justify-center mb-3 shadow-sm">
              <Book className="w-5 h-5 text-gray-800" />
            </div>
            <div className="font-bold text-gray-900">Documentation</div>
            <div className="text-sm text-gray-500">API guides</div>
          </button>

          <button
            onClick={onAnalyticsClick}
            className="bg-white rounded-[20px] p-5 text-left hover:shadow-lg transition-all group relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3 shadow-sm">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div className="font-bold text-gray-900">Analytics</div>
            <div className="text-sm text-gray-500">Usage stats</div>
          </button>

          <button
            onClick={onLogsClick}
            className="bg-white rounded-[20px] p-5 text-left hover:shadow-lg transition-all group relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            </div>
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center mb-3 shadow-sm">
              <FileText className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="font-bold text-gray-900">Logs</div>
            <div className="text-sm text-gray-500">Activity</div>
          </button>
        </div>

        {/* Scenes Summary */}
        <div className="bg-white rounded-[20px] p-5 mb-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">You have {totalUsage.totalKeys} API keys</div>
              <div className="text-sm text-gray-500">{totalUsage.activeKeys} keys active</div>
            </div>
          </div>
          <button
            onClick={() => {
              setNewKey(null);
              setShowNewKeyModal(true);
            }}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
          >
            See All
          </button>
        </div>

        {/* Activity Chart Section */}
        <div className="bg-white rounded-[24px] p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 text-lg">Activity</h3>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#E5FF00]" />
              <span className="font-bold text-gray-900">{usagePercent}%</span>
            </div>
          </div>
          <ActivityChart data={activityData} />
          <div className="flex justify-between mt-3 text-xs text-gray-400">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <span key={i}>{day}</span>
            ))}
          </div>
        </div>

        {/* API Analytics List */}
        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm mb-6">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-gray-700" />
              <div>
                <div className="font-bold text-gray-900">API Power Analytics</div>
                <div className="text-sm text-gray-500">Daily usage</div>
              </div>
            </div>
            <button
              onClick={onAnalyticsClick}
              className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
            >
              <ArrowUpRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Analytics Items */}
          {[
            { icon: <Cpu className="w-5 h-5 text-gray-600" />, name: 'QR Generation', units: totalUsage.totalRequests, metric: `${formatNumber(totalUsage.totalRequests * 2)}ms` },
            { icon: <Wifi className="w-5 h-5 text-gray-600" />, name: 'API Calls', units: totalUsage.totalRequests, metric: `${formatNumber(totalUsage.totalRequests)}req` },
            { icon: <Monitor className="w-5 h-5 text-gray-600" />, name: 'Responses', units: totalUsage.totalRequests, metric: `${formatNumber(totalUsage.totalRequests * 0.5)}KB` },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={onAnalyticsClick}
              className="w-full p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                {item.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-500">{item.units} unit | {item.metric}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>

        {/* More Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={onWebhooksClick}
            className="bg-white rounded-[20px] p-5 flex items-center gap-4 hover:shadow-lg transition-all shadow-sm"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900">Webhooks</div>
              <div className="text-sm text-gray-500">Real-time events</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={onTeamAccessClick}
            className="bg-white rounded-[20px] p-5 flex items-center gap-4 hover:shadow-lg transition-all shadow-sm"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900">Team Access</div>
              <div className="text-sm text-gray-500">Manage roles</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          {onSecurityClick && (
            <button
              onClick={onSecurityClick}
              className="bg-white rounded-[20px] p-5 flex items-center gap-4 hover:shadow-lg transition-all shadow-sm"
            >
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900">Security</div>
                <div className="text-sm text-gray-500">Rate limits & CORS</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* API Keys List */}
        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm mb-6">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900">API Keys</div>
                <div className="text-sm text-gray-500">Manage access keys</div>
              </div>
            </div>
            <button
              onClick={() => {
                setNewKey(null);
                setShowNewKeyModal(true);
              }}
              className="px-5 py-2.5 bg-[#E5FF00] text-gray-900 rounded-full font-semibold hover:bg-[#d4ee00] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Key
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-[#E5FF00] rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-10 h-10 text-gray-900" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No API Keys Yet</h3>
              <p className="text-gray-500 mb-6">Create your first key to get started</p>
              <button
                onClick={() => setShowNewKeyModal(true)}
                className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create API Key
              </button>
            </div>
          ) : (
            <div>
              {apiKeys.map(key => {
                const usage = keyUsage[key.id];
                const usagePercent = usage ? calculateUsagePercentage(usage.request_count, key.rate_limit) : 0;

                return (
                  <div key={key.id} className="p-5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${key.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="font-semibold text-gray-900">{key.name}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                          {TIER_CONFIG[key.tier].name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleKeyVisibility(key.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {visibleKeys[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleToggleKey(key.id, key.is_active)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Power className={`w-4 h-4 ${key.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <code className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-xl font-mono block mb-3">
                      {visibleKeys[key.id] ? key.key_prefix : '••••••••••••••••••••'}
                    </code>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatNumber(usage?.request_count || 0)} / {formatNumber(key.rate_limit)} requests</span>
                      </div>
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${usagePercent}%`,
                            backgroundColor: usagePercent > 80 ? '#EF4444' : usagePercent > 50 ? '#F59E0B' : '#10B981'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Help Card */}
        <div className="bg-gray-900 rounded-[24px] p-6 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg mb-1">Need Help?</h3>
            <p className="text-gray-400">Contact our developer support team</p>
          </div>
          <button className="px-6 py-3 bg-[#E5FF00] text-gray-900 rounded-2xl font-semibold hover:bg-[#d4ee00] transition-colors">
            Get Support
          </button>
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
    </div>
  );
};

export default ApiDashboard;
