import React, { useState } from 'react';
import {
  Globe, Shield, Plus, Trash2, Edit3, CheckCircle, XCircle,
  AlertTriangle, Info, Save, X, Loader2, ChevronDown,
  Lock, ExternalLink, Copy, Check, Settings, Zap, RefreshCw
} from 'lucide-react';

interface CorsOrigin {
  id: string;
  origin: string;
  type: 'exact' | 'wildcard' | 'regex';
  methods: string[];
  headers: string[];
  credentials: boolean;
  maxAge: number;
  enabled: boolean;
  createdAt: string;
}

interface CorsSettings {
  enabled: boolean;
  allowAllOrigins: boolean;
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
  credentials: boolean;
}

// HTTP Methods
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

// Common Headers
const COMMON_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
  'X-Api-Key',
  'X-Custom-Header'
];

// Mock Origins
const INITIAL_ORIGINS: CorsOrigin[] = [
  {
    id: 'origin_001',
    origin: 'https://myapp.com',
    type: 'exact',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    headers: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
    enabled: true,
    createdAt: '2024-10-15T10:00:00Z'
  },
  {
    id: 'origin_002',
    origin: 'https://*.myapp.com',
    type: 'wildcard',
    methods: ['GET', 'POST'],
    headers: ['Content-Type', 'Authorization', 'X-Api-Key'],
    credentials: true,
    maxAge: 3600,
    enabled: true,
    createdAt: '2024-09-01T08:00:00Z'
  },
  {
    id: 'origin_003',
    origin: 'http://localhost:3000',
    type: 'exact',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 0,
    enabled: true,
    createdAt: '2024-11-20T15:00:00Z'
  },
  {
    id: 'origin_004',
    origin: 'https://staging.myapp.com',
    type: 'exact',
    methods: ['GET', 'POST'],
    headers: ['Content-Type'],
    credentials: false,
    maxAge: 3600,
    enabled: false,
    createdAt: '2024-06-01T10:00:00Z'
  }
];

interface CorsConfigurationProps {
  onBack?: () => void;
}

