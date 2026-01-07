import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Copy, Check, ExternalLink, ChevronDown, ChevronUp, Link2, AlertCircle, CheckCircle, Lock, FileText, Video, Music, Image, Utensils, Tag, FileType } from 'lucide-react';
import { supabase, generateShortCode, DynamicQRCode } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { QRContentData, QRStyleConfig, QRType } from '../../types';
import { QRStylePanel } from '../QRStylePanel';
import { CustomSVGRenderer } from '../../services/customSvgRenderer';

// Landing page content types - these QR codes have locked destination URLs
// Users can update files but not change the destination URL
const LANDING_PAGE_TYPES: QRType[] = ['pdf', 'menu', 'audio', 'video', 'images', 'document', 'coupon', 'text'];

// Helper to check if content type is a landing page type
const isLandingPageType = (type: QRType): boolean => LANDING_PAGE_TYPES.includes(type);

// Helper to get friendly name and icon for content type
const getContentTypeInfo = (contentType: QRType): { name: string; icon: React.ReactNode; color: string } => {
  const types: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
    'pdf': { name: 'PDF Document', icon: <FileText size={16} />, color: 'text-red-600 bg-red-50' },
    'document': { name: 'Document', icon: <FileType size={16} />, color: 'text-blue-600 bg-blue-50' },
    'video': { name: 'Video', icon: <Video size={16} />, color: 'text-purple-600 bg-purple-50' },
    'audio': { name: 'Audio', icon: <Music size={16} />, color: 'text-green-600 bg-green-50' },
    'images': { name: 'Image Gallery', icon: <Image size={16} />, color: 'text-pink-600 bg-pink-50' },
    'menu': { name: 'Restaurant Menu', icon: <Utensils size={16} />, color: 'text-amber-600 bg-amber-50' },
    'coupon': { name: 'Coupon/Discount', icon: <Tag size={16} />, color: 'text-emerald-600 bg-emerald-50' },
    'text': { name: 'Text Content', icon: <FileText size={16} />, color: 'text-gray-600 bg-gray-50' },
  };
  return types[contentType] || { name: 'Content', icon: <FileText size={16} />, color: 'text-gray-600 bg-gray-50' };
};

interface DynamicQRFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingQR?: DynamicQRCode | null;
}

const INITIAL_STYLE: QRStyleConfig = {
  size: 1000,
  padding: 20,
  errorCorrectionLevel: 'M',
  fgColor: '#000000',
  bgColor: '#ffffff',
  isGradient: false,
  gradientType: 'linear',
  fgColor2: '#2563eb',
  gradientRotation: 45,
  bgTransparent: false,
  customCornerColor: false,
  cornerSquareColor: '#000000',
  cornerDotColor: '#000000',
  dotsType: 'square',
  cornerSquareType: 'square',
  cornerDotType: 'square',
  frameType: 'none',
  logoImage: null,
  logoSize: 0.25,
  logoPadding: 0,
  logoUseCustomColors: false,
  logoForegroundColor: '#000000',
  logoBackgroundColor: '#ffffff',
  logoShape: 'auto',
};

const INITIAL_CONTENT: QRContentData = {
  type: 'url',
  value: '',
  url: '',
};

