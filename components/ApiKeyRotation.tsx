import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Key, Shield, Clock, AlertTriangle, CheckCircle,
  Copy, Check, Eye, EyeOff, Calendar, ArrowRight, Info,
  Zap, Lock, Unlock, ChevronDown, ChevronUp, History,
  Settings, Bell, X, Loader2, RotateCcw, Timer
} from 'lucide-react';
import { getUserApiKeys, regenerateApiKey, ApiKey as DbApiKey, ApiPermissions } from '../services/apiService';
import { logAuditEvent } from '../services/apiExtendedService';

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

// Helper function to convert permissions to scopes
const permissionsToScopes = (permissions: ApiPermissions): string[] => {
  const scopes: string[] = [];
  if (permissions.read) scopes.push('qr:read');
  if (permissions.create) scopes.push('qr:write');
  if (permissions.analytics) scopes.push('analytics:read');
  if (permissions.webhooks) scopes.push('webhooks:manage');
  if (permissions.bulk) scopes.push('bulk:operations');
  return scopes;
};

// Helper function to convert DB API key to component format
const mapDbKeyToApiKey = (dbKey: DbApiKey): ApiKey => ({
  id: dbKey.id,
  name: dbKey.name,
  keyPrefix: dbKey.key_prefix,
  environment: dbKey.key_prefix.includes('test') ? 'sandbox' : 'production',
  status: dbKey.is_active ? 'active' : 'deprecated',
  createdAt: dbKey.created_at,
  lastUsed: dbKey.last_used_at,
  expiresAt: dbKey.expires_at,
  rotationSchedule: 'manual', // Default, could be stored in DB
  nextRotationAt: null,
  previousKeyId: null,
  gracePeriodEndsAt: null,
  scopes: permissionsToScopes(dbKey.permissions),
  usageCount: 0, // Would need to fetch from usage table
});

interface ApiKeyRotationProps {
  userId?: string;
  onBack?: () => void;
}

const ApiKeyRotation: React.FC<ApiKeyRotationProps> = ({ userId, onBack }) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [rotationHistory, setRotationHistory] = useState<RotationHistory[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch API keys from database
  const loadApiKeys = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const dbKeys = await getUserApiKeys(userId);
      const mappedKeys = dbKeys.map(mapDbKeyToApiKey);
      setApiKeys(mappedKeys);
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRotateKey = async (keyId: string) => {
    if (!userId) return;
    setRotatingKeyId(keyId);

    try {
      // Get the old key for history
      const oldKey = apiKeys.find(k => k.id === keyId);

      // Call the real regenerate API key function
      const result = await regenerateApiKey(keyId);

      if (result) {
        // Log the rotation audit event
        await logAuditEvent(userId, {
          actorType: 'user',
          actorId: userId,
          action: 'api_key.rotate',
          resourceType: 'api_key',
          resourceId: keyId,
          resourceName: oldKey?.name,
          status: 'success',
          reason: rotationReason || 'Manual rotation',
          metadata: { gracePeriod }
        });

        // Add to local history
        if (oldKey) {
          setRotationHistory(prev => [{
            id: `rot_${Date.now()}`,
            keyId: result.keyData.id,
            keyName: oldKey.name,
            rotatedAt: new Date().toISOString(),
            rotatedBy: 'You',
            reason: rotationReason || 'Manual rotation',
            oldKeyPrefix: oldKey.keyPrefix,
            newKeyPrefix: result.keyData.key_prefix,
            gracePeriodDays: gracePeriod
          }, ...prev]);
        }

        setNewKeyValue(result.key);
        setShowNewKey(true);

        // Reload the keys list
        await loadApiKeys();
      }
    } catch (error) {
      console.error('Error rotating key:', error);
    } finally {
      setRotatingKeyId(null);
      setShowRotateModal(false);
      setRotationReason('');
    }
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
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="bg-white rounded-[20px] shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="w-10 h-10 bg-[#F0F0F0] rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <ChevronDown className="w-5 h-5 text-gray-600 rotate-90" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-gray-900">API Key Rotation</h1>
                  <p className="text-xs text-gray-500">Securely rotate your API keys with zero downtime</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#E5FF00] rounded-full hover:bg-[#d4ee00] transition-colors text-xs font-medium text-gray-900"
            >
              <div className="w-6 h-6 bg-gray-900/10 rounded-full flex items-center justify-center">
                <History className="w-3 h-3" />
              </div>
              Rotation History
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-white rounded-[20px] shadow-sm p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">Zero-Downtime Key Rotation</h3>
              <p className="text-xs text-gray-600">
                When you rotate a key, both the old and new keys work during the grace period.
                This allows you to update your applications without any service interruption.
              </p>
            </div>
          </div>
        </div>

        {/* API Keys List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-[20px] shadow-sm p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Loading API keys...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="bg-white rounded-[20px] shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">No API Keys Yet</h3>
              <p className="text-xs text-gray-500">Create an API key from the API Dashboard to start using key rotation.</p>
            </div>
          ) : apiKeys.map((key) => (
            <div
              key={key.id}
              className={`bg-white rounded-[20px] shadow-sm transition-all ${
                key.status === 'rotating' ? 'ring-2 ring-amber-200' :
                key.status === 'deprecated' ? 'ring-2 ring-orange-200' :
                ''
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
