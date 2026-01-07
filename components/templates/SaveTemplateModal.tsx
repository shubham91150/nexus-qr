/**
 * SaveTemplateModal - Save current QR design as a reusable template
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Loader2, Check, Bookmark, Globe, Lock, Briefcase, Share2, Calendar, Palette } from 'lucide-react';
import { QRStyleConfig } from '../../types';
import { saveTemplate, generateTemplatePreview, TemplateCategory } from '../../services/templateService';
import { useAuth } from '../../lib/AuthContext';
import { CustomSVGRenderer } from '../../services/customSvgRenderer';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  styleConfig: QRStyleConfig;
  onSaved?: () => void;
}

const CATEGORIES: { id: TemplateCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'custom', label: 'Custom', icon: <Palette size={16} /> },
  { id: 'business', label: 'Business', icon: <Briefcase size={16} /> },
  { id: 'social', label: 'Social Media', icon: <Share2 size={16} /> },
  { id: 'marketing', label: 'Marketing', icon: <Globe size={16} /> },
  { id: 'event', label: 'Events', icon: <Calendar size={16} /> },
];

export function SaveTemplateModal({ isOpen, onClose, styleConfig, onSaved }: SaveTemplateModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('custom');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Generate preview on open
  useEffect(() => {
    if (isOpen && previewRef.current) {
      try {
        const previewStyle: QRStyleConfig = {
          ...styleConfig,
          size: 120,
          padding: 8,
          logoImage: null,
        };
        const renderer = new CustomSVGRenderer(previewStyle);
        const svgString = renderer.render('TEMPLATE');
        previewRef.current.innerHTML = svgString;
      } catch (err) {
        console.error('Preview error:', err);
      }
    }
  }, [isOpen, styleConfig]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setCategory('custom');
      setIsPublic(false);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Please login to save templates');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a template name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveTemplate({
        userId: user.id,
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        styleConfig,
        isPublic,
      });

      if (!result.success) {
        setError(result.error || 'Failed to save template');
        return;
      }

      setSuccess(true);

      // Close after showing success
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Bookmark className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Save as Template</h2>
              <p className="text-xs text-gray-500">Reuse this design anytime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        {success ? (
          // Success state
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Template Saved!</h3>
            <p className="text-gray-500 text-sm">
              Your design has been saved and can be reused anytime from the Template Gallery.
            </p>
          </div>
        ) : (
          // Form
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Preview */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div
                  ref={previewRef}
                  className="w-20 h-20 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Current Design</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {styleConfig.isGradient ? 'Gradient' : 'Solid'} {styleConfig.dotsType} pattern
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className="w-5 h-5 rounded border border-gray-200"
                      style={{ backgroundColor: styleConfig.fgColor }}
                    />
                    {styleConfig.isGradient && (
                      <div
                        className="w-5 h-5 rounded border border-gray-200"
                        style={{ backgroundColor: styleConfig.fgColor2 }}
                      />
                    )}
                    <div
                      className="w-5 h-5 rounded border border-gray-200"
                      style={{ backgroundColor: styleConfig.bgColor }}
                    />
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., My Brand Style"
                  className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                  maxLength={100}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about this template..."
                  className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none resize-none"
                  rows={2}
                  maxLength={500}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        category === cat.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {cat.icon}
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Public Toggle */}
              <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {isPublic ? (
                      <Globe className="text-indigo-600" size={20} />
                    ) : (
                      <Lock className="text-gray-500" size={20} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {isPublic ? 'Public Template' : 'Private Template'}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {isPublic
                        ? 'Others can discover and use'
                        : 'Only you can see and use'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                    isPublic ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      isPublic ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex flex-col items-center justify-center gap-1"
              >
                <X size={20} />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Save Template</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
