import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import QRCode from 'qrcode';

// =====================================================
// Types
// =====================================================

interface ApiKeyValidation {
  valid: boolean;
  reason?: string;
  error_code?: string;
  key_id?: string;
  user_id?: string;
  tier?: string;
  permissions?: ApiPermissions;
  rate_limit?: number;
}

interface ApiPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  analytics: boolean;
  bulk: boolean;
  webhooks: boolean;
}

interface QRCreateRequest {
  type: string;
  content: string | Record<string, any>;
  title?: string;
  is_dynamic?: boolean;
  options?: {
    width?: number;
    margin?: number;
    color?: string;
    background?: string;
    format?: 'png' | 'svg' | 'base64';
    error_correction?: 'L' | 'M' | 'Q' | 'H';
  };
  metadata?: Record<string, any>;
}

// Error codes
const ERROR_CODES: Record<string, { code: number; message: string; status: number }> = {
  INVALID_API_KEY: { code: 1001, message: 'Invalid API key', status: 401 },
  EXPIRED_API_KEY: { code: 1002, message: 'API key has expired', status: 401 },
  INACTIVE_API_KEY: { code: 1003, message: 'API key is inactive', status: 401 },
  MISSING_API_KEY: { code: 1004, message: 'API key is required', status: 401 },
  RATE_LIMIT_EXCEEDED: { code: 2002, message: 'Rate limit exceeded', status: 429 },
  INVALID_REQUEST_BODY: { code: 3001, message: 'Invalid request body', status: 400 },
  MISSING_REQUIRED_FIELD: { code: 3002, message: 'Missing required field', status: 400 },
  INVALID_QR_TYPE: { code: 3003, message: 'Invalid QR type', status: 400 },
  QR_NOT_FOUND: { code: 4001, message: 'QR code not found', status: 404 },
  INTERNAL_ERROR: { code: 5001, message: 'Internal server error', status: 500 },
  DATABASE_ERROR: { code: 5002, message: 'Database error', status: 500 },
  QR_GENERATION_FAILED: { code: 5003, message: 'QR code generation failed', status: 500 },
};

const VALID_QR_TYPES = ['url', 'text', 'vcard', 'wifi', 'email', 'sms', 'phone', 'geo', 'event'];

// =====================================================
// Utility Functions
// =====================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

function createErrorResponse(errorCode: string, details?: any, requestId?: string) {
  const error = ERROR_CODES[errorCode] || ERROR_CODES.INTERNAL_ERROR;
  return {
    error: {
      code: error.code,
      message: error.message,
      details,
      request_id: requestId || generateRequestId()
    }
  };
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// =====================================================
// API Key Validation
// =====================================================

async function validateApiKey(apiKey: string, db: any): Promise<ApiKeyValidation> {
  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const { data: keyData, error } = await db
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyData) {
      return { valid: false, reason: 'Invalid API key', error_code: 'INVALID_API_KEY' };
    }

    if (!keyData.is_active) {
      return { valid: false, reason: 'API key is inactive', error_code: 'INACTIVE_API_KEY' };
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return { valid: false, reason: 'API key has expired', error_code: 'EXPIRED_API_KEY' };
    }

    // Update last used
    await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id);

    return {
      valid: true,
      key_id: keyData.id,
      user_id: keyData.user_id,
      tier: keyData.tier,
      permissions: keyData.permissions,
      rate_limit: keyData.rate_limit
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false, reason: 'Validation error', error_code: 'INTERNAL_ERROR' };
  }
}

// =====================================================
// QR Code Handlers
// =====================================================

