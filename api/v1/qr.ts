import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

// =====================================================
// Types
// =====================================================

interface ApiKeyValidation {
  valid: boolean;
  reason?: string;
  key_id?: string;
  user_id?: string;
  tier?: string;
  permissions?: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    analytics: boolean;
    bulk: boolean;
    webhooks: boolean;
  };
  rate_limit?: number;
}

interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  limit: number;
  used: number;
  remaining: number;
}

interface QRCreateRequest {
  type: 'url' | 'text' | 'vcard' | 'wifi' | 'email' | 'sms' | 'phone';
  content: string | object;
  title?: string;
  is_dynamic?: boolean;
  options?: {
    width?: number;
    margin?: number;
    color?: string;
    background?: string;
    format?: 'png' | 'svg' | 'base64';
  };
}

interface QRUpdateRequest {
  content?: string | object;
  title?: string;
  is_active?: boolean;
}

// =====================================================
// Supabase Admin Client
// =====================================================

function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// =====================================================
// API Key Validation
// =====================================================

async function validateApiKey(apiKey: string, db: SupabaseClient): Promise<ApiKeyValidation> {
  try {
    // Hash the API key
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Validate using database function
    const { data: result, error } = await db.rpc('validate_api_key', { p_key_hash: keyHash });

    if (error) throw error;
    return result as ApiKeyValidation;
  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false, reason: 'Validation error' };
  }
}

async function checkRateLimit(keyId: string, db: SupabaseClient): Promise<RateLimitCheck> {
  try {
    const { data: result, error } = await db.rpc('check_rate_limit', { p_api_key_id: keyId });
    if (error) throw error;
    return result as RateLimitCheck;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: false, reason: 'Rate limit check failed', limit: 0, used: 0, remaining: 0 };
  }
}

