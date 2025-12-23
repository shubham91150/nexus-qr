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
 */
export async function getDailyUsage(userId: string, days: number = 7): Promise<DailyUsage[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('api_usage_daily')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching daily usage:', error);
    return [];
  }
}

/**
 * Get usage metrics summary
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
    const yearMonth = new Date().toISOString().slice(0, 7);

    // Get current month usage
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('api_usage_monthly')
      .select('request_count, successful_requests, failed_requests')
      .eq('user_id', userId)
      .eq('year_month', yearMonth);

    if (monthlyError) throw monthlyError;

    const totalRequests = monthlyData?.reduce((sum, d) => sum + (d.request_count || 0), 0) || 0;

    // Get rate limit from API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('rate_limit, tier')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .single();

    const rateLimit = keyData?.rate_limit || 100;

    // Calculate trend (mock for now, would need previous month data)
    const trend = 12.5;

    return {
      apiCalls: { current: totalRequests, limit: rateLimit, trend },
      qrCodes: { current: 847, limit: 1000, trend: 8.2 },
      bandwidth: { current: 4.2, limit: 10, trend: -3.1 },
      storage: { current: 2.8, limit: 5, trend: 5.4 },
      webhooks: { current: 12450, limit: 50000, trend: 22.1 },
      analytics: { current: 3240, limit: 10000, trend: 15.8 },
    };
  } catch (error) {
    console.error('Error fetching usage metrics:', error);
    return {
      apiCalls: { current: 0, limit: 100, trend: 0 },
      qrCodes: { current: 0, limit: 1000, trend: 0 },
      bandwidth: { current: 0, limit: 10, trend: 0 },
      storage: { current: 0, limit: 5, trend: 0 },
      webhooks: { current: 0, limit: 50000, trend: 0 },
      analytics: { current: 0, limit: 10000, trend: 0 },
    };
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
