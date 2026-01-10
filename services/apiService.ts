import { supabase } from '../lib/supabase';

// =====================================================
// Types
// =====================================================

export type ApiTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  tier: ApiTier;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  rate_limit: number;
  permissions: ApiPermissions;
}

export interface ApiPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  analytics: boolean;
  bulk: boolean;
  webhooks: boolean;
}

export interface ApiUsageMonthly {
  id: string;
  api_key_id: string;
  year_month: string;
  request_count: number;
  successful_requests: number;
  failed_requests: number;
}

export interface ApiWebhook {
  id: string;
  user_id: string;
  api_key_id: string | null;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

export interface RateLimitInfo {
  allowed: boolean;
  reason?: string;
  limit: number;
  used: number;
  remaining: number;
}

// Tier configurations
export const TIER_CONFIG: Record<ApiTier, {
  name: string;
  price: number;
  priceLabel: string;
  requests: number;
  requestsLabel: string;
  features: string[];
  permissions: ApiPermissions;
}> = {
  free: {
    name: 'Free',
    price: 0,
    priceLabel: 'Free',
    requests: 100,
    requestsLabel: '100/month',
    features: ['All QR types', 'Full API access', 'Analytics', 'Perfect for testing'],
    permissions: { create: true, read: true, update: true, delete: true, analytics: true, bulk: true, webhooks: true }
  },
  starter: {
    name: 'Starter',
    price: 19,
    priceLabel: '$19/mo',
    requests: 5000,
    requestsLabel: '5,000/month',
    features: ['Dynamic QR codes', 'Full analytics', 'Bulk operations', 'Webhooks', 'Email support'],
    permissions: { create: true, read: true, update: true, delete: true, analytics: true, bulk: true, webhooks: true }
  },
  pro: {
    name: 'Pro',
    price: 49,
    priceLabel: '$49/mo',
    requests: 50000,
    requestsLabel: '50,000/month',
    features: ['Everything in Starter', 'Bulk operations', 'Webhooks', 'Priority support', 'Custom branding'],
    permissions: { create: true, read: true, update: true, delete: true, analytics: true, bulk: true, webhooks: true }
  },
  enterprise: {
    name: 'Enterprise',
    price: 0,
    priceLabel: 'Custom',
    requests: 999999999,
    requestsLabel: 'Unlimited',
    features: ['Everything in Pro', 'Unlimited requests', 'White-label API', 'SLA guarantee', 'Dedicated support', 'Custom integrations'],
    permissions: { create: true, read: true, update: true, delete: true, analytics: true, bulk: true, webhooks: true }
  }
};

// =====================================================
// API Key Management
// =====================================================

/**
 * Generate a new API key
 * Returns the full key only once - store it securely!
 */
export async function generateApiKey(
  userId: string,
  name: string = 'Default Key',
  tier: ApiTier = 'free'
): Promise<{ key: string; keyData: ApiKey } | null> {
  try {
    // Generate a random API key: nxqr_live_xxxxxxxxxxxxxxxxxxxx
    const randomBytes = crypto.getRandomValues(new Uint8Array(24));
    const keyString = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const fullKey = `nxqr_live_${keyString}`;
    const keyPrefix = fullKey.substring(0, 12); // nxqr_live_xx (exactly 12 chars)

    // Hash the key for storage (we never store the actual key)
    const encoder = new TextEncoder();
    const data = encoder.encode(fullKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const tierConfig = TIER_CONFIG[tier];

    const { data: keyData, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        tier,
        rate_limit: tierConfig.requests,
        permissions: tierConfig.permissions
      })
      .select()
      .single();

    if (error) throw error;

    return { key: fullKey, keyData };
  } catch (error) {
    console.error('Error generating API key:', error);
    return null;
  }
}

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }
}

/**
 * Update an API key
 */
export async function updateApiKey(
  keyId: string,
  updates: { name?: string; is_active?: boolean }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', keyId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating API key:', error);
    return false;
  }
}

/**
 * Delete an API key
 */
export async function deleteApiKey(keyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting API key:', error);
    return false;
  }
}

/**
 * Regenerate an API key (creates new key with same settings)
 */
