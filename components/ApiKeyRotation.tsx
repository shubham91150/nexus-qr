import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Key, Shield, Clock, AlertTriangle, CheckCircle,
  Copy, Check, Eye, EyeOff, Calendar, ArrowRight, Info,
  Zap, Lock, Unlock, ChevronDown, ChevronUp, History,
  Settings, Bell, X, Loader2, RotateCcw, Timer
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyFull?: string;
  environment: 'production' | 'sandbox';
  status: 'active' | 'rotating' | 'deprecated' | 'revoked';
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
  rotationSchedule: 'manual' | '30days' | '60days' | '90days' | 'never';
  nextRotationAt: string | null;
  previousKeyId: string | null;
  gracePeriodEndsAt: string | null;
  scopes: string[];
  usageCount: number;
}

interface RotationHistory {
  id: string;
  keyId: string;
  keyName: string;
  rotatedAt: string;
  rotatedBy: string;
  reason: string;
  oldKeyPrefix: string;
  newKeyPrefix: string;
  gracePeriodDays: number;
}

// Mock API Keys
const MOCK_API_KEYS: ApiKey[] = [
  {
    id: 'key_001',
    name: 'Production API Key',
    keyPrefix: 'nxqr_live_abc123',
    environment: 'production',
    status: 'active',
    createdAt: '2024-10-15T10:00:00Z',
    lastUsed: '2024-12-21T14:30:00Z',
    expiresAt: null,
    rotationSchedule: '90days',
    nextRotationAt: '2025-01-13T10:00:00Z',
    previousKeyId: null,
    gracePeriodEndsAt: null,
    scopes: ['qr:read', 'qr:write', 'analytics:read'],
    usageCount: 15420
  },
  {
    id: 'key_002',
    name: 'Mobile App Key',
    keyPrefix: 'nxqr_live_def456',
    environment: 'production',
    status: 'rotating',
    createdAt: '2024-09-01T08:00:00Z',
    lastUsed: '2024-12-21T12:15:00Z',
    expiresAt: null,
    rotationSchedule: '30days',
    nextRotationAt: null,
    previousKeyId: 'key_old_002',
    gracePeriodEndsAt: '2024-12-28T08:00:00Z',
    scopes: ['qr:read', 'qr:write'],
    usageCount: 8750
  },
  {
    id: 'key_003',
    name: 'Test Environment',
    keyPrefix: 'nxqr_test_xyz789',
    environment: 'sandbox',
    status: 'active',
    createdAt: '2024-11-20T15:00:00Z',
    lastUsed: '2024-12-20T18:45:00Z',
    expiresAt: null,
    rotationSchedule: 'never',
    nextRotationAt: null,
    previousKeyId: null,
    gracePeriodEndsAt: null,
    scopes: ['qr:read', 'qr:write', 'analytics:read', 'webhooks:manage'],
    usageCount: 2340
  },
  {
    id: 'key_004',
    name: 'Legacy Integration',
    keyPrefix: 'nxqr_live_old999',
    environment: 'production',
    status: 'deprecated',
    createdAt: '2024-06-01T10:00:00Z',
    lastUsed: '2024-12-15T09:00:00Z',
    expiresAt: '2024-12-31T23:59:59Z',
    rotationSchedule: 'manual',
    nextRotationAt: null,
    previousKeyId: null,
    gracePeriodEndsAt: null,
    scopes: ['qr:read'],
    usageCount: 45200
  }
];

// Mock Rotation History
const MOCK_ROTATION_HISTORY: RotationHistory[] = [
  {
    id: 'rot_001',
    keyId: 'key_002',
    keyName: 'Mobile App Key',
    rotatedAt: '2024-12-21T08:00:00Z',
    rotatedBy: 'System (Scheduled)',
    reason: 'Scheduled 30-day rotation',
    oldKeyPrefix: 'nxqr_live_abc999',
    newKeyPrefix: 'nxqr_live_def456',
    gracePeriodDays: 7
  },
  {
    id: 'rot_002',
    keyId: 'key_001',
    keyName: 'Production API Key',
    rotatedAt: '2024-10-15T10:00:00Z',
    rotatedBy: 'admin@company.com',
    reason: 'Initial key creation',
    oldKeyPrefix: '',
    newKeyPrefix: 'nxqr_live_abc123',
    gracePeriodDays: 0
  },
  {
    id: 'rot_003',
    keyId: 'key_004',
    keyName: 'Legacy Integration',
    rotatedAt: '2024-09-01T12:00:00Z',
    rotatedBy: 'admin@company.com',
    reason: 'Security audit recommendation',
    oldKeyPrefix: 'nxqr_live_legacy1',
    newKeyPrefix: 'nxqr_live_old999',
    gracePeriodDays: 14
  }
];

interface ApiKeyRotationProps {
  onBack?: () => void;
}

