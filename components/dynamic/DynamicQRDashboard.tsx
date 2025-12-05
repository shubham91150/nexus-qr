import React, { useState, useEffect } from 'react';
import {
  Plus, QrCode, BarChart3, Edit2, Trash2, ExternalLink,
  Copy, Check, Power, PowerOff, Loader2, TrendingUp,
  Smartphone, Monitor, Globe, Calendar, Users, Eye
} from 'lucide-react';
import { supabase, DynamicQRCode, QRScan } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { DynamicQRForm } from './DynamicQRForm';

interface AnalyticsData {
  totalScans: number;
  todayScans: number;
  weekScans: number;
  topCountries: { country: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  recentScans: QRScan[];
}

export function DynamicQRDashboard() {
  const { user, signOut } = useAuth();
  const [qrCodes, setQRCodes] = useState<DynamicQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<DynamicQRCode | null>(null);
  const [selectedQR, setSelectedQR] = useState<DynamicQRCode | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Fetch QR codes
  const fetchQRCodes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dynamic_qr_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQRCodes(data || []);
    } catch (err) {
      console.error('Error fetching QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics for selected QR
  const fetchAnalytics = async (qrId: string) => {
    setAnalyticsLoading(true);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Total scans
      const { count: totalScans } = await supabase
        .from('qr_scans')
        .select('*', { count: 'exact', head: true })
        .eq('qr_id', qrId);

      // Today's scans
      const { count: todayScans } = await supabase
        .from('qr_scans')
        .select('*', { count: 'exact', head: true })
        .eq('qr_id', qrId)
        .gte('scanned_at', today);

      // Week scans
      const { count: weekScans } = await supabase
        .from('qr_scans')
        .select('*', { count: 'exact', head: true })
        .eq('qr_id', qrId)
        .gte('scanned_at', weekAgo);

      // Recent scans
      const { data: recentScans } = await supabase
        .from('qr_scans')
        .select('*')
        .eq('qr_id', qrId)
        .order('scanned_at', { ascending: false })
        .limit(10);

      // Top countries
      const { data: countryData } = await supabase
        .from('qr_scans')
        .select('country')
        .eq('qr_id', qrId)
        .not('country', 'is', null);

      const countryCounts: Record<string, number> = {};
      countryData?.forEach((scan) => {
        if (scan.country) {
          countryCounts[scan.country] = (countryCounts[scan.country] || 0) + 1;
        }
      });
      const topCountries = Object.entries(countryCounts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Device breakdown
      const { data: deviceData } = await supabase
        .from('qr_scans')
        .select('device_type')
        .eq('qr_id', qrId)
        .not('device_type', 'is', null);

      const deviceCounts: Record<string, number> = {};
      deviceData?.forEach((scan) => {
        if (scan.device_type) {
          deviceCounts[scan.device_type] = (deviceCounts[scan.device_type] || 0) + 1;
        }
      });
      const deviceBreakdown = Object.entries(deviceCounts)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count);

      setAnalytics({
        totalScans: totalScans || 0,
        todayScans: todayScans || 0,
        weekScans: weekScans || 0,
        topCountries,
        deviceBreakdown,
        recentScans: recentScans || [],
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, [user]);

  useEffect(() => {
    if (selectedQR) {
      fetchAnalytics(selectedQR.id);
    }
  }, [selectedQR]);

  const handleDelete = async (qr: DynamicQRCode) => {
    if (!confirm(`Delete "${qr.title}"? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('dynamic_qr_codes')
        .delete()
        .eq('id', qr.id);

      if (error) throw error;
      fetchQRCodes();
      if (selectedQR?.id === qr.id) {
        setSelectedQR(null);
        setAnalytics(null);
      }
    } catch (err) {
      console.error('Error deleting QR:', err);
      alert('Failed to delete QR code');
    }
  };

  const handleToggleActive = async (qr: DynamicQRCode) => {
    try {
      const { error } = await supabase
        .from('dynamic_qr_codes')
        .update({ is_active: !qr.is_active })
        .eq('id', qr.id);

      if (error) throw error;
      fetchQRCodes();
    } catch (err) {
      console.error('Error toggling QR:', err);
    }
  };

  const copyToClipboard = async (qr: DynamicQRCode) => {
    const url = `${baseUrl}/r/${qr.short_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(qr.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode className="text-indigo-600" size={28} />
            <h1 className="text-xl font-bold text-gray-900">Dynamic QR Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Your QR Codes</h2>
                <button
                  onClick={() => {
                    setEditingQR(null);
                    setIsFormOpen(true);
                  }}
                  className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
              ) : qrCodes.length === 0 ? (
                <div className="text-center py-12">
                  <QrCode className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500 mb-4">No Dynamic QR codes yet</p>
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="text-indigo-600 font-medium hover:underline"
                  >
                    Create your first one
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {qrCodes.map((qr) => (
                    <div
                      key={qr.id}
                      onClick={() => setSelectedQR(qr)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedQR?.id === qr.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{qr.title}</h3>
                          <p className="text-xs text-gray-500 truncate">{qr.destination_url}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            qr.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {qr.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(qr);
                          }}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title="Copy URL"
                        >
                          {copiedId === qr.id ? (
                            <Check size={16} className="text-green-600" />
                          ) : (
                            <Copy size={16} className="text-gray-500" />
                          )}
                        </button>
                        <a
                          href={`${baseUrl}/r/${qr.short_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title="Open URL"
                        >
                          <ExternalLink size={16} className="text-gray-500" />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingQR(qr);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-gray-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(qr);
                          }}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title={qr.is_active ? 'Pause' : 'Activate'}
                        >
                          {qr.is_active ? (
                            <PowerOff size={16} className="text-gray-500" />
                          ) : (
                            <Power size={16} className="text-green-600" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(qr);
                          }}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Analytics */}
          <div className="lg:col-span-2">
            {selectedQR ? (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-100 rounded-xl">
                        <Eye className="text-indigo-600" size={20} />
                      </div>
                      <span className="text-sm text-gray-500">Total Scans</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.totalScans || 0}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 rounded-xl">
                        <TrendingUp className="text-green-600" size={20} />
                      </div>
                      <span className="text-sm text-gray-500">Today</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.todayScans || 0}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 rounded-xl">
                        <Calendar className="text-purple-600" size={20} />
                      </div>
                      <span className="text-sm text-gray-500">This Week</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.weekScans || 0}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Device Breakdown */}
                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Smartphone size={18} />
                      Devices
                    </h3>
                    {analyticsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-gray-400" size={24} />
                      </div>
                    ) : analytics?.deviceBreakdown.length ? (
                      <div className="space-y-3">
                        {analytics.deviceBreakdown.map((item) => (
                          <div key={item.device} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {item.device.toLowerCase().includes('mobile') ? (
                                <Smartphone size={16} className="text-gray-400" />
                              ) : (
                                <Monitor size={16} className="text-gray-400" />
                              )}
                              <span className="text-sm text-gray-700">{item.device}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
                    )}
                  </div>

                  {/* Top Countries */}
                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Globe size={18} />
                      Top Countries
                    </h3>
                    {analyticsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-gray-400" size={24} />
                      </div>
                    ) : analytics?.topCountries.length ? (
                      <div className="space-y-3">
                        {analytics.topCountries.map((item) => (
                          <div key={item.country} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">{item.country}</span>
                            <span className="text-sm font-medium text-gray-900">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
                    )}
                  </div>
                </div>

                {/* Recent Scans */}
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users size={18} />
                    Recent Scans
                  </h3>
                  {analyticsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-gray-400" size={24} />
                    </div>
                  ) : analytics?.recentScans.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b">
                            <th className="pb-2 font-medium">Time</th>
                            <th className="pb-2 font-medium">Location</th>
                            <th className="pb-2 font-medium">Device</th>
                            <th className="pb-2 font-medium">Browser</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {analytics.recentScans.map((scan) => (
                            <tr key={scan.id} className="text-gray-700">
                              <td className="py-2">
                                <div>{formatDate(scan.scanned_at)}</div>
                                <div className="text-xs text-gray-400">{formatTime(scan.scanned_at)}</div>
                              </td>
                              <td className="py-2">
                                {scan.city && scan.country
                                  ? `${scan.city}, ${scan.country}`
                                  : scan.country || 'Unknown'}
                              </td>
                              <td className="py-2">{scan.device_type || 'Unknown'}</td>
                              <td className="py-2">{scan.browser || 'Unknown'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-8">
                      No scans yet. Share your QR code to start tracking!
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <BarChart3 className="mx-auto text-gray-300 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a QR Code</h3>
                <p className="text-gray-500">
                  Click on a QR code from the list to view its analytics
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <DynamicQRForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingQR(null);
        }}
        onSuccess={fetchQRCodes}
        editingQR={editingQR}
      />
    </div>
  );
}
