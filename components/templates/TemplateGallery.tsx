/**
 * TemplateGallery - Browse and apply QR code design templates
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Check,
  Trash2,
  Globe,
  Lock,
  Sparkles,
  Palette,
  Briefcase,
  Zap,
  Heart,
  MoreVertical,
  Copy,
  Edit3,
  Grid,
  User,
  Search,
} from 'lucide-react';
import { QRStyleConfig } from '../../types';
import {
  QRTemplate,
  PresetTemplate,
  getUserTemplates,
  getPresetTemplates,
  deleteTemplate,
  duplicateTemplate,
  updateTemplate,
  PresetCategory,
  TemplateCategory,
} from '../../services/templateService';
import { useAuth } from '../../lib/AuthContext';
import { CustomSVGRenderer } from '../../services/customSvgRenderer';

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (styleConfig: QRStyleConfig) => void;
  currentStyle?: QRStyleConfig;
}

type TabType = 'presets' | 'my-templates';

const PRESET_CATEGORIES: { id: PresetCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <Grid size={16} /> },
  { id: 'minimal', label: 'Minimal', icon: <Zap size={16} /> },
  { id: 'colorful', label: 'Colorful', icon: <Palette size={16} /> },
  { id: 'business', label: 'Business', icon: <Briefcase size={16} /> },
  { id: 'creative', label: 'Creative', icon: <Sparkles size={16} /> },
];

export function TemplateGallery({ isOpen, onClose, onApply, currentStyle }: TemplateGalleryProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [presetTemplates, setPresetTemplates] = useState<PresetTemplate[]>([]);
  const [userTemplates, setUserTemplates] = useState<QRTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI states
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal states
  const [editingTemplate, setEditingTemplate] = useState<QRTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<TemplateCategory>('custom');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load templates
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, activeTab, user]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'presets') {
        const result = await getPresetTemplates();
        if (result.success && result.templates) {
          setPresetTemplates(result.templates);
        } else {
          setError(result.error || 'Failed to load templates');
        }
      } else if (user) {
        const result = await getUserTemplates(user.id);
        if (result.success && result.templates) {
          setUserTemplates(result.templates);
        } else {
          setError(result.error || 'Failed to load templates');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Filter templates
  const filteredPresets = presetTemplates.filter((t) => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredUserTemplates = userTemplates.filter((t) => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Handle apply template
  const handleApply = (styleConfig: QRStyleConfig) => {
    onApply(styleConfig);
    onClose();
  };

  // Handle delete
  const handleDelete = async (templateId: string) => {
    if (!user) return;

    setDeleting(true);
    try {
      const result = await deleteTemplate({ templateId, userId: user.id });
      if (result.success) {
        setUserTemplates((prev) => prev.filter((t) => t.id !== templateId));
        setDeleteConfirmId(null);
      } else {
        setError(result.error || 'Failed to delete template');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (templateId: string, name: string) => {
    if (!user) return;

    try {
      const result = await duplicateTemplate({
        templateId,
        userId: user.id,
        newName: `${name} (Copy)`,
      });
      if (result.success && result.template) {
        setUserTemplates((prev) => [result.template!, ...prev]);
        setMenuOpenId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate template');
    }
  };

  // Handle edit - open edit modal
  const handleEditOpen = (template: QRTemplate) => {
    setEditingTemplate(template);
    setEditName(template.name);
    setEditCategory(template.category as TemplateCategory);
    setEditIsPublic(template.is_public);
    setMenuOpenId(null);
  };

  // Handle save edit
  const handleEditSave = async () => {
    if (!user || !editingTemplate || !editName.trim()) return;

    setSaving(true);
    try {
      const result = await updateTemplate({
        templateId: editingTemplate.id,
        userId: user.id,
        name: editName.trim(),
        category: editCategory,
        isPublic: editIsPublic,
      });

      if (result.success && result.template) {
        setUserTemplates((prev) =>
          prev.map((t) => (t.id === editingTemplate.id ? result.template! : t))
        );
        setEditingTemplate(null);
      } else {
        setError(result.error || 'Failed to update template');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Template Gallery</h2>
              <p className="text-xs text-gray-500">Choose a design to apply</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Sparkles size={16} />
            Preset Templates
          </button>
          <button
            onClick={() => setActiveTab('my-templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'my-templates'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <User size={16} />
            My Templates
            {userTemplates.length > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                {userTemplates.length}
              </span>
            )}
          </button>

          {/* Search */}
          <div className="ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        {/* Category Filter (for presets) */}
        {activeTab === 'presets' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 overflow-x-auto">
            {PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <button
                onClick={loadTemplates}
                className="mt-2 text-indigo-600 hover:underline text-sm"
              >
                Try again
              </button>
            </div>
          ) : activeTab === 'presets' ? (
            // Preset Templates Grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredPresets.map((template) => (
                <TemplateCard
                  key={template.id}
                  name={template.name}
                  description={template.description}
                  category={template.category}
                  styleConfig={template.style_config}
                  previewImage={template.preview_image}
                  isSelected={selectedTemplate === template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  onApply={() => handleApply(template.style_config)}
                />
              ))}
              {filteredPresets.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No templates found
                </div>
              )}
            </div>
          ) : (
            // User Templates
            <>
              {!user ? (
                <div className="text-center py-12">
                  <Lock className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">Please login to view your saved templates</p>
                </div>
              ) : filteredUserTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500 mb-2">No saved templates yet</p>
                  <p className="text-gray-400 text-sm">
                    Create a QR design and click "Save as Template" to save it here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredUserTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      name={template.name}
                      description={template.description}
                      category={template.category}
                      styleConfig={template.style_config}
                      previewImage={template.preview_image}
                      isSelected={selectedTemplate === template.id}
                      isPublic={template.is_public}
                      useCount={template.use_count}
                      onClick={() => setSelectedTemplate(template.id)}
                      onApply={() => handleApply(template.style_config)}
                      showMenu
                      menuOpen={menuOpenId === template.id}
                      onMenuToggle={() =>
                        setMenuOpenId(menuOpenId === template.id ? null : template.id)
                      }
                      onEdit={() => handleEditOpen(template)}
                      onDelete={() => setDeleteConfirmId(template.id)}
                      onDuplicate={() => handleDuplicate(template.id, template.name)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Template?</h3>
              <p className="text-gray-500 text-sm mb-4">
                This action cannot be undone. The template will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={deleting}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Template Modal */}
        {editingTemplate && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Template</h3>

              {/* Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                  maxLength={100}
                />
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['custom', 'business', 'social', 'marketing', 'event'] as TemplateCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        editCategory === cat
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Public Toggle */}
              <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl mb-4">
                <div className="flex items-center gap-2">
                  {editIsPublic ? (
                    <Globe className="text-indigo-600" size={18} />
                  ) : (
                    <Lock className="text-gray-500" size={18} />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {editIsPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsPublic(!editIsPublic)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    editIsPublic ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      editIsPublic ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={saving || !editName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Template Card Component
interface TemplateCardProps {
  name: string;
  description: string | null;
  category: string;
  styleConfig: QRStyleConfig;
  previewImage: string | null;
  isSelected: boolean;
  isPublic?: boolean;
  useCount?: number;
  onClick: () => void;
  onApply: () => void;
  showMenu?: boolean;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

function TemplateCard({
  name,
  description,
  category,
  styleConfig,
  previewImage,
  isSelected,
  isPublic,
  useCount,
  onClick,
  onApply,
  showMenu,
  menuOpen,
  onMenuToggle,
  onEdit,
  onDelete,
  onDuplicate,
}: TemplateCardProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  // Generate preview if not available
  useEffect(() => {
    if (!previewImage && previewRef.current) {
      try {
        const previewStyle: QRStyleConfig = {
          ...styleConfig,
          size: 100,
          padding: 6,
          logoImage: null,
        };
        const renderer = new CustomSVGRenderer(previewStyle);
        const svgString = renderer.render('QR');
        previewRef.current.innerHTML = svgString;
      } catch (err) {
        console.error('Preview error:', err);
      }
    }
  }, [previewImage, styleConfig]);

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-indigo-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Preview */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
        {previewImage ? (
          <img src={previewImage} alt={name} className="w-full h-full object-contain" />
        ) : (
          <div ref={previewRef} className="w-full h-full flex items-center justify-center" />
        )}
      </div>

      {/* Info */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm truncate">{name}</h4>
            <p className="text-xs text-gray-500 capitalize">{category}</p>
          </div>

          {/* Menu Button */}
          {showMenu && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuToggle?.();
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <MoreVertical size={16} className="text-gray-400" />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-32 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate?.();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Public/Private indicator */}
        {isPublic !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {isPublic ? (
              <Globe size={12} className="text-green-500" />
            ) : (
              <Lock size={12} className="text-gray-400" />
            )}
            <span className="text-[10px] text-gray-400">
              {isPublic ? 'Public' : 'Private'}
            </span>
          </div>
        )}
      </div>

      {/* Apply Button (on hover/select) */}
      {isSelected && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply();
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-colors"
          >
            <Check size={18} />
            Apply Template
          </button>
        </div>
      )}
    </div>
  );
}
