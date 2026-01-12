import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import formidable, { Fields, Files, File as FormidableFile } from 'formidable';
import { promises as fs } from 'fs';

// =====================================================
// File Upload API for Landing Pages & QR Content
// =====================================================
//
// Endpoints:
// POST /api/v1/upload - Upload file(s) to storage
//
// Supports:
// - Media types: audio, video, images, pdf, document
// - Multiple file upload (for images)
// - File size validation
// - File type validation
// - Automatic bucket selection
// - Signed URL generation
// =====================================================

// Disable body parsing - required for formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

// File type configurations matching frontend
const FILE_CONFIG = {
  audio: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a'],
    bucket: 'qr-media',
  },
  video: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    bucket: 'qr-media',
  },
  images: {
    maxSize: 5 * 1024 * 1024, // 5MB per image
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    bucket: 'qr-media',
  },
  document: {
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
    bucket: 'qr-docs',
  },
  pdf: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: ['application/pdf'],
    bucket: 'qr-docs',
  },
  menu: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    bucket: 'qr-docs',
  },
} as const;

type MediaType = keyof typeof FILE_CONFIG;

// Error codes
const ERROR_CODES = {
  INVALID_API_KEY: { code: 1001, message: 'Invalid API key', status: 401 },
  MISSING_API_KEY: { code: 1004, message: 'API key is required', status: 401 },
  INVALID_REQUEST: { code: 3001, message: 'Invalid request', status: 400 },
  INVALID_MEDIA_TYPE: { code: 3010, message: 'Invalid media type', status: 400 },
  FILE_TOO_LARGE: { code: 3011, message: 'File exceeds size limit', status: 400 },
  INVALID_FILE_TYPE: { code: 3012, message: 'Invalid file type', status: 400 },
  NO_FILE_PROVIDED: { code: 3013, message: 'No file provided', status: 400 },
  UPLOAD_FAILED: { code: 5004, message: 'File upload failed', status: 500 },
  INTERNAL_ERROR: { code: 5001, message: 'Internal server error', status: 500 },
} as const;

// Helper Functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function sendError(res: VercelResponse, errorKey: keyof typeof ERROR_CODES, details?: any, requestId?: string) {
  const error = ERROR_CODES[errorKey];
  return res.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      details,
      request_id: requestId || generateRequestId(),
    },
  });
}

function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Validate API key
async function validateApiKey(apiKey: string, db: SupabaseClient): Promise<{ valid: boolean; userId?: string; keyId?: string; error?: string }> {
  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const { data: keyData, error } = await db
      .from('api_keys')
      .select('id, user_id, is_active, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyData) return { valid: false, error: 'Invalid API key' };
    if (!keyData.is_active) return { valid: false, error: 'API key is inactive' };
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    return { valid: true, userId: keyData.user_id, keyId: keyData.id };
  } catch {
    return { valid: false, error: 'Validation failed' };
  }
}

