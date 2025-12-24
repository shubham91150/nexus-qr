import React, { useState, useEffect } from 'react';
import {
  Link, Clock, MapPin, Smartphone, Globe, FlaskConical, Languages,
  Plus, Trash2, Save, Loader2, ChevronDown, ChevronUp, AlertCircle,
  Calendar, Timer, X, Lock, Navigation, Shield, Tag, Target, Bell, CheckCircle, Info, History, Webhook
} from 'lucide-react';
import {
  DynamicQRCode, ConditionalRule, ABTestVariant, LanguageContent,
  PasswordProtection, GeofenceSettings, GeofenceLocation, IPRestriction, UTMParameters,
  RetargetingConfig, LocationTrackingConfig, EmailNotificationConfig,
  URLHistoryEntry, WebhookConfig,
  supabase
} from '../../lib/supabase';

interface QRSettingsPanelProps {
  qrCode: DynamicQRCode;
  onUpdate: () => void;
}

type SettingsTab = 'url' | 'expiry' | 'conditions' | 'language' | 'ab-testing' | 'security' | 'utm' | 'tracking' | 'history' | 'webhook';

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

export const QRSettingsPanel: React.FC<QRSettingsPanelProps> = ({ qrCode, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('url');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // URL Settings
  const [destinationUrl, setDestinationUrl] = useState(qrCode.destination_url);

  // Expiry Settings
  const [expiresAt, setExpiresAt] = useState(qrCode.expires_at || '');
  const [expiredRedirectUrl, setExpiredRedirectUrl] = useState(qrCode.expired_redirect_url || '');

  // Conditional Rules
  const [conditionalRules, setConditionalRules] = useState<ConditionalRule[]>(
    qrCode.conditional_rules || []
  );
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // Multi-language
  const [multiLanguageEnabled, setMultiLanguageEnabled] = useState(qrCode.multi_language_enabled || false);
  const [languageContents, setLanguageContents] = useState<LanguageContent[]>(
    qrCode.language_contents || []
  );
  const [defaultLanguage, setDefaultLanguage] = useState(qrCode.default_language || 'en');

  // A/B Testing
  const [abTestingEnabled, setAbTestingEnabled] = useState(qrCode.ab_testing_enabled || false);
  const [abVariants, setAbVariants] = useState<ABTestVariant[]>(
    qrCode.ab_variants || []
  );

  // Password Protection
  const [passwordProtection, setPasswordProtection] = useState<PasswordProtection>(
    qrCode.password_protection || { enabled: false, password: '', hint: '' }
  );

  // Geofencing
  const [geofenceSettings, setGeofenceSettings] = useState<GeofenceSettings>(
    qrCode.geofence_settings || { enabled: false, locations: [], blockOutside: true, blockedRedirectUrl: '' }
  );

  // IP Restriction
  const [ipRestriction, setIpRestriction] = useState<IPRestriction>(
    qrCode.ip_restriction || { enabled: false, maxScansPerIP: 1, timeWindowMinutes: 60, blockedRedirectUrl: '' }
  );

  // UTM Parameters
  const [utmParameters, setUtmParameters] = useState<UTMParameters>(
    qrCode.utm_parameters || { enabled: false, source: '', medium: '', campaign: '', term: '', content: '' }
  );

  // Retargeting Config
  const [retargetingConfig, setRetargetingConfig] = useState<RetargetingConfig>(
    qrCode.retargeting_config || { enabled: false, gtm_id: '', facebook_pixel_id: '', google_ads_id: '', tiktok_pixel_id: '' }
  );

  // Location Tracking Config
  const [locationTrackingConfig, setLocationTrackingConfig] = useState<LocationTrackingConfig>(
    qrCode.location_tracking_config || { enabled: false }
  );

  // Email Notification Config
  const [emailNotificationConfig, setEmailNotificationConfig] = useState<EmailNotificationConfig>(
    qrCode.email_notification_config || { enabled: false, email: '', frequency: 'every_scan' }
  );

  // URL History (read-only, populated from database)
  const [urlHistory, setUrlHistory] = useState<URLHistoryEntry[]>(
    qrCode.url_history || []
  );

  // Webhook Configuration
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>(
    qrCode.webhook_config || { enabled: false, url: '', events: ['scan'] }
  );

  // Reset on QR change
  useEffect(() => {
    setDestinationUrl(qrCode.destination_url);
    setExpiresAt(qrCode.expires_at || '');
    setExpiredRedirectUrl(qrCode.expired_redirect_url || '');
    setConditionalRules(qrCode.conditional_rules || []);
    setMultiLanguageEnabled(qrCode.multi_language_enabled || false);
    setLanguageContents(qrCode.language_contents || []);
    setDefaultLanguage(qrCode.default_language || 'en');
    setAbTestingEnabled(qrCode.ab_testing_enabled || false);
    setAbVariants(qrCode.ab_variants || []);
    setPasswordProtection(qrCode.password_protection || { enabled: false, password: '', hint: '' });
    setGeofenceSettings(qrCode.geofence_settings || { enabled: false, locations: [], blockOutside: true, blockedRedirectUrl: '' });
    setIpRestriction(qrCode.ip_restriction || { enabled: false, maxScansPerIP: 1, timeWindowMinutes: 60, blockedRedirectUrl: '' });
    setUtmParameters(qrCode.utm_parameters || { enabled: false, source: '', medium: '', campaign: '', term: '', content: '' });
    setRetargetingConfig(qrCode.retargeting_config || { enabled: false, gtm_id: '', facebook_pixel_id: '', google_ads_id: '', tiktok_pixel_id: '' });
    setLocationTrackingConfig(qrCode.location_tracking_config || { enabled: false });
    setEmailNotificationConfig(qrCode.email_notification_config || { enabled: false, email: '', frequency: 'every_scan' });
    setUrlHistory(qrCode.url_history || []);
    setWebhookConfig(qrCode.webhook_config || { enabled: false, url: '', events: ['scan'] });
  }, [qrCode.id]);

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: Record<string, unknown> = {
        destination_url: destinationUrl,
        expires_at: expiresAt || null,
        expired_redirect_url: expiredRedirectUrl || null,
        conditional_rules: conditionalRules,
        multi_language_enabled: multiLanguageEnabled,
        language_contents: languageContents,
        default_language: defaultLanguage,
        ab_testing_enabled: abTestingEnabled,
        ab_variants: abVariants,
        password_protection: passwordProtection,
        geofence_settings: geofenceSettings,
        ip_restriction: ipRestriction,
        utm_parameters: utmParameters,
        retargeting_config: retargetingConfig,
        location_tracking_config: locationTrackingConfig,
        email_notification_config: emailNotificationConfig,
        webhook_config: webhookConfig,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('dynamic_qr_codes')
        .update(updateData)
        .eq('id', qrCode.id);

      if (updateError) throw updateError;

      setSuccess('Settings saved successfully!');
      onUpdate();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Add new conditional rule
  const addConditionalRule = (type: ConditionalRule['type']) => {
    const newRule: ConditionalRule = {
      id: generateId(),
      type,
      condition: {},
      destinationUrl: '',
      priority: conditionalRules.length,
    };
    setConditionalRules([...conditionalRules, newRule]);
    setExpandedRule(newRule.id);
  };

  // Update conditional rule
  const updateConditionalRule = (id: string, updates: Partial<ConditionalRule>) => {
    setConditionalRules(rules =>
      rules.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  // Remove conditional rule
  const removeConditionalRule = (id: string) => {
    setConditionalRules(rules => rules.filter(r => r.id !== id));
  };

  // Add language content
  const addLanguageContent = () => {
    setLanguageContents([
      ...languageContents,
      { language: '', destinationUrl: '', label: '' },
    ]);
  };

  // Update language content
  const updateLanguageContent = (index: number, updates: Partial<LanguageContent>) => {
    setLanguageContents(contents =>
      contents.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  // Remove language content
  const removeLanguageContent = (index: number) => {
    setLanguageContents(contents => contents.filter((_, i) => i !== index));
  };

  // Add A/B variant
  const addABVariant = () => {
    const newVariant: ABTestVariant = {
      id: generateId(),
      name: `Variant ${String.fromCharCode(65 + abVariants.length)}`, // A, B, C...
      destinationUrl: '',
      weight: 50,
      scans: 0,
      conversions: 0,
    };
    setAbVariants([...abVariants, newVariant]);
  };

  // Update A/B variant
  const updateABVariant = (id: string, updates: Partial<ABTestVariant>) => {
    setAbVariants(variants =>
      variants.map(v => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  // Remove A/B variant
  const removeABVariant = (id: string) => {
    setAbVariants(variants => variants.filter(v => v.id !== id));
  };

  const tabs = [
    { id: 'url' as SettingsTab, label: 'URL', icon: Link },
    { id: 'history' as SettingsTab, label: 'History', icon: History },
    { id: 'expiry' as SettingsTab, label: 'Expiry', icon: Timer },
    { id: 'conditions' as SettingsTab, label: 'Conditions', icon: MapPin },
    { id: 'security' as SettingsTab, label: 'Security', icon: Shield },
    { id: 'webhook' as SettingsTab, label: 'Webhook', icon: Webhook },
    { id: 'utm' as SettingsTab, label: 'UTM', icon: Tag },
    { id: 'tracking' as SettingsTab, label: 'Tracking', icon: Target },
    { id: 'language' as SettingsTab, label: 'Language', icon: Languages },
    { id: 'ab-testing' as SettingsTab, label: 'A/B Test', icon: FlaskConical },
  ];

  const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
  ];

  const DAYS_OF_WEEK = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  return (
    <div className="space-y-4">
      {/* Pill-style Tabs - Scrollable */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 text-green-600 px-4 py-3 rounded-xl text-sm">
            {success}
          </div>
        )}

        {/* URL Tab */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination URL
              </label>
              <input
                type="url"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all"
                placeholder="https://example.com"
              />
              <p className="text-xs text-gray-500 mt-2">
                You can change this URL anytime. All printed QR codes will redirect to the new URL.
              </p>
            </div>
          </div>
        )}

        {/* Expiry Tab */}
        {activeTab === 'expiry' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date & Time
              </label>
              <input
                type="datetime-local"
                value={expiresAt ? expiresAt.slice(0, 16) : ''}
                onChange={(e) => setExpiresAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
              {expiresAt && (
                <button
                  onClick={() => setExpiresAt('')}
                  className="text-xs text-red-500 mt-1 hover:underline"
                >
                  Remove expiry
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Redirect URL After Expiry (Optional)
              </label>
              <input
                type="url"
                value={expiredRedirectUrl}
                onChange={(e) => setExpiredRedirectUrl(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all"
                placeholder="https://example.com/expired"
              />
              <p className="text-xs text-gray-500 mt-2">
                Users will be redirected here after the QR expires. Leave empty to show the original URL.
              </p>
            </div>
          </div>
        )}

        {/* Conditions Tab */}
        {activeTab === 'conditions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Add rules to show different content based on conditions.
              </p>
            </div>

            {/* Add Rule Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <button
                onClick={() => addConditionalRule('time')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <Clock size={14} /> Time
              </button>
              <button
                onClick={() => addConditionalRule('location')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
              >
                <MapPin size={14} /> Location
              </button>
              <button
                onClick={() => addConditionalRule('device')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
              >
                <Smartphone size={14} /> Device
              </button>
              <button
                onClick={() => addConditionalRule('language')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
              >
                <Globe size={14} /> Language
              </button>
            </div>

            {/* Rules List */}
            {conditionalRules.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conditional rules yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conditionalRules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          #{index + 1}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          rule.type === 'time' ? 'bg-blue-100 text-blue-600' :
                          rule.type === 'location' ? 'bg-green-100 text-green-600' :
                          rule.type === 'device' ? 'bg-purple-100 text-purple-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {rule.type.charAt(0).toUpperCase() + rule.type.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeConditionalRule(rule.id);
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                        {expandedRule === rule.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {expandedRule === rule.id && (
                      <div className="p-3 space-y-3 animate-fadeIn">
                        {/* Time-based conditions */}
                        {rule.type === 'time' && (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
                                <input
                                  type="time"
                                  value={rule.condition.startTime || ''}
                                  onChange={(e) => updateConditionalRule(rule.id, {
                                    condition: { ...rule.condition, startTime: e.target.value }
                                  })}
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">End Time</label>
                                <input
                                  type="time"
                                  value={rule.condition.endTime || ''}
                                  onChange={(e) => updateConditionalRule(rule.id, {
                                    condition: { ...rule.condition, endTime: e.target.value }
                                  })}
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Days of Week</label>
                              <div className="flex flex-wrap gap-1">
                                {DAYS_OF_WEEK.map((day) => (
                                  <button
                                    key={day.value}
                                    onClick={() => {
                                      const days = rule.condition.daysOfWeek || [];
                                      const newDays = days.includes(day.value)
                                        ? days.filter(d => d !== day.value)
                                        : [...days, day.value];
                                      updateConditionalRule(rule.id, {
                                        condition: { ...rule.condition, daysOfWeek: newDays }
                                      });
                                    }}
                                    className={`px-2 py-1 text-xs rounded ${
                                      rule.condition.daysOfWeek?.includes(day.value)
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {day.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Location-based conditions */}
                        {rule.type === 'location' && (
                          <>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Countries (comma separated)</label>
                              <input
                                type="text"
                                value={rule.condition.countries?.join(', ') || ''}
                                onChange={(e) => updateConditionalRule(rule.id, {
                                  condition: {
                                    ...rule.condition,
                                    countries: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                                  }
                                })}
                                placeholder="India, USA, UK"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Cities (comma separated)</label>
                              <input
                                type="text"
                                value={rule.condition.cities?.join(', ') || ''}
                                onChange={(e) => updateConditionalRule(rule.id, {
                                  condition: {
                                    ...rule.condition,
                                    cities: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                                  }
                                })}
                                placeholder="Mumbai, Delhi, New York"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                              />
                            </div>
                          </>
                        )}

                        {/* Device-based conditions */}
                        {rule.type === 'device' && (
                          <>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Device Type</label>
                              <div className="flex gap-2">
                                {(['mobile', 'tablet', 'desktop'] as const).map((device) => (
                                  <button
                                    key={device}
                                    onClick={() => {
                                      const devices = rule.condition.devices || [];
                                      const newDevices = devices.includes(device)
                                        ? devices.filter(d => d !== device)
                                        : [...devices, device];
                                      updateConditionalRule(rule.id, {
                                        condition: { ...rule.condition, devices: newDevices }
                                      });
                                    }}
                                    className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                                      rule.condition.devices?.includes(device)
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {device.charAt(0).toUpperCase() + device.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">OS (comma separated)</label>
                              <input
                                type="text"
                                value={rule.condition.os?.join(', ') || ''}
                                onChange={(e) => updateConditionalRule(rule.id, {
                                  condition: {
                                    ...rule.condition,
                                    os: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                                  }
                                })}
                                placeholder="iOS, Android, Windows"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                              />
                            </div>
                          </>
                        )}

                        {/* Language-based conditions */}
                        {rule.type === 'language' && (
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Languages</label>
                            <div className="flex flex-wrap gap-1">
                              {LANGUAGES.slice(0, 6).map((lang) => (
                                <button
                                  key={lang.code}
                                  onClick={() => {
                                    const langs = rule.condition.languages || [];
                                    const newLangs = langs.includes(lang.code)
                                      ? langs.filter(l => l !== lang.code)
                                      : [...langs, lang.code];
                                    updateConditionalRule(rule.id, {
                                      condition: { ...rule.condition, languages: newLangs }
                                    });
                                  }}
                                  className={`px-2 py-1 text-xs rounded ${
                                    rule.condition.languages?.includes(lang.code)
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {lang.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Destination URL */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Redirect To</label>
                          <input
                            type="url"
                            value={rule.destinationUrl}
                            onChange={(e) => updateConditionalRule(rule.id, { destinationUrl: e.target.value })}
                            placeholder="https://example.com/special"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Security Tab - Password, Geofencing, IP Restriction */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Password Protection */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock size={18} className="text-indigo-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Password Protection</h4>
                    <p className="text-xs text-gray-500">Require password to access content</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={passwordProtection.enabled}
                    onChange={(e) => setPasswordProtection({ ...passwordProtection, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {passwordProtection.enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Password</label>
                    <input
                      type="text"
                      value={passwordProtection.password}
                      onChange={(e) => setPasswordProtection({ ...passwordProtection, password: e.target.value })}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Hint (Optional)</label>
                    <input
                      type="text"
                      value={passwordProtection.hint || ''}
                      onChange={(e) => setPasswordProtection({ ...passwordProtection, hint: e.target.value })}
                      placeholder="Password hint for users"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Geofencing */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Navigation size={18} className="text-green-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Geofencing</h4>
                    <p className="text-xs text-gray-500">Restrict access by location</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={geofenceSettings.enabled}
                    onChange={(e) => setGeofenceSettings({ ...geofenceSettings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {geofenceSettings.enabled && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Access:</label>
                    <select
                      value={geofenceSettings.blockOutside ? 'inside' : 'outside'}
                      onChange={(e) => setGeofenceSettings({ ...geofenceSettings, blockOutside: e.target.value === 'inside' })}
                      className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs"
                    >
                      <option value="inside">Only Inside Zones</option>
                      <option value="outside">Only Outside Zones</option>
                    </select>
                  </div>

                  {geofenceSettings.locations.map((loc, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={loc.name || ''}
                          onChange={(e) => {
                            const newLocs = [...geofenceSettings.locations];
                            newLocs[index] = { ...loc, name: e.target.value };
                            setGeofenceSettings({ ...geofenceSettings, locations: newLocs });
                          }}
                          placeholder="Location Name"
                          className="text-sm font-medium bg-transparent border-none outline-none"
                        />
                        <button
                          onClick={() => {
                            const newLocs = geofenceSettings.locations.filter((_, i) => i !== index);
                            setGeofenceSettings({ ...geofenceSettings, locations: newLocs });
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={loc.latitude}
                            onChange={(e) => {
                              const newLocs = [...geofenceSettings.locations];
                              newLocs[index] = { ...loc, latitude: parseFloat(e.target.value) || 0 };
                              setGeofenceSettings({ ...geofenceSettings, locations: newLocs });
                            }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={loc.longitude}
                            onChange={(e) => {
                              const newLocs = [...geofenceSettings.locations];
                              newLocs[index] = { ...loc, longitude: parseFloat(e.target.value) || 0 };
                              setGeofenceSettings({ ...geofenceSettings, locations: newLocs });
                            }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400">Radius (m)</label>
                          <input
                            type="number"
                            value={loc.radius}
                            onChange={(e) => {
                              const newLocs = [...geofenceSettings.locations];
                              newLocs[index] = { ...loc, radius: parseInt(e.target.value) || 100 };
                              setGeofenceSettings({ ...geofenceSettings, locations: newLocs });
                            }}
                            className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      setGeofenceSettings({
                        ...geofenceSettings,
                        locations: [...geofenceSettings.locations, { latitude: 0, longitude: 0, radius: 500, name: '' }]
                      });
                    }}
                    className="flex items-center gap-2 text-green-600 text-sm font-medium hover:underline"
                  >
                    <Plus size={14} /> Add Location
                  </button>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Blocked Redirect URL</label>
                    <input
                      type="url"
                      value={geofenceSettings.blockedRedirectUrl || ''}
                      onChange={(e) => setGeofenceSettings({ ...geofenceSettings, blockedRedirectUrl: e.target.value })}
                      placeholder="https://example.com/not-available"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* IP Restriction */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-orange-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">IP Restriction</h4>
                    <p className="text-xs text-gray-500">Limit scans per IP address</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ipRestriction.enabled}
                    onChange={(e) => setIpRestriction({ ...ipRestriction, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {ipRestriction.enabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Max Scans per IP</label>
                      <input
                        type="number"
                        min="1"
                        value={ipRestriction.maxScansPerIP}
                        onChange={(e) => setIpRestriction({ ...ipRestriction, maxScansPerIP: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Time Window (minutes)</label>
                      <input
                        type="number"
                        min="1"
                        value={ipRestriction.timeWindowMinutes}
                        onChange={(e) => setIpRestriction({ ...ipRestriction, timeWindowMinutes: parseInt(e.target.value) || 60 })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Example: {ipRestriction.maxScansPerIP} scan(s) allowed per IP every {ipRestriction.timeWindowMinutes} minutes
                  </p>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Blocked Redirect URL</label>
                    <input
                      type="url"
                      value={ipRestriction.blockedRedirectUrl || ''}
                      onChange={(e) => setIpRestriction({ ...ipRestriction, blockedRedirectUrl: e.target.value })}
                      placeholder="https://example.com/limit-reached"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UTM Parameters Tab */}
        {activeTab === 'utm' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">UTM Builder</h4>
                <p className="text-xs text-gray-500">Auto-generate tracking parameters for Google Analytics</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={utmParameters.enabled}
                  onChange={(e) => setUtmParameters({ ...utmParameters, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {utmParameters.enabled && (
              <div className="space-y-4">
                {/* Quick Templates */}
                <div className="border border-gray-200 rounded-xl p-3">
                  <label className="text-xs text-gray-500 mb-2 block font-medium">Quick Templates</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'QR Print', source: 'qr_code', medium: 'print', campaign: qrCode.title.toLowerCase().replace(/\s+/g, '_') },
                      { label: 'Flyer', source: 'flyer', medium: 'print', campaign: qrCode.title.toLowerCase().replace(/\s+/g, '_') },
                      { label: 'Billboard', source: 'billboard', medium: 'outdoor', campaign: qrCode.title.toLowerCase().replace(/\s+/g, '_') },
                      { label: 'Product', source: 'product_packaging', medium: 'packaging', campaign: qrCode.title.toLowerCase().replace(/\s+/g, '_') },
                      { label: 'Business Card', source: 'business_card', medium: 'print', campaign: 'contact' },
                      { label: 'Event', source: 'event', medium: 'offline', campaign: qrCode.title.toLowerCase().replace(/\s+/g, '_') },
                    ].map((template) => (
                      <button
                        key={template.label}
                        type="button"
                        onClick={() => setUtmParameters({
                          ...utmParameters,
                          source: template.source,
                          medium: template.medium,
                          campaign: template.campaign,
                        })}
                        className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-fill from Title */}
                <button
                  type="button"
                  onClick={() => setUtmParameters({
                    ...utmParameters,
                    source: 'qr_code',
                    medium: 'qr',
                    campaign: qrCode.title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                  })}
                  className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Tag size={14} />
                  Auto-fill from QR Title: "{qrCode.title}"
                </button>

                {/* Source with suggestions */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Campaign Source (utm_source) *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={utmParameters.source || ''}
                      onChange={(e) => setUtmParameters({ ...utmParameters, source: e.target.value })}
                      placeholder="e.g., qr_code, flyer, billboard"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      list="utm-source-list"
                    />
                    <datalist id="utm-source-list">
                      <option value="qr_code" />
                      <option value="flyer" />
                      <option value="billboard" />
                      <option value="poster" />
                      <option value="business_card" />
                      <option value="product_packaging" />
                      <option value="storefront" />
                      <option value="event" />
                      <option value="brochure" />
                      <option value="menu" />
                    </datalist>
                  </div>
                </div>

                {/* Medium with suggestions */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Campaign Medium (utm_medium) *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={utmParameters.medium || ''}
                      onChange={(e) => setUtmParameters({ ...utmParameters, medium: e.target.value })}
                      placeholder="e.g., qr, print, outdoor"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      list="utm-medium-list"
                    />
                    <datalist id="utm-medium-list">
                      <option value="qr" />
                      <option value="print" />
                      <option value="outdoor" />
                      <option value="packaging" />
                      <option value="offline" />
                      <option value="display" />
                      <option value="referral" />
                    </datalist>
                  </div>
                </div>

                {/* Campaign Name */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Campaign Name (utm_campaign) *</label>
                  <input
                    type="text"
                    value={utmParameters.campaign || ''}
                    onChange={(e) => setUtmParameters({ ...utmParameters, campaign: e.target.value })}
                    placeholder="e.g., summer_sale, product_launch"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  />
                </div>

                {/* Optional Fields - Collapsible */}
                <details className="group">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1">
                    <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                    Advanced Options (optional)
                  </summary>
                  <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Campaign Term (utm_term)</label>
                      <input
                        type="text"
                        value={utmParameters.term || ''}
                        onChange={(e) => setUtmParameters({ ...utmParameters, term: e.target.value })}
                        placeholder="e.g., running+shoes"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Campaign Content (utm_content)</label>
                      <input
                        type="text"
                        value={utmParameters.content || ''}
                        onChange={(e) => setUtmParameters({ ...utmParameters, content: e.target.value })}
                        placeholder="e.g., banner_ad, text_link"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </details>

                {/* Preview */}
                <div className="bg-indigo-50 rounded-xl p-3">
                  <label className="text-xs text-indigo-600 mb-1 block font-medium">Generated URL Preview</label>
                  <code className="text-xs text-indigo-800 break-all block mt-1">
                    {destinationUrl}
                    {utmParameters.source ? `?utm_source=${encodeURIComponent(utmParameters.source)}` : ''}
                    {utmParameters.medium ? `&utm_medium=${encodeURIComponent(utmParameters.medium)}` : ''}
                    {utmParameters.campaign ? `&utm_campaign=${encodeURIComponent(utmParameters.campaign)}` : ''}
                    {utmParameters.term ? `&utm_term=${encodeURIComponent(utmParameters.term)}` : ''}
                    {utmParameters.content ? `&utm_content=${encodeURIComponent(utmParameters.content)}` : ''}
                  </code>
                </div>

                {/* Info */}
                <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                  <Info size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    UTM parameters will be automatically added to your destination URL when users scan this QR code. Track performance in Google Analytics under Acquisition → Campaigns.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tracking Tab - Location & Retargeting */}
        {activeTab === 'tracking' && (
          <div className="space-y-4">
            {/* Location Tracking Section */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Location Tracking</h4>
                    <p className="text-xs text-gray-500">Track scan locations via IP</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={locationTrackingConfig.enabled}
                    onChange={(e) => setLocationTrackingConfig({ ...locationTrackingConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {locationTrackingConfig.enabled && (
                <div className="bg-green-50 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">
                    Location tracking enabled. City-wise scan data will be shown in analytics.
                  </p>
                </div>
              )}
            </div>

            {/* Email Notifications Section */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-xs text-gray-500">Get alerts when QR is scanned</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotificationConfig.enabled}
                    onChange={(e) => setEmailNotificationConfig({ ...emailNotificationConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {emailNotificationConfig.enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Email Address *</label>
                    <input
                      type="email"
                      value={emailNotificationConfig.email || ''}
                      onChange={(e) => setEmailNotificationConfig({ ...emailNotificationConfig, email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Notification Frequency</label>
                    <select
                      value={emailNotificationConfig.frequency}
                      onChange={(e) => setEmailNotificationConfig({ ...emailNotificationConfig, frequency: e.target.value as EmailNotificationConfig['frequency'] })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="every_scan">Every Scan</option>
                      <option value="first_daily">First Scan of Day</option>
                      <option value="every_10_scans">Every 10 Scans</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Retargeting Section */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Retargeting Pixels</h4>
                    <p className="text-xs text-gray-500">Track scanners with ad pixels</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retargetingConfig.enabled}
                    onChange={(e) => setRetargetingConfig({ ...retargetingConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {retargetingConfig.enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Google Tag Manager ID</label>
                    <input
                      type="text"
                      value={retargetingConfig.gtm_id || ''}
                      onChange={(e) => setRetargetingConfig({ ...retargetingConfig, gtm_id: e.target.value })}
                      placeholder="GTM-XXXXXXX"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Facebook Pixel ID</label>
                    <input
                      type="text"
                      value={retargetingConfig.facebook_pixel_id || ''}
                      onChange={(e) => setRetargetingConfig({ ...retargetingConfig, facebook_pixel_id: e.target.value })}
                      placeholder="123456789012345"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">TikTok Pixel ID</label>
                    <input
                      type="text"
                      value={retargetingConfig.tiktok_pixel_id || ''}
                      onChange={(e) => setRetargetingConfig({ ...retargetingConfig, tiktok_pixel_id: e.target.value })}
                      placeholder="XXXXXXXXXXXXXXXXXX"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Google Ads Conversion ID</label>
                    <input
                      type="text"
                      value={retargetingConfig.google_ads_id || ''}
                      onChange={(e) => setRetargetingConfig({ ...retargetingConfig, google_ads_id: e.target.value })}
                      placeholder="AW-XXXXXXXXXX"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Language Tab */}
        {activeTab === 'language' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Multi-Language Support</h4>
                <p className="text-xs text-gray-500">Show different URLs based on user's language</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={multiLanguageEnabled}
                  onChange={(e) => setMultiLanguageEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {multiLanguageEnabled && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Default Language</label>
                  <select
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  {languageContents.map((content, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <select
                        value={content.language}
                        onChange={(e) => updateLanguageContent(index, { language: e.target.value })}
                        className="w-28 px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Select</option>
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                      <input
                        type="url"
                        value={content.destinationUrl}
                        onChange={(e) => updateLanguageContent(index, { destinationUrl: e.target.value })}
                        placeholder="https://example.com/hi"
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => removeLanguageContent(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addLanguageContent}
                  className="flex items-center gap-2 text-indigo-600 text-sm font-medium hover:underline"
                >
                  <Plus size={14} /> Add Language
                </button>
              </>
            )}
          </div>
        )}

        {/* A/B Testing Tab */}
        {activeTab === 'ab-testing' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">A/B Testing</h4>
                <p className="text-xs text-gray-500">Split traffic between different URLs</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={abTestingEnabled}
                  onChange={(e) => setAbTestingEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {abTestingEnabled && (
              <>
                <div className="space-y-3">
                  {abVariants.map((variant) => (
                    <div key={variant.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateABVariant(variant.id, { name: e.target.value })}
                          className="font-medium text-gray-900 bg-transparent border-none outline-none"
                        />
                        <button
                          onClick={() => removeABVariant(variant.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        type="url"
                        value={variant.destinationUrl}
                        onChange={(e) => updateABVariant(variant.id, { destinationUrl: e.target.value })}
                        placeholder="https://example.com/variant-a"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Weight:</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={variant.weight}
                          onChange={(e) => updateABVariant(variant.id, { weight: Number(e.target.value) })}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-12">{variant.weight}%</span>
                      </div>
                      {variant.scans > 0 && (
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Scans: {variant.scans}</span>
                          <span>Conversions: {variant.conversions}</span>
                          <span>Rate: {((variant.conversions / variant.scans) * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addABVariant}
                  className="flex items-center gap-2 text-indigo-600 text-sm font-medium hover:underline"
                >
                  <Plus size={14} /> Add Variant
                </button>
              </>
            )}
          </div>
        )}

        {/* URL History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <History size={18} className="text-indigo-600" />
                URL Change History
              </h3>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Track all destination URL changes for this QR code. History is automatically recorded when you update the URL.
            </p>

            {urlHistory && urlHistory.length > 0 ? (
              <div className="space-y-3">
                {/* Current URL */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-xs font-medium text-green-700">Current URL</span>
                  </div>
                  <p className="text-sm text-gray-900 break-all">{qrCode.destination_url}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last updated: {new Date(qrCode.updated_at).toLocaleString()}
                  </p>
                </div>

                {/* History entries */}
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {urlHistory.slice().reverse().map((entry, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">
                          {new Date(entry.changed_at).toLocaleString()}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Change #{urlHistory.length - index}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-red-500 flex-shrink-0 mt-0.5">From:</span>
                          <p className="text-xs text-gray-600 break-all">{entry.url}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-green-600 flex-shrink-0 mt-0.5">To:</span>
                          <p className="text-xs text-gray-800 break-all">{entry.changed_to}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <History size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No URL changes yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  URL history will appear here when you change the destination URL
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
              <Info size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                URL history is automatically tracked. Every time you change the destination URL, a record is saved with timestamp. This helps you audit changes and revert if needed.
              </p>
            </div>
          </div>
        )}

        {/* Webhook Tab */}
        {activeTab === 'webhook' && (
          <div className="space-y-4">
            {/* Enable Webhook */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook size={18} className="text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Webhook Notifications</h4>
                  <p className="text-xs text-gray-500">Get notified via HTTP POST on events</p>
                </div>
              </div>
              <button
                onClick={() => setWebhookConfig(c => ({ ...c, enabled: !c.enabled }))}
                className={`w-12 h-6 rounded-full transition-colors ${webhookConfig.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${webhookConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {webhookConfig.enabled && (
              <div className="space-y-4 mt-4 pl-2 border-l-2 border-indigo-100">
                {/* Webhook URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={webhookConfig.url}
                    onChange={(e) => setWebhookConfig(c => ({ ...c, url: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 outline-none text-sm"
                    placeholder="https://your-server.com/webhook"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    We'll send a POST request to this URL when events occur
                  </p>
                </div>

                {/* Webhook Secret */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook Secret (Optional)
                  </label>
                  <input
                    type="text"
                    value={webhookConfig.secret || ''}
                    onChange={(e) => setWebhookConfig(c => ({ ...c, secret: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 outline-none text-sm font-mono"
                    placeholder="your-webhook-secret"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Used to generate HMAC-SHA256 signature for verification (x-signature header)
                  </p>
                </div>

                {/* Events Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Events to Trigger
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'scan', label: 'QR Code Scanned', desc: 'When someone scans this QR code' },
                      { id: 'url_changed', label: 'URL Changed', desc: 'When destination URL is updated' },
                      { id: 'expired', label: 'QR Code Expired', desc: 'When the QR code expires' },
                    ].map((event) => (
                      <label key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={webhookConfig.events?.includes(event.id as 'scan' | 'url_changed' | 'expired') || false}
                          onChange={(e) => {
                            const eventType = event.id as 'scan' | 'url_changed' | 'expired';
                            if (e.target.checked) {
                              setWebhookConfig(c => ({ ...c, events: [...(c.events || []), eventType] }));
                            } else {
                              setWebhookConfig(c => ({ ...c, events: (c.events || []).filter(ev => ev !== eventType) }));
                            }
                          }}
                          className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{event.label}</span>
                          <p className="text-xs text-gray-500">{event.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Payload Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Example Payload
                  </label>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs overflow-x-auto">
{`{
  "event": "scan",
  "qr_id": "${qrCode.id.substring(0, 8)}...",
  "short_code": "${qrCode.short_code}",
  "timestamp": "${new Date().toISOString()}",
  "data": {
    "country": "India",
    "city": "Mumbai",
    "device": "Mobile",
    "browser": "Chrome",
    "os": "Android"
  }
}`}
                  </pre>
                </div>

                {/* Info */}
                <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                  <Info size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">Webhook Headers:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Content-Type: application/json</li>
                      <li>X-Signature: HMAC-SHA256 of payload (if secret is set)</li>
                      <li>X-Event-Type: Event name (scan/url_changed/expired)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
