import React, { useState, useEffect } from 'react';
import { X, Link, Type, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import { supabase, generateShortCode, DynamicQRCode } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

interface DynamicQRFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingQR?: DynamicQRCode | null;
}

export function DynamicQRForm({ isOpen, onClose, onSuccess, editingQR }: DynamicQRFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdQR, setCreatedQR] = useState<DynamicQRCode | null>(null);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (editingQR) {
      setTitle(editingQR.title);
      setDestinationUrl(editingQR.destination_url);
    } else {
      setTitle('');
      setDestinationUrl('');
    }
    setError(null);
    setCreatedQR(null);
  }, [editingQR, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    try {
      // Validate URL
      let url = destinationUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      try {
        new URL(url);
      } catch {
        setError('Please enter a valid URL');
        setLoading(false);
        return;
      }

      if (editingQR) {
        // Update existing QR
        const { error: updateError } = await supabase
          .from('dynamic_qr_codes')
          .update({
            title: title.trim(),
            destination_url: url,
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
              destination_url: url,
            })
            .select()
            .single();

          if (insertError) {
            if (insertError.code === '23505') {
              // Duplicate short code, try again
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {createdQR ? (
          // Success view
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Dynamic QR Created!
            </h2>
            <p className="text-gray-500 mb-6">
              Your QR code is ready. Share this short URL:
            </p>

            {/* Short URL display */}
            <div className="bg-gray-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-500 mb-1">Short URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-indigo-600 font-medium text-sm break-all">
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

            <p className="text-sm text-gray-500 mb-6">
              Redirects to: <span className="text-gray-700">{createdQR.destination_url}</span>
            </p>

            <button
              onClick={onClose}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          // Form view
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {editingQR ? 'Edit Dynamic QR' : 'Create Dynamic QR'}
            </h2>
            <p className="text-gray-500 mb-6">
              {editingQR
                ? 'Update your QR code destination anytime'
                : 'Create a QR code with changeable destination & analytics'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                    placeholder="My Website QR"
                    required
                    maxLength={255}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination URL
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  You can change this URL anytime without changing the QR code
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={20} />}
                {editingQR ? 'Update QR Code' : 'Create Dynamic QR'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
