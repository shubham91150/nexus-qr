import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, Trash2, Edit2, RefreshCw, Check, X,
  Globe, Zap, Clock, AlertCircle, CheckCircle, Link2,
  Bell, Code, Copy, Eye, EyeOff, FileText, ChevronRight, Power
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  ApiWebhook,
  getUserWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook
} from '../services/apiService';

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, url: string, events: string[]) => Promise<void>;
  editingWebhook?: ApiWebhook | null;
}

const WEBHOOK_EVENTS = [
  { id: 'qr.created', name: 'QR Created', description: 'When a new QR code is created' },
  { id: 'qr.scanned', name: 'QR Scanned', description: 'When a QR code is scanned' },
  { id: 'qr.updated', name: 'QR Updated', description: 'When a QR code is updated' },
  { id: 'qr.deleted', name: 'QR Deleted', description: 'When a QR code is deleted' },
];

const WebhookModal: React.FC<WebhookModalProps> = ({ isOpen, onClose, onSave, editingWebhook }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['qr.scanned']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingWebhook) {
      setName(editingWebhook.name);
      setUrl(editingWebhook.url);
      setSelectedEvents(editingWebhook.events);
    } else {
      setName('');
      setUrl('');
      setSelectedEvents(['qr.scanned']);
    }
  }, [editingWebhook, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim()) {
      setError('Name and URL are required');
      return;
    }
    if (selectedEvents.length === 0) {
      setError('Select at least one event');
      return;
    }
    try {
      new URL(url);
    } catch {
      setError('Invalid URL format');
      return;
    }

    setLoading(true);
    setError('');
    await onSave(name, url, selectedEvents);
    setLoading(false);
    onClose();
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[20px] max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {editingWebhook ? 'Edit Webhook' : 'Create Webhook'}
            </h3>
            <p className="text-xs text-gray-500">Configure your endpoint</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 rounded-[12px] text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Webhook Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Slack Notifications"
              className="w-full px-4 py-3 bg-gray-100 border-0 rounded-[12px] text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Endpoint URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="w-full px-4 py-3 bg-gray-100 border-0 rounded-[12px] text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Events to Listen</label>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map(event => (
                <label
                  key={event.id}
                  className={`flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-all ${
                    selectedEvents.includes(event.id)
                      ? 'bg-purple-50'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.id)}
                    onChange={() => toggleEvent(event.id)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{event.name}</div>
                    <div className="text-xs text-gray-500">{event.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {editingWebhook ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ApiWebhooksProps {
  onBack: () => void;
  onDeliveryLogsClick: () => void;
}

const ApiWebhooks: React.FC<ApiWebhooksProps> = ({ onBack, onDeliveryLogsClick }) => {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<ApiWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<ApiWebhook | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadWebhooks();
    }
  }, [user]);

  const loadWebhooks = async () => {
    if (!user) return;
    setLoading(true);
    const data = await getUserWebhooks(user.id);
    setWebhooks(data);
    setLoading(false);
  };

  const handleCreateWebhook = async (name: string, url: string, events: string[]) => {
    if (!user) return;
    await createWebhook(user.id, name, url, events);
    await loadWebhooks();
  };

  const handleUpdateWebhook = async (name: string, url: string, events: string[]) => {
    if (!editingWebhook) return;
    await updateWebhook(editingWebhook.id, { name, url, events });
    await loadWebhooks();
    setEditingWebhook(null);
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      await deleteWebhook(webhookId);
      await loadWebhooks();
    }
  };

  const handleToggleActive = async (webhook: ApiWebhook) => {
    await updateWebhook(webhook.id, { is_active: !webhook.is_active });
    await loadWebhooks();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <div className="max-w-[1000px] mx-auto pt-6 pb-20 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-gray-800 truncate">Webhooks</h1>
              <p className="text-xs text-gray-500 truncate">Real-time notifications</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onDeliveryLogsClick}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <div className="w-6 h-6 bg-[#f5f5f5] rounded-full flex items-center justify-center">
                <FileText className="w-3 h-3 text-gray-900" />
              </div>
              Logs
            </button>
            <button
              onClick={() => {
                setEditingWebhook(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full text-xs font-medium hover:bg-gray-800 transition-colors"
            >
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <Plus className="w-3 h-3" />
              </div>
              Add
            </button>
          </div>
        </div>

        {/* How Webhooks Work Card */}
        <div className="bg-white rounded-[20px] p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">How Webhooks Work</div>
              <div className="text-xs text-gray-500">HTTP POST requests to your endpoint</div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-[12px] p-4 overflow-x-auto">
            <pre className="text-xs text-gray-300 font-mono">{`POST /your-endpoint HTTP/1.1
Content-Type: application/json
X-Nexus-Signature: sha256=xxxxx

{
  "event": "qr.scanned",
  "data": { "qr_id": "uuid", "city": "NYC" }
}`}</pre>
          </div>
        </div>

        {/* Webhooks List */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-sm">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#f5f5f5] rounded-full flex items-center justify-center">
                <Globe className="w-4 h-4 text-gray-900" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Your Webhooks</div>
                <div className="text-xs text-gray-500">{webhooks.length} configured</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-xs text-gray-500">Loading webhooks...</p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No Webhooks Yet</h3>
              <p className="text-xs text-gray-500 mb-4">Create your first webhook</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-gray-900 text-white rounded-full text-xs font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Webhook
              </button>
            </div>
          ) : (
            <div>
              {webhooks.map(webhook => (
                <div key={webhook.id} className="p-4 hover:bg-gray-50 transition-colors border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${webhook.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm font-semibold text-gray-900">{webhook.name}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        webhook.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {webhook.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {webhook.failure_count > 0 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          {webhook.failure_count} failures
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(webhook)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title={webhook.is_active ? 'Disable' : 'Enable'}
                      >
                        <Power className={`w-4 h-4 ${webhook.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingWebhook(webhook);
                          setShowModal(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <Link2 className="w-3 h-3 text-gray-500" />
                    </div>
                    <code className="text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full break-all flex-1">
                      {webhook.url}
                    </code>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {webhook.events.map(event => (
                      <span
                        key={event}
                        className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {new Date(webhook.created_at).toLocaleDateString()}
                    </span>
                    {webhook.last_triggered_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Last triggered {new Date(webhook.last_triggered_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Signature Verification Card */}
        <div className="mt-4 bg-white rounded-[20px] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center">
              <Code className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Verifying Signatures</div>
              <div className="text-xs text-gray-500">Validate X-Nexus-Signature header</div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-[12px] p-4 overflow-x-auto">
            <pre className="text-xs text-gray-300 font-mono">{`// Node.js verification
const crypto = require('crypto');

function verify(payload, signature, secret) {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</pre>
          </div>
        </div>
      </div>

      {/* Modal */}
      <WebhookModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingWebhook(null);
        }}
        onSave={editingWebhook ? handleUpdateWebhook : handleCreateWebhook}
        editingWebhook={editingWebhook}
      />
    </div>
  );
};

export default ApiWebhooks;