export function DynamicQRForm({ isOpen, onClose, onSuccess, editingQR }: DynamicQRFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [contentData, setContentData] = useState<QRContentData>(INITIAL_CONTENT);
  const [styleConfig, setStyleConfig] = useState<QRStyleConfig>(INITIAL_STYLE);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdQR, setCreatedQR] = useState<DynamicQRCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [showStyling, setShowStyling] = useState(false);

  // Custom Short URL state
  const [customAlias, setCustomAlias] = useState('');
  const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const aliasCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Validate alias format
  const isValidAlias = (alias: string): boolean => {
    // Allow only letters, numbers, hyphens, underscores. 3-30 chars
    return /^[a-zA-Z0-9_-]{3,30}$/.test(alias);
  };

  // Check if alias is available
  const checkAliasAvailability = async (alias: string) => {
    if (!alias) {
      setAliasStatus('idle');
      return;
    }

    if (!isValidAlias(alias)) {
      setAliasStatus('invalid');
      return;
    }

    setAliasStatus('checking');

    try {
      const { data, error } = await supabase
        .from('dynamic_qr_codes')
        .select('id')
        .eq('short_code', alias)
        .maybeSingle();

      if (error) {
        console.error('Error checking alias:', error);
        setAliasStatus('idle');
        return;
      }

      setAliasStatus(data ? 'taken' : 'available');
    } catch (err) {
      console.error('Error checking alias:', err);
      setAliasStatus('idle');
    }
  };

  // Debounced alias check
  useEffect(() => {
    if (aliasCheckTimeout.current) {
      clearTimeout(aliasCheckTimeout.current);
    }

    if (customAlias) {
      aliasCheckTimeout.current = setTimeout(() => {
        checkAliasAvailability(customAlias);
      }, 500);
    } else {
      setAliasStatus('idle');
    }

    return () => {
      if (aliasCheckTimeout.current) {
        clearTimeout(aliasCheckTimeout.current);
      }
    };
  }, [customAlias]);

  // Reset form when opening/closing
  useEffect(() => {
    if (isOpen) {
      if (editingQR) {
        setTitle(editingQR.title);
        // Load saved style and contentData from qr_style
        const savedStyle = editingQR.qr_style as Record<string, unknown>;
        // Restore contentData from qr_style if available (important for PDF/doc types)
        if (savedStyle?.contentData) {
          setContentData(savedStyle.contentData as QRContentData);
        } else {
          // Fallback for old QR codes without saved contentData
          // Try to detect content type from destination_url pattern
          const destUrl = editingQR.destination_url || '';
          let contentObj: Partial<QRContentData> = { type: 'url', url: destUrl, value: destUrl };

          // Check if it looks like a file path (contains user ID pattern or file extensions)
          if (destUrl.includes('/temp/') || destUrl.includes('/qr_') ||
              destUrl.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i)) {
            contentObj = { type: 'document', document: { url: destUrl, title: editingQR.title } };
          } else if (destUrl.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
            contentObj = { type: 'audio', audio: { url: destUrl, title: editingQR.title } };
          } else if (destUrl.match(/\.(mp4|webm|mov|avi)$/i)) {
            contentObj = { type: 'video', video: { url: destUrl, title: editingQR.title } };
          } else if (destUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            contentObj = { type: 'images', images: { urls: [destUrl], filePaths: [destUrl], title: editingQR.title } };
          }

          setContentData(contentObj as QRContentData);
        }
        if (savedStyle?.styleConfig) {
          setStyleConfig(savedStyle.styleConfig as QRStyleConfig);
        }
        // Don't allow changing alias when editing
        setCustomAlias('');
      } else {
        setTitle('');
        setContentData(INITIAL_CONTENT);
        setStyleConfig(INITIAL_STYLE);
        setCustomAlias('');
      }
      setError(null);
      setCreatedQR(null);
      setAliasStatus('idle');
    }
  }, [editingQR, isOpen]);

  // Get destination URL - handles all content types
  const getPayload = () => {
    // For file-based content types, get URL from nested object
    const type = contentData.type;

    // Check nested content type objects first
    if (type === 'document' && contentData.document?.url) {
      return contentData.document.url;
    }
    if (type === 'pdf' && contentData.pdf?.url) {
      return contentData.pdf.url;
    }
    if (type === 'video' && contentData.video?.url) {
      return contentData.video.url;
    }
    if (type === 'audio' && contentData.audio?.url) {
      return contentData.audio.url;
    }
    if (type === 'images' && contentData.images) {
      const paths = contentData.images.filePaths || contentData.images.urls;
      return paths?.[0] || '';
    }
    if (type === 'menu' && contentData.menu?.url) {
      return contentData.menu.url;
    }
    if (type === 'coupon' && contentData.coupon?.code) {
      return contentData.coupon.code;
    }
    if (type === 'text') {
      return contentData.value || 'text-content';
    }

    // Fallback for URL types and legacy content
    return contentData.url || contentData.value || '';
  };

  // Update QR preview
  useEffect(() => {
    if (previewRef.current && isOpen) {
      try {
        // If QR is created, show the SHORT URL in preview (this is what users will scan)
        if (createdQR) {
          const shortUrl = `${baseUrl}/r/${createdQR.short_code}`;
          const previewStyle = { ...styleConfig, size: 200, padding: 10 };
          const renderer = new CustomSVGRenderer(previewStyle);
          const svgString = renderer.render(shortUrl);
          previewRef.current.innerHTML = svgString;
        } else {
          // During creation, show preview of content (just for reference)
          const payload = getPayload();
          if (payload) {
            const previewStyle = { ...styleConfig, size: 200, padding: 10 };
            const renderer = new CustomSVGRenderer(previewStyle);
            const svgString = renderer.render(payload);
            previewRef.current.innerHTML = svgString;
          } else {
            previewRef.current.innerHTML = '<div class="text-gray-400 text-sm text-center p-8">Enter content to preview QR</div>';
          }
        }
      } catch (err) {
        console.error('Preview error:', err);
        previewRef.current.innerHTML = '<div class="text-red-400 text-sm text-center p-8">Preview error</div>';
      }
    }
  }, [contentData, styleConfig, isOpen, createdQR]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    try {
      // Validate content
      const payload = getPayload();

      // When editing, use existing destination_url if no new payload provided
      const finalDestinationUrl = payload || (editingQR?.destination_url || '');

      // Only require destination URL for new QR codes, not for edits
      if (!finalDestinationUrl || finalDestinationUrl.length < 1) {
        setError('Please enter valid content for the QR code');
        setLoading(false);
        return;
      }

      if (!title.trim()) {
        setError('Please enter a title for your QR code');
        setLoading(false);
        return;
      }

      // Prepare QR style data to save (for styling only, not encryption)
      // Dynamic QR uses backend password protection via Supabase, not client-side encryption
      const qrStyleData = {
        styleConfig,
        contentData,
      };

      if (editingQR) {
        // Update existing QR
        // Only update destination_url if user provided new content
        const updateData: Record<string, unknown> = {
          title: title.trim(),
          qr_style: qrStyleData,
        };

        // Only update destination_url if new payload is provided
        if (payload && payload.length > 0) {
          updateData.destination_url = payload;
        }

        const { error: updateError } = await supabase
          .from('dynamic_qr_codes')
          .update(updateData)
          .eq('id', editingQR.id);

        if (updateError) throw updateError;
        onSuccess();
        onClose();
      } else {
        // Use custom alias if provided and valid, otherwise generate
        let shortCode = customAlias && aliasStatus === 'available'
          ? customAlias
          : generateShortCode();

        let attempts = 0;
        const maxAttempts = customAlias ? 1 : 5; // Only 1 attempt if using custom alias

        // Determine QR category - landing_page types have locked destination URLs
        const qrCategory = isLandingPageType(contentData.type) ? 'landing_page' : 'url';

        while (attempts < maxAttempts) {
          const { data, error: insertError } = await supabase
            .from('dynamic_qr_codes')
            .insert({
              user_id: user.id,
              short_code: shortCode,
              title: title.trim(),
              destination_url: payload,
              qr_style: qrStyleData,
              qr_category: qrCategory, // 'landing_page' or 'url'
            })
            .select()
            .single();

          if (insertError) {
            if (insertError.code === '23505') {
              if (customAlias) {
                // Custom alias was taken (race condition)
                throw new Error('This custom URL is no longer available. Please choose another.');
              }
              shortCode = generateShortCode();
              attempts++;
              continue;
            }
            throw insertError;
          }

          setCreatedQR(data);
          onSuccess();
          break;
        }

        if (attempts >= maxAttempts && !customAlias) {
          throw new Error('Failed to generate unique short code. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error saving QR:', err);
      setError(err instanceof Error ? err.message : 'Failed to save QR code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shortUrl = createdQR ? `${baseUrl}/r/${createdQR.short_code}` : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full my-4 relative max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            {createdQR ? 'QR Code Created!' : editingQR ? 'Edit Dynamic QR' : 'Create Dynamic QR'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        {createdQR ? (
          // Success view - show QR with SHORT URL encoded
          <div className="p-6 text-center overflow-y-auto">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Dynamic QR Created Successfully!
            </h3>
            <p className="text-gray-500 mb-4">
              This QR encodes your short URL. You can change the destination anytime!
            </p>

            {/* QR Code Preview - encodes SHORT URL */}
            <div className="flex justify-center mb-4">
              <div
                ref={previewRef}
                className="bg-white p-3 rounded-xl border-2 border-gray-200"
              />
            </div>

            {/* Short URL display */}
            <div className="bg-gray-100 rounded-xl p-4 mb-4 max-w-md mx-auto">
              <p className="text-sm text-gray-500 mb-1">Short URL (encoded in QR)</p>
              <div className="flex items-center gap-2 justify-center">
                <code className="text-indigo-600 font-medium text-sm break-all">
                  {shortUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(shortUrl)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy URL"
                >
                  {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Open URL"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Currently redirects to: {createdQR.destination_url}
            </p>

            <button
              onClick={onClose}
              className="bg-indigo-600 text-white py-3 px-8 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          // Form view - Simplified for Dynamic QR (URL-focused)
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <div className="p-4 space-y-4">
                {/* Info Banner */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                  <p className="text-sm text-indigo-700">
                    <strong>Dynamic QR</strong> = QR code that can be updated anytime.
                    Perfect for URLs, PDFs, videos, or any link that might change.
                  </p>
                </div>

                {/* Title Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    QR Code Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                    placeholder="e.g., Product Brochure, Menu, Event Info"
                    required
                    maxLength={255}
                  />
                </div>

                {/* Custom Short URL (only for new QR) */}
                {!editingQR && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="w-4 h-4 text-indigo-600" />
                      <label className="text-sm font-medium text-gray-700">
                        Custom Short URL <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm whitespace-nowrap">{baseUrl}/r/</span>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={customAlias}
                          onChange={(e) => setCustomAlias(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                          className={`w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-sm ${
                            aliasStatus === 'available' ? 'border-green-500' :
                            aliasStatus === 'taken' || aliasStatus === 'invalid' ? 'border-red-500' :
                            'border-gray-200 focus:border-indigo-500'
                          }`}
                          placeholder="my-brand"
                          maxLength={30}
                        />
                        {/* Status indicator */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {aliasStatus === 'checking' && (
                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          )}
                          {aliasStatus === 'available' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {(aliasStatus === 'taken' || aliasStatus === 'invalid') && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Status message */}
                    <div className="mt-2 text-xs">
                      {aliasStatus === 'idle' && !customAlias && (
                        <span className="text-gray-500">Leave empty for auto-generated code, or create your branded URL</span>
                      )}
                      {aliasStatus === 'checking' && (
                        <span className="text-gray-500">Checking availability...</span>
                      )}
                      {aliasStatus === 'available' && (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> This URL is available!
                        </span>
                      )}
                      {aliasStatus === 'taken' && (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> This URL is already taken
                        </span>
                      )}
                      {aliasStatus === 'invalid' && (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Use 3-30 characters: letters, numbers, hyphens, underscores
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left: URL Input */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Destination URL - Locked for landing_page QRs */}
                    {editingQR?.qr_category === 'landing_page' ? (
                      // LOCKED - Landing page QR codes cannot change destination URL
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`p-2 rounded-lg ${getContentTypeInfo(contentData.type).color}`}>
                            {getContentTypeInfo(contentData.type).icon}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800">
                              {getContentTypeInfo(contentData.type).name}
                            </h4>
                            <p className="text-xs text-gray-500">Landing Page QR</p>
                          </div>
                          <div className="ml-auto flex items-center gap-1 text-amber-700 bg-amber-100 px-3 py-1 rounded-full text-xs font-medium">
                            <Lock size={12} />
                            <span>URL Locked</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-100/50 rounded-lg p-3">
                          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium mb-1">Destination URL is locked</p>
                            <p className="text-amber-700">
                              Landing page QR codes ka destination URL change nahi ho sakta.
                              Aap files/content update kar sakte hain, title aur styling change kar sakte hain.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // EDITABLE - Regular URL QR codes or new QR creation
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Destination URL {!editingQR && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="url"
                          value={contentData.url || ''}
                          onChange={(e) => setContentData({ ...contentData, type: 'url', url: e.target.value, value: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                          placeholder={editingQR ? "Leave empty to keep current URL" : "https://example.com/my-page"}
                          required={!editingQR}
                        />
                        <p className="text-xs text-gray-400 mt-2">
                          {editingQR
                            ? "Leave empty to keep the current URL, or enter a new URL to update it."
                            : "This URL can be changed anytime from the dashboard after QR is created."
                          }
                        </p>
                      </div>
                    )}

                    {/* Use Cases - Only show for new QR */}
                    {!editingQR && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Common Use Cases
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white p-2 rounded-lg text-gray-600">📄 PDF Documents</div>
                          <div className="bg-white p-2 rounded-lg text-gray-600">🎥 Video Links</div>
                          <div className="bg-white p-2 rounded-lg text-gray-600">🍽️ Restaurant Menus</div>
                          <div className="bg-white p-2 rounded-lg text-gray-600">📱 App Download Links</div>
                          <div className="bg-white p-2 rounded-lg text-gray-600">🎫 Event Pages</div>
                          <div className="bg-white p-2 rounded-lg text-gray-600">🛒 Product Pages</div>
                        </div>
                      </div>
                    )}

                    {/* Styling Section (Collapsible) */}
                    <div className="bg-gray-50 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowStyling(!showStyling)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          QR Code Styling
                        </span>
                        {showStyling ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      {showStyling && (
                        <div className="px-4 pb-4">
                          <QRStylePanel config={styleConfig} onChange={setStyleConfig} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Preview */}
                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-xl p-4 sticky top-0">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Live Preview
                      </label>
                      <div className="flex justify-center">
                        <div
                          ref={previewRef}
                          className="bg-white p-2 rounded-xl border-2 border-gray-200 min-h-[200px] min-w-[200px] flex items-center justify-center"
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-3">
                        This QR will be trackable with analytics
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="animate-spin" size={20} />}
                    {editingQR ? 'Update QR' : 'Create Dynamic QR'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
