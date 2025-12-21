import React, { useState } from 'react';
import {
  Shield, Globe, Plus, Trash2, Edit3, CheckCircle, XCircle,
  AlertTriangle, Info, Search, Save, X, Loader2, Clock,
  ChevronDown, Server, Wifi, MapPin, Lock, Unlock, Copy, Check
} from 'lucide-react';

interface IpRule {
  id: string;
  ip: string;
  type: 'single' | 'range' | 'cidr';
  label: string;
  environment: 'all' | 'production' | 'sandbox';
  status: 'active' | 'inactive';
  createdAt: string;
  lastUsed: string | null;
  hitCount: number;
}

// Mock IP Rules
const INITIAL_IP_RULES: IpRule[] = [
  {
    id: 'ip_001',
    ip: '203.0.113.50',
    type: 'single',
    label: 'Office Network',
    environment: 'all',
    status: 'active',
    createdAt: '2024-10-15T10:00:00Z',
    lastUsed: '2024-12-21T14:30:00Z',
    hitCount: 15420
  },
  {
    id: 'ip_002',
    ip: '198.51.100.0/24',
    type: 'cidr',
    label: 'AWS Production Servers',
    environment: 'production',
    status: 'active',
    createdAt: '2024-09-01T08:00:00Z',
    lastUsed: '2024-12-21T14:35:00Z',
    hitCount: 89750
  },
  {
    id: 'ip_003',
    ip: '192.0.2.100-192.0.2.200',
    type: 'range',
    label: 'Development Team',
    environment: 'sandbox',
    status: 'active',
    createdAt: '2024-11-20T15:00:00Z',
    lastUsed: '2024-12-20T18:45:00Z',
    hitCount: 2340
  },
  {
    id: 'ip_004',
    ip: '10.0.0.0/8',
    type: 'cidr',
    label: 'Internal Network',
    environment: 'all',
    status: 'inactive',
    createdAt: '2024-06-01T10:00:00Z',
    lastUsed: null,
    hitCount: 0
  }
];

interface IpWhitelistingProps {
  onBack?: () => void;
}

