import { supabase } from '../lib/supabase';

// =====================================================
// Types
// =====================================================

export interface AuditEvent {
  id: string;
  user_id: string;
  actor_type: 'user' | 'api_key' | 'system';
  actor_id: string;
  actor_name: string | null;
  actor_email: string | null;
  api_key_prefix: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  status: 'success' | 'failure' | 'warning';
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
  changes: { field: string; oldValue: string; newValue: string }[] | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UsageAlert {
  id: string;
  user_id: string;
  alert_type: 'warning' | 'critical' | 'info';
  message: string;
  metric: string;
  threshold: number | null;
  current_value: number | null;
  acknowledged: boolean;
  created_at: string;
}

export interface AlertSettings {
  id: string;
  user_id: string;
  warning_threshold: number;
  critical_threshold: number;
  email_notify: boolean;
  slack_notify: boolean;
  webhook_notify: boolean;
  slack_webhook_url: string | null;
}

export interface DailyUsage {
  id: string;
  user_id: string;
  date: string;
  api_calls: number;
  qr_codes_created: number;
  bandwidth_bytes: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
}

export interface PerformanceMetric {
  id: string;
  user_id: string;
  endpoint: string;
  method: string;
  time_bucket: string;
  request_count: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  error_count: number;
  error_rate: number;
  status: 'healthy' | 'degraded' | 'down';
}

export interface ApiError {
  id: string;
  user_id: string;
  endpoint: string;
  status_code: number;
  error_message: string | null;
  error_count: number;
  first_occurred: string;
  last_occurred: string;
  trend: 'up' | 'down' | 'stable';
}

export interface TeamMember {
  id: string;
  user_id: string;
  member_user_id: string | null;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  api_keys_count: number;
  last_active_at: string | null;
  joined_at: string;
  mfa_enabled: boolean;
  permissions: string[];
}

export interface CustomDomain {
  id: string;
  user_id: string;
  domain: string;
  status: 'active' | 'pending' | 'failed' | 'verifying';
  ssl_status: 'active' | 'pending' | 'expired' | 'none';
  ssl_expiry: string | null;
  is_primary: boolean;
  dns_verified: boolean;
  dns_records: { type: string; name: string; value: string; verified: boolean }[];
  verification_token: string | null;
  total_redirects: number;
  created_at: string;
}

// =====================================================
// Audit Trail Functions
// =====================================================

/**
 * Get audit events for a user
 */
export async function getAuditEvents(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    category?: string;
    status?: string;
    dateRange?: 'today' | 'week' | 'month';
    search?: string;
  } = {}
): Promise<AuditEvent[]> {
  try {
    let query = supabase
      .from('api_audit_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (options.category && options.category !== 'all') {
      query = query.ilike('action', `${options.category}%`);
    }

    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options.dateRange) {
      const now = new Date();
      let startDate: Date;

      switch (options.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }
      query = query.gte('created_at', startDate.toISOString());
    }

    if (options.search) {
      query = query.or(
        `actor_name.ilike.%${options.search}%,actor_email.ilike.%${options.search}%,action.ilike.%${options.search}%,resource_id.ilike.%${options.search}%`
      );
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit events:', error);
    return [];
  }
}

/**
 * Get audit event stats
 */
