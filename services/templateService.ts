/**
 * Nexus QR - Template Service
 *
 * Handles all template-related operations including:
 * - Saving user templates
 * - Loading user and preset templates
 * - Updating and deleting templates
 * - Generating preview images
 */

import { supabase } from '../lib/supabase';
import { QRStyleConfig } from '../types';
import { CustomSVGRenderer } from './customSvgRenderer';

// Template interfaces
export interface QRTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  preview_image: string | null;
  style_config: QRStyleConfig;
  is_public: boolean;
  is_featured: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface PresetTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  preview_image: string | null;
  style_config: QRStyleConfig;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type TemplateCategory = 'custom' | 'business' | 'social' | 'marketing' | 'event';
export type PresetCategory = 'minimal' | 'colorful' | 'business' | 'creative';

// Generate a small preview image for the template
export function generateTemplatePreview(styleConfig: QRStyleConfig): string {
  try {
    // Create a small preview with sample content
    const previewStyle: QRStyleConfig = {
      ...styleConfig,
      size: 150, // Small preview size
      padding: 8,
      logoImage: null, // Don't include logo in preview
    };

    const renderer = new CustomSVGRenderer(previewStyle);
    const svgString = renderer.render('TEMPLATE');

    // Convert SVG to base64 data URL
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error('Error generating template preview:', error);
    return '';
  }
}

// Save a new template
export async function saveTemplate(params: {
  userId: string;
  name: string;
  description?: string;
  category?: TemplateCategory;
  styleConfig: QRStyleConfig;
  isPublic?: boolean;
}): Promise<{ success: boolean; template?: QRTemplate; error?: string }> {
  try {
    // Generate preview image
    const previewImage = generateTemplatePreview(params.styleConfig);

    // Remove logo from saved config if it's a base64 image (too large)
    const styleToSave = { ...params.styleConfig };
    if (styleToSave.logoImage && styleToSave.logoImage.length > 1000) {
      styleToSave.logoImage = null; // Don't save large logo data
    }

    const { data, error } = await supabase
      .from('qr_templates')
      .insert({
        user_id: params.userId,
        name: params.name,
        description: params.description || null,
        category: params.category || 'custom',
        preview_image: previewImage,
        style_config: styleToSave,
        is_public: params.isPublic || false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      template: {
        ...data,
        style_config: data.style_config as QRStyleConfig,
      } as QRTemplate,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Get user's templates
export async function getUserTemplates(userId: string): Promise<{
  success: boolean;
  templates?: QRTemplate[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('qr_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      templates: (data || []).map((t) => ({
        ...t,
        style_config: t.style_config as QRStyleConfig,
      })) as QRTemplate[],
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Get preset (system) templates
export async function getPresetTemplates(category?: PresetCategory): Promise<{
  success: boolean;
  templates?: PresetTemplate[];
  error?: string;
}> {
  try {
    let query = supabase
      .from('preset_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      templates: (data || []).map((t) => ({
        ...t,
        style_config: t.style_config as QRStyleConfig,
      })) as PresetTemplate[],
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Get public templates from other users
export async function getPublicTemplates(limit: number = 20): Promise<{
  success: boolean;
  templates?: QRTemplate[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('qr_templates')
      .select('*')
      .eq('is_public', true)
      .order('use_count', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      templates: (data || []).map((t) => ({
        ...t,
        style_config: t.style_config as QRStyleConfig,
      })) as QRTemplate[],
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Update a template
export async function updateTemplate(params: {
  templateId: string;
  userId: string;
  name?: string;
  description?: string;
  category?: TemplateCategory;
  styleConfig?: QRStyleConfig;
  isPublic?: boolean;
}): Promise<{ success: boolean; template?: QRTemplate; error?: string }> {
  try {
    const updates: Record<string, unknown> = {};

    if (params.name !== undefined) updates.name = params.name;
    if (params.description !== undefined) updates.description = params.description;
    if (params.category !== undefined) updates.category = params.category;
    if (params.isPublic !== undefined) updates.is_public = params.isPublic;

    if (params.styleConfig) {
      // Generate new preview
      updates.preview_image = generateTemplatePreview(params.styleConfig);

      // Remove logo if too large
      const styleToSave = { ...params.styleConfig };
      if (styleToSave.logoImage && styleToSave.logoImage.length > 1000) {
        styleToSave.logoImage = null;
      }
      updates.style_config = styleToSave;
    }

    const { data, error } = await supabase
      .from('qr_templates')
      .update(updates)
      .eq('id', params.templateId)
      .eq('user_id', params.userId) // Ensure user owns this template
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      template: {
        ...data,
        style_config: data.style_config as QRStyleConfig,
      } as QRTemplate,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Delete a template
export async function deleteTemplate(params: {
  templateId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('qr_templates')
      .delete()
      .eq('id', params.templateId)
      .eq('user_id', params.userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Increment use count when a template is applied
export async function incrementTemplateUseCount(templateId: string): Promise<void> {
  try {
    await supabase.rpc('increment_template_use_count', { template_id: templateId });
  } catch (error) {
    console.error('Error incrementing template use count:', error);
  }
}

// Duplicate a template (create a copy)
export async function duplicateTemplate(params: {
  templateId: string;
  userId: string;
  newName: string;
}): Promise<{ success: boolean; template?: QRTemplate; error?: string }> {
  try {
    // Get the original template
    const { data: original, error: fetchError } = await supabase
      .from('qr_templates')
      .select('*')
      .eq('id', params.templateId)
      .single();

    if (fetchError || !original) {
      return { success: false, error: 'Template not found' };
    }

    // Create a copy
    const { data, error } = await supabase
      .from('qr_templates')
      .insert({
        user_id: params.userId,
        name: params.newName,
        description: original.description,
        category: original.category,
        preview_image: original.preview_image,
        style_config: original.style_config,
        is_public: false, // Copies are private by default
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      template: {
        ...data,
        style_config: data.style_config as QRStyleConfig,
      } as QRTemplate,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
