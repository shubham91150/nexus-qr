import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode, BarChart3, Edit2, Trash2, ExternalLink,
  Copy, Check, Power, PowerOff, Loader2, TrendingUp,
  Smartphone, Globe, Calendar, Users, Eye, MapPin,
  Download, Settings, Timer, AlertTriangle, Files, Plus, HelpCircle,
  FileSpreadsheet, FileDown, Folder, FolderPlus, X, ChevronRight
} from 'lucide-react';
import { supabase, DynamicQRCode, QRScan, QRFolder, subscribeToScans, isQRExpired, generateShortCode } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { DynamicQRForm } from './DynamicQRForm';
import { QRSettingsPanel } from './QRSettingsPanel';
import { ScanHeatmap } from './ScanHeatmap';
import { CustomSVGRenderer } from '../../services/customSvgRenderer';
import { QRStyleConfig } from '../../types';
import {
  TourController,
  dashboardTourSteps,
  hasCompletedDashboardOnboarding,
  completeDashboardOnboarding,
} from '../onboarding/OnboardingTour';

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

// Compact QR Code Preview Component for dashboard
const CompactQRPreview: React.FC<{
  qrCode: DynamicQRCode;
  title: string;
}> = ({ qrCode, title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const getShortRedirectUrl = (): string => `${baseUrl}/r/${qrCode.short_code}`;

  const getSavedStyle = (): QRStyleConfig => {
    const savedData = qrCode.qr_style as Record<string, unknown>;
    if (savedData?.styleConfig) {
      return { ...(savedData.styleConfig as QRStyleConfig), size: 160, padding: 10 };
    }
    return { ...DEFAULT_QR_STYLE, size: 160, padding: 10 };
  };

  useEffect(() => {
    if (containerRef.current) {
      try {
        const style = getSavedStyle();
        const shortUrl = getShortRedirectUrl();
        const renderer = new CustomSVGRenderer(style);
        const svgString = renderer.render(shortUrl);
        containerRef.current.innerHTML = svgString;
      } catch (err) {
        console.error('Error rendering QR:', err);
        containerRef.current.innerHTML = '<p class="text-red-500 text-xs">Error</p>';
      }
    }
  }, [qrCode]);

  const downloadQR = async (format: 'png' | 'svg') => {
    setDownloading(true);
    try {
      const savedData = qrCode.qr_style as Record<string, unknown>;
      const baseStyle = savedData?.styleConfig as QRStyleConfig || DEFAULT_QR_STYLE;
      const shortUrl = getShortRedirectUrl();
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
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        canvas.width = downloadSize;
        canvas.height = downloadSize;

        img.onload = () => {
          if (ctx) {
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
    <div className="flex flex-col items-center">
      {/* Main QR Code */}
      <div
        ref={containerRef}
        className="bg-white p-1 rounded-lg border border-gray-100 mb-3"
      />

      {/* Download Buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={() => downloadQR('png')}
          disabled={downloading}
          className="flex items-center gap-1 bg-indigo-600 text-white py-1.5 px-3 rounded-lg font-medium text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          PNG
        </button>
        <button
          onClick={() => downloadQR('svg')}
          disabled={downloading}
          className="flex items-center gap-1 bg-gray-100 text-gray-600 py-1.5 px-3 rounded-lg font-medium text-xs hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Download size={12} />
          SVG
        </button>
      </div>
    </div>
  );
};

interface DynamicQRDashboardProps {
  onBackToGenerator?: () => void;
}

export function DynamicQRDashboard({ onBackToGenerator }: DynamicQRDashboardProps) {
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

  // Export Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<'all' | '7d' | '30d' | '90d' | 'custom'>('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');

  // Real-time scan count
  const [liveScansToday, setLiveScansToday] = useState(0);

  // Dashboard Tour state - only show when user clicks help button
  const [showDashboardTour, setShowDashboardTour] = useState(false);

  // Folder Management states
  const [folders, setFolders] = useState<QRFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = All QR Codes
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<QRFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#6366f1');
  const [folderSaving, setFolderSaving] = useState(false);

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

  // Fetch folders
  const fetchFolders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('qr_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  };

  // Save folder (create or update)
  const handleSaveFolder = async () => {
    if (!user || !folderName.trim()) return;
    setFolderSaving(true);

    try {
      if (editingFolder) {
        // Update existing folder
        const { error } = await supabase
          .from('qr_folders')
          .update({ name: folderName.trim(), color: folderColor })
          .eq('id', editingFolder.id);

        if (error) throw error;
      } else {
        // Create new folder
        const { error } = await supabase
          .from('qr_folders')
          .insert({
            user_id: user.id,
            name: folderName.trim(),
            color: folderColor,
            icon: 'folder',
          });

        if (error) throw error;
      }

      await fetchFolders();
      setShowFolderModal(false);
      setFolderName('');
      setFolderColor('#6366f1');
      setEditingFolder(null);
    } catch (err) {
      console.error('Error saving folder:', err);
      alert('Failed to save folder');
    } finally {
      setFolderSaving(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder? QR codes inside will be moved to "All QR Codes".')) return;

    try {
      const { error } = await supabase
        .from('qr_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      await fetchFolders();
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
      }
    } catch (err) {
      console.error('Error deleting folder:', err);
      alert('Failed to delete folder');
    }
  };

  // Move QR to folder
  const handleMoveToFolder = async (qrId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('dynamic_qr_codes')
        .update({ folder_id: folderId })
        .eq('id', qrId);

      if (error) throw error;
      await fetchQRCodes();
    } catch (err) {
      console.error('Error moving QR to folder:', err);
    }
  };

  // Get filtered QR codes based on selected folder
  const filteredQRCodes = selectedFolder
    ? qrCodes.filter(qr => qr.folder_id === selectedFolder)
    : qrCodes;

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
    fetchFolders();
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

  // Export Analytics Data
  const handleExportAnalytics = async () => {
    if (!selectedQR) return;
    setExportLoading(true);

    try {
      // Calculate date range
      let startDate: Date | null = null;
      const endDate = new Date();

      switch (exportDateRange) {
        case '7d':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          if (exportStartDate) startDate = new Date(exportStartDate);
          break;
        default:
          startDate = null; // All time
      }

      // Build query
      let query = supabase
        .from('qr_scans')
        .select('*')
        .eq('qr_id', selectedQR.id)
        .order('scanned_at', { ascending: false });

      if (startDate) {
        query = query.gte('scanned_at', startDate.toISOString());
      }
      if (exportDateRange === 'custom' && exportEndDate) {
        query = query.lte('scanned_at', new Date(exportEndDate).toISOString());
      }

      const { data: scans, error } = await query;

      if (error) throw error;
      if (!scans || scans.length === 0) {
        alert('No scan data found for the selected date range.');
        setExportLoading(false);
        return;
      }

      // Prepare data for export
      const exportData = scans.map((scan, index) => ({
        '#': index + 1,
        'Date': new Date(scan.scanned_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        'Time': new Date(scan.scanned_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        'Country': scan.country || 'Unknown',
        'City': scan.city || 'Unknown',
        'Region': scan.region || 'Unknown',
        'Device': scan.device_type || 'Unknown',
        'Browser': scan.browser || 'Unknown',
        'OS': scan.os || 'Unknown',
        'Language': scan.language || 'Unknown',
        'Referrer': scan.referrer || 'Direct',
        'A/B Variant': scan.ab_variant_id || 'N/A',
        'Converted': scan.converted ? 'Yes' : 'No',
        'IP Address': scan.ip_address || 'N/A',
      }));

      if (exportFormat === 'csv') {
        // Generate CSV
        const headers = Object.keys(exportData[0]);
        const csvRows = [
          headers.join(','),
          ...exportData.map(row =>
            headers.map(header => {
              const value = String(row[header as keyof typeof row] || '');
              // Escape quotes and wrap in quotes if contains comma
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',')
          )
        ];
        const csvContent = csvRows.join('\n');

        // Add BOM for Excel UTF-8 compatibility
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedQR.title.replace(/\s+/g, '_')}_scans_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Generate Excel-compatible XML (SpreadsheetML)
        const headers = Object.keys(exportData[0]);
        const xmlRows = exportData.map(row =>
          `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${String(row[h as keyof typeof row] || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`).join('')}</Row>`
        ).join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
      <Font ss:Color="#FFFFFF"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Scan Data">
    <Table>
      <Row ss:StyleID="Header">${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
      ${xmlRows}
    </Table>
  </Worksheet>
</Workbook>`;

        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedQR.title.replace(/\s+/g, '_')}_scans_${new Date().toISOString().split('T')[0]}.xls`;
        link.click();
        URL.revokeObjectURL(url);
      }

      setShowExportModal(false);
      alert(`Successfully exported ${scans.length} scan records!`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
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
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToGenerator && (
              <button
                onClick={onBackToGenerator}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors mr-2"
              >
                <span className="text-lg">←</span>
              </button>
            )}
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <QrCode className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Dynamic QR Dashboard</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Manage your trackable QR codes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden md:block">{user?.email}</span>
            <button
              onClick={() => setShowDashboardTour(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-indigo-600"
              title="Dashboard Tour"
            >
              <HelpCircle size={18} />
            </button>
            <button
              onClick={signOut}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* QR List - Left Column */}
          <div className="lg:col-span-3" data-tour="qr-list">
            {/* Folders Section */}
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Folder size={16} className="text-indigo-600" />
                  Folders
                </h2>
                <button
                  onClick={() => {
                    setEditingFolder(null);
                    setFolderName('');
                    setFolderColor('#6366f1');
                    setShowFolderModal(true);
                  }}
                  className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1"
                  title="New Folder"
                >
                  <FolderPlus size={12} />
                  New
                </button>
              </div>

              <div className="space-y-1">
                {/* All QR Codes */}
                <button
                  onClick={() => setSelectedFolder(null)}
                  className={`w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    selectedFolder === null
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <QrCode size={14} />
                  All QR Codes
                  <span className="ml-auto text-xs text-gray-400">{qrCodes.length}</span>
                </button>

                {/* User Folders */}
                {folders.map((folder) => {
                  const folderQRCount = qrCodes.filter(qr => qr.folder_id === folder.id).length;
                  return (
                    <div
                      key={folder.id}
                      className={`group flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                        selectedFolder === folder.id
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedFolder(folder.id)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <Folder size={14} style={{ color: folder.color }} />
                        <span className="truncate">{folder.name}</span>
                        <span className="ml-auto text-xs text-gray-400">{folderQRCount}</span>
                      </button>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder(folder);
                            setFolderName(folder.name);
                            setFolderColor(folder.color);
                            setShowFolderModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Edit2 size={12} className="text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QR Codes List */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">
                  {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name || 'QR Codes' : 'All QR Codes'}
                </h2>
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
              ) : filteredQRCodes.length === 0 ? (
                <div className="text-center py-12">
                  <QrCode className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500 mb-2">
                    {selectedFolder ? 'No QR codes in this folder' : 'No Dynamic QR codes yet'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedFolder
                      ? 'Move QR codes here by clicking the folder icon on a QR card'
                      : 'Use the main generator with "Dynamic QR" enabled to create trackable QR codes'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                  {filteredQRCodes.map((qr) => (
                    <div
                      key={qr.id}
                      onClick={() => setSelectedQR(qr)}
                      className={`group p-3 rounded-xl cursor-pointer transition-all ${
                        selectedQR?.id === qr.id
                          ? 'bg-indigo-50 border-2 border-indigo-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate text-sm">{qr.title}</h3>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {/* Folder dropdown */}
                          {folders.length > 0 && (
                            <select
                              value={qr.folder_id || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleMoveToFolder(qr.id, e.target.value || null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="hidden group-hover:block text-xs bg-transparent border-none outline-none cursor-pointer text-gray-400 hover:text-gray-600"
                              title="Move to folder"
                            >
                              <option value="">No Folder</option>
                              {folders.map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              qr.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {qr.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
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
              <div className="space-y-4">
                {/* Expiry Warning - Only show if expired */}
                {isQRExpired(selectedQR) && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
                    <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
                    <div>
                      <p className="text-sm font-medium text-red-800">QR Code Expired</p>
                      <p className="text-xs text-red-600">Expired {new Date(selectedQR.expires_at!).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                {/* Unified Main Card - QR Info + Preview + Analytics */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Header with title and actions */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-bold text-gray-900">{selectedQR.title}</h2>
                          {selectedQR.is_active ? (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                          ) : (
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">Paused</span>
                          )}
                          {selectedQR.expires_at && !isQRExpired(selectedQR) && (
                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Timer size={10} />
                              {new Date(selectedQR.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">→ {selectedQR.destination_url}</p>
                      </div>
                      <div className="flex items-center gap-1" data-tour="qr-actions">
                        <button onClick={() => copyToClipboard(selectedQR)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Copy URL">
                          {copiedId === selectedQR.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-400" />}
                        </button>
                        <a href={getShortUrl(selectedQR)} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Open">
                          <ExternalLink size={16} className="text-gray-400" />
                        </a>
                        <button onClick={() => handleClone(selectedQR)} disabled={cloning} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50" title="Clone">
                          {cloning ? <Loader2 size={16} className="text-gray-400 animate-spin" /> : <Files size={16} className="text-gray-400" />}
                        </button>
                        <button
                          onClick={() => setShowExportModal(true)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Export Analytics"
                        >
                          <FileSpreadsheet size={16} className="text-gray-400" />
                        </button>
                        <button
                          onClick={() => setActiveView(activeView === 'settings' ? 'analytics' : 'settings')}
                          className={`p-2 rounded-lg transition-colors ${activeView === 'settings' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-400'}`}
                          title="Settings"
                        >
                          <Settings size={16} />
                        </button>
                        <button onClick={() => { setEditingQR(selectedQR); setIsFormOpen(true); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                          <Edit2 size={16} className="text-gray-400" />
                        </button>
                        <button onClick={() => handleToggleActive(selectedQR)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title={selectedQR.is_active ? 'Pause' : 'Activate'}>
                          {selectedQR.is_active ? <PowerOff size={16} className="text-orange-500" /> : <Power size={16} className="text-green-600" />}
                        </button>
                        <button onClick={() => handleDelete(selectedQR)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content: Settings or Analytics */}
                  {/* View Toggle Tabs */}
                  <div className="px-5 pt-4 border-b border-gray-100">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                      <button
                        onClick={() => setActiveView('analytics')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          activeView === 'analytics'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <BarChart3 size={16} />
                        Analytics
                      </button>
                      <button
                        onClick={() => setActiveView('settings')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          activeView === 'settings'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Settings size={16} />
                        Settings
                      </button>
                    </div>
                  </div>

                  {activeView === 'settings' ? (
                    <div className="p-5">
                      <QRSettingsPanel qrCode={selectedQR} onUpdate={fetchQRCodes} />
                    </div>
                  ) : (
                    <div className="p-5" data-tour="analytics">
                      {/* Unified layout: QR on left, Stats + Details on right */}
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Left: QR Preview */}
                        <div className="flex-shrink-0 flex justify-center md:justify-start">
                          <CompactQRPreview qrCode={selectedQR} title={selectedQR.title} />
                        </div>

                        {/* Right: Analytics Data */}
                        <div className="flex-1 min-w-0">
                          {/* Stats Row - Prominent */}
                          <div className="grid grid-cols-3 gap-4 mb-5">
                            <div className="text-center bg-indigo-50 rounded-xl p-3">
                              <p className="text-2xl font-bold text-indigo-600">
                                {analyticsLoading ? '...' : analytics?.totalScans || 0}
                              </p>
                              <p className="text-[11px] text-indigo-500 font-medium">Total Scans</p>
                            </div>
                            <div className="text-center bg-green-50 rounded-xl p-3">
                              <p className="text-2xl font-bold text-green-600">
                                {analyticsLoading ? '...' : analytics?.todayScans || 0}
                              </p>
                              <p className="text-[11px] text-green-500 font-medium">Today</p>
                            </div>
                            <div className="text-center bg-purple-50 rounded-xl p-3">
                              <p className="text-2xl font-bold text-purple-600">
                                {analyticsLoading ? '...' : analytics?.weekScans || 0}
                              </p>
                              <p className="text-[11px] text-purple-500 font-medium">This Week</p>
                            </div>
                          </div>

                          {/* Device & Country breakdown */}
                          <div className="grid grid-cols-2 gap-4" data-tour="device-stats">
                            <div className="bg-gray-50 rounded-xl p-3">
                              <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-1.5 text-xs">
                                <Smartphone size={12} />
                                Devices
                              </h3>
                              {analyticsLoading ? (
                                <Loader2 className="animate-spin text-gray-400 mx-auto" size={16} />
                              ) : analytics?.deviceBreakdown.length ? (
                                <div className="space-y-1">
                                  {analytics.deviceBreakdown.slice(0, 3).map((item) => (
                                    <div key={item.device} className="flex items-center justify-between text-xs">
                                      <span className="text-gray-500">{item.device}</span>
                                      <span className="font-semibold text-gray-800">{item.count}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-400 text-xs">No scans yet</p>
                              )}
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-1.5 text-xs">
                                <Globe size={12} />
                                Countries
                              </h3>
                              {analyticsLoading ? (
                                <Loader2 className="animate-spin text-gray-400 mx-auto" size={16} />
                              ) : analytics?.topCountries.length ? (
                                <div className="space-y-1">
                                  {analytics.topCountries.slice(0, 3).map((item) => (
                                    <div key={item.country} className="flex items-center justify-between text-xs">
                                      <span className="text-gray-500">{item.country}</span>
                                      <span className="font-semibold text-gray-800">{item.count}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-400 text-xs">No scans yet</p>
                              )}
                            </div>
                          </div>

                          {/* Recent Activity - Inline, compact */}
                          {analytics && analytics.recentScans.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-1.5 text-xs">
                                <Users size={12} />
                                Recent Activity
                              </h3>
                              <div className="space-y-1">
                                {analytics.recentScans.slice(0, 4).map((scan) => (
                                  <div key={scan.id} className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="text-gray-400 w-14 flex-shrink-0">{formatTime(scan.scanned_at)}</span>
                                    <span className="truncate">{scan.country || 'Unknown'} • {scan.device_type || 'Unknown'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scan Locations - Only show if location tracking is enabled */}
                      {selectedQR.location_tracking_config?.enabled ? (
                        <div className="mt-6">
                          <ScanHeatmap qrId={selectedQR.id} height="300px" />
                        </div>
                      ) : (
                        <div className="mt-6 bg-gray-50 rounded-xl p-4 text-center">
                          <MapPin size={24} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Location tracking disabled</p>
                          <p className="text-xs text-gray-400 mt-1">Enable in Settings → Tracking to see scan locations</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

      {/* Export Analytics Modal */}
      {showExportModal && selectedQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileDown size={20} className="text-indigo-600" />
                Export Scan Data
              </h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Export scan analytics for <strong>{selectedQR.title}</strong> as CSV or Excel file.
            </p>

            <div className="space-y-4">
              {/* Date Range Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: '7d', label: '7 Days' },
                    { value: '30d', label: '30 Days' },
                    { value: '90d', label: '90 Days' },
                    { value: 'custom', label: 'Custom' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setExportDateRange(option.value as typeof exportDateRange)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        exportDateRange === option.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Inputs */}
                {exportDateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End Date</label>
                      <input
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`py-3 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      exportFormat === 'csv'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FileSpreadsheet size={16} />
                    CSV
                  </button>
                  <button
                    onClick={() => setExportFormat('excel')}
                    className={`py-3 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      exportFormat === 'excel'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FileSpreadsheet size={16} />
                    Excel (.xls)
                  </button>
                </div>
              </div>

              {/* Export Info */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                <p className="font-medium text-gray-700 mb-1">Included Data:</p>
                <p>Date, Time, Country, City, Device, Browser, OS, Language, Referrer, A/B Variant, Conversion Status</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportAnalytics}
                  disabled={exportLoading}
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {exportLoading && <Loader2 size={16} className="animate-spin" />}
                  {exportLoading ? 'Exporting...' : 'Export Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Folder Create/Edit Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FolderPlus size={20} className="text-indigo-600" />
                {editingFolder ? 'Edit Folder' : 'New Folder'}
              </h2>
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setEditingFolder(null);
                  setFolderName('');
                  setFolderColor('#6366f1');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Folder Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g., Marketing Campaign"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-colors"
                  autoFocus
                />
              </div>

              {/* Folder Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#64748b'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setFolderColor(color)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        folderColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                <Folder size={18} style={{ color: folderColor }} />
                <span className="text-sm font-medium text-gray-700">
                  {folderName || 'Folder Preview'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowFolderModal(false);
                    setEditingFolder(null);
                    setFolderName('');
                    setFolderColor('#6366f1');
                  }}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFolder}
                  disabled={folderSaving || !folderName.trim()}
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {folderSaving && <Loader2 size={16} className="animate-spin" />}
                  {folderSaving ? 'Saving...' : editingFolder ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Tour */}
      <TourController
        isActive={showDashboardTour}
        onComplete={() => {
          setShowDashboardTour(false);
          completeDashboardOnboarding();
        }}
        steps={dashboardTourSteps}
        storageKey="nexus_qr_dashboard_onboarding_completed"
      />
    </div>
  );
}