export async function getAuditStats(userId: string): Promise<{
  total: number;
  success: number;
  warning: number;
  failure: number;
}> {
  try {
    const { data, error } = await supabase
      .from('api_audit_events')
      .select('status')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      success: data?.filter(e => e.status === 'success').length || 0,
      warning: data?.filter(e => e.status === 'warning').length || 0,
      failure: data?.filter(e => e.status === 'failure').length || 0,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    return { total: 0, success: 0, warning: 0, failure: 0 };
  }
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  userId: string,
  event: {
    actorType: 'user' | 'api_key' | 'system';
    actorId: string;
    actorName?: string;
    actorEmail?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    resourceName?: string;
    status: 'success' | 'failure' | 'warning';
    ipAddress?: string;
    userAgent?: string;
    changes?: { field: string; oldValue: string; newValue: string }[];
    reason?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase.from('api_audit_events').insert({
      user_id: userId,
      actor_type: event.actorType,
      actor_id: event.actorId,
      actor_name: event.actorName,
      actor_email: event.actorEmail,
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      resource_name: event.resourceName,
      status: event.status,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      changes: event.changes,
      reason: event.reason,
      metadata: event.metadata || {},
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error logging audit event:', error);
    return false;
  }
}

// =====================================================
// Usage & Quota Functions
// =====================================================

/**
 * Get usage alerts for a user
 */
export async function getUsageAlerts(userId: string): Promise<UsageAlert[]> {
  try {
    const { data, error } = await supabase
      .from('usage_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching usage alerts:', error);
    return [];
  }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('usage_alerts')
      .update({ acknowledged: true })
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return false;
  }
}

/**
 * Get alert settings
 */
export async function getAlertSettings(userId: string): Promise<AlertSettings | null> {
  try {
    const { data, error } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error fetching alert settings:', error);
    return null;
  }
}

/**
 * Update alert settings
 */
export async function updateAlertSettings(
  userId: string,
  settings: Partial<AlertSettings>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('alert_settings')
      .upsert({
        user_id: userId,
        ...settings,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating alert settings:', error);
    return false;
  }
}

/**
 * Get daily usage for last N days
 * Fetches from api_usage table and aggregates by date
 */
export async function getDailyUsage(userId: string, days: number = 7): Promise<DailyUsage[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // First try the api_usage_daily table
    const { data: dailyData, error: dailyError } = await supabase
      .from('api_usage_daily')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (!dailyError && dailyData && dailyData.length > 0) {
      return dailyData;
    }

    // Fallback: Aggregate from api_usage table directly
    const { data: usageData, error: usageError } = await supabase
      .from('api_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (usageError) throw usageError;

    if (!usageData || usageData.length === 0) {
      return [];
    }

    // Aggregate by date
    const dailyMap = new Map<string, DailyUsage>();

    usageData.forEach((usage: any) => {
      const date = new Date(usage.created_at).toISOString().split('T')[0];
      const existing = dailyMap.get(date);

      if (existing) {
        existing.api_calls++;
        if (usage.status_code >= 200 && usage.status_code < 400) {
          existing.successful_requests++;
        } else {
          existing.failed_requests++;
        }
        existing.avg_response_time_ms = Math.round(
          (existing.avg_response_time_ms + (usage.response_time_ms || 0)) / 2
        );
      } else {
        dailyMap.set(date, {
          id: `daily_${date}`,
          user_id: userId,
          date,
          api_calls: 1,
          qr_codes_created: 0,
          bandwidth_bytes: 0,
          successful_requests: usage.status_code >= 200 && usage.status_code < 400 ? 1 : 0,
          failed_requests: usage.status_code >= 400 ? 1 : 0,
          avg_response_time_ms: usage.response_time_ms || 0,
        });
      }
    });

    return Array.from(dailyMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  } catch (error) {
    console.error('Error fetching daily usage:', error);
    return [];
  }
}

/**
 * Get usage metrics summary
 * Fetches real data from api_usage and dynamic_qr_codes tables
 */
export async function getUsageMetrics(userId: string): Promise<{
  apiCalls: { current: number; limit: number; trend: number };
  qrCodes: { current: number; limit: number; trend: number };
  bandwidth: { current: number; limit: number; trend: number };
  storage: { current: number; limit: number; trend: number };
  webhooks: { current: number; limit: number; trend: number };
  analytics: { current: number; limit: number; trend: number };
}> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month API calls from api_usage
    const { count: currentMonthCalls, error: currentError } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    // Get last month API calls for trend calculation
    const { count: lastMonthCalls, error: lastError } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfLastMonth.toISOString())
      .lte('created_at', endOfLastMonth.toISOString());

    // Get QR codes count for current month
    const { count: qrCodesCount, error: qrError } = await supabase
      .from('dynamic_qr_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    // Get total QR codes
    const { count: totalQrCodes, error: totalQrError } = await supabase
      .from('dynamic_qr_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get rate limit from API key
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('rate_limit, tier')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .single();

    const rateLimit = keyData?.rate_limit || 1000;
    const currentApiCalls = currentMonthCalls || 0;
    const previousApiCalls = lastMonthCalls || 0;

    // Calculate trend percentage
    const apiTrend = previousApiCalls > 0
      ? Math.round(((currentApiCalls - previousApiCalls) / previousApiCalls) * 100 * 10) / 10
      : currentApiCalls > 0 ? 100 : 0;

    // Get webhook delivery count
    const { count: webhookCount } = await supabase
      .from('webhook_deliveries')
      .select('*', { count: 'exact', head: true })
      .gte('delivered_at', startOfMonth.toISOString());

    return {
      apiCalls: {
        current: currentApiCalls,
        limit: rateLimit,
        trend: apiTrend
      },
      qrCodes: {
        current: qrCodesCount || 0,
        limit: 10000,
        trend: 0
      },
      bandwidth: {
        current: Math.round((currentApiCalls * 0.005) * 10) / 10, // Estimate ~5KB per request
        limit: 50,
        trend: 0
      },
      storage: {
        current: Math.round((totalQrCodes || 0) * 0.01 * 10) / 10, // Estimate ~10KB per QR
        limit: 10,
        trend: 0
      },
      webhooks: {
        current: webhookCount || 0,
        limit: 50000,
        trend: 0
      },
      analytics: {
        current: currentApiCalls, // Analytics queries = API calls in this context
        limit: rateLimit * 10,
        trend: 0
      },
    };
  } catch (error) {
    console.error('Error fetching usage metrics:', error);
    return {
      apiCalls: { current: 0, limit: 1000, trend: 0 },
      qrCodes: { current: 0, limit: 10000, trend: 0 },
      bandwidth: { current: 0, limit: 50, trend: 0 },
      storage: { current: 0, limit: 10, trend: 0 },
      webhooks: { current: 0, limit: 50000, trend: 0 },
      analytics: { current: 0, limit: 10000, trend: 0 },
    };
  }
}

// =====================================================
// API Logs Functions
// =====================================================

export interface ApiRequestLog {
  id: string;
  request_id: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string;
  user_agent: string;
  api_key_name: string;
  api_key_prefix: string;
  created_at: string;
}

/**
 * Get API request logs from api_usage table
 */
export async function getApiLogs(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    method?: string;
    status?: string;
    apiKeyId?: string;
    search?: string;
  } = {}
): Promise<ApiRequestLog[]> {
  try {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    let query = supabase
      .from('api_usage')
      .select(`
        id,
        request_id,
        method,
        endpoint,
        status_code,
        response_time_ms,
        ip_address,
        user_agent,
        api_key_id,
        created_at,
        api_keys!left(name, key_prefix)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.method && options.method !== 'all') {
      query = query.eq('method', options.method);
    }

    if (options.status && options.status !== 'all') {
      if (options.status === 'success') {
        query = query.gte('status_code', 200).lt('status_code', 400);
      } else if (options.status === 'error') {
        query = query.gte('status_code', 400);
      } else {
        query = query.eq('status_code', parseInt(options.status));
      }
    }

    if (options.apiKeyId && options.apiKeyId !== 'all') {
      query = query.eq('api_key_id', options.apiKeyId);
    }

    if (options.search) {
      query = query.or(`endpoint.ilike.%${options.search}%,ip_address.ilike.%${options.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((log: any) => ({
      id: log.id,
      request_id: log.request_id || `req_${log.id.slice(0, 8)}`,
      method: log.method || 'GET',
      endpoint: log.endpoint || '/api/v1/qr',
      status_code: log.status_code || 200,
      response_time_ms: log.response_time_ms || 0,
      ip_address: log.ip_address || '0.0.0.0',
      user_agent: log.user_agent || 'Unknown',
      api_key_name: log.api_keys?.name || 'Unknown',
      api_key_prefix: log.api_keys?.key_prefix || 'nxqr_***',
      created_at: log.created_at,
    }));
  } catch (error) {
    console.error('Error fetching API logs:', error);
    return [];
  }
}

/**
 * Get API logs stats
 */
export async function getApiLogsStats(userId: string): Promise<{
  total: number;
  successful: number;
  errors: number;
  avgResponseTime: number;
}> {
  try {
    const { data, error } = await supabase
      .from('api_usage')
      .select('status_code, response_time_ms')
      .eq('user_id', userId);

    if (error) throw error;

    const logs = data || [];
    const total = logs.length;
    const successful = logs.filter(l => l.status_code >= 200 && l.status_code < 400).length;
    const errors = logs.filter(l => l.status_code >= 400).length;
    const avgResponseTime = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length)
      : 0;

    return { total, successful, errors, avgResponseTime };
  } catch (error) {
    console.error('Error fetching API logs stats:', error);
    return { total: 0, successful: 0, errors: 0, avgResponseTime: 0 };
  }
}

/**
 * Get endpoint analytics from api_usage
 */
export async function getEndpointAnalytics(userId: string, days: number = 30): Promise<{
  endpoint: string;
  method: string;
  count: number;
  avgTime: number;
  errorRate: number;
}[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('api_usage')
      .select('endpoint, method, status_code, response_time_ms')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Aggregate by endpoint
    const endpointMap = new Map<string, {
      count: number;
      totalTime: number;
      errors: number;
    }>();

    (data || []).forEach((log: any) => {
      const key = `${log.method} ${log.endpoint}`;
      const existing = endpointMap.get(key);

      if (existing) {
        existing.count++;
        existing.totalTime += log.response_time_ms || 0;
        if (log.status_code >= 400) existing.errors++;
      } else {
        endpointMap.set(key, {
          count: 1,
          totalTime: log.response_time_ms || 0,
          errors: log.status_code >= 400 ? 1 : 0,
        });
      }
    });

    return Array.from(endpointMap.entries())
      .map(([key, stats]) => {
        const [method, endpoint] = key.split(' ');
        return {
          endpoint,
          method,
          count: stats.count,
          avgTime: Math.round(stats.totalTime / stats.count),
          errorRate: Math.round((stats.errors / stats.count) * 100 * 10) / 10,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  } catch (error) {
    console.error('Error fetching endpoint analytics:', error);
    return [];
  }
}

/**
 * Get status code distribution
 */
export async function getStatusCodeDistribution(userId: string, days: number = 30): Promise<{
  status: number;
  count: number;
}[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('api_usage')
      .select('status_code')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const statusMap = new Map<number, number>();

    (data || []).forEach((log: any) => {
      const count = statusMap.get(log.status_code) || 0;
      statusMap.set(log.status_code, count + 1);
    });

    return Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error fetching status code distribution:', error);
    return [];
  }
}

/**
 * Get hourly distribution
 */
export async function getHourlyDistribution(userId: string, days: number = 7): Promise<{
  hour: number;
  count: number;
}[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('api_usage')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const hourMap = new Map<number, number>();

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, 0);
    }

    (data || []).forEach((log: any) => {
      const hour = new Date(log.created_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    return Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
  } catch (error) {
    console.error('Error fetching hourly distribution:', error);
    return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  }
}

// =====================================================
// Performance Monitoring Functions
// =====================================================

/**
 * Get performance metrics
 */
export async function getPerformanceMetrics(
  userId: string,
  timeRange: 'hour' | 'day' | 'week' = 'day'
): Promise<PerformanceMetric[]> {
  try {
    const now = new Date();
    let startTime: Date;

    switch (timeRange) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const { data, error } = await supabase
      .from('api_performance_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('time_bucket', startTime.toISOString())
      .order('time_bucket', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return [];
  }
}

/**
 * Get endpoint performance summary
 */
export async function getEndpointPerformance(userId: string): Promise<{
  endpoint: string;
  method: string;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  requests: number;
  errorRate: number;
  status: 'healthy' | 'degraded' | 'down';
}[]> {
  try {
    // Get latest metrics grouped by endpoint
    const { data, error } = await supabase
      .from('api_performance_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('time_bucket', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Group by endpoint and aggregate
    const endpointMap = new Map<string, typeof data>();
    data?.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, []);
      }
      endpointMap.get(key)?.push(metric);
    });

    return Array.from(endpointMap.entries()).map(([key, metrics]) => {
      const [method, endpoint] = key.split(' ');
      const avgLatency = metrics.reduce((sum, m) => sum + m.avg_latency_ms, 0) / metrics.length;
      const totalRequests = metrics.reduce((sum, m) => sum + m.request_count, 0);
      const totalErrors = metrics.reduce((sum, m) => sum + m.error_count, 0);

      return {
        endpoint,
        method,
        avgLatency: Math.round(avgLatency),
        p50: metrics[0]?.p50_latency_ms || 0,
        p95: metrics[0]?.p95_latency_ms || 0,
        p99: metrics[0]?.p99_latency_ms || 0,
        requests: totalRequests,
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
        status: avgLatency > 1000 ? 'down' : avgLatency > 500 ? 'degraded' : 'healthy',
      };
    });
  } catch (error) {
    console.error('Error fetching endpoint performance:', error);
    return [];
  }
}

/**
 * Get API errors
 */
export async function getApiErrors(userId: string, limit: number = 10): Promise<ApiError[]> {
  try {
    const { data, error } = await supabase
      .from('api_errors')
      .select('*')
      .eq('user_id', userId)
      .order('last_occurred', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching API errors:', error);
    return [];
  }
}

// =====================================================
// Team Management Functions
// =====================================================

/**
 * Get team members
 */
export async function getTeamMembers(userId: string): Promise<TeamMember[]> {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
}

/**
 * Invite team member
 */
export async function inviteTeamMember(
  userId: string,
  email: string,
  role: 'admin' | 'developer' | 'viewer',
  invitedBy: string
): Promise<TeamMember | null> {
  try {
    // Generate invitation token
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data, error } = await supabase
      .from('team_members')
      .insert({
        user_id: userId,
        email,
        role,
        status: 'pending',
        invited_by: invitedBy,
        invitation_token: token,
        invitation_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inviting team member:', error);
    return null;
  }
}

/**
 * Update team member
 */
export async function updateTeamMember(
  memberId: string,
  updates: { role?: string; status?: string; permissions?: string[] }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', memberId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating team member:', error);
    return false;
  }
}

/**
 * Remove team member
 */
export async function removeTeamMember(memberId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing team member:', error);
    return false;
  }
}

// =====================================================
// Custom Domain Functions
// =====================================================

/**
 * Get custom domains
 */
export async function getCustomDomains(userId: string): Promise<CustomDomain[]> {
  try {
    const { data, error } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching custom domains:', error);
    return [];
  }
}

/**
 * Add custom domain
 */
export async function addCustomDomain(
  userId: string,
  domain: string
): Promise<CustomDomain | null> {
  try {
    // Generate verification token
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const token = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const dnsRecords = [
      {
        type: 'CNAME',
        name: domain,
        value: 'qr.nexusqr.app',
        verified: false,
      },
      {
        type: 'TXT',
        name: `_nexusqr.${domain}`,
        value: `nexusqr-verify=${token}`,
        verified: false,
      },
    ];

    const { data, error } = await supabase
      .from('custom_domains')
      .insert({
        user_id: userId,
        domain,
        status: 'pending',
        dns_records: dnsRecords,
        verification_token: token,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding custom domain:', error);
    return null;
  }
}

/**
 * Verify custom domain DNS
 */
export async function verifyDomainDns(domainId: string): Promise<{
  verified: boolean;
  records: { type: string; verified: boolean }[];
}> {
  try {
    // In a real implementation, this would check DNS records
    // For now, we'll simulate verification

    const { data: domain, error } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('id', domainId)
      .single();

    if (error) throw error;

    // Simulate DNS check (in production, use DNS lookup API)
    const verified = Math.random() > 0.3; // 70% chance of success for demo

    if (verified) {
      await supabase
        .from('custom_domains')
        .update({
          status: 'active',
          ssl_status: 'active',
          dns_verified: true,
          ssl_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', domainId);
    }

    return {
      verified,
      records: domain.dns_records.map((r: { type: string }) => ({
        type: r.type,
        verified,
      })),
    };
  } catch (error) {
    console.error('Error verifying domain DNS:', error);
    return { verified: false, records: [] };
  }
}

/**
 * Delete custom domain
 */
export async function deleteCustomDomain(domainId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('custom_domains')
      .delete()
      .eq('id', domainId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting custom domain:', error);
    return false;
  }
}

/**
 * Set primary domain
 */
export async function setPrimaryDomain(userId: string, domainId: string): Promise<boolean> {
  try {
    // First, unset all primary
    await supabase
      .from('custom_domains')
      .update({ is_primary: false })
      .eq('user_id', userId);

    // Then set the new primary
    const { error } = await supabase
      .from('custom_domains')
      .update({ is_primary: true })
      .eq('id', domainId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error setting primary domain:', error);
    return false;
  }
}

// =====================================================
// Webhook Functions
// =====================================================

export interface WebhookSecret {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used: string | null;
  status: 'active' | 'rotated';
}

export interface WebhookVerificationLog {
  id: string;
  webhook_id: string;
  timestamp: string;
  status: 'valid' | 'invalid' | 'expired' | 'missing';
  signature_received: string;
  signature_expected: string;
  payload: string;
}

/**
 * Get webhook secrets for a user
 */
export async function getWebhookSecrets(userId: string): Promise<WebhookSecret[]> {
  try {
    const { data, error } = await supabase
      .from('api_webhooks')
      .select('id, name, secret, created_at, last_triggered_at, is_active')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to match WebhookSecret interface
    return (data || []).map(webhook => ({
      id: webhook.id,
      name: webhook.name,
      prefix: webhook.secret ? `whsec_${webhook.secret.substring(0, 8)}...` : 'whsec_...',
      created_at: webhook.created_at,
      last_used: webhook.last_triggered_at,
      status: webhook.is_active ? 'active' as const : 'rotated' as const,
    }));
  } catch (error) {
    console.error('Error fetching webhook secrets:', error);
    return [];
  }
}

/**
 * Get webhook verification logs
 */
export async function getWebhookVerificationLogs(userId: string, limit: number = 20): Promise<WebhookVerificationLog[]> {
  try {
    // Get webhook IDs for this user
    const { data: webhooks, error: webhookError } = await supabase
      .from('api_webhooks')
      .select('id')
      .eq('user_id', userId);

    if (webhookError) throw webhookError;
    if (!webhooks || webhooks.length === 0) return [];

    const webhookIds = webhooks.map(w => w.id);

    // Get delivery logs for these webhooks
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .in('webhook_id', webhookIds)
      .order('delivered_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Transform data to match WebhookVerificationLog interface
    return (data || []).map(log => ({
      id: log.id,
      webhook_id: log.webhook_id,
      timestamp: log.delivered_at,
      status: log.success ? 'valid' as const :
              log.response_status === 401 ? 'invalid' as const :
              log.response_status === 408 ? 'expired' as const : 'missing' as const,
      signature_received: 'sha256=...',
      signature_expected: 'sha256=...',
      payload: typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload),
    }));
  } catch (error) {
    console.error('Error fetching webhook verification logs:', error);
    return [];
  }
}

/**
 * Rotate webhook secret
 */
export async function rotateWebhookSecret(webhookId: string): Promise<string | null> {
  try {
    // Generate a new secret
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const newSecret = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { error } = await supabase
      .from('api_webhooks')
      .update({ secret: newSecret })
      .eq('id', webhookId);

    if (error) throw error;
    return newSecret;
  } catch (error) {
    console.error('Error rotating webhook secret:', error);
    return null;
  }
}

// =====================================================
// Daily Usage Tracking Functions
// =====================================================

/**
 * Track API usage for a user (increments daily usage counters)
 */
export async function trackDailyUsage(
  userId: string,
  options: {
    apiKeyId?: string;
    apiCalls?: number;
    qrCodes?: number;
    bandwidth?: number;
    success?: boolean;
    responseTime?: number;
  } = {}
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('increment_daily_usage', {
      p_user_id: userId,
      p_api_key_id: options.apiKeyId || null,
      p_api_calls: options.apiCalls ?? 1,
      p_qr_codes: options.qrCodes ?? 0,
      p_bandwidth: options.bandwidth ?? 0,
      p_success: options.success ?? true,
      p_response_time: options.responseTime ?? 0,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error tracking daily usage:', error);
    return false;
  }
}

/**
 * Seed demo daily usage data for testing
 * This should be called once for new users who want to see demo data
 */
export async function seedDemoUsageData(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('seed_demo_daily_usage', {
      p_user_id: userId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error seeding demo usage data:', error);
    return false;
  }
}

/**
 * Direct insert/upsert for daily usage (fallback if RPC not available)
 */
export async function upsertDailyUsage(
  userId: string,
  date: string,
  data: {
    apiKeyId?: string;
    apiCalls?: number;
    qrCodesCreated?: number;
    bandwidthBytes?: number;
    successfulRequests?: number;
    failedRequests?: number;
    avgResponseTimeMs?: number;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('api_usage_daily')
      .upsert(
        {
          user_id: userId,
          api_key_id: data.apiKeyId || null,
          date,
          api_calls: data.apiCalls ?? 0,
          qr_codes_created: data.qrCodesCreated ?? 0,
          bandwidth_bytes: data.bandwidthBytes ?? 0,
          successful_requests: data.successfulRequests ?? 0,
          failed_requests: data.failedRequests ?? 0,
          avg_response_time_ms: data.avgResponseTimeMs ?? 0,
        },
        { onConflict: 'user_id,api_key_id,date' }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error upserting daily usage:', error);
    return false;
  }
}

/**
 * Generate and insert demo data directly (no RPC needed)
 * Call this if the database migration hasn't been run yet
 */
export async function generateDemoUsageData(userId: string): Promise<boolean> {
  try {
    const today = new Date();
    const demoData: {
      user_id: string;
      date: string;
      api_calls: number;
      qr_codes_created: number;
      bandwidth_bytes: number;
      successful_requests: number;
      failed_requests: number;
      avg_response_time_ms: number;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const apiCalls = Math.floor(Math.random() * 500) + 100;
      const successfulRequests = Math.floor(apiCalls * 0.9);
      const failedRequests = apiCalls - successfulRequests;

      demoData.push({
        user_id: userId,
        date: dateStr,
        api_calls: apiCalls,
        qr_codes_created: Math.floor(Math.random() * 50) + 10,
        bandwidth_bytes: Math.floor(Math.random() * 50000000) + 10000000,
        successful_requests: successfulRequests,
        failed_requests: failedRequests,
        avg_response_time_ms: Math.floor(Math.random() * 150) + 50,
      });
    }

    const { error } = await supabase
      .from('api_usage_daily')
      .upsert(demoData, { onConflict: 'user_id,api_key_id,date' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error generating demo usage data:', error);
    return false;
  }
}