const IpWhitelisting: React.FC<IpWhitelistingProps> = ({ onBack }) => {
  const [ipRules, setIpRules] = useState<IpRule[]>(INITIAL_IP_RULES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<IpRule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnvironment, setFilterEnvironment] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [whitelistMode, setWhitelistMode] = useState<'enabled' | 'disabled'>('enabled');

  const [newRule, setNewRule] = useState({
    ip: '',
    type: 'single' as IpRule['type'],
    label: '',
    environment: 'all' as IpRule['environment']
  });

  const filteredRules = ipRules.filter(rule => {
    const matchesSearch =
      rule.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = filterEnvironment === 'all' || rule.environment === filterEnvironment || rule.environment === 'all';
    return matchesSearch && matchesEnv;
  });

  const handleAddRule = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const rule: IpRule = {
      id: `ip_${Date.now()}`,
      ip: newRule.ip,
      type: newRule.type,
      label: newRule.label,
      environment: newRule.environment,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUsed: null,
      hitCount: 0
    };

    setIpRules(prev => [...prev, rule]);
    setNewRule({ ip: '', type: 'single', label: '', environment: 'all' });
    setShowAddModal(false);
    setSaving(false);
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIpRules(prev => prev.map(r => r.id === editingRule.id ? editingRule : r));
    setEditingRule(null);
    setSaving(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    setIpRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const toggleRuleStatus = (ruleId: string) => {
    setIpRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, status: r.status === 'active' ? 'inactive' : 'active' } : r
    ));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const validateIp = (ip: string, type: IpRule['type']): boolean => {
    if (type === 'single') {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      return ipv4Regex.test(ip);
    }
    if (type === 'cidr') {
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      return cidrRegex.test(ip);
    }
    if (type === 'range') {
      const rangeRegex = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/;
      return rangeRegex.test(ip);
    }
    return false;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type: IpRule['type']) => {
    switch (type) {
      case 'single': return <Server className="w-4 h-4" />;
      case 'cidr': return <Wifi className="w-4 h-4" />;
      case 'range': return <MapPin className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: IpRule['type']) => {
    const config = {
      single: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Single IP' },
      cidr: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'CIDR Block' },
      range: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'IP Range' }
    };
    const { bg, text, label } = config[type];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
        {getTypeIcon(type)}
        {label}
      </span>
    );
  };

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
                <Shield className="w-6 h-6 text-indigo-600" />
                IP Whitelisting
              </h1>
              <p className="text-gray-500 text-sm">Restrict API access to trusted IP addresses</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add IP Address
          </button>
        </div>

        {/* Whitelist Mode Toggle */}
        <div className={`rounded-2xl p-5 mb-6 border ${
          whitelistMode === 'enabled'
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                whitelistMode === 'enabled' ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                {whitelistMode === 'enabled' ? (
                  <Lock className="w-6 h-6 text-green-600" />
                ) : (
                  <Unlock className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <div>
                <h3 className={`font-semibold mb-1 ${
                  whitelistMode === 'enabled' ? 'text-green-900' : 'text-amber-900'
                }`}>
                  IP Whitelisting is {whitelistMode === 'enabled' ? 'Enabled' : 'Disabled'}
                </h3>
                <p className={`text-sm ${
                  whitelistMode === 'enabled' ? 'text-green-700' : 'text-amber-700'
                }`}>
                  {whitelistMode === 'enabled'
                    ? 'Only whitelisted IP addresses can access your API'
                    : 'All IP addresses can access your API (not recommended for production)'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setWhitelistMode(whitelistMode === 'enabled' ? 'disabled' : 'enabled')}
              className={`w-14 h-8 rounded-full transition-colors relative ${
                whitelistMode === 'enabled' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  whitelistMode === 'enabled' ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by IP or label..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <select
              value={filterEnvironment}
              onChange={(e) => setFilterEnvironment(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Environments</option>
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </div>
        </div>

        {/* IP Rules List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Whitelisted IPs ({filteredRules.filter(r => r.status === 'active').length} active)
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-5 ${rule.status === 'inactive' ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleRuleStatus(rule.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 mt-1 ${
                        rule.status === 'active' ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          rule.status === 'active' ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>

                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-gray-900">{rule.label}</h4>
                        {getTypeBadge(rule.type)}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rule.environment === 'production'
                            ? 'bg-indigo-100 text-indigo-700'
                            : rule.environment === 'sandbox'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {rule.environment === 'all' ? 'All Envs' : rule.environment}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                          {rule.ip}
                        </code>
                        <button
                          onClick={() => copyToClipboard(rule.ip, rule.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          {copied === rule.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Added {formatDate(rule.createdAt)}
                        </span>
                        <span>
                          {rule.hitCount.toLocaleString()} requests
                        </span>
                        {rule.lastUsed && (
                          <span>
                            Last used {formatDate(rule.lastUsed)}
                          </span>
                        )}
                      </div>
                    </div>
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

            {filteredRules.length === 0 && (
              <div className="p-8 text-center">
                <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No IP addresses found</p>
                <p className="text-sm text-gray-400">Add IP addresses to whitelist</p>
              </div>
            )}
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600" />
            IP Whitelisting Best Practices
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Use CIDR for Server Ranges</h4>
                <p className="text-sm text-gray-500">
                  Use CIDR notation (e.g., 10.0.0.0/24) for cloud server IP ranges
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Label Your IPs</h4>
                <p className="text-sm text-gray-500">
                  Add descriptive labels to easily identify which systems use each IP
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Review Regularly</h4>
                <p className="text-sm text-gray-500">
                  Periodically review and remove unused IP addresses
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Avoid Overly Broad Ranges</h4>
                <p className="text-sm text-gray-500">
                  Don't whitelist entire ISP ranges; be as specific as possible
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingRule) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRule ? 'Edit IP Rule' : 'Add IP Address'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRule(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                <input
                  type="text"
                  value={editingRule?.label || newRule.label}
                  onChange={(e) => editingRule
                    ? setEditingRule({ ...editingRule, label: e.target.value })
                    : setNewRule({ ...newRule, label: e.target.value })
                  }
                  placeholder="e.g., Office Network, AWS Servers"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['single', 'cidr', 'range'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => editingRule
                        ? setEditingRule({ ...editingRule, type })
                        : setNewRule({ ...newRule, type })
                      }
                      className={`p-3 rounded-xl border-2 transition-colors ${
                        (editingRule?.type || newRule.type) === type
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {getTypeIcon(type)}
                        <span className="text-xs font-medium">
                          {type === 'single' ? 'Single' : type === 'cidr' ? 'CIDR' : 'Range'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Address
                  <span className="text-gray-400 font-normal ml-2">
                    {(editingRule?.type || newRule.type) === 'single' && '(e.g., 192.168.1.1)'}
                    {(editingRule?.type || newRule.type) === 'cidr' && '(e.g., 10.0.0.0/24)'}
                    {(editingRule?.type || newRule.type) === 'range' && '(e.g., 10.0.0.1-10.0.0.255)'}
                  </span>
                </label>
                <input
                  type="text"
                  value={editingRule?.ip || newRule.ip}
                  onChange={(e) => editingRule
                    ? setEditingRule({ ...editingRule, ip: e.target.value })
                    : setNewRule({ ...newRule, ip: e.target.value })
                  }
                  placeholder={
                    (editingRule?.type || newRule.type) === 'single' ? '192.168.1.1' :
                    (editingRule?.type || newRule.type) === 'cidr' ? '10.0.0.0/24' :
                    '10.0.0.1-10.0.0.255'
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                <select
                  value={editingRule?.environment || newRule.environment}
                  onChange={(e) => editingRule
                    ? setEditingRule({ ...editingRule, environment: e.target.value as IpRule['environment'] })
                    : setNewRule({ ...newRule, environment: e.target.value as IpRule['environment'] })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Environments</option>
                  <option value="production">Production Only</option>
                  <option value="sandbox">Sandbox Only</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRule(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingRule ? handleUpdateRule : handleAddRule}
                disabled={saving || !(editingRule?.ip || newRule.ip) || !(editingRule?.label || newRule.label)}
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
                    {editingRule ? 'Update' : 'Add IP'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IpWhitelisting;