const ApiKeyRotation: React.FC<ApiKeyRotationProps> = ({ onBack }) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
  const [rotationHistory, setRotationHistory] = useState<RotationHistory[]>(MOCK_ROTATION_HISTORY);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [gracePeriod, setGracePeriod] = useState(7);
  const [rotationReason, setRotationReason] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRotateKey = async (keyId: string) => {
    setRotatingKeyId(keyId);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate new key
    const newKeyFull = `nxqr_live_${Math.random().toString(36).substring(2, 14)}`;
    const newKeyPrefix = newKeyFull.substring(0, 16) + '...';

    setApiKeys(prev => prev.map(key => {
      if (key.id === keyId) {
        return {
          ...key,
          keyPrefix: newKeyPrefix,
          keyFull: newKeyFull,
          status: 'rotating' as const,
          previousKeyId: key.id,
          gracePeriodEndsAt: new Date(Date.now() + gracePeriod * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        };
      }
      return key;
    }));

    // Add to history
    const oldKey = apiKeys.find(k => k.id === keyId);
    if (oldKey) {
      setRotationHistory(prev => [{
        id: `rot_${Date.now()}`,
        keyId,
        keyName: oldKey.name,
        rotatedAt: new Date().toISOString(),
        rotatedBy: 'You',
        reason: rotationReason || 'Manual rotation',
        oldKeyPrefix: oldKey.keyPrefix,
        newKeyPrefix: newKeyPrefix,
        gracePeriodDays: gracePeriod
      }, ...prev]);
    }

    setNewKeyValue(newKeyFull);
    setShowNewKey(true);
    setRotatingKeyId(null);
    setShowRotateModal(false);
    setRotationReason('');
  };

  const handleUpdateSchedule = (keyId: string, schedule: ApiKey['rotationSchedule']) => {
    setApiKeys(prev => prev.map(key => {
      if (key.id === keyId) {
        let nextRotation: string | null = null;
        if (schedule !== 'manual' && schedule !== 'never') {
          const days = parseInt(schedule);
          nextRotation = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        }
        return {
          ...key,
          rotationSchedule: schedule,
          nextRotationAt: nextRotation
        };
      }
      return key;
    }));
    setShowScheduleModal(false);
  };

  const getStatusBadge = (status: ApiKey['status']) => {
    const config = {
      active: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Active' },
      rotating: { bg: 'bg-amber-100', text: 'text-amber-700', icon: RefreshCw, label: 'Rotating' },
      deprecated: { bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle, label: 'Deprecated' },
      revoked: { bg: 'bg-red-100', text: 'text-red-700', icon: X, label: 'Revoked' }
    };
    const { bg, text, icon: Icon, label } = config[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        <Icon className={`w-3.5 h-3.5 ${status === 'rotating' ? 'animate-spin' : ''}`} />
        {label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntil = (dateString: string) => {
    const diff = new Date(dateString).getTime() - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
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
                <RefreshCw className="w-6 h-6 text-indigo-600" />
                API Key Rotation
              </h1>
              <p className="text-gray-500 text-sm">Securely rotate your API keys with zero downtime</p>
            </div>
          </div>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <History className="w-4 h-4" />
            Rotation History
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-6 border border-indigo-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Zero-Downtime Key Rotation</h3>
              <p className="text-sm text-gray-600">
                When you rotate a key, both the old and new keys work during the grace period.
                This allows you to update your applications without any service interruption.
              </p>
            </div>
          </div>
        </div>

        {/* API Keys List */}
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all ${
                key.status === 'rotating' ? 'border-amber-200' :
                key.status === 'deprecated' ? 'border-orange-200' :
                'border-gray-100'
              }`}
            >
              {/* Key Header */}
              <div
                className="p-5 cursor-pointer"
                onClick={() => setExpandedKey(expandedKey === key.id ? null : key.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      key.environment === 'production' ? 'bg-indigo-100' : 'bg-amber-100'
                    }`}>
                      <Key className={`w-6 h-6 ${
                        key.environment === 'production' ? 'text-indigo-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{key.name}</h3>
                        {getStatusBadge(key.status)}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          key.environment === 'production'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {key.environment}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-gray-500 font-mono">{key.keyPrefix}</code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(key.keyPrefix, key.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          {copiedKey === key.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {key.status === 'rotating' && key.gracePeriodEndsAt && (
                      <div className="text-right">
                        <p className="text-xs text-amber-600 font-medium">Grace period ends</p>
                        <p className="text-sm text-gray-900">{getTimeUntil(key.gracePeriodEndsAt)}</p>
                      </div>
                    )}
                    {key.nextRotationAt && key.status === 'active' && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Next rotation</p>
                        <p className="text-sm text-gray-900">{getTimeUntil(key.nextRotationAt)}</p>
                      </div>
                    )}
                    {expandedKey === key.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    {key.usageCount.toLocaleString()} requests
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Last used {key.lastUsed ? formatDate(key.lastUsed) : 'Never'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Created {formatDate(key.createdAt)}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedKey === key.id && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
                    {/* Rotation Schedule */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Timer className="w-4 h-4 text-indigo-500" />
                        Rotation Schedule
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Current:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {key.rotationSchedule === 'manual' ? 'Manual' :
                             key.rotationSchedule === 'never' ? 'Never' :
                             `Every ${key.rotationSchedule}`}
                          </span>
                        </div>
                        {key.nextRotationAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Next:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(key.nextRotationAt)}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setSelectedKey(key);
                            setShowScheduleModal(true);
                          }}
                          className="w-full mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Change Schedule
                        </button>
                      </div>
                    </div>

                    {/* Scopes */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-500" />
                        Scopes
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {key.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono text-gray-600"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-indigo-500" />
                        Actions
                      </h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setSelectedKey(key);
                            setShowRotateModal(true);
                          }}
                          disabled={key.status === 'rotating' || key.status === 'revoked'}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Rotate Now
                        </button>
                        {key.status === 'rotating' && (
                          <button
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            End Grace Period
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grace Period Warning */}
                  {key.status === 'rotating' && key.gracePeriodEndsAt && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800">Key Rotation in Progress</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            Both the old and new API keys are currently active. Update your applications
                            to use the new key before <strong>{formatDate(key.gracePeriodEndsAt)}</strong>.
                            After this date, the old key will stop working.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Best Practices */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600" />
            Key Rotation Best Practices
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Rotate Regularly</h4>
                <p className="text-sm text-gray-600">
                  Set up automatic rotation every 30-90 days to minimize security risks.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Use Grace Periods</h4>
                <p className="text-sm text-gray-600">
                  Allow 7-14 days for updating applications during key transitions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Monitor Usage</h4>
                <p className="text-sm text-gray-600">
                  Check that old keys stop receiving traffic before ending grace period.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rotate Key Modal */}
      {showRotateModal && selectedKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Rotate API Key</h3>
                  <p className="text-sm text-gray-500">{selectedKey.name}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grace Period (days)
                </label>
                <select
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days (Recommended)</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Both old and new keys will work during this period
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={rotationReason}
                  onChange={(e) => setRotationReason(e.target.value)}
                  placeholder="e.g., Security audit, Regular rotation"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">Important</p>
                    <p className="mt-1">
                      A new API key will be generated. Make sure to copy it immediately
                      as you won't be able to see it again.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowRotateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRotateKey(selectedKey.id)}
                disabled={rotatingKeyId === selectedKey.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {rotatingKeyId === selectedKey.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rotating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Rotate Key
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Key Display Modal */}
      {showNewKey && newKeyValue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Key Rotated Successfully!</h3>
                  <p className="text-sm text-gray-500">Copy your new API key now</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gray-900 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between gap-4">
                  <code className="text-green-400 font-mono text-sm break-all">
                    {newKeyValue}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKeyValue, 'new-key')}
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {copiedKey === 'new-key' ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium">Store this key securely!</p>
                    <p className="mt-1">
                      This is the only time you'll see the full API key.
                      Store it in a secure location like a password manager or environment variable.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowNewKey(false);
                  setNewKeyValue(null);
                }}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                I've Saved My Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Rotation Schedule</h3>
              <p className="text-sm text-gray-500">{selectedKey.name}</p>
            </div>

            <div className="p-6 space-y-3">
              {[
                { value: 'manual', label: 'Manual', desc: 'Rotate only when triggered manually' },
                { value: '30days', label: 'Every 30 days', desc: 'Recommended for high-security apps' },
                { value: '60days', label: 'Every 60 days', desc: 'Balanced security and convenience' },
                { value: '90days', label: 'Every 90 days', desc: 'Standard rotation schedule' },
                { value: 'never', label: 'Never', desc: 'Not recommended for production' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleUpdateSchedule(selectedKey.id, option.value as ApiKey['rotationSchedule'])}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                    selectedKey.rotationSchedule === option.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{option.label}</p>
                      <p className="text-sm text-gray-500">{option.desc}</p>
                    </div>
                    {selectedKey.rotationSchedule === option.value && (
                      <CheckCircle className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Rotation History</h3>
                <p className="text-sm text-gray-500">Complete log of all key rotations</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-4">
                {rotationHistory.map((entry) => (
                  <div key={entry.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{entry.keyName}</h4>
                        <p className="text-sm text-gray-500">{entry.reason}</p>
                      </div>
                      <span className="text-sm text-gray-500">{formatDate(entry.rotatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">By: </span>
                        <span className="text-gray-900">{entry.rotatedBy}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Grace Period: </span>
                        <span className="text-gray-900">{entry.gracePeriodDays} days</span>
                      </div>
                    </div>
                    {entry.oldKeyPrefix && (
                      <div className="mt-3 flex items-center gap-2 text-sm font-mono">
                        <span className="text-gray-400">{entry.oldKeyPrefix}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="text-green-600">{entry.newKeyPrefix}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyRotation;