function buildQRContent(type: string, content: string | Record<string, any>): string {
  if (typeof content === 'string') return content;

  switch (type) {
    case 'vcard':
      const vc = content;
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${vc.name || ''}\nORG:${vc.company || ''}\nTEL:${vc.phone || ''}\nEMAIL:${vc.email || ''}\nURL:${vc.website || ''}\nEND:VCARD`;
    case 'wifi':
      return `WIFI:T:${content.encryption || 'WPA'};S:${content.ssid || ''};P:${content.password || ''};;`;
    case 'email':
      return `mailto:${content.address || ''}?subject=${encodeURIComponent(content.subject || '')}&body=${encodeURIComponent(content.body || '')}`;
    case 'sms':
      return `sms:${content.phone || ''}?body=${encodeURIComponent(content.message || '')}`;
    case 'phone':
      return `tel:${content.number || content}`;
    case 'geo':
      return `geo:${content.latitude || 0},${content.longitude || 0}`;
    default:
      return JSON.stringify(content);
  }
}

async function handleCreate(
  db: any,
  userId: string,
  body: QRCreateRequest,
  baseUrl: string,
  requestId: string
): Promise<{ status: number; data: any }> {
  try {
    // Validate
    if (!body.type || !VALID_QR_TYPES.includes(body.type)) {
      return {
        status: 400,
        data: createErrorResponse('INVALID_QR_TYPE', { valid_types: VALID_QR_TYPES }, requestId)
      };
    }

    if (!body.content) {
      return {
        status: 400,
        data: createErrorResponse('MISSING_REQUIRED_FIELD', { field: 'content' }, requestId)
      };
    }

    const qrContent = buildQRContent(body.type, body.content);
    const isDynamic = body.is_dynamic !== false;
    const shortCode = crypto.randomBytes(4).toString('hex');

    const { data: qrRecord, error } = await db
      .from('dynamic_qr_codes')
      .insert({
        user_id: userId,
        title: body.title || `QR Code - ${body.type}`,
        short_code: shortCode,
        content_type: body.type,
        content_data: typeof body.content === 'object' ? body.content : { value: body.content },
        redirect_url: body.type === 'url' ? (body.content as string) : null,
        is_dynamic: isDynamic,
        is_active: true,
        metadata: body.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    // Generate QR code
    const qrUrl = isDynamic ? `${baseUrl}/r/${shortCode}` : qrContent;

    // Generate actual QR code image
    const qrOptions = {
      width: body.options?.width || 400,
      margin: body.options?.margin ?? 2,
      errorCorrectionLevel: (body.options?.error_correction || 'M') as 'L' | 'M' | 'Q' | 'H',
      color: {
        dark: body.options?.color || '#000000',
        light: body.options?.background || '#ffffff'
      }
    };

    let qrImage: string;
    if (body.options?.format === 'svg') {
      qrImage = await QRCode.toString(qrUrl, { ...qrOptions, type: 'svg' });
    } else {
      qrImage = await QRCode.toDataURL(qrUrl, qrOptions);
    }

    return {
      status: 201,
      data: {
        success: true,
        request_id: requestId,
        data: {
          id: qrRecord.id,
          short_code: shortCode,
          title: qrRecord.title,
          type: body.type,
          is_dynamic: isDynamic,
          redirect_url: isDynamic ? `${baseUrl}/r/${shortCode}` : null,
          qr_image: qrImage,
          qr_content: qrUrl,
          created_at: qrRecord.created_at
        }
      }
    };
  } catch (error: any) {
    console.error('Create QR error:', error);
    return {
      status: 500,
      data: createErrorResponse('QR_GENERATION_FAILED', { message: error.message }, requestId)
    };
  }
}

async function handleList(
  db: any,
  userId: string,
  query: URLSearchParams,
  requestId: string
): Promise<{ status: number; data: any }> {
  try {
    const page = Math.max(1, parseInt(query.get('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(query.get('limit') || '20')), 100);
    const offset = (page - 1) * limit;

    const { data, error, count } = await db
      .from('dynamic_qr_codes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      status: 200,
      data: {
        success: true,
        request_id: requestId,
        data: {
          items: data,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
            has_next: page * limit < (count || 0),
            has_prev: page > 1
          }
        }
      }
    };
  } catch (error: any) {
    return { status: 500, data: createErrorResponse('DATABASE_ERROR', { message: error.message }, requestId) };
  }
}

async function handleRead(
  db: any,
  userId: string,
  qrId: string,
  requestId: string
): Promise<{ status: number; data: any }> {
  try {
    const { data, error } = await db
      .from('dynamic_qr_codes')
      .select('*')
      .eq('id', qrId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { status: 404, data: createErrorResponse('QR_NOT_FOUND', null, requestId) };
    }

    return {
      status: 200,
      data: {
        success: true,
        request_id: requestId,
        data
      }
    };
  } catch (error: any) {
    return { status: 500, data: createErrorResponse('DATABASE_ERROR', { message: error.message }, requestId) };
  }
}

async function handleUpdate(
  db: any,
  userId: string,
  qrId: string,
  body: any,
  requestId: string
): Promise<{ status: number; data: any }> {
  try {
    const { data: existing } = await db
      .from('dynamic_qr_codes')
      .select('id')
      .eq('id', qrId)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return { status: 404, data: createErrorResponse('QR_NOT_FOUND', null, requestId) };
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (body.content !== undefined) {
      updates.content_data = typeof body.content === 'object' ? body.content : { value: body.content };
      if (typeof body.content === 'string') {
        updates.redirect_url = body.content;
      }
    }
    if (body.title !== undefined) updates.title = body.title;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data, error } = await db
      .from('dynamic_qr_codes')
      .update(updates)
      .eq('id', qrId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      status: 200,
      data: {
        success: true,
        request_id: requestId,
        data
      }
    };
  } catch (error: any) {
    return { status: 500, data: createErrorResponse('DATABASE_ERROR', { message: error.message }, requestId) };
  }
}

async function handleDelete(
  db: any,
  userId: string,
  qrId: string,
  requestId: string
): Promise<{ status: number; data: any }> {
  try {
    const { data: existing } = await db
      .from('dynamic_qr_codes')
      .select('id')
      .eq('id', qrId)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return { status: 404, data: createErrorResponse('QR_NOT_FOUND', null, requestId) };
    }

    const { error } = await db
      .from('dynamic_qr_codes')
      .delete()
      .eq('id', qrId)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      status: 200,
      data: {
        success: true,
        request_id: requestId,
        message: 'QR code deleted successfully'
      }
    };
  } catch (error: any) {
    return { status: 500, data: createErrorResponse('DATABASE_ERROR', { message: error.message }, requestId) };
  }
}

// =====================================================
// Vite Plugin
// =====================================================

export function viteApiPlugin(): Plugin {
  return {
    name: 'vite-api-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        // Only handle /api/v1/* routes
        if (!req.url?.startsWith('/api/v1/')) {
          return next();
        }

        const requestId = generateRequestId();
        const startTime = Date.now();

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
        res.setHeader('X-Request-ID', requestId);
        res.setHeader('Content-Type', 'application/json');

        // Handle preflight
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        try {
          const db = getSupabaseAdmin();

          // Extract API key
          const apiKey = (req.headers['x-api-key'] as string) ||
                        (req.headers.authorization?.replace('Bearer ', ''));

          if (!apiKey) {
            res.statusCode = 401;
            res.end(JSON.stringify(createErrorResponse('MISSING_API_KEY', null, requestId)));
            return;
          }

          // Validate API key
          const keyValidation = await validateApiKey(apiKey, db);

          if (!keyValidation.valid) {
            const errorCode = keyValidation.error_code || 'INVALID_API_KEY';
            res.statusCode = ERROR_CODES[errorCode]?.status || 401;
            res.end(JSON.stringify(createErrorResponse(errorCode, null, requestId)));
            return;
          }

          // Parse URL and route
          const url = new URL(req.url, `http://${req.headers.host}`);
          const pathParts = url.pathname.split('/').filter(Boolean);
          // pathParts: ['api', 'v1', 'qr', ...rest]
          const resource = pathParts[3]; // could be a QR ID or undefined for list
          const userId = keyValidation.user_id!;
          const permissions = keyValidation.permissions!;
          const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

          let result: { status: number; data: any };
          const body = await parseBody(req);

          switch (req.method) {
            case 'GET':
              if (!permissions.read) {
                result = { status: 403, data: createErrorResponse('PERMISSION_DENIED', { action: 'read' }, requestId) };
              } else if (resource && resource !== 'qr') {
                result = await handleRead(db, userId, resource, requestId);
              } else {
                result = await handleList(db, userId, url.searchParams, requestId);
              }
              break;

            case 'POST':
              if (!permissions.create) {
                result = { status: 403, data: createErrorResponse('PERMISSION_DENIED', { action: 'create' }, requestId) };
              } else {
                result = await handleCreate(db, userId, body, baseUrl, requestId);
              }
              break;

            case 'PATCH':
              if (!permissions.update) {
                result = { status: 403, data: createErrorResponse('PERMISSION_DENIED', { action: 'update' }, requestId) };
              } else if (!resource || resource === 'qr') {
                result = { status: 400, data: createErrorResponse('MISSING_REQUIRED_FIELD', { field: 'qr_id' }, requestId) };
              } else {
                result = await handleUpdate(db, userId, resource, body, requestId);
              }
              break;

            case 'DELETE':
              if (!permissions.delete) {
                result = { status: 403, data: createErrorResponse('PERMISSION_DENIED', { action: 'delete' }, requestId) };
              } else if (!resource || resource === 'qr') {
                result = { status: 400, data: createErrorResponse('MISSING_REQUIRED_FIELD', { field: 'qr_id' }, requestId) };
              } else {
                result = await handleDelete(db, userId, resource, requestId);
              }
              break;

            default:
              result = { status: 405, data: { error: 'Method not allowed', request_id: requestId } };
          }

          const responseTime = Date.now() - startTime;
          res.setHeader('X-Response-Time', `${responseTime}ms`);
          res.statusCode = result.status;
          res.end(JSON.stringify(result.data));

        } catch (error: any) {
          console.error('API Error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify(createErrorResponse('INTERNAL_ERROR', { message: error.message }, requestId)));
        }
      });
    }
  };
}
