import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { z } from 'zod';

// =====================================================
// Zod Validation Schemas (Security Layer)
// =====================================================

const HexColorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional();

const SafeURLSchema = z.string()
  .url()
  .max(2048)
  .refine(url => !url.includes('javascript:') && !url.includes('data:'), 'Unsafe URL protocol');

const QRCreateRequestSchema = z.object({
  type: z.enum(['url', 'text', 'vcard', 'wifi', 'email', 'sms', 'phone', 'geo', 'event']),
  content: z.union([z.string().min(1).max(10000), z.record(z.any())]),
  title: z.string().max(255).optional(),
  is_dynamic: z.boolean().optional().default(false),
  options: z.object({
    width: z.number().min(100).max(2000).optional(),
    margin: z.number().min(0).max(10).optional(),
    color: HexColorSchema,
    background: HexColorSchema,
    format: z.enum(['png', 'svg', 'base64']).optional(),
    error_correction: z.enum(['L', 'M', 'Q', 'H']).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

const BulkQRCreateSchema = z.object({
  items: z.array(QRCreateRequestSchema).min(1).max(100),
});

// =====================================================
// Error Codes & Types
// =====================================================

const ERROR_CODES = {
  // Authentication Errors (1xxx)
  INVALID_API_KEY: { code: 1001, message: 'Invalid API key', status: 401 },
  EXPIRED_API_KEY: { code: 1002, message: 'API key has expired', status: 401 },
  INACTIVE_API_KEY: { code: 1003, message: 'API key is inactive', status: 401 },
  MISSING_API_KEY: { code: 1004, message: 'API key is required', status: 401 },

  // Authorization Errors (2xxx)
  PERMISSION_DENIED: { code: 2001, message: 'Permission denied for this operation', status: 403 },
  RATE_LIMIT_EXCEEDED: { code: 2002, message: 'Rate limit exceeded', status: 429 },
  IP_NOT_WHITELISTED: { code: 2003, message: 'IP address not whitelisted', status: 403 },
  TIER_UPGRADE_REQUIRED: { code: 2004, message: 'This feature requires a higher tier', status: 403 },

  // Validation Errors (3xxx)
  INVALID_REQUEST_BODY: { code: 3001, message: 'Invalid request body', status: 400 },
  MISSING_REQUIRED_FIELD: { code: 3002, message: 'Missing required field', status: 400 },
  INVALID_QR_TYPE: { code: 3003, message: 'Invalid QR type', status: 400 },
  INVALID_CONTENT: { code: 3004, message: 'Invalid content for QR type', status: 400 },
  BULK_LIMIT_EXCEEDED: { code: 3005, message: 'Bulk operation limit exceeded (max 100)', status: 400 },
  INVALID_URL: { code: 3006, message: 'Invalid URL format', status: 400 },
  INVALID_EMAIL: { code: 3007, message: 'Invalid email format', status: 400 },
  INVALID_PHONE: { code: 3008, message: 'Invalid phone number format', status: 400 },

  // Resource Errors (4xxx)
  QR_NOT_FOUND: { code: 4001, message: 'QR code not found', status: 404 },
  WEBHOOK_NOT_FOUND: { code: 4002, message: 'Webhook not found', status: 404 },

  // Server Errors (5xxx)
  INTERNAL_ERROR: { code: 5001, message: 'Internal server error', status: 500 },
  DATABASE_ERROR: { code: 5002, message: 'Database error', status: 500 },
  QR_GENERATION_FAILED: { code: 5003, message: 'QR code generation failed', status: 500 },

  // Idempotency Errors (6xxx)
  DUPLICATE_REQUEST: { code: 6001, message: 'Duplicate request detected', status: 409 },
} as const;

type ErrorCode = keyof typeof ERROR_CODES;

interface ApiError {
  error: {
    code: number;
    message: string;
    details?: any;
    request_id: string;
  };
}

interface ApiKeyValidation {
  valid: boolean;
  reason?: string;
  error_code?: ErrorCode;
  key_id?: string;
  user_id?: string;
  tier?: string;
  permissions?: ApiPermissions;
  rate_limit?: number;
  ip_whitelist?: string[];
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

interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  limit: number;
  used: number;
  remaining: number;
  reset_at: string;
}

// Valid QR types
const VALID_QR_TYPES = ['url', 'text', 'vcard', 'wifi', 'email', 'sms', 'phone', 'geo', 'event'] as const;
type QRType = typeof VALID_QR_TYPES[number];

interface QRCreateRequest {
  type: QRType;
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

// =====================================================
// Utility Functions
// =====================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

function createErrorResponse(errorCode: ErrorCode, details?: any, requestId?: string): ApiError {
  const error = ERROR_CODES[errorCode];
  return {
    error: {
      code: error.code,
      message: error.message,
      details,
      request_id: requestId || generateRequestId()
    }
  };
}

function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] as string || '0.0.0.0';
}

// =====================================================
// Validation Functions
// =====================================================

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;
  return phoneRegex.test(phone);
}

function validateQRCreateRequest(body: any): { valid: boolean; errors: string[]; data?: z.infer<typeof QRCreateRequestSchema> } {
  // Use Zod for robust validation
  const result = QRCreateRequestSchema.safeParse(body);

  if (!result.success) {
    const errors = result.error.errors.map(e => {
      const path = e.path.join('.');
      return path ? `${path}: ${e.message}` : e.message;
    });
    return { valid: false, errors };
  }

  // Additional type-specific validation
  const errors: string[] = [];
  const data = result.data;

  // URL validation for url type
  if (data.type === 'url' && typeof data.content === 'string') {
    const urlResult = SafeURLSchema.safeParse(data.content);
    if (!urlResult.success) {
      errors.push('Invalid or unsafe URL format');
    }
  }

  // Email validation
  if (data.type === 'email') {
    const email = typeof data.content === 'string' ? data.content : (data.content as any)?.address;
    if (email && !validateEmail(email)) {
      errors.push('Invalid email format');
    }
  }

  // Phone validation
  if (data.type === 'phone' || data.type === 'sms') {
    const phone = typeof data.content === 'string' ? data.content : (data.content as any)?.phone || (data.content as any)?.number;
    if (phone && !validatePhone(phone)) {
      errors.push('Invalid phone number format');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], data: result.data };
}

// =====================================================
// API Key Validation with IP Whitelist
// =====================================================

async function validateApiKey(apiKey: string, clientIP: string, db: SupabaseClient): Promise<ApiKeyValidation> {
  try {
    // Hash the API key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Get key from database
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

    // Check IP whitelist if configured
    if (keyData.ip_whitelist && keyData.ip_whitelist.length > 0) {
      const isWhitelisted = keyData.ip_whitelist.some((ip: string) => {
        if (ip.includes('/')) {
          // CIDR notation - simplified check
          return ip.split('/')[0] === clientIP;
        }
        return ip === clientIP || ip === '*';
      });

      if (!isWhitelisted) {
        return { valid: false, reason: 'IP address not whitelisted', error_code: 'IP_NOT_WHITELISTED' };
      }
    }

    // Update last used
    await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id);

    return {
      valid: true,
      key_id: keyData.id,
      user_id: keyData.user_id,
      tier: keyData.tier,
      permissions: keyData.permissions,
      rate_limit: keyData.rate_limit,
      ip_whitelist: keyData.ip_whitelist
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false, reason: 'Validation error', error_code: 'INTERNAL_ERROR' };
  }
}

// =====================================================
// Rate Limiting with Sliding Window
// =====================================================

async function checkRateLimit(keyId: string, db: SupabaseClient): Promise<RateLimitCheck> {
  try {
    const { data: result, error } = await db.rpc('check_rate_limit', { p_api_key_id: keyId });

    if (error) throw error;

    // Calculate reset time (end of current month)
    const now = new Date();
    const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      ...result,
      reset_at: resetAt.toISOString()
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return {
      allowed: false,
      reason: 'Rate limit check failed',
      limit: 0,
      used: 0,
      remaining: 0,
      reset_at: new Date().toISOString()
    };
  }
}

// =====================================================
// Idempotency Support
// =====================================================

async function checkIdempotency(
  db: SupabaseClient,
  idempotencyKey: string,
  userId: string
): Promise<{ isDuplicate: boolean; cachedResponse?: any }> {
  try {
    const { data, error } = await db
      .from('api_idempotency')
      .select('response')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      return { isDuplicate: true, cachedResponse: data.response };
    }

    return { isDuplicate: false };
  } catch (error) {
    // If table doesn't exist, continue without idempotency
    return { isDuplicate: false };
  }
}

