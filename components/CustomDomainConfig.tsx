'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Plus,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Shield,
  Lock,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Server,
  Link,
  ArrowLeft,
  Info,
  HelpCircle,
  Zap
} from 'lucide-react';
import {
  getCustomDomains,
  addCustomDomain,
  deleteCustomDomain,
  verifyDomainDns,
  setPrimaryDomain,
  CustomDomain as ApiCustomDomain
} from '../services/apiExtendedService';

interface CustomDomainConfigProps {
  onBack: () => void;
  userId?: string;
}

// Types
interface CustomDomain {
  id: string;
  domain: string;
  status: 'active' | 'pending' | 'failed' | 'verifying';
  sslStatus: 'active' | 'pending' | 'expired' | 'none';
  sslExpiry?: string;
  isPrimary: boolean;
  dnsVerified: boolean;
  createdAt: string;
  totalRedirects: number;
}

interface DNSRecord {
  type: 'CNAME' | 'TXT' | 'A';
  name: string;
  value: string;
  verified: boolean;
  ttl?: string;
}

// Note: Mock data removed - component now fetches real data from Supabase

export default function CustomDomainConfig({ onBack, userId }: CustomDomainConfigProps) {
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<CustomDomain | null>(null);
  const [newDomain, setNewDomain] = useState('');

  // Fetch domains
  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const data = await getCustomDomains(userId);
      const transformedDomains: CustomDomain[] = data.map(d => ({
        id: d.id,
        domain: d.domain,
        status: d.status,
        sslStatus: d.ssl_status,
        sslExpiry: d.ssl_expiry || undefined,
        isPrimary: d.is_primary,
        dnsVerified: d.dns_verified,
        createdAt: d.created_at,
        totalRedirects: d.total_redirects
      }));
      setDomains(transformedDomains);
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  // Get DNS records for a domain
  const getDNSRecords = (domain: string): DNSRecord[] => {
    const baseDomain = domain.split('.').slice(-2).join('.');
    const subdomain = domain.replace(`.${baseDomain}`, '');

    return [
      {
        type: 'CNAME',
        name: subdomain,
        value: 'proxy.nexusqr.com',
        verified: domains.find(d => d.domain === domain)?.dnsVerified || false
      },
      {
        type: 'TXT',
        name: `_nexusqr.${subdomain}`,
        value: `nxqr-verify=${domains.find(d => d.domain === domain)?.id || 'pending'}`,
        verified: domains.find(d => d.domain === domain)?.dnsVerified || false,
        ttl: '3600'
      }
    ];
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'pending':
      case 'verifying': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'failed':
      case 'expired': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // Add domain
  const handleAddDomain = async () => {
    if (!newDomain || !userId) return;

    setIsAdding(true);
    try {
      const result = await addCustomDomain(userId, newDomain);
      if (result) {
        const newDomainObj: CustomDomain = {
          id: result.id,
          domain: result.domain,
          status: result.status,
          sslStatus: result.ssl_status,
          sslExpiry: result.ssl_expiry || undefined,
          isPrimary: result.is_primary,
          dnsVerified: result.dns_verified,
          createdAt: result.created_at,
          totalRedirects: result.total_redirects
        };
        setDomains([...domains, newDomainObj]);
        setExpandedDomain(newDomainObj.id);
      }
      setNewDomain('');
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding domain:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Verify DNS
  const verifyDNS = async (domainId: string) => {
    setIsVerifying(domainId);
    try {
      const result = await verifyDomainDns(domainId);
      if (result.verified) {
        setDomains(domains.map(d => {
          if (d.id === domainId) {
            return {
              ...d,
              dnsVerified: true,
              status: 'active' as const,
              sslStatus: 'active' as const,
              sslExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
          }
          return d;
        }));
      }
    } catch (error) {
      console.error('Error verifying DNS:', error);
    } finally {
      setIsVerifying(null);
    }
  };

  // Set as primary
  const handleSetPrimary = async (domainId: string) => {
    if (!userId) return;
    try {
      const success = await setPrimaryDomain(userId, domainId);
      if (success) {
        setDomains(domains.map(d => ({
          ...d,
          isPrimary: d.id === domainId
        })));
      }
    } catch (error) {
      console.error('Error setting primary domain:', error);
    }
  };

  // Delete domain
  const handleDeleteDomain = async (domainId: string) => {
    try {
      const success = await deleteCustomDomain(domainId);
      if (success) {
        setDomains(domains.filter(d => d.id !== domainId));
        setSelectedDomain(null);
      }
    } catch (error) {
      console.error('Error deleting domain:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to API Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Custom Domains</h1>
              <p className="text-slate-400">Configure branded short URLs for your QR codes</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Domain
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6 flex items-start gap-4">
          <Info className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-indigo-300">Use Your Own Domain</div>
            <p className="text-sm text-slate-400 mt-1">
              Replace <code className="text-indigo-300">nxqr.io</code> with your own branded domain for QR code short URLs.
              All SSL certificates are automatically provisioned and renewed.
            </p>
          </div>
        </div>

        {/* Domains List */}
        <div className="space-y-4">
          {domains.map(domain => {
            const dnsRecords = getDNSRecords(domain.domain);
            const isExpanded = expandedDomain === domain.id;

            return (
              <div
                key={domain.id}
                className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
              >
                {/* Domain Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-slate-700/30 transition-colors"
                  onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        domain.status === 'active'
                          ? 'bg-emerald-500/20'
                          : domain.status === 'pending'
                          ? 'bg-amber-500/20'
                          : 'bg-red-500/20'
                      }`}>
                        {domain.status === 'active' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {domain.status === 'pending' && <Clock className="w-5 h-5 text-amber-400" />}
                        {domain.status === 'verifying' && <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />}
                        {domain.status === 'failed' && <XCircle className="w-5 h-5 text-red-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-lg">{domain.domain}</span>
                          {domain.isPrimary && (
                            <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded">
                              Primary
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(domain.status)}`}>
                            {domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Link className="w-3 h-3" />
                            {domain.totalRedirects.toLocaleString()} redirects
                          </span>
                          {domain.sslStatus === 'active' && (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Lock className="w-3 h-3" />
                              SSL Active
                            </span>
                          )}
                          {domain.sslExpiry && (
                            <span>Expires: {domain.sslExpiry}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {domain.status !== 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            verifyDNS(domain.id);
                          }}
                          disabled={isVerifying === domain.id}
                          className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-lg text-sm flex items-center gap-2 transition-colors"
                        >
                          {isVerifying === domain.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Verify DNS
                            </>
                          )}
                        </button>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-700 p-6 bg-slate-900/50">
                    {/* DNS Configuration */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Server className="w-4 h-4 text-slate-400" />
                        DNS Configuration
                      </h3>

                      {domain.dnsVerified ? (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-300">DNS records verified and domain is active</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                            <div>
                              <div className="text-amber-300 font-medium">DNS verification pending</div>
                              <p className="text-sm text-slate-400 mt-1">
                                Add the following records to your DNS provider, then click "Verify DNS".
                                Changes may take up to 48 hours to propagate.
                              </p>
                            </div>
                          </div>

                          {dnsRecords.map((record, i) => (
                            <div key={i} className="bg-slate-800 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="px-2 py-1 text-xs font-bold bg-slate-700 rounded">
                                  {record.type}
                                </span>
                                {record.verified ? (
                                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Pending
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">Name / Host</div>
                                  <div className="flex items-center gap-2">
                                    <code className="text-sm font-mono text-slate-300">{record.name}</code>
                                    <button
                                      onClick={() => copyToClipboard(record.name, `name-${i}`)}
                                      className="p-1 hover:bg-slate-700 rounded"
                                    >
                                      {copied === `name-${i}` ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3 text-slate-400" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">Value / Target</div>
                                  <div className="flex items-center gap-2">
                                    <code className="text-sm font-mono text-slate-300 truncate">{record.value}</code>
                                    <button
                                      onClick={() => copyToClipboard(record.value, `value-${i}`)}
                                      className="p-1 hover:bg-slate-700 rounded"
                                    >
                                      {copied === `value-${i}` ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3 text-slate-400" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {record.ttl && (
                                <div className="mt-2 text-xs text-slate-500">
                                  TTL: {record.ttl} (recommended)
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SSL Certificate */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-slate-400" />
                        SSL Certificate
                      </h3>

                      <div className="bg-slate-800 rounded-lg p-4">
                        {domain.sslStatus === 'active' ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                <Lock className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div>
                                <div className="font-medium text-emerald-400">SSL Certificate Active</div>
                                <div className="text-sm text-slate-400">
                                  Auto-renews on {domain.sslExpiry}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-slate-500">Let's Encrypt</span>
                          </div>
                        ) : domain.sslStatus === 'pending' ? (
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                            <span className="text-amber-400">SSL certificate being provisioned...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-slate-400" />
                            <span className="text-slate-400">SSL certificate will be provisioned after DNS verification</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                      <div className="flex items-center gap-2">
                        {!domain.isPrimary && domain.status === 'active' && (
                          <button
                            onClick={() => handleSetPrimary(domain.id)}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2 transition-colors"
                          >
                            <Zap className="w-4 h-4" />
                            Set as Primary
                          </button>
                        )}
                        <a
                          href={`https://${domain.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visit Domain
                        </a>
                      </div>

                      {!domain.isPrimary && (
                        <button
                          onClick={() => handleDeleteDomain(domain.id)}
                          className="px-3 py-1.5 text-red-400 hover:bg-red-500/20 rounded-lg text-sm flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove Domain
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {domains.length === 0 && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
            <Globe className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold mb-2">No Custom Domains</h3>
            <p className="text-slate-400 mb-6">
              Add your first custom domain to start using branded short URLs
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Domain
            </button>
          </div>
        )}

        {/* How It Works */}
        <div className="mt-8 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-slate-400" />
            How Custom Domains Work
          </h3>

          <div className="grid grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0 font-bold text-indigo-400">
                1
              </div>
              <div>
                <div className="font-medium mb-1">Add Domain</div>
                <p className="text-sm text-slate-400">
                  Enter your subdomain (e.g., qr.yourdomain.com)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0 font-bold text-indigo-400">
                2
              </div>
              <div>
                <div className="font-medium mb-1">Configure DNS</div>
                <p className="text-sm text-slate-400">
                  Add the CNAME and TXT records to your DNS provider
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0 font-bold text-indigo-400">
                3
              </div>
              <div>
                <div className="font-medium mb-1">Start Using</div>
                <p className="text-sm text-slate-400">
                  SSL is auto-provisioned and your domain is ready
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                Add Custom Domain
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Domain Name</label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="qr.yourdomain.com"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Use a subdomain like qr.yourdomain.com or links.yourdomain.com
                </p>
              </div>

              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-400 mt-0.5" />
                  <p className="text-xs text-slate-400">
                    After adding, you'll need to configure DNS records with your domain registrar.
                    We'll provide the exact records to add.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDomain}
                  disabled={!newDomain || isAdding}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Domain
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
