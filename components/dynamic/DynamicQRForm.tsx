import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase, generateShortCode, DynamicQRCode } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { QRContentData, QRStyleConfig } from '../../types';
import { QRStylePanel } from '../QRStylePanel';
import { CustomSVGRenderer } from '../../services/customSvgRenderer';

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
  logoBackground: 'transparent',
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

  const previewRef = useRef<HTMLDivElement>(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Reset form when opening/closing
  useEffect(() => {
    if (isOpen) {
      if (editingQR) {
        setTitle(editingQR.title);
        // Load saved URL from destination_url
        setContentData({
          type: 'url',
          url: editingQR.destination_url,
          value: editingQR.destination_url,
        });
        // Load saved style
        const savedStyle = editingQR.qr_style as Record<string, unknown>;
        if (savedStyle?.styleConfig) {
          setStyleConfig(savedStyle.styleConfig as QRStyleConfig);
        }
      } else {
        setTitle('');
        setContentData(INITIAL_CONTENT);
        setStyleConfig(INITIAL_STYLE);
      }
      setError(null);
      setCreatedQR(null);
    }
  }, [editingQR, isOpen]);

  // Get destination URL (simple - just return the URL)
  const getPayload = () => {
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
      if (!payload || payload.length < 1) {
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
        const { error: updateError } = await supabase
          .from('dynamic_qr_codes')
          .update({
            title: title.trim(),
            destination_url: payload, // Store payload as destination
            qr_style: qrStyleData,
          })
          .eq('id', editingQR.id);

        if (updateError) throw updateError;
        onSuccess();
        onClose();
      } else {
        // Create new QR with unique short code
        let shortCode = generateShortCode();
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
          const { data, error: insertError } = await supabase
            .from('dynamic_qr_codes')
            .insert({
              user_id: user.id,
              short_code: shortCode,
              title: title.trim(),
              destination_url: payload,
              qr_style: qrStyleData,
            })
            .select()
            .single();

          if (insertError) {
            if (insertError.code === '23505') {
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

        if (attempts >= maxAttempts) {
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left: URL Input */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Destination URL */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destination URL *
                      </label>
                      <input
                        type="url"
                        value={contentData.url || ''}
                        onChange={(e) => setContentData({ ...contentData, type: 'url', url: e.target.value, value: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                        placeholder="https://example.com/my-page"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-2">
                        This URL can be changed anytime from the dashboard after QR is created.
                      </p>
                    </div>

                    {/* Use Cases */}
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
