import React, { useState } from 'react';
import {
  Shield, Key, Lock, Unlock, CheckCircle, XCircle, Info,
  ChevronDown, ChevronUp, Search, Save, AlertTriangle,
  Eye, Edit3, Trash2, Plus, Settings, Zap, Globe, Webhook,
  BarChart3, Users, Database, FileText, X, Check, Loader2
} from 'lucide-react';

interface Scope {
  id: string;
  name: string;
  description: string;
  category: 'qr' | 'analytics' | 'webhooks' | 'team' | 'billing';
  permission: 'read' | 'write' | 'delete' | 'admin';
  icon: React.ElementType;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  environment: 'production' | 'sandbox';
  scopes: string[];
  createdAt: string;
  lastUsed: string | null;
}

// Available Scopes
const AVAILABLE_SCOPES: Scope[] = [
  // QR Code Scopes
  { id: 'qr:read', name: 'Read QR Codes', description: 'View QR codes and their details', category: 'qr', permission: 'read', icon: Eye },
  { id: 'qr:write', name: 'Create/Update QR Codes', description: 'Create and modify QR codes', category: 'qr', permission: 'write', icon: Edit3 },
  { id: 'qr:delete', name: 'Delete QR Codes', description: 'Permanently delete QR codes', category: 'qr', permission: 'delete', icon: Trash2 },
  { id: 'qr:bulk', name: 'Bulk Operations', description: 'Perform bulk create/update/delete', category: 'qr', permission: 'admin', icon: Database },

  // Analytics Scopes
  { id: 'analytics:read', name: 'View Analytics', description: 'Access scan analytics and reports', category: 'analytics', permission: 'read', icon: BarChart3 },
  { id: 'analytics:export', name: 'Export Analytics', description: 'Export analytics data to CSV/PDF', category: 'analytics', permission: 'write', icon: FileText },

  // Webhook Scopes
  { id: 'webhooks:read', name: 'View Webhooks', description: 'List and view webhook configurations', category: 'webhooks', permission: 'read', icon: Eye },
  { id: 'webhooks:manage', name: 'Manage Webhooks', description: 'Create, update, and delete webhooks', category: 'webhooks', permission: 'write', icon: Webhook },

  // Team Scopes
  { id: 'team:read', name: 'View Team', description: 'View team members and roles', category: 'team', permission: 'read', icon: Users },
  { id: 'team:manage', name: 'Manage Team', description: 'Invite and manage team members', category: 'team', permission: 'admin', icon: Users },

  // Billing Scopes
  { id: 'billing:read', name: 'View Billing', description: 'View invoices and usage', category: 'billing', permission: 'read', icon: FileText },
  { id: 'billing:manage', name: 'Manage Billing', description: 'Update payment methods and plans', category: 'billing', permission: 'admin', icon: Settings },
];

// Preset Scope Templates
const SCOPE_TEMPLATES = [
  {
    id: 'readonly',
    name: 'Read Only',
    description: 'View-only access to all resources',
    scopes: ['qr:read', 'analytics:read', 'webhooks:read', 'team:read', 'billing:read'],
    color: 'bg-blue-100 text-blue-700'
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Create and manage QR codes with analytics',
    scopes: ['qr:read', 'qr:write', 'analytics:read', 'analytics:export', 'webhooks:read'],
    color: 'bg-green-100 text-green-700'
  },
  {
    id: 'full',
    name: 'Full Access',
    description: 'Complete access to all features',
    scopes: AVAILABLE_SCOPES.map(s => s.id),
    color: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'webhook-only',
    name: 'Webhook Manager',
    description: 'Manage webhooks only',
    scopes: ['webhooks:read', 'webhooks:manage'],
    color: 'bg-amber-100 text-amber-700'
  },
  {
    id: 'analytics-only',
    name: 'Analytics Viewer',
    description: 'View and export analytics only',
    scopes: ['analytics:read', 'analytics:export'],
    color: 'bg-cyan-100 text-cyan-700'
  }
];

