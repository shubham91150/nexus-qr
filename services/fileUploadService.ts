import { supabase } from '../lib/supabase';

// File type configurations
export const FILE_CONFIG = {
  audio: {
    accept: 'audio/*',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a'],
    bucket: 'media-files',
    folder: 'audio',
  },
  video: {
    accept: 'video/*',
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    bucket: 'media-files',
    folder: 'video',
  },
  images: {
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024, // 5MB per image
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    bucket: 'media-files',
    folder: 'images',
  },
  document: {
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
    bucket: 'media-files',
    folder: 'documents',
  },
};

export type MediaType = keyof typeof FILE_CONFIG;

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
}

/**
 * Generate a unique file name to prevent collisions
 */
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').substring(0, 50);
  // Sanitize filename - remove special characters
  const sanitizedBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${sanitizedBase}_${timestamp}_${randomStr}.${extension}`;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, mediaType: MediaType): { valid: boolean; error?: string } {
  const config = FILE_CONFIG[mediaType];

  // Check file size
  if (file.size > config.maxSize) {
    const maxSizeMB = config.maxSize / (1024 * 1024);
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${config.allowedTypes.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Upload a single file to Supabase Storage
 */
export async function uploadFile(file: File, mediaType: MediaType): Promise<UploadResult> {
  const config = FILE_CONFIG[mediaType];

  // Validate file
  const validation = validateFile(file, mediaType);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const fileName = generateFileName(file.name);
    const filePath = `${config.folder}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(config.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(config.bucket)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      fileName: fileName,
    };
  } catch (err) {
    console.error('Upload exception:', err);
    return { success: false, error: 'Failed to upload file. Please try again.' };
  }
}

/**
 * Upload multiple files (for image gallery)
 */
export async function uploadMultipleFiles(files: File[], mediaType: MediaType): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadFile(file, mediaType);
    results.push(result);
  }

  return results;
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(url: string, mediaType: MediaType): Promise<boolean> {
  const config = FILE_CONFIG[mediaType];

  try {
    // Extract file path from URL
    const urlParts = url.split(`${config.bucket}/`);
    if (urlParts.length < 2) return false;

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(config.bucket)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Delete exception:', err);
    return false;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