// Log API usage with fallback
async function logApiUsage(
  db: SupabaseClient,
  keyId: string,
  userId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress: string,
  userAgent: string | null,
  requestId: string
): Promise<void> {
  try {
    // Insert detailed log
    await db.from('api_usage').insert({
      api_key_id: keyId,
      user_id: userId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: ipAddress,
      user_agent: userAgent,
      request_id: requestId
    });

    // Try RPC first
    const { error: rpcError } = await db.rpc('increment_api_usage', {
      p_api_key_id: keyId,
      p_user_id: userId,
      p_success: statusCode >= 200 && statusCode < 300
    });

    // Fallback to direct update if RPC fails
    if (rpcError) {
      const yearMonth = new Date().toISOString().slice(0, 7);
      const isSuccess = statusCode >= 200 && statusCode < 300;

      const { data: existing } = await db
        .from('api_usage_monthly')
        .select('id, request_count, successful_requests, failed_requests')
        .eq('api_key_id', keyId)
        .eq('year_month', yearMonth)
        .single();

      if (existing) {
        await db.from('api_usage_monthly').update({
          request_count: (existing.request_count || 0) + 1,
          successful_requests: (existing.successful_requests || 0) + (isSuccess ? 1 : 0),
          failed_requests: (existing.failed_requests || 0) + (isSuccess ? 0 : 1),
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        await db.from('api_usage_monthly').insert({
          api_key_id: keyId,
          user_id: userId,
          year_month: yearMonth,
          request_count: 1,
          successful_requests: isSuccess ? 1 : 0,
          failed_requests: isSuccess ? 0 : 1
        });
      }
    }
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}

// Generate unique filename
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').substring(0, 50);
  const sanitizedBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${sanitizedBase}_${timestamp}_${randomStr}.${extension}`;
}

// Parse form data
function parseForm(req: VercelRequest): Promise<{ fields: Fields; files: Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB max
      maxFiles: 10,
      allowEmptyFiles: false,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

// Generate signed URL
async function generateSignedUrl(
  db: SupabaseClient,
  filePath: string,
  bucket: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await db.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Signed URL exception:', err);
    return null;
  }
}

// Get client IP
function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] as string || '0.0.0.0';
}

// Main Handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let db: SupabaseClient | null = null;
  let keyId: string | null = null;
  let userId: string | null = null;

  try {
    db = getSupabaseAdmin();

    // Check API key
    const apiKey = req.headers['x-api-key'] as string ||
                   req.headers.authorization?.replace('Bearer ', '');

    if (!apiKey) {
      return sendError(res, 'MISSING_API_KEY', null, requestId);
    }

    const validation = await validateApiKey(apiKey, db);
    if (!validation.valid) {
      return sendError(res, 'INVALID_API_KEY', validation.error, requestId);
    }

    userId = validation.userId!;
    keyId = validation.keyId!;

    // Parse multipart form data
    let fields: Fields;
    let files: Files;

    try {
      const parsed = await parseForm(req);
      fields = parsed.fields;
      files = parsed.files;
    } catch (parseError: any) {
      console.error('Form parse error:', parseError);
      return sendError(res, 'INVALID_REQUEST', parseError.message, requestId);
    }

    // Get media type from fields
    const mediaTypeField = fields.media_type || fields.type;
    const mediaType = (Array.isArray(mediaTypeField) ? mediaTypeField[0] : mediaTypeField) as MediaType;

    if (!mediaType || !FILE_CONFIG[mediaType]) {
      return sendError(res, 'INVALID_MEDIA_TYPE', `Supported types: ${Object.keys(FILE_CONFIG).join(', ')}`, requestId);
    }

    const config = FILE_CONFIG[mediaType];

    // Get optional QR ID
    const qrIdField = fields.qr_id;
    const qrId = Array.isArray(qrIdField) ? qrIdField[0] : qrIdField;

    // Get file(s)
    const fileField = files.file || files.files;
    if (!fileField) {
      return sendError(res, 'NO_FILE_PROVIDED', null, requestId);
    }

    const fileArray: FormidableFile[] = Array.isArray(fileField) ? fileField : [fileField];

    // Process each file
    const uploadResults: Array<{
      success: boolean;
      fileName?: string;
      filePath?: string;
      bucket?: string;
      signedUrl?: string;
      size?: number;
      mimeType?: string;
      error?: string;
    }> = [];

    for (const file of fileArray) {
      // Validate file size
      if (file.size > config.maxSize) {
        uploadResults.push({
          success: false,
          fileName: file.originalFilename || 'unknown',
          error: `File exceeds ${config.maxSize / (1024 * 1024)}MB limit`,
        });
        continue;
      }

      // Validate file type
      const mimeType = file.mimetype || '';
      if (!config.allowedTypes.includes(mimeType)) {
        uploadResults.push({
          success: false,
          fileName: file.originalFilename || 'unknown',
          error: `Invalid file type: ${mimeType}. Allowed: ${config.allowedTypes.join(', ')}`,
        });
        continue;
      }

      // Generate file path
      const fileName = generateFileName(file.originalFilename || 'file');
      const folderPath = qrId ? `${userId}/${qrId}` : `${userId}/temp`;
      const filePath = `${folderPath}/${fileName}`;

      try {
        // Read file contents
        const fileBuffer = await fs.readFile(file.filepath);

        // Upload to Supabase
        const { data, error } = await db.storage
          .from(config.bucket)
          .upload(filePath, fileBuffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Supabase upload error:', error);
          uploadResults.push({
            success: false,
            fileName: file.originalFilename || 'unknown',
            error: error.message,
          });
          continue;
        }

        // Generate signed URL
        const signedUrl = await generateSignedUrl(db, filePath, config.bucket, 3600);

        uploadResults.push({
          success: true,
          fileName: fileName,
          filePath: filePath,
          bucket: config.bucket,
          signedUrl: signedUrl || undefined,
          size: file.size,
          mimeType: mimeType,
        });

        // Clean up temp file
        try {
          await fs.unlink(file.filepath);
        } catch {
          // Ignore cleanup errors
        }
      } catch (uploadError: any) {
        console.error('Upload exception:', uploadError);
        uploadResults.push({
          success: false,
          fileName: file.originalFilename || 'unknown',
          error: uploadError.message,
        });
      }
    }

    // Check if any uploads succeeded
    const successfulUploads = uploadResults.filter(r => r.success);
    const failedUploads = uploadResults.filter(r => !r.success);

    if (successfulUploads.length === 0) {
      // Log failed request - MUST await
      if (db && keyId && userId) {
        await logApiUsage(db, keyId, userId, '/api/v1/upload', 'POST', 500, Date.now() - startTime,
          getClientIP(req), req.headers['user-agent'] as string || null, requestId);
      }
      return sendError(res, 'UPLOAD_FAILED', { uploads: failedUploads }, requestId);
    }

    // Log successful request - MUST await
    if (db && keyId && userId) {
      await logApiUsage(db, keyId, userId, '/api/v1/upload', 'POST', 200, Date.now() - startTime,
        getClientIP(req), req.headers['user-agent'] as string || null, requestId);
    }

    // Return response
    return res.status(200).json({
      success: true,
      request_id: requestId,
      data: {
        uploaded: successfulUploads.length,
        failed: failedUploads.length,
        media_type: mediaType,
        bucket: config.bucket,
        files: uploadResults,
      },
    });

  } catch (error: any) {
    console.error('Upload API Error:', error);
    // Log error request - MUST await
    if (db && keyId && userId) {
      await logApiUsage(db, keyId, userId, '/api/v1/upload', 'POST', 500, Date.now() - startTime,
        getClientIP(req), req.headers['user-agent'] as string || null, requestId);
    }
    return sendError(res, 'INTERNAL_ERROR', error.message, requestId);
  }
}