async function saveIdempotencyResponse(
  db: SupabaseClient,
  idempotencyKey: string,
  userId: string,
  response: any
): Promise<void> {
  try {
    await db.from('api_idempotency').upsert({
      idempotency_key: idempotencyKey,
      user_id: userId,
      response,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });
  } catch (error) {
    // Ignore errors - idempotency is optional
    console.error('Idempotency save error:', error);
  }
}

// =====================================================
// Webhook Delivery with Retry
// =====================================================

async function triggerWebhooks(
  db: SupabaseClient,
  userId: string,
  event: string,
  payload: any
): Promise<void> {
  try {
    const { data: webhooks } = await db
      .from('api_webhooks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .contains('events', [event]);

    if (!webhooks || webhooks.length === 0) return;

    for (const webhook of webhooks) {
      // Queue webhook delivery (in production, use a proper queue)
      deliverWebhook(db, webhook, event, payload);
    }
  } catch (error) {
    console.error('Webhook trigger error:', error);
  }
}

async function deliverWebhook(
  db: SupabaseClient,
  webhook: any,
  event: string,
  payload: any,
  attempt: number = 1
): Promise<void> {
  const maxRetries = 3;
  const retryDelays = [0, 5000, 30000, 120000]; // Exponential backoff

  try {
    // Create signature
    const timestamp = Date.now();
    const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto
      .createHmac('sha256', webhook.secret || '')
      .update(signaturePayload)
      .digest('hex');

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Signature': `t=${timestamp},v1=${signature}`,
        'X-Nexus-Event': event,
        'X-Nexus-Delivery': crypto.randomUUID(),
        'User-Agent': 'NexusQR-Webhook/1.0'
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    // Log delivery
    await db.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      event_type: event,
      payload,
      response_status: response.status,
      success: response.ok,
      delivered_at: new Date().toISOString()
    });

    if (response.ok) {
      // Reset failure count on success
      await db.from('api_webhooks').update({
        failure_count: 0,
        last_triggered_at: new Date().toISOString()
      }).eq('id', webhook.id);
    } else if (attempt < maxRetries) {
      // Retry with exponential backoff
      setTimeout(() => {
        deliverWebhook(db, webhook, event, payload, attempt + 1);
      }, retryDelays[attempt]);
    } else {
      // Max retries exceeded, increment failure count
      await db.from('api_webhooks').update({
        failure_count: webhook.failure_count + 1
      }).eq('id', webhook.id);

      // Disable webhook after 10 consecutive failures
      if (webhook.failure_count + 1 >= 10) {
        await db.from('api_webhooks').update({ is_active: false }).eq('id', webhook.id);
      }
    }
  } catch (error: any) {
    // Log failed delivery
    await db.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      event_type: event,
      payload,
      response_status: 0,
      response_body: error.message,
      success: false,
      delivered_at: new Date().toISOString()
    });

    if (attempt < maxRetries) {
      setTimeout(() => {
        deliverWebhook(db, webhook, event, payload, attempt + 1);
      }, retryDelays[attempt]);
    }
  }
}