const CorsConfiguration: React.FC<CorsConfigurationProps> = ({ onBack }) => {
  const [origins, setOrigins] = useState<CorsOrigin[]>(INITIAL_ORIGINS);
  const [settings, setSettings] = useState<CorsSettings>({
    enabled: true,
    allowAllOrigins: false,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
    credentials: true
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState<CorsOrigin | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [newOrigin, setNewOrigin] = useState<Partial<CorsOrigin>>({
    origin: '',
    type: 'exact',
    methods: ['GET', 'POST'],
    headers: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
    enabled: true
  });

  const handleAddOrigin = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const origin: CorsOrigin = {
      id: `origin_${Date.now()}`,
      origin: newOrigin.origin || '',
      type: newOrigin.type || 'exact',
      methods: newOrigin.methods || ['GET', 'POST'],
      headers: newOrigin.headers || ['Content-Type'],
      credentials: newOrigin.credentials ?? true,
      maxAge: newOrigin.maxAge || 86400,
      enabled: true,
      createdAt: new Date().toISOString()
    };

    setOrigins(prev => [...prev, origin]);
    setNewOrigin({
      origin: '',
      type: 'exact',
      methods: ['GET', 'POST'],
      headers: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400,
      enabled: true
    });
    setShowAddModal(false);
    setSaving(false);
  };

  const handleUpdateOrigin = async () => {
    if (!editingOrigin) return;
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setOrigins(prev => prev.map(o => o.id === editingOrigin.id ? editingOrigin : o));
    setEditingOrigin(null);
    setSaving(false);
  };

  const handleDeleteOrigin = (originId: string) => {
    setOrigins(prev => prev.filter(o => o.id !== originId));
  };

  const toggleOriginEnabled = (originId: string) => {
    setOrigins(prev => prev.map(o =>
      o.id === originId ? { ...o, enabled: !o.enabled } : o
    ));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleMethod = (method: string, current: string[], setter: (methods: string[]) => void) => {
    if (current.includes(method)) {
      setter(current.filter(m => m !== method));
    } else {
      setter([...current, method]);
    }
  };

  const toggleHeader = (header: string, current: string[], setter: (headers: string[]) => void) => {
    if (current.includes(header)) {
      setter(current.filter(h => h !== header));
    } else {
      setter([...current, header]);
    }
  };

  const getTypeBadge = (type: CorsOrigin['type']) => {
    const config = {
      exact: { bg: 'bg-green-100', text: 'text-green-700', label: 'Exact Match' },
      wildcard: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Wildcard' },
      regex: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Regex' }
    };
    const { bg, text, label } = config[type];
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
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
                <Globe className="w-6 h-6 text-indigo-600" />
                CORS Configuration
              </h1>
              <p className="text-gray-500 text-sm">Configure Cross-Origin Resource Sharing settings</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Origin
          </button>
        </div>

        {/* CORS Status */}
        <div className={`rounded-2xl p-5 mb-6 border ${
          settings.enabled
            ? settings.allowAllOrigins
              ? 'bg-amber-50 border-amber-200'
              : 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                settings.enabled
                  ? settings.allowAllOrigins ? 'bg-amber-100' : 'bg-green-100'
                  : 'bg-red-100'
              }`}>
                {settings.enabled ? (
                  settings.allowAllOrigins ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  ) : (
                    <Shield className="w-6 h-6 text-green-600" />
                  )
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <h3 className={`font-semibold mb-1 ${
                  settings.enabled
                    ? settings.allowAllOrigins ? 'text-amber-900' : 'text-green-900'
                    : 'text-red-900'
                }`}>
                  CORS is {settings.enabled ? 'Enabled' : 'Disabled'}
                  {settings.enabled && settings.allowAllOrigins && ' (Allow All Origins)'}
                </h3>
                <p className={`text-sm ${
                  settings.enabled
                    ? settings.allowAllOrigins ? 'text-amber-700' : 'text-green-700'
                    : 'text-red-700'
                }`}>
                  {settings.enabled
                    ? settings.allowAllOrigins
                      ? 'Warning: All origins are allowed. This is not recommended for production.'
                      : `${origins.filter(o => o.enabled).length} origins are whitelisted`
                    : 'Cross-origin requests will be blocked'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={settings.allowAllOrigins}
                  onChange={(e) => setSettings({ ...settings, allowAllOrigins: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Allow All (*)
              </label>

              <button
                onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                className={`w-14 h-8 rounded-full transition-colors relative ${
                  settings.enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    settings.enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Global Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Global Settings
            </h3>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </div>

          {showAdvanced && (
            <div className="mt-6 space-y-6">
              {/* Allowed Methods */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Allowed Methods
                </label>
                <div className="flex flex-wrap gap-2">
                  {HTTP_METHODS.map(method => (
                    <button
                      key={method}
                      onClick={() => toggleMethod(
                        method,
                        settings.allowedMethods,
                        (methods) => setSettings({ ...settings, allowedMethods: methods })
                      )}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        settings.allowedMethods.includes(method)
                          ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allowed Headers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Allowed Headers
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_HEADERS.map(header => (
                    <button
                      key={header}
                      onClick={() => toggleHeader(
                        header,
                        settings.allowedHeaders,
                        (headers) => setSettings({ ...settings, allowedHeaders: headers })
                      )}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        settings.allowedHeaders.includes(header)
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {header}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Age (seconds)
                  </label>
                  <input
                    type="number"
                    value={settings.maxAge}
                    onChange={(e) => setSettings({ ...settings, maxAge: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Preflight cache duration</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credentials
                  </label>
                  <button
                    onClick={() => setSettings({ ...settings, credentials: !settings.credentials })}
                    className={`w-full px-3 py-2 rounded-xl border-2 font-medium transition-colors ${
                      settings.credentials
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    {settings.credentials ? 'Allowed' : 'Not Allowed'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">Allow cookies/auth headers</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actions
                  </label>
                  <button
                    onClick={() => setSaving(true)}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Origins List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Allowed Origins ({origins.filter(o => o.enabled).length} active)
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {origins.map((origin) => (
              <div
                key={origin.id}
                className={`p-5 ${!origin.enabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleOriginEnabled(origin.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 mt-1 ${
                        origin.enabled ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          origin.enabled ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>

                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {origin.origin}
                        </code>
                        {getTypeBadge(origin.type)}
                        <button
                          onClick={() => copyToClipboard(origin.origin, origin.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          {copied === origin.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-2">
                        {origin.methods.map(method => (
                          <span
                            key={method}
                            className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded"
                          >
                            {method}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          {origin.credentials ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                          Credentials
                        </span>
                        <span>
                          Max Age: {origin.maxAge}s
                        </span>
                        <span>
                          {origin.headers.length} headers
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingOrigin(origin)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteOrigin(origin.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {origins.length === 0 && (
              <div className="p-8 text-center">
                <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No origins configured</p>
                <p className="text-sm text-gray-400">Add allowed origins for cross-origin requests</p>
              </div>
            )}
          </div>
        </div>

        {/* CORS Headers Preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Response Headers Preview
          </h3>
          <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm overflow-x-auto">
            <div className="text-gray-300">
              <span className="text-purple-400">Access-Control-Allow-Origin:</span>{' '}
              <span className="text-green-400">
                {settings.allowAllOrigins ? '*' : origins.filter(o => o.enabled).map(o => o.origin).join(', ') || 'none'}
              </span>
            </div>
            <div className="text-gray-300">
              <span className="text-purple-400">Access-Control-Allow-Methods:</span>{' '}
              <span className="text-green-400">{settings.allowedMethods.join(', ')}</span>
            </div>
            <div className="text-gray-300">
              <span className="text-purple-400">Access-Control-Allow-Headers:</span>{' '}
              <span className="text-green-400">{settings.allowedHeaders.join(', ')}</span>
            </div>
            <div className="text-gray-300">
              <span className="text-purple-400">Access-Control-Allow-Credentials:</span>{' '}
              <span className="text-green-400">{settings.credentials ? 'true' : 'false'}</span>
            </div>
            <div className="text-gray-300">
              <span className="text-purple-400">Access-Control-Max-Age:</span>{' '}
              <span className="text-green-400">{settings.maxAge}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Origin Modal */}
      {(showAddModal || editingOrigin) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingOrigin ? 'Edit Origin' : 'Add Origin'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingOrigin(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Origin URL</label>
                <input
                  type="text"
                  value={editingOrigin?.origin || newOrigin.origin}
                  onChange={(e) => editingOrigin
                    ? setEditingOrigin({ ...editingOrigin, origin: e.target.value })
                    : setNewOrigin({ ...newOrigin, origin: e.target.value })
                  }
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Match Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['exact', 'wildcard', 'regex'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => editingOrigin
                        ? setEditingOrigin({ ...editingOrigin, type })
                        : setNewOrigin({ ...newOrigin, type })
                      }
                      className={`p-3 rounded-xl border-2 text-center transition-colors ${
                        (editingOrigin?.type || newOrigin.type) === type
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Methods</label>
                <div className="flex flex-wrap gap-2">
                  {HTTP_METHODS.map(method => {
                    const methods = editingOrigin?.methods || newOrigin.methods || [];
                    return (
                      <button
                        key={method}
                        onClick={() => {
                          const newMethods = methods.includes(method)
                            ? methods.filter(m => m !== method)
                            : [...methods, method];
                          editingOrigin
                            ? setEditingOrigin({ ...editingOrigin, methods: newMethods })
                            : setNewOrigin({ ...newOrigin, methods: newMethods });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          methods.includes(method)
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Age (s)</label>
                  <input
                    type="number"
                    value={editingOrigin?.maxAge || newOrigin.maxAge}
                    onChange={(e) => editingOrigin
                      ? setEditingOrigin({ ...editingOrigin, maxAge: parseInt(e.target.value) || 0 })
                      : setNewOrigin({ ...newOrigin, maxAge: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Credentials</label>
                  <button
                    onClick={() => editingOrigin
                      ? setEditingOrigin({ ...editingOrigin, credentials: !editingOrigin.credentials })
                      : setNewOrigin({ ...newOrigin, credentials: !newOrigin.credentials })
                    }
                    className={`w-full px-3 py-2 rounded-xl border-2 font-medium transition-colors ${
                      (editingOrigin?.credentials ?? newOrigin.credentials)
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    {(editingOrigin?.credentials ?? newOrigin.credentials) ? 'Allowed' : 'Not Allowed'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingOrigin(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingOrigin ? handleUpdateOrigin : handleAddOrigin}
                disabled={saving || !(editingOrigin?.origin || newOrigin.origin)}
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
                    {editingOrigin ? 'Update' : 'Add Origin'}
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

export default CorsConfiguration;
