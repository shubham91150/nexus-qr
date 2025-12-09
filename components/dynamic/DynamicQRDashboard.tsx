import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode, BarChart3, Edit2, Trash2, ExternalLink,
  Copy, Check, Power, PowerOff, Loader2, TrendingUp,
  Smartphone, Globe, Calendar, Users, Eye,
  Download, Settings, Timer, AlertTriangle, Files, Plus
} from 'lucide-react';
import { supabase, DynamicQRCode, QRScan, subscribeToScans, isQRExpired, generateShortCode } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { DynamicQRForm } from './DynamicQRForm';
import { QRSettingsPanel } from './QRSettingsPanel';
import { CustomSVGRenderer } from '../../services/customSvgRenderer';
import { QRStyleConfig } from '../../types';

interface AnalyticsData {
  totalScans: number;
  todayScans: number;
  weekScans: number;
  topCountries: { country: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  recentScans: QRScan[];
}

// Default style for Dynamic QR codes
const DEFAULT_QR_STYLE: QRStyleConfig = {
  size: 280,
  padding: 15,
  errorCorrectionLevel: 'M',
  fgColor: '#000000',
  bgColor: '#ffffff',
  isGradient: false,
  gradientType: 'linear',
  fgColor2: '#000000',
  gradientRotation: 0,
  bgTransparent: false,
  customCornerColor: false,
  cornerSquareColor: '#000000',
  cornerDotColor: '#000000',
  dotsType: 'square',
  cornerSquareType: 'square',
  cornerDotType: 'square',
  logoImage: null,
  logoSize: 0.25,
  logoPadding: 0,
  logoBackground: 'transparent',
};

// QR Code Preview Component - Dynamic QR should encode the SHORT URL, not the content
const QRCodePreview: React.FC<{
  qrCode: DynamicQRCode;
  title: string;
}> = ({ qrCode, title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Base URL for the short redirect
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Dynamic QR always encodes the SHORT URL, not the content directly
  // This allows content to be changed after QR is printed
  const getShortRedirectUrl = (): string => {
    return `${baseUrl}/r/${qrCode.short_code}`;
  };

  // Get the saved style or use default
  const getSavedStyle = (): QRStyleConfig => {
    const savedData = qrCode.qr_style as Record<string, unknown>;
    if (savedData?.styleConfig) {
      return { ...(savedData.styleConfig as QRStyleConfig), size: 280, padding: 15 };
    }
    return DEFAULT_QR_STYLE;
  };

  useEffect(() => {
    if (containerRef.current) {
      try {
        const style = getSavedStyle();
        // IMPORTANT: Encode short URL, not the destination content
        const shortUrl = getShortRedirectUrl();
        const renderer = new CustomSVGRenderer(style);
        const svgString = renderer.render(shortUrl);
        containerRef.current.innerHTML = svgString;
      } catch (err) {
        console.error('Error rendering QR:', err);
        containerRef.current.innerHTML = '<p class="text-red-500 text-sm">Error generating QR</p>';
      }
    }
  }, [qrCode]);

  const downloadQR = async (format: 'png' | 'svg') => {
    setDownloading(true);

    try {
      // Generate high-quality QR for download using saved style
      const savedData = qrCode.qr_style as Record<string, unknown>;
      const baseStyle = savedData?.styleConfig as QRStyleConfig || DEFAULT_QR_STYLE;

      // IMPORTANT: Download QR with short URL, not content
      const shortUrl = getShortRedirectUrl();

      // Use original saved size or default to 1024 for high quality
      const downloadSize = baseStyle.size || 1024;
      const downloadStyle = { ...baseStyle, size: downloadSize, padding: baseStyle.padding || 20 };

      const renderer = new CustomSVGRenderer(downloadStyle);
      const svgString = renderer.render(shortUrl);

      if (format === 'svg') {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}_QR.svg`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloading(false);
      } else {
        // PNG download
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        canvas.width = downloadSize;
        canvas.height = downloadSize;

        img.onload = () => {
          if (ctx) {
            // Use saved background color or white
            ctx.fillStyle = downloadStyle.bgTransparent ? 'transparent' : (downloadStyle.bgColor || '#ffffff');
            ctx.fillRect(0, 0, downloadSize, downloadSize);
            ctx.drawImage(img, 0, 0, downloadSize, downloadSize);

            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${title.replace(/\s+/g, '_')}_QR.png`;
                a.click();
                URL.revokeObjectURL(url);
              }
              setDownloading(false);
            }, 'image/png');
          }
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
      }
    } catch (err) {
      console.error('Download error:', err);
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <QrCode size={18} />
        QR Code
      </h3>

      {/* QR Code Display */}
      <div className="flex justify-center mb-4">
        <div
          ref={containerRef}
          className="bg-white p-2 rounded-xl border-2 border-gray-100"
        />
      </div>

      {/* Download Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => downloadQR('png')}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 px-4 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          PNG
        </button>
        <button
          onClick={() => downloadQR('svg')}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Download size={16} />
          SVG
        </button>
      </div>
    </div>
  );
};

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

  // New states for settings
  const [showSettings, setShowSettings] = useState(false);
  const [activeView, setActiveView] = useState<'analytics' | 'settings'>('analytics');

  // Clone and Bulk Generation states
  const [cloning, setCloning] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkPrefix, setBulkPrefix] = useState('QR');

  // Real-time scan count
  const [liveScansToday, setLiveScansToday] = useState(0);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Subscribe to real-time scan updates
  useEffect(() => {
    if (!selectedQR) return;

    const channel = subscribeToScans(selectedQR.id, (newScan) => {
      // Update live scan count
      setLiveScansToday(prev => prev + 1);

      // Update analytics with new scan
      setAnalytics(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          totalScans: prev.totalScans + 1,
          todayScans: prev.todayScans + 1,
          recentScans: [newScan, ...prev.recentScans.slice(0, 9)],
        };
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [selectedQR?.id]);

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

      // Auto-select first QR if none selected
      if (data && data.length > 0 && !selectedQR) {
        setSelectedQR(data[0]);
      }
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

  // Clone QR Code
  const handleClone = async (qr: DynamicQRCode) => {
    if (!user) return;
    setCloning(true);

    try {
      const newShortCode = generateShortCode();
      const clonedQR = {
        user_id: user.id,
        short_code: newShortCode,
        title: `${qr.title} (Copy)`,
        destination_url: qr.destination_url,
        qr_style: qr.qr_style,
        is_active: true,
        // Clone all advanced settings
        expires_at: null, // Reset expiry for clone
        expired_redirect_url: qr.expired_redirect_url,
        conditional_rules: qr.conditional_rules,
        ab_testing_enabled: qr.ab_testing_enabled,
        ab_variants: qr.ab_variants,
        multi_language_enabled: qr.multi_language_enabled,
        language_contents: qr.language_contents,
        default_language: qr.default_language,
        password_protection: qr.password_protection,
        geofence_settings: qr.geofence_settings,
        ip_restriction: qr.ip_restriction,
        utm_parameters: qr.utm_parameters,
      };

      const { data, error } = await supabase
        .from('dynamic_qr_codes')
        .insert(clonedQR)
        .select()
        .single();

      if (error) throw error;

      await fetchQRCodes();
      if (data) {
        setSelectedQR(data);
      }
      alert(`QR Code "${qr.title}" cloned successfully!`);
    } catch (err) {
      console.error('Error cloning QR:', err);
      alert('Failed to clone QR code');
    } finally {
      setCloning(false);
    }
  };

  // Bulk Generate QR Codes
  const handleBulkGenerate = async () => {
    if (!user || !bulkUrls.trim()) return;
    setBulkGenerating(true);

    try {
      const urls = bulkUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));

      if (urls.length === 0) {
        alert('Please enter at least one valid URL (starting with http:// or https://)');
        setBulkGenerating(false);
        return;
      }

      if (urls.length > 50) {
        alert('Maximum 50 URLs allowed at once');
        setBulkGenerating(false);
        return;
      }

      const qrCodesToInsert = urls.map((url, index) => ({
        user_id: user.id,
        short_code: generateShortCode(),
        title: `${bulkPrefix} ${index + 1}`,
        destination_url: url,
        qr_style: {},
        is_active: true,
      }));

      const { error } = await supabase
        .from('dynamic_qr_codes')
        .insert(qrCodesToInsert);

      if (error) throw error;

      await fetchQRCodes();
      setShowBulkModal(false);
      setBulkUrls('');
      setBulkPrefix('QR');
      alert(`Successfully created ${urls.length} QR codes!`);
    } catch (err) {
      console.error('Error bulk generating:', err);
      alert('Failed to generate QR codes');
    } finally {
      setBulkGenerating(false);
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

  const getShortUrl = (qr: DynamicQRCode) => `${baseUrl}/r/${qr.short_code}`;

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
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* QR List - Left Column */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Your QR Codes</h2>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1"
                  title="Bulk Generate"
                >
                  <Plus size={12} />
                  Bulk
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
              ) : qrCodes.length === 0 ? (
                <div className="text-center py-12">
                  <QrCode className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500 mb-2">No Dynamic QR codes yet</p>
                  <p className="text-xs text-gray-400">
                    Use the main generator with "Dynamic QR" enabled to create trackable QR codes
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {qrCodes.map((qr) => (
                    <div
                      key={qr.id}
                      onClick={() => setSelectedQR(qr)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        selectedQR?.id === qr.id
                          ? 'bg-indigo-50 border-2 border-indigo-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate text-sm">{qr.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                            qr.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {qr.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">/r/{qr.short_code}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Middle & Right */}
          <div className="lg:col-span-9">
            {selectedQR ? (
              <div className="space-y-6">
                {/* Expiry Warning */}
                {isQRExpired(selectedQR) && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
                    <AlertTriangle className="text-red-500" size={20} />
                    <div>
                      <p className="text-sm font-medium text-red-800">This QR code has expired</p>
                      <p className="text-xs text-red-600">
                        Expired on {new Date(selectedQR.expires_at!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Selected QR Info Bar */}
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">{selectedQR.title}</h2>
                        {selectedQR.expires_at && !isQRExpired(selectedQR) && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Timer size={10} />
                            Expires {new Date(selectedQR.expires_at).toLocaleDateString()}
                          </span>
                        )}
                        {selectedQR.ab_testing_enabled && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            A/B Test
                          </span>
                        )}
                        {selectedQR.multi_language_enabled && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Multi-lang
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        Redirects to: {selectedQR.destination_url}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => copyToClipboard(selectedQR)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copy URL"
                      >
                        {copiedId === selectedQR.id ? (
                          <Check size={18} className="text-green-600" />
                        ) : (
                          <Copy size={18} className="text-gray-500" />
                        )}
                      </button>
                      <a
                        href={getShortUrl(selectedQR)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Open URL"
                      >
                        <ExternalLink size={18} className="text-gray-500" />
                      </a>
                      <button
                        onClick={() => handleClone(selectedQR)}
                        disabled={cloning}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Clone QR Code"
                      >
                        {cloning ? (
                          <Loader2 size={18} className="text-gray-500 animate-spin" />
                        ) : (
                          <Files size={18} className="text-gray-500" />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveView(activeView === 'settings' ? 'analytics' : 'settings')}
                        className={`p-2 rounded-lg transition-colors ${
                          activeView === 'settings'
                            ? 'bg-indigo-100 text-indigo-600'
                            : 'hover:bg-gray-100 text-gray-500'
                        }`}
                        title="Settings"
                      >
                        <Settings size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingQR(selectedQR);
                          setIsFormOpen(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit QR Content"
                      >
                        <Edit2 size={18} className="text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(selectedQR)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title={selectedQR.is_active ? 'Pause' : 'Activate'}
                      >
                        {selectedQR.is_active ? (
                          <PowerOff size={18} className="text-orange-500" />
                        ) : (
                          <Power size={18} className="text-green-600" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(selectedQR)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* QR Code Preview */}
                  <div className="md:col-span-1">
                    <QRCodePreview
                      qrCode={selectedQR}
                      title={selectedQR.title}
                    />
                  </div>

                  {/* Stats or Settings based on activeView */}
                  <div className="md:col-span-2 space-y-4">
                    {activeView === 'settings' ? (
                      /* Settings Panel */
                      <QRSettingsPanel qrCode={selectedQR} onUpdate={fetchQRCodes} />
                    ) : (
                      /* Analytics View */
                      <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white rounded-2xl shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-2 bg-indigo-100 rounded-xl">
                                <Eye className="text-indigo-600" size={18} />
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                              {analyticsLoading ? '...' : analytics?.totalScans || 0}
                            </p>
                            <p className="text-xs text-gray-500">Total Scans</p>
                          </div>

                          <div className="bg-white rounded-2xl shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-2 bg-green-100 rounded-xl">
                                <TrendingUp className="text-green-600" size={18} />
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                              {analyticsLoading ? '...' : analytics?.todayScans || 0}
                            </p>
                            <p className="text-xs text-gray-500">Today</p>
                          </div>

                          <div className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-purple-100 rounded-xl">
                            <Calendar className="text-purple-600" size={18} />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                          {analyticsLoading ? '...' : analytics?.weekScans || 0}
                        </p>
                        <p className="text-xs text-gray-500">This Week</p>
                      </div>
                    </div>

                    {/* Device & Country */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Device Breakdown */}
                      <div className="bg-white rounded-2xl shadow-sm p-4">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                          <Smartphone size={16} />
                          Devices
                        </h3>
                        {analyticsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="animate-spin text-gray-400" size={20} />
                          </div>
                        ) : analytics?.deviceBreakdown.length ? (
                          <div className="space-y-2">
                            {analytics.deviceBreakdown.map((item) => (
                              <div key={item.device} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{item.device}</span>
                                <span className="font-medium text-gray-900">{item.count}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-xs text-center py-4">No data yet</p>
                        )}
                      </div>

                      {/* Top Countries */}
                      <div className="bg-white rounded-2xl shadow-sm p-4">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                          <Globe size={16} />
                          Countries
                        </h3>
                        {analyticsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="animate-spin text-gray-400" size={20} />
                          </div>
                        ) : analytics?.topCountries.length ? (
                          <div className="space-y-2">
                            {analytics.topCountries.slice(0, 4).map((item) => (
                              <div key={item.country} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{item.country}</span>
                                <span className="font-medium text-gray-900">{item.count}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-xs text-center py-4">No data yet</p>
                        )}
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Recent Scans - only show in analytics view */}
                {activeView === 'analytics' && (
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
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <QrCode className="mx-auto text-gray-300 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {qrCodes.length === 0 ? 'No Dynamic QR Codes Yet' : 'Select a QR Code'}
                </h3>
                <p className="text-gray-500 mb-2">
                  {qrCodes.length === 0
                    ? 'Dynamic QR codes let you change the destination URL anytime and track scans'
                    : 'Click on a QR code from the list to view its details and analytics'}
                </p>
                {qrCodes.length === 0 && (
                  <p className="text-sm text-gray-400">
                    Go back to the main generator and enable "Dynamic QR" to create your first trackable QR code.
                  </p>
                )}
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

      {/* Bulk Generation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" />
                Bulk Generate QR Codes
              </h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Create multiple Dynamic QR codes at once. Enter one URL per line (max 50).
            </p>

            <div className="space-y-4">
              {/* Prefix Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title Prefix
                </label>
                <input
                  type="text"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  placeholder="QR"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  QR codes will be named: "{bulkPrefix} 1", "{bulkPrefix} 2", etc.
                </p>
              </div>

              {/* URLs Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URLs (one per line)
                </label>
                <textarea
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  placeholder={`https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3`}
                  rows={8}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-colors font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {bulkUrls.split('\n').filter(u => u.trim().startsWith('http')).length} valid URLs entered
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkGenerate}
                  disabled={bulkGenerating || !bulkUrls.trim()}
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {bulkGenerating && <Loader2 size={16} className="animate-spin" />}
                  {bulkGenerating ? 'Generating...' : 'Generate All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