// =====================================================
// QR Code Generation
// =====================================================

function buildQRContent(type: string, content: string | Record<string, any>): string {
  if (typeof content === 'string') return content;

  switch (type) {
    case 'vcard':
      const vc = content;
      return `BEGIN:VCARD
VERSION:3.0
FN:${vc.name || ''}
ORG:${vc.company || ''}
TEL:${vc.phone || ''}
EMAIL:${vc.email || ''}
URL:${vc.website || ''}
ADR:;;${vc.address || ''}
NOTE:${vc.note || ''}
END:VCARD`;

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

    case 'event':
      const ev = content;
      return `BEGIN:VEVENT
SUMMARY:${ev.title || ''}
DTSTART:${ev.start || ''}
DTEND:${ev.end || ''}
LOCATION:${ev.location || ''}
DESCRIPTION:${ev.description || ''}
END:VEVENT`;

    default:
      return JSON.stringify(content);
  }
}

async function generateQRCodeImage(
  content: string,
  options: QRCreateRequest['options'] = {}
): Promise<string> {
  const qrOptions: any = {
    width: Math.min(Math.max(options.width || 400, 100), 2000),
    margin: Math.min(Math.max(options.margin ?? 2, 0), 10),
    errorCorrectionLevel: options.error_correction || 'M',
    color: {
      dark: options.color || '#000000',
      light: options.background || '#ffffff'
    }
  };

  if (options.format === 'svg') {
    return await QRCode.toString(content, { ...qrOptions, type: 'svg' });
  }

  return await QRCode.toDataURL(content, qrOptions);
}