// Mock API Keys
const MOCK_API_KEYS: ApiKey[] = [
  {
    id: 'key_001',
    name: 'Production API Key',
    keyPrefix: 'nxqr_live_abc123...',
    environment: 'production',
    scopes: ['qr:read', 'qr:write', 'analytics:read'],
    createdAt: '2024-10-15T10:00:00Z',
    lastUsed: '2024-12-21T14:30:00Z'
  },
  {
    id: 'key_002',
    name: 'Mobile App Key',
    keyPrefix: 'nxqr_live_def456...',
    environment: 'production',
    scopes: ['qr:read', 'qr:write'],
    createdAt: '2024-09-01T08:00:00Z',
    lastUsed: '2024-12-21T12:15:00Z'
  },
  {
    id: 'key_003',
    name: 'Analytics Dashboard',
    keyPrefix: 'nxqr_live_ghi789...',
    environment: 'production',
    scopes: ['analytics:read', 'analytics:export'],
    createdAt: '2024-11-20T15:00:00Z',
    lastUsed: '2024-12-20T18:45:00Z'
  }
];

const CATEGORY_CONFIG = {
  qr: { label: 'QR Codes', icon: Zap, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  analytics: { label: 'Analytics', icon: BarChart3, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  webhooks: { label: 'Webhooks', icon: Webhook, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  team: { label: 'Team', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  billing: { label: 'Billing', icon: FileText, color: 'text-amber-600', bgColor: 'bg-amber-100' }
};

interface ApiKeyScopesProps {
  onBack?: () => void;
}

const ApiKeyScopes: React.FC<ApiKeyScopesProps> = ({ onBack }) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [editingScopes, setEditingScopes] = useState<string[]>([]);
  const [showScopeEditor, setShowScopeEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleEditScopes = (key: ApiKey) => {
    setSelectedKey(key);
    setEditingScopes([...key.scopes]);
    setShowScopeEditor(true);
  };

  const toggleScope = (scopeId: string) => {
    setEditingScopes(prev =>
      prev.includes(scopeId)
        ? prev.filter(s => s !== scopeId)
        : [...prev, scopeId]
    );
  };

  const applyTemplate = (templateId: string) => {
    const template = SCOPE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setEditingScopes([...template.scopes]);
    }
    setShowTemplates(false);
  };

  const handleSaveScopes = async () => {
    if (!selectedKey) return;

    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    setApiKeys(prev => prev.map(key =>
      key.id === selectedKey.id
        ? { ...key, scopes: editingScopes }
        : key
    ));

    setSaving(false);
    setShowScopeEditor(false);
    setSelectedKey(null);
  };

  const getScopesByCategory = () => {
    const categories: Record<string, Scope[]> = {};
    AVAILABLE_SCOPES.forEach(scope => {
      if (!categories[scope.category]) {
        categories[scope.category] = [];
      }
      categories[scope.category].push(scope);
    });
    return categories;
  };

  const filteredScopes = AVAILABLE_SCOPES.filter(scope =>
    scope.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scope.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scope.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPermissionBadge = (permission: Scope['permission']) => {
    const config = {
      read: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Read' },
      write: { bg: 'bg-green-100', text: 'text-green-700', label: 'Write' },
      delete: { bg: 'bg-red-100', text: 'text-red-700', label: 'Delete' },
      admin: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin' }
    };
    const { bg, text, label } = config[permission];
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
                <Shield className="w-6 h-6 text-indigo-600" />
                API Key Scopes & Permissions
              </h1>
              <p className="text-gray-500 text-sm">Control what each API key can access</p>
            </div>
          </div>
        </div>

        {/* Scope Overview */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 mb-6 border border-indigo-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Principle of Least Privilege</h3>
              <p className="text-sm text-gray-600">
                Grant API keys only the permissions they need. This reduces security risks if a key is compromised.
                You can modify scopes at any time without regenerating the key.
              </p>
            </div>
          </div>
        </div>

        {/* Available Scopes Reference */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600" />
            Available Scopes ({AVAILABLE_SCOPES.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(getScopesByCategory()).map(([category, scopes]) => {
              const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
              const CategoryIcon = config.icon;

              return (
                <div key={category} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 ${config.bgColor} rounded-lg flex items-center justify-center`}>
                      <CategoryIcon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <h4 className="font-medium text-gray-900">{config.label}</h4>
                  </div>
                  <div className="space-y-2">
                    {scopes.map(scope => (
                      <div key={scope.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{scope.name}</span>
                        {getPermissionBadge(scope.permission)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* API Keys with Scopes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Your API Keys</h3>
            <p className="text-sm text-gray-500">Click on a key to modify its scopes</p>
          </div>

          <div className="divide-y divide-gray-100">
            {apiKeys.map((key) => (
              <div key={key.id} className="p-6 hover:bg-gray-50 transition-colors">
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
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{key.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          key.environment === 'production'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {key.environment}
                        </span>
                      </div>
                      <code className="text-sm text-gray-500 font-mono">{key.keyPrefix}</code>

                      {/* Current Scopes */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {key.scopes.map(scopeId => {
                          const scope = AVAILABLE_SCOPES.find(s => s.id === scopeId);
                          if (!scope) return null;
                          const ScopeIcon = scope.icon;
                          return (
                            <span
                              key={scopeId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700"
                            >
                              <ScopeIcon className="w-3.5 h-3.5" />
                              {scope.id}
                            </span>
                          );
                        })}
                        {key.scopes.length === 0 && (
                          <span className="text-sm text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            No scopes assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEditScopes(key)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Scopes
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scope Templates */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Quick Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {SCOPE_TEMPLATES.map(template => (
              <div
                key={template.id}
                className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <div className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium mb-2 ${template.color}`}>
                  {template.name}
                </div>
                <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                <p className="text-xs text-gray-500">
                  {template.scopes.length} scopes
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scope Editor Modal */}
      {showScopeEditor && selectedKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Edit Scopes</h3>
                  <p className="text-sm text-gray-500">{selectedKey.name}</p>
                </div>
                <button
                  onClick={() => setShowScopeEditor(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Search and Templates */}
              <div className="flex gap-3 mt-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search scopes..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-medium hover:bg-amber-100 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    Templates
                    <ChevronDown className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                  </button>

                  {showTemplates && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                      {SCOPE_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="text-xs text-gray-500">{template.scopes.length} scopes</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scope List */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="space-y-6">
                {Object.entries(getScopesByCategory()).map(([category, scopes]) => {
                  const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                  const CategoryIcon = config.icon;
                  const filteredCategoryScopes = scopes.filter(s => filteredScopes.includes(s));

                  if (filteredCategoryScopes.length === 0) return null;

                  return (
                    <div key={category}>
                      <div
                        className="flex items-center gap-2 mb-3 cursor-pointer"
                        onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                      >
                        <div className={`w-8 h-8 ${config.bgColor} rounded-lg flex items-center justify-center`}>
                          <CategoryIcon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <h4 className="font-semibold text-gray-900">{config.label}</h4>
                        <span className="text-sm text-gray-500">
                          ({filteredCategoryScopes.filter(s => editingScopes.includes(s.id)).length}/{filteredCategoryScopes.length})
                        </span>
                      </div>

                      <div className="space-y-2 ml-10">
                        {filteredCategoryScopes.map(scope => {
                          const ScopeIcon = scope.icon;
                          const isEnabled = editingScopes.includes(scope.id);

                          return (
                            <div
                              key={scope.id}
                              onClick={() => toggleScope(scope.id)}
                              className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                isEnabled
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isEnabled ? 'bg-indigo-100' : 'bg-gray-100'
                                }`}>
                                  <ScopeIcon className={`w-4 h-4 ${isEnabled ? 'text-indigo-600' : 'text-gray-500'}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{scope.name}</span>
                                    {getPermissionBadge(scope.permission)}
                                  </div>
                                  <p className="text-sm text-gray-500">{scope.description}</p>
                                  <code className="text-xs text-gray-400 font-mono">{scope.id}</code>
                                </div>
                              </div>

                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                              }`}>
                                {isEnabled ? (
                                  <Check className="w-4 h-4 text-white" />
                                ) : (
                                  <Plus className="w-4 h-4 text-gray-500" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary and Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{editingScopes.length}</span> scopes selected
                  </p>
                  {editingScopes.length === 0 && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      At least one scope is required
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingScopes([])}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowScopeEditor(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveScopes}
                    disabled={editingScopes.length === 0 || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Selected Scopes Preview */}
              {editingScopes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editingScopes.map(scopeId => {
                    const scope = AVAILABLE_SCOPES.find(s => s.id === scopeId);
                    if (!scope) return null;
                    return (
                      <span
                        key={scopeId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono text-gray-600"
                      >
                        {scopeId}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleScope(scopeId);
                          }}
                          className="hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyScopes;