async function logApiUsage(
  db: SupabaseClient,
  keyId: string,
  userId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress: string | null,
  userAgent: string | null
): Promise<void> {
  try {
    // Log individual request
    await db.from('api_usage').insert({
      api_key_id: keyId,
      user_id: userId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // Increment monthly usage
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
// QR Code Generation
// =====================================================

function buildQRContent(type: string, content: string | object): string {
  if (typeof content === 'string') return content;

  switch (type) {
    case 'vcard':
      const vc = content as any;
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
      const wifi = content as any;
      return `WIFI:T:${wifi.encryption || 'WPA'};S:${wifi.ssid || ''};P:${wifi.password || ''};;`;

    case 'email':
      const email = content as any;
      return `mailto:${email.address || ''}?subject=${encodeURIComponent(email.subject || '')}&body=${encodeURIComponent(email.body || '')}`;

    case 'sms':
      const sms = content as any;
      return `sms:${sms.phone || ''}?body=${encodeURIComponent(sms.message || '')}`;

    case 'phone':
      return `tel:${(content as any).number || content}`;

    default:
      return JSON.stringify(content);
  }
}

async function generateQRCodeImage(
  content: string,
  options: QRCreateRequest['options'] = {}
): Promise<string> {
  const qrOptions = {
    width: options.width || 400,
    margin: options.margin || 2,
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
// API Handlers
// =====================================================

async function handleCreate(
  db: SupabaseClient,
  userId: string,
  body: QRCreateRequest,
  baseUrl: string
): Promise<{ status: number; data: any }> {
  try {
    const qrContent = buildQRContent(body.type, body.content);
    const isDynamic = body.is_dynamic !== false;

    // Create QR record in database
    const shortCode = Math.random().toString(36).substring(2, 10);

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
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    // Generate QR code image
    const qrUrl = isDynamic ? `${baseUrl}/r/${shortCode}` : qrContent;
    const qrImage = await generateQRCodeImage(qrUrl, body.options);

    return {
      status: 201,
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
    };
  } catch (error: any) {
    console.error('Create QR error:', error);
    return { status: 500, data: { error: 'Failed to create QR code', details: error.message } };
  }
}

async function handleRead(
  db: SupabaseClient,
  userId: string,
  qrId: string
): Promise<{ status: number; data: any }> {
  try {
    const { data, error } = await db
      .from('dynamic_qr_codes')
      .select('*')
      .eq('id', qrId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { status: 404, data: { error: 'QR code not found' } };
    }

    return { status: 200, data };
  } catch (error: any) {
    return { status: 500, data: { error: 'Failed to fetch QR code', details: error.message } };
  }
}

async function handleList(
  db: SupabaseClient,
  userId: string,
  query: any
): Promise<{ status: number; data: any }> {
  try {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    let queryBuilder = db
      .from('dynamic_qr_codes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.type) {
      queryBuilder = queryBuilder.eq('content_type', query.type);
    }

    if (query.is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', query.is_active === 'true');
    }

    const { data, error, count } = await queryBuilder;

    if (error) throw error;

    return {
      status: 200,
      data: {
        items: data,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit)
        }
      }
    };
  } catch (error: any) {
    return { status: 500, data: { error: 'Failed to list QR codes', details: error.message } };
  }
}

async function handleUpdate(
  db: SupabaseClient,
  userId: string,
  qrId: string,
  body: QRUpdateRequest
): Promise<{ status: number; data: any }> {
  try {
    const updates: any = {};

    if (body.content !== undefined) {
      updates.content_data = typeof body.content === 'object' ? body.content : { value: body.content };
      if (typeof body.content === 'string' && body.content.startsWith('http')) {
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

    if (error || !data) {
      return { status: 404, data: { error: 'QR code not found or update failed' } };
    }

    return { status: 200, data };
  } catch (error: any) {
    return { status: 500, data: { error: 'Failed to update QR code', details: error.message } };
  }
}

async function handleDelete(
  db: SupabaseClient,
  userId: string,
  qrId: string
): Promise<{ status: number; data: any }> {
  try {
    const { error } = await db
      .from('dynamic_qr_codes')
      .delete()
      .eq('id', qrId)
      .eq('user_id', userId);

    if (error) throw error;

    return { status: 200, data: { message: 'QR code deleted successfully' } };
  } catch (error: any) {
    return { status: 500, data: { error: 'Failed to delete QR code', details: error.message } };
  }
}

async function handleAnalytics(
  db: SupabaseClient,
  userId: string,
  qrId: string,
  query: any
): Promise<{ status: number; data: any }> {
  try {
    // Verify ownership
    const { data: qr, error: qrError } = await db
      .from('dynamic_qr_codes')
      .select('id, short_code')
      .eq('id', qrId)
      .eq('user_id', userId)
      .single();

    if (qrError || !qr) {
      return { status: 404, data: { error: 'QR code not found' } };
    }

    // Get scan analytics
    const days = parseInt(query.days) || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const { data: scans, error: scansError } = await db
      .from('qr_scans')
      .select('*')
      .eq('qr_id', qrId)
      .gte('scanned_at', fromDate.toISOString())
      .order('scanned_at', { ascending: false });

    if (scansError) throw scansError;

    // Aggregate data
    const totalScans = scans?.length || 0;
    const uniqueIPs = new Set(scans?.map(s => s.ip_address)).size;

    // Group by date
    const scansByDate: Record<string, number> = {};
    scans?.forEach(scan => {
      const date = new Date(scan.scanned_at).toISOString().split('T')[0];
      scansByDate[date] = (scansByDate[date] || 0) + 1;
    });

    // Group by country
    const scansByCountry: Record<string, number> = {};
    scans?.forEach(scan => {
      const country = scan.country || 'Unknown';
      scansByCountry[country] = (scansByCountry[country] || 0) + 1;
    });

    // Group by device
    const scansByDevice: Record<string, number> = {};
    scans?.forEach(scan => {
      const device = scan.device_type || 'Unknown';
      scansByDevice[device] = (scansByDevice[device] || 0) + 1;
    });

    return {
      status: 200,
      data: {
        qr_id: qrId,
        period_days: days,
        total_scans: totalScans,
        unique_visitors: uniqueIPs,
        scans_by_date: scansByDate,
        scans_by_country: scansByCountry,
        scans_by_device: scansByDevice,
        recent_scans: scans?.slice(0, 10) || []
      }
    };
  } catch (error: any) {
    return { status: 500, data: { error: 'Failed to fetch analytics', details: error.message } };
  }
}

async function handleBulkCreate(
  db: SupabaseClient,
  userId: string,
  body: { items: QRCreateRequest[] },
  baseUrl: string
): Promise<{ status: number; data: any }> {
  try {
    if (!body.items || !Array.isArray(body.items)) {
      return { status: 400, data: { error: 'items array is required' } };
    }

    if (body.items.length > 100) {
      return { status: 400, data: { error: 'Maximum 100 items per bulk request' } };
    }

    const results = await Promise.all(
      body.items.map(item => handleCreate(db, userId, item, baseUrl))
    );

    const successful = results.filter(r => r.status === 201);
    const failed = results.filter(r => r.status !== 201);

    return {
      status: 200,
      data: {
        total: body.items.length,
        successful: successful.length,
        failed: failed.length,
        results: results.map((r, i) => ({
          index: i,
          success: r.status === 201,
          data: r.data
        }))
      }
    };
  } catch (error: any) {
    return { status: 500, data: { error: 'Bulk operation failed', details: error.message } };
  }
}

// =====================================================
// Main Handler
// =====================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = getSupabaseAdmin();

    // Extract API key from header
    const apiKey = req.headers['x-api-key'] as string ||
                   (req.headers.authorization?.replace('Bearer ', ''));

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Use X-API-Key header or Bearer token.'
      });
    }

    // Validate API key
    const keyValidation = await validateApiKey(apiKey, db);

    if (!keyValidation.valid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: keyValidation.reason
      });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(keyValidation.key_id!, db);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Used', rateLimit.used);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: rateLimit.reason,
        limit: rateLimit.limit,
        used: rateLimit.used,
        remaining: rateLimit.remaining
      });
    }

    // Parse the path
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Expected: ['api', 'v1', 'qr', ...rest]

    const resource = pathParts[3]; // 'qr' or specific ID
    const action = pathParts[4]; // 'analytics', 'bulk', or undefined

    const userId = keyValidation.user_id!;
    const permissions = keyValidation.permissions!;
    const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    let result: { status: number; data: any };

    // Route the request
    switch (req.method) {
      case 'GET':
        if (!permissions.read) {
          result = { status: 403, data: { error: 'Read permission denied' } };
        } else if (resource && action === 'analytics') {
          if (!permissions.analytics) {
            result = { status: 403, data: { error: 'Analytics permission denied' } };
          } else {
            result = await handleAnalytics(db, userId, resource, req.query);
          }
        } else if (resource && resource !== 'qr') {
          result = await handleRead(db, userId, resource);
        } else {
          result = await handleList(db, userId, req.query);
        }
        break;

      case 'POST':
        if (!permissions.create) {
          result = { status: 403, data: { error: 'Create permission denied' } };
        } else if (action === 'bulk') {
          if (!permissions.bulk) {
            result = { status: 403, data: { error: 'Bulk operations not allowed on your plan' } };
          } else {
            result = await handleBulkCreate(db, userId, req.body, baseUrl);
          }
        } else {
          result = await handleCreate(db, userId, req.body, baseUrl);
        }
        break;

      case 'PATCH':
        if (!permissions.update) {
          result = { status: 403, data: { error: 'Update permission denied' } };
        } else if (!resource || resource === 'qr') {
          result = { status: 400, data: { error: 'QR ID is required' } };
        } else {
          result = await handleUpdate(db, userId, resource, req.body);
        }
        break;

      case 'DELETE':
        if (!permissions.delete) {
          result = { status: 403, data: { error: 'Delete permission denied' } };
        } else if (!resource || resource === 'qr') {
          result = { status: 400, data: { error: 'QR ID is required' } };
        } else {
          result = await handleDelete(db, userId, resource);
        }
        break;

      default:
        result = { status: 405, data: { error: 'Method not allowed' } };
    }

    // Log API usage
    const responseTime = Date.now() - startTime;
    await logApiUsage(
      db,
      keyValidation.key_id!,
      userId,
      url.pathname,
      req.method || 'GET',
      result.status,
      responseTime,
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || null,
      req.headers['user-agent'] as string || null
    );

    return res.status(result.status).json(result.data);

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
