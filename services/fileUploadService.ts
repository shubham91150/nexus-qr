import { supabase } from '../lib/supabase';

// File type configurations with secure bucket assignment
export const FILE_CONFIG = {
  audio: {
    accept: 'audio/*',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a'],
    bucket: 'qr-media', // Private bucket
  },
  video: {
    accept: 'video/*',
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    bucket: 'qr-media', // Private bucket
  },
  images: {
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024, // 5MB per image
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    bucket: 'qr-media', // Private bucket
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
    bucket: 'qr-docs', // Private bucket for documents
  },
  pdf: {
    accept: '.pdf',
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: ['application/pdf'],
    bucket: 'qr-docs', // Private bucket
  },
};

export type MediaType = keyof typeof FILE_CONFIG;

export interface UploadResult {
  success: boolean;
  url?: string;        // Will store path for signed URL generation
  filePath?: string;   // Full path: user_id/qr_id/filename
  bucket?: string;     // Bucket name for signed URL
  error?: string;
  fileName?: string;
}

export type ProgressCallback = (progress: number) => void;

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
 * Get current user ID from Supabase auth
 */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Upload with timeout wrapper
 */
async function uploadWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Upload timeout - please check your connection and try again'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Upload a single file to Supabase Storage with progress tracking
 * Path format: <user_id>/<qr_id>/<filename>
 */
export async function uploadFile(
  file: File,
  mediaType: MediaType,
  qrId?: string,
  onProgress?: ProgressCallback
): Promise<UploadResult> {
  const config = FILE_CONFIG[mediaType];

  // Validate file
  const validation = validateFile(file, mediaType);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Get current user ID
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Refresh session to ensure token is valid (fixes "exp" claim error)
    const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('Session refresh error:', refreshError);
      return { success: false, error: 'Session expired. Please login again.' };
    }

    const fileName = generateFileName(file.name);

    // Path format: user_id/qr_id/filename OR user_id/temp/filename
    const folderPath = qrId ? `${userId}/${qrId}` : `${userId}/temp`;
    const filePath = `${folderPath}/${fileName}`;

    // If progress callback provided, use XMLHttpRequest for progress tracking
    if (onProgress) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const accessToken = sessionData?.session?.access_token;

      if (!supabaseUrl || !accessToken) {
        return { success: false, error: 'Authentication error' };
      }

      const uploadUrl = `${supabaseUrl}/storage/v1/object/${config.bucket}/${filePath}`;

      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              success: true,
              url: filePath,
              filePath: filePath,
              bucket: config.bucket,
              fileName: fileName,
            });
          } else {
            let errorMsg = 'Upload failed';
            try {
              const response = JSON.parse(xhr.responseText);
              errorMsg = response.message || response.error || errorMsg;
            } catch {}
            resolve({ success: false, error: errorMsg });
          }
        });

        xhr.addEventListener('error', () => {
          resolve({ success: false, error: 'Network error during upload' });
        });

        xhr.addEventListener('timeout', () => {
          resolve({ success: false, error: 'Upload timeout - please try with a smaller file' });
        });

        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.timeout = 300000; // 5 minute timeout

        xhr.send(file);
      });
    }

    // Fallback to Supabase client if no progress callback
    const { data, error } = await supabase.storage
      .from(config.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      if (error.message.includes('exp') || error.message.includes('token')) {
        return { success: false, error: 'Session expired. Please refresh the page and try again.' };
      }
      return { success: false, error: error.message };
    }

    return {
      success: true,
      url: filePath,
      filePath: filePath,
      bucket: config.bucket,
      fileName: fileName,
    };
  } catch (err: any) {
    console.error('Upload exception:', err);
    if (err.message?.includes('timeout')) {
      return { success: false, error: 'Upload timeout - please check your connection and try with a smaller file.' };
    }
    return { success: false, error: 'Failed to upload file. Please try again.' };
  }
}

/**
 * Upload multiple files (for image gallery)
 */
export async function uploadMultipleFiles(
  files: File[],
  mediaType: MediaType,
  qrId?: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadFile(file, mediaType, qrId);
    results.push(result);
  }

  return results;
}

/**
 * Generate a signed URL for temporary file access
 * @param filePath - The file path in storage
 * @param bucket - The bucket name
 * @param expiresIn - Expiry time in seconds (default 60)
 */
export async function getSignedUrl(
  filePath: string,
  bucket: string,
  expiresIn: number = 60
): Promise<{ url: string | null; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return { url: null, error: error.message };
    }

    return { url: data.signedUrl };
  } catch (err) {
    console.error('Signed URL exception:', err);
    return { url: null, error: 'Failed to generate access URL' };
  }
}

/**
 * Generate signed URLs for multiple files
 */
export async function getSignedUrls(
  filePaths: string[],
  bucket: string,
  expiresIn: number = 60
): Promise<{ urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];

  for (const filePath of filePaths) {
    const result = await getSignedUrl(filePath, bucket, expiresIn);
    if (result.url) {
      urls.push(result.url);
    } else {
      errors.push(result.error || 'Unknown error');
    }
  }

  return { urls, errors };
}

/**
 * Move file from temp folder to QR folder when QR is created
 */
export async function moveFileToQR(
  tempFilePath: string,
  bucket: string,
  qrId: string
): Promise<{ success: boolean; newPath?: string; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Extract filename from temp path
    const fileName = tempFilePath.split('/').pop();
    if (!fileName) {
      return { success: false, error: 'Invalid file path' };
    }

    const newPath = `${userId}/${qrId}/${fileName}`;

    // Copy to new location
    const { error: copyError } = await supabase.storage
      .from(bucket)
      .copy(tempFilePath, newPath);

    if (copyError) {
      return { success: false, error: copyError.message };
    }

    // Delete from temp location
    await supabase.storage.from(bucket).remove([tempFilePath]);

    return { success: true, newPath };
  } catch (err) {
    console.error('Move file exception:', err);
    return { success: false, error: 'Failed to move file' };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(filePath: string, bucket: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
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
 * Delete all files for a QR code
 */
export async function deleteQRFiles(qrId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const folderPath = `${userId}/${qrId}`;

    // Delete from both buckets
    for (const bucket of ['qr-media', 'qr-docs']) {
      const { data: files } = await supabase.storage
        .from(bucket)
        .list(folderPath);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${folderPath}/${f.name}`);
        await supabase.storage.from(bucket).remove(filePaths);
      }
    }

    return true;
  } catch (err) {
    console.error('Delete QR files exception:', err);
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

/**
 * Get bucket name for a media type
 */
export function getBucketForType(mediaType: MediaType): string {
  return FILE_CONFIG[mediaType].bucket;
}