export async function regenerateApiKey(keyId: string): Promise<{ key: string; keyData: ApiKey } | null> {
  try {
    // Get existing key details
    const { data: existingKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (fetchError || !existingKey) throw fetchError;

    // Delete old key
    await deleteApiKey(keyId);

    // Generate new key with same settings
    return generateApiKey(existingKey.user_id, existingKey.name, existingKey.tier);
  } catch (error) {
    console.error('Error regenerating API key:', error);
    return null;
  }
}

// =====================================================
// Usage Tracking
// =====================================================

/**
 * Get API usage for a key
 */
export async function getApiKeyUsage(keyId: string): Promise<ApiUsageMonthly[]> {
  try {
    const { data, error } = await supabase
      .from('api_usage_monthly')
      .select('*')
      .eq('api_key_id', keyId)
      .order('year_month', { ascending: false })
      .limit(12);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching API usage:', error);
    return [];
  }
}

/**
 * Get current month usage for a key
 */
export async function getCurrentMonthUsage(keyId: string): Promise<ApiUsageMonthly | null> {
  try {
    const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data, error } = await supabase
      .from('api_usage_monthly')
      .select('*')
      .eq('api_key_id', keyId)
      .eq('year_month', yearMonth)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || { request_count: 0, successful_requests: 0, failed_requests: 0 } as ApiUsageMonthly;
  } catch (error) {
    console.error('Error fetching current usage:', error);
    return null;
  }
}

/**
 * Get total usage for a user across all keys
 */
export async function getUserTotalUsage(userId: string): Promise<{
  totalRequests: number;
  totalKeys: number;
  activeKeys: number;
}> {
  try {
    const yearMonth = new Date().toISOString().slice(0, 7);

    // Get keys count
    const { data: keys, error: keysError } = await supabase
      .from('api_keys')
      .select('id, is_active')
      .eq('user_id', userId);

    if (keysError) throw keysError;

    // Get total usage this month
    const { data: usage, error: usageError } = await supabase
      .from('api_usage_monthly')
      .select('request_count')
      .eq('user_id', userId)
      .eq('year_month', yearMonth);

    if (usageError) throw usageError;

    const totalRequests = usage?.reduce((sum, u) => sum + (u.request_count || 0), 0) || 0;

    return {
      totalRequests,
      totalKeys: keys?.length || 0,
      activeKeys: keys?.filter(k => k.is_active).length || 0
    };
  } catch (error) {
    console.error('Error fetching user usage:', error);
    return { totalRequests: 0, totalKeys: 0, activeKeys: 0 };
  }
}

// =====================================================
// Webhooks Management
// =====================================================

/**
 * Create a webhook
 */
export async function createWebhook(
  userId: string,
  name: string,
  url: string,
  events: string[] = ['qr.scanned'],
  apiKeyId?: string
): Promise<ApiWebhook | null> {
  try {
    // Generate webhook secret
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const secret = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data, error } = await supabase
      .from('api_webhooks')
      .insert({
        user_id: userId,
        api_key_id: apiKeyId,
        name,
        url,
        secret,
        events
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating webhook:', error);
    return null;
  }
}

/**
 * Get user webhooks
 */
export async function getUserWebhooks(userId: string): Promise<ApiWebhook[]> {
  try {
    const { data, error } = await supabase
      .from('api_webhooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return [];
  }
}

/**
 * Update webhook
 */
export async function updateWebhook(
  webhookId: string,
  updates: { name?: string; url?: string; events?: string[]; is_active?: boolean }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('api_webhooks')
      .update(updates)
      .eq('id', webhookId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating webhook:', error);
    return false;
  }
}

/**
 * Delete webhook
 */
export async function deleteWebhook(webhookId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('api_webhooks')
      .delete()
      .eq('id', webhookId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return false;
  }
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Hash an API key for comparison
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Format large numbers for display
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Calculate usage percentage
 */
export function calculateUsagePercentage(used: number, limit: number): number {
  if (limit === 0 || limit >= 999999999) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: ApiTier): string {
  const colors: Record<ApiTier, string> = {
    free: '#718096',
    starter: '#3182CE',
    pro: '#805AD5',
    enterprise: '#D69E2E'
  };
  return colors[tier];
}
