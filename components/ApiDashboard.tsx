import React, { useState, useEffect } from 'react';
import {
  Key, Copy, Eye, EyeOff, Trash2, RefreshCw, Plus,
  Activity, Zap, Shield, ChevronRight, Check,
  Clock, TrendingUp, Globe, ArrowLeft, Play, FileText, Book,
  Users, Rocket, Code, ArrowUpRight, Power
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
  getCurrentMonthUsage,
  getUserTotalUsage,
  calculateUsagePercentage,
  formatNumber,
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
      <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl">
        {!newKey ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#E5FF00] rounded-full flex items-center justify-center">
                <Key className="w-5 h-5 text-gray-900" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Create API Key</h3>
                <p className="text-xs text-gray-500">Add a new key for your app</p>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-700 mb-2">Key Name</label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Production App"
                className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm focus:ring-2 focus:ring-[#E5FF00] focus:bg-white transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!keyName.trim() || loading}
                className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-[#E5FF00] rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Key Created!</h3>
              <p className="text-xs text-gray-500 mt-1">Copy now. You won't see it again!</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 mb-5">
              <code className="text-[#E5FF00] text-xs break-all font-mono">{newKey}</code>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  copied ? 'bg-[#E5FF00] text-gray-900' : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Key'}
              </button>
              <button
                onClick={() => { setKeyName(''); onClose(); }}
                className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
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
    <div className="flex items-end gap-1 h-20">
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

// Gauge Component matching Air Conditioner dial style
const RequestGauge: React.FC<{ current: number; max: number }> = ({ current, max }) => {
  const percentage = Math.min((current / max) * 100, 100);
  const needleAngle = -135 + (percentage * 2.7); // -135 to 135 degrees (270 degree arc)

  // Color gradient function - from blue to cyan to green to yellow to orange to red
  const getTickColor = (index: number, total: number) => {
    const position = index / total;
    if (position < 0.2) return '#3B82F6'; // Blue
    if (position < 0.4) return '#06B6D4'; // Cyan
    if (position < 0.6) return '#10B981'; // Green
    if (position < 0.75) return '#F59E0B'; // Amber
    if (position < 0.9) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  // Generate tick marks
  const ticks = [];
  const totalTicks = 54;
  for (let i = 0; i <= totalTicks; i++) {
    const angle = -135 + (i * (270 / totalTicks)); // 270 degree arc
    const isLarge = i % 9 === 0;
    const radian = (angle * Math.PI) / 180;
    const innerR = isLarge ? 62 : 68;
    const outerR = 78;
    const x1 = 100 + innerR * Math.cos(radian);
    const y1 = 100 + innerR * Math.sin(radian);
    const x2 = 100 + outerR * Math.cos(radian);
    const y2 = 100 + outerR * Math.sin(radian);

    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={getTickColor(i, totalTicks)}
        strokeWidth={isLarge ? 3 : 2}
        strokeLinecap="round"
      />
    );
  }

  // Calculate needle tip position for the value label
  const needleRadian = (needleAngle * Math.PI) / 180;
  const labelRadius = 45;
  const labelX = 100 + labelRadius * Math.cos(needleRadian);
  const labelY = 100 + labelRadius * Math.sin(needleRadian);

  return (
    <div className="relative pt-2">
      {/* Timer badge */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f5] rounded-full">
        <Clock className="w-3.5 h-3.5 text-gray-600" />
        <span className="text-[11px] font-medium text-gray-700">This Month</span>
      </div>

      {/* Auto label with dot indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-500">Auto</span>
      </div>

      <svg viewBox="0 0 200 160" className="w-full mt-2">
        {/* Tick marks */}
        {ticks}

        {/* Needle - triangular pointer from center going outward */}
        <g transform={`rotate(${needleAngle}, 100, 100)`}>
          {/* Needle body - triangle shape */}
          <polygon
            points="100,35 96,100 104,100"
            fill="#1F2937"
          />
          {/* Needle tip circle */}
          <circle cx="100" cy="35" r="4" fill="#1F2937" />
          {/* Center hub */}
          <circle cx="100" cy="100" r="8" fill="#1F2937" />
          <circle cx="100" cy="100" r="4" fill="white" />
        </g>

        {/* Value indicator following needle tip */}
        <g transform={`translate(${labelX}, ${labelY})`}>
          <circle r="14" fill="white" stroke="#E5E7EB" strokeWidth="1" />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-700"
            style={{ fontSize: '10px', fontWeight: 600 }}
          >
            {current}
          </text>
        </g>

        {/* Center display */}
        <text x="100" y="125" textAnchor="middle" className="fill-gray-900" style={{ fontSize: '28px', fontWeight: 700 }}>
          {current}
        </text>
        <text x="100" y="142" textAnchor="middle" className="fill-gray-400" style={{ fontSize: '10px' }}>
          Requests
        </text>

        {/* Scale labels at edges */}
        <text x="30" y="130" textAnchor="middle" className="fill-gray-400" style={{ fontSize: '10px' }}>0</text>
        <text x="170" y="130" textAnchor="middle" className="fill-gray-400" style={{ fontSize: '10px' }}>{max}</text>
      </svg>
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
            <div>
              <h1 className="text-sm font-semibold text-gray-800">API Dashboard</h1>
              <p className="text-xs text-gray-500">Manage keys & monitor usage</p>
            </div>
          </div>
          <button
            onClick={onOnboardingClick}
            className="flex items-center gap-2 px-4 py-2 bg-[#E5FF00] text-gray-900 rounded-full text-xs font-medium hover:bg-[#d4ee00] transition-all shadow-sm"
          >
            <Rocket className="w-4 h-4" />
            Getting Started
          </button>
        </div>

        {/* Main Grid - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Gauge Card - Like Air Conditioner card */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Activity className="w-4 h-4 text-gray-700" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">API Usage</div>
                  <div className="text-xs text-gray-500">Auto tracking</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">On</span>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Power className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
            <RequestGauge current={totalUsage.totalRequests} max={100} />
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm">
            <div className="flex items-start justify-between mb-1">
              <div className="text-4xl font-bold text-gray-900">{formatNumber(totalUsage.totalRequests)}</div>
              <span className="px-2 py-1 bg-[#E5FF00] rounded-full text-[10px] font-bold text-gray-900">
                +{Math.min(totalUsage.totalRequests * 2, 172)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Total API requests for<br />
              01 Jan — {new Date().getDate()} Jan week.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 bg-gray-900 rounded-full border-2 border-white flex items-center justify-center">
                  <Key className="w-3 h-3 text-white" />
                </div>
                <div className="w-8 h-8 bg-gray-900 rounded-full border-2 border-white flex items-center justify-center">
                  <Zap className="w-3 h-3 text-[#E5FF00]" />
                </div>
                <div className="w-8 h-8 bg-gray-900 rounded-full border-2 border-white flex items-center justify-center">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              </div>
              <button
                onClick={onAnalyticsClick}
                className="px-4 py-2 bg-gray-900 text-white rounded-full text-xs font-medium hover:bg-gray-800 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        </div>

        {/* User Greeting Card - Yellow */}
        <div className="bg-[#E5FF00] rounded-[20px] p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-6 h-6 text-gray-700" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Hi, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Developer'}
              </div>
              <div className="text-xs text-gray-700">{totalUsage.activeKeys} keys active</div>
            </div>
          </div>
          <button className="w-8 h-8 flex items-center justify-center">
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 bg-gray-900 rounded-full" />
              <div className="w-1 h-1 bg-gray-900 rounded-full" />
              <div className="w-1 h-1 bg-gray-900 rounded-full" />
            </div>
          </button>
        </div>

        {/* Scene Cards - Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={onPlaygroundClick}
            className="bg-[#A8C5DA] rounded-[20px] p-4 text-left hover:shadow-lg transition-all relative"
          >
            <div className="absolute top-3 right-3 flex gap-1">
              <div className="w-1 h-1 bg-gray-800/50 rounded-full" />
              <div className="w-1 h-1 bg-gray-800/50 rounded-full" />
            </div>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-3">
              <Play className="w-5 h-5 text-gray-800" />
            </div>
            <div className="text-sm font-semibold text-gray-900">API Playground</div>
            <div className="text-xs text-gray-700">{totalUsage.totalKeys} Endpoints</div>
          </button>

          <button
            onClick={onDocsClick}
            className="bg-white rounded-[20px] p-4 text-left hover:shadow-lg transition-all relative shadow-sm"
          >
            <div className="absolute top-3 right-3 flex gap-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
            </div>
            <div className="w-10 h-10 bg-[#E5FF00] rounded-full flex items-center justify-center mb-3">
              <Book className="w-5 h-5 text-gray-800" />
            </div>
            <div className="text-sm font-semibold text-gray-900">Documentation</div>
            <div className="text-xs text-gray-500">API Guides</div>
          </button>
        </div>

        {/* Summary Row */}
        <div className="bg-white rounded-[20px] p-4 mb-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">You created {totalUsage.totalKeys} keys</div>
              <div className="text-xs text-gray-500">{totalUsage.activeKeys} keys in use</div>
            </div>
          </div>
          <button
            onClick={() => { setNewKey(null); setShowNewKeyModal(true); }}
            className="px-4 py-2 bg-gray-900 text-white rounded-full text-xs font-medium hover:bg-gray-800 transition-colors"
          >
            See All
          </button>
        </div>

        {/* Activity Chart */}
        <div className="bg-white rounded-[20px] p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-900">Activity</div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-[#E5FF00]" />
              <span className="text-sm font-semibold text-gray-900">24%</span>
            </div>
          </div>
          <div className="mb-2">
            <div className="text-xs text-gray-400 mb-1">20 h</div>
            <div className="text-xs text-gray-400">15 h</div>
          </div>
          <ActivityChart data={activityData} />
        </div>

        {/* API Power Analytics - List */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-sm mb-4">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-gray-700" />
              <div>
                <div className="text-sm font-semibold text-gray-900">API Power Analytics</div>
                <div className="text-xs text-gray-500">Daily usage</div>
              </div>
            </div>
            <button
              onClick={onAnalyticsClick}
              className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {[
            { icon: <Zap className="w-4 h-4 text-gray-600" />, name: 'QR Generation', units: `${totalUsage.totalKeys} keys`, metric: `${totalUsage.totalRequests} req` },
            { icon: <Activity className="w-4 h-4 text-gray-600" />, name: 'API Requests', units: 'This month', metric: `${totalUsage.totalRequests} calls` },
            { icon: <Code className="w-4 h-4 text-gray-600" />, name: 'Responses', units: 'Success rate', metric: '99.9%' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={onAnalyticsClick}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                {item.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                <div className="text-xs text-gray-500">{item.units} | {item.metric}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>

        {/* More Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <button
            onClick={onWebhooksClick}
            className="bg-white rounded-[20px] p-4 flex items-center gap-3 hover:shadow-lg transition-all shadow-sm"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-900">Webhooks</div>
              <div className="text-xs text-gray-500">Real-time</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={onLogsClick}
            className="bg-white rounded-[20px] p-4 flex items-center gap-3 hover:shadow-lg transition-all shadow-sm"
          >
            <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-900">Logs</div>
              <div className="text-xs text-gray-500">Activity</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={onTeamAccessClick}
            className="bg-white rounded-[20px] p-4 flex items-center gap-3 hover:shadow-lg transition-all shadow-sm"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-900">Team</div>
              <div className="text-xs text-gray-500">Members</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* API Keys Section */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-sm mb-4">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                <Key className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">API Keys</div>
                <div className="text-xs text-gray-500">Access management</div>
              </div>
            </div>
            <button
              onClick={() => { setNewKey(null); setShowNewKeyModal(true); }}
              className="px-4 py-2 bg-[#E5FF00] text-gray-900 rounded-full text-xs font-medium hover:bg-[#d4ee00] transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              New Key
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-[#E5FF00] rounded-full flex items-center justify-center mx-auto mb-3">
                <Key className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No API Keys Yet</h3>
              <p className="text-xs text-gray-500 mb-4">Create your first key</p>
              <button
                onClick={() => setShowNewKeyModal(true)}
                className="px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create API Key
              </button>
            </div>
          ) : (
            <div>
              {apiKeys.map(key => {
                const usage = keyUsage[key.id];
                const usagePercent = usage ? calculateUsagePercentage(usage.request_count, key.rate_limit) : 0;

                return (
                  <div key={key.id} className="p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${key.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-sm font-semibold text-gray-900">{key.name}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {TIER_CONFIG[key.tier].name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleKeyVisibility(key.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          {visibleKeys[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => handleToggleKey(key.id, key.is_active)}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Power className={`w-3 h-3 ${key.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <code className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-mono block mb-2">
                      {visibleKeys[key.id] ? key.key_prefix : '••••••••••••••••'}
                    </code>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">
                        {formatNumber(usage?.request_count || 0)} / {formatNumber(key.rate_limit)} req
                      </span>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

        {/* Security Card */}
        {onSecurityClick && (
          <button
            onClick={onSecurityClick}
            className="w-full bg-white rounded-[20px] p-4 flex items-center gap-3 hover:shadow-lg transition-all shadow-sm mb-4"
          >
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-900">Security Settings</div>
              <div className="text-xs text-gray-500">Rate limits, CORS & IP whitelist</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Help Card */}
        <div className="bg-gray-900 rounded-[20px] p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white mb-0.5">Need Help?</div>
            <div className="text-xs text-gray-400">Contact developer support</div>
          </div>
          <button className="px-4 py-2 bg-[#E5FF00] text-gray-900 rounded-full text-xs font-medium hover:bg-[#d4ee00] transition-colors">
            Get Support
          </button>
        </div>

        <NewKeyModal
          isOpen={showNewKeyModal}
          onClose={() => { setShowNewKeyModal(false); setNewKey(null); }}
          onCreateKey={handleCreateKey}
          newKey={newKey}
        />
      </div>
    </div>
  );
};

export default ApiDashboard;