// =====================================================
// API Usage Logging
// =====================================================

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

    await db.rpc('increment_api_usage', {
      p_api_key_id: keyId,
      p_user_id: userId,
      p_success: statusCode >= 200 && statusCode < 300
    });
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}

// =====================================================
// Request Handlers
// =====================================================

async function handleCreate(
  db: SupabaseClient,
  userId: string,
  body: QRCreateRequest,
  baseUrl: string,
  requestId: string
): Promise<{ status: number; data: any }> {
  try {
    // Validate request
    const validation = validateQRCreateRequest(body);
    if (!validation.valid) {
      return {
        status: 400,
        data: createErrorResponse('INVALID_REQUEST_BODY', { errors: validation.errors }, requestId)
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

    const qrUrl = isDynamic ? `${baseUrl}/r/${shortCode}` : qrContent;
    const qrImage = await generateQRCodeImage(qrUrl, body.options);

    // Trigger webhooks
    triggerWebhooks(db, userId, 'qr.created', {
      id: qrRecord.id,
      short_code: shortCode,
      type: body.type,
      is_dynamic: isDynamic
    });

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

async function handleRead(
  db: SupabaseClient,
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

async function handleList(
  db: SupabaseClient,
  userId: string,
  query: any,
  requestId: string
): Promise<{ status: number; data: any }> {
  try {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(query.limit) || 20), 100);
    const offset = (page - 1) * limit;

    let queryBuilder = db
      .from('dynamic_qr_codes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.type && VALID_QR_TYPES.includes(query.type)) {
      queryBuilder = queryBuilder.eq('content_type', query.type);
    }

    if (query.is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', query.is_active === 'true');
    }

    if (query.search) {
      queryBuilder = queryBuilder.ilike('title', `%${query.search}%`);
    }

    const { data, error, count } = await queryBuilder;

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

async function handleUpdate(
  db: SupabaseClient,
  userId: string,
  qrId: string,
  body: any,
  requestId: string
): Promise<{ status: number; data: any }> {
  try {
    // Check if QR exists
    const { data: existing } = await db
      .from('dynamic_qr_codes')
      .select('id, is_dynamic')
      .eq('id', qrId)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return { status: 404, data: createErrorResponse('QR_NOT_FOUND', null, requestId) };
    }

    const updates: any = { updated_at: new Date().toISOString() };

    if (body.content !== undefined) {
      updates.content_data = typeof body.content === 'object' ? body.content : { value: body.content };
      if (typeof body.content === 'string' && validateUrl(body.content)) {
        updates.redirect_url = body.content;
      }
    }

    if (body.title !== undefined) updates.title = body.title.slice(0, 255);
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data, error } = await db
      .from('dynamic_qr_codes')
      .update(updates)
      .eq('id', qrId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Trigger webhooks
    triggerWebhooks(db, userId, 'qr.updated', { id: qrId, updates: Object.keys(updates) });

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
  db: SupabaseClient,
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

    // Trigger webhooks
    triggerWebhooks(db, userId, 'qr.deleted', { id: qrId });

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

async function handleAnalytics(
  db: SupabaseClient,
  userId: string,
  qrId: string,
  query: any,
  requestId: string
): Promise<{ status: number; data: any }> {
  try {
    const { data: qr } = await db
      .from('dynamic_qr_codes')
      .select('id, short_code, title')
      .eq('id', qrId)
      .eq('user_id', userId)
      .single();

    if (!qr) {
      return { status: 404, data: createErrorResponse('QR_NOT_FOUND', null, requestId) };
    }

    const days = Math.min(Math.max(1, parseInt(query.days) || 30), 365);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const { data: scans } = await db
      .from('qr_scans')
      .select('*')
      .eq('qr_id', qrId)
      .gte('scanned_at', fromDate.toISOString())
      .order('scanned_at', { ascending: false });

    const totalScans = scans?.length || 0;
    const uniqueIPs = new Set(scans?.map(s => s.ip_address)).size;

    // Aggregations
    const scansByDate: Record<string, number> = {};
    const scansByCountry: Record<string, number> = {};
    const scansByDevice: Record<string, number> = {};
    const scansByBrowser: Record<string, number> = {};
    const scansByHour: Record<number, number> = {};

    scans?.forEach(scan => {
      const date = new Date(scan.scanned_at).toISOString().split('T')[0];
      const hour = new Date(scan.scanned_at).getHours();

      scansByDate[date] = (scansByDate[date] || 0) + 1;
      scansByCountry[scan.country || 'Unknown'] = (scansByCountry[scan.country || 'Unknown'] || 0) + 1;
      scansByDevice[scan.device_type || 'Unknown'] = (scansByDevice[scan.device_type || 'Unknown'] || 0) + 1;
      scansByBrowser[scan.browser || 'Unknown'] = (scansByBrowser[scan.browser || 'Unknown'] || 0) + 1;
      scansByHour[hour] = (scansByHour[hour] || 0) + 1;
    });

    return {
      status: 200,
      data: {
        success: true,
        request_id: requestId,
        data: {
          qr_id: qrId,
          title: qr.title,
          period_days: days,
          summary: {
            total_scans: totalScans,
            unique_visitors: uniqueIPs,
            avg_scans_per_day: Math.round((totalScans / days) * 100) / 100
          },
          breakdowns: {
            by_date: scansByDate,
            by_country: scansByCountry,
            by_device: scansByDevice,
            by_browser: scansByBrowser,
            by_hour: scansByHour
          },
          recent_scans: scans?.slice(0, 20).map(s => ({
            scanned_at: s.scanned_at,
            country: s.country,
            city: s.city,
            device_type: s.device_type,
            browser: s.browser
          })) || []
        }
      }
    };
  } catch (error: any) {
    return { status: 500, data: createErrorResponse('DATABASE_ERROR', { message: error.message }, requestId) };
  }
}

async function handleBulkCreate(
  db: SupabaseClient,
  userId: string,
  body: { items: QRCreateRequest[] },
  baseUrl: string,
  requestId: string
): Promise<{ status: number; data: any }> {
  try {
    if (!body.items || !Array.isArray(body.items)) {
      return { status: 400, data: createErrorResponse('INVALID_REQUEST_BODY', { message: 'items array is required' }, requestId) };
    }

    if (body.items.length > 100) {
      return { status: 400, data: createErrorResponse('BULK_LIMIT_EXCEEDED', null, requestId) };
    }

    const results = await Promise.allSettled(
      body.items.map((item, index) =>
        handleCreate(db, userId, item, baseUrl, `${requestId}_${index}`)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 201);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && (r.value as any).status !== 201));

    return {
      status: 200,
      data: {
        success: true,
        request_id: requestId,
        data: {
          summary: {
            total: body.items.length,
            successful: successful.length,
            failed: failed.length
          },
          results: results.map((r, i) => ({
            index: i,
            success: r.status === 'fulfilled' && (r.value as any).status === 201,
            data: r.status === 'fulfilled' ? (r.value as any).data : { error: 'Processing failed' }
          }))
        }
      }
    };
  } catch (error: any) {
    return { status: 500, data: createErrorResponse('INTERNAL_ERROR', { message: error.message }, requestId) };
  }
}

// =====================================================
// Main Handler
// =====================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  const requestId = generateRequestId();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Idempotency-Key');
  res.setHeader('X-Request-ID', requestId);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = getSupabaseAdmin();
    const clientIP = getClientIP(req);

    // Extract API key
    const apiKey = req.headers['x-api-key'] as string ||
                   (req.headers.authorization?.replace('Bearer ', ''));

    if (!apiKey) {
      return res.status(401).json(createErrorResponse('MISSING_API_KEY', null, requestId));
    }

    // Validate API key with IP check
    const keyValidation = await validateApiKey(apiKey, clientIP, db);

    if (!keyValidation.valid) {
      const errorCode = keyValidation.error_code || 'INVALID_API_KEY';
      return res.status(ERROR_CODES[errorCode].status).json(
        createErrorResponse(errorCode, null, requestId)
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(keyValidation.key_id!, db);

    res.setHeader('X-RateLimit-Limit', rateLimit.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Used', rateLimit.used);
    res.setHeader('X-RateLimit-Reset', rateLimit.reset_at);

    if (!rateLimit.allowed) {
      return res.status(429).json(createErrorResponse('RATE_LIMIT_EXCEEDED', {
        limit: rateLimit.limit,
        used: rateLimit.used,
        reset_at: rateLimit.reset_at
      }, requestId));
    }

    // Check idempotency for POST requests
    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    if (req.method === 'POST' && idempotencyKey) {
      const idempotencyCheck = await checkIdempotency(db, idempotencyKey, keyValidation.user_id!);
      if (idempotencyCheck.isDuplicate) {
        return res.status(200).json(idempotencyCheck.cachedResponse);
      }
    }

    // Parse the path
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const resource = pathParts[3];
    const action = pathParts[4];

    const userId = keyValidation.user_id!;
    const permissions = keyValidation.permissions!;
    const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    let result: { status: number; data: any };

    // Route the request
    switch (req.method) {
      case 'GET':
        if (!permissions.read) {
          result = { status: 403, data: createErrorResponse('PERMISSION_DENIED', { action: 'read' }, requestId) };
        } else if (resource && action === 'analytics') {
          if (!permissions.analytics) {
            result = { status: 403, data: createErrorResponse('TIER_UPGRADE_REQUIRED', { feature: 'analytics' }, requestId) };
          } else {
            result = await handleAnalytics(db, userId, resource, req.query, requestId);
          }
        } else if (resource && resource !== 'qr') {
          result = await handleRead(db, userId, resource, requestId);
        } else {
          result = await handleList(db, userId, req.query, requestId);
        }
        break;

      case 'POST':
        if (!permissions.create) {
          result = { status: 403, data: createErrorResponse('PERMISSION_DENIED', { action: 'create' }, requestId) };
        } else if (action === 'bulk') {
          if (!permissions.bulk) {
            result = { status: 403, data: createErrorResponse('TIER_UPGRADE_REQUIRED', { feature: 'bulk' }, requestId) };
          } else {
            result = await handleBulkCreate(db, userId, req.body, baseUrl, requestId);
          }
        } else {
          result = await handleCreate(db, userId, req.body, baseUrl, requestId);
        }
        break;

      case 'PATCH':
        if (!permissions.update) {
          result = { status: 403, data: createErrorResponse('PERMISSION_DENIED', { action: 'update' }, requestId) };
        } else if (!resource || resource === 'qr') {
          result = { status: 400, data: createErrorResponse('MISSING_REQUIRED_FIELD', { field: 'qr_id' }, requestId) };
        } else {
          result = await handleUpdate(db, userId, resource, req.body, requestId);
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

    // Save idempotency response
    if (req.method === 'POST' && idempotencyKey && result.status >= 200 && result.status < 300) {
      saveIdempotencyResponse(db, idempotencyKey, userId, result.data);
    }

    // Log API usage
    const responseTime = Date.now() - startTime;
    logApiUsage(
      db,
      keyValidation.key_id!,
      userId,
      url.pathname,
      req.method || 'GET',
      result.status,
      responseTime,
      clientIP,
      req.headers['user-agent'] as string || null,
      requestId
    );

    res.setHeader('X-Response-Time', `${responseTime}ms`);
    return res.status(result.status).json(result.data);

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', { message: error.message }, requestId));
  }
}
