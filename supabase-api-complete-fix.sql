-- =====================================================
-- NEXUS QR - COMPLETE API DATABASE FIX
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. API KEYS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Key',
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  tier TEXT DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 100,
  permissions JSONB DEFAULT '{"create": true, "read": true, "update": false, "delete": false, "analytics": false, "bulk": false, "webhooks": false}',
  ip_whitelist TEXT[] DEFAULT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. API USAGE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. API USAGE MONTHLY (for rate limiting)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_usage_monthly (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL,
  request_count INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(api_key_id, year_month)
);

-- =====================================================
-- 4. API IDEMPOTENCY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_idempotency (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(idempotency_key, user_id)
);

-- =====================================================
-- 5. API WEBHOOKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'My Webhook',
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] DEFAULT ARRAY['qr.created', 'qr.scanned'],
  is_active BOOLEAN DEFAULT true,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. WEBHOOK DELIVERIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID REFERENCES api_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. ADD MISSING COLUMNS TO dynamic_qr_codes
-- =====================================================
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'url';

ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS content_data JSONB DEFAULT '{}';

ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS redirect_url TEXT;

ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS is_dynamic BOOLEAN DEFAULT true;

ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS api_key_id UUID;

ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS qr_image_data TEXT;

ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS short_url TEXT;

ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS qr_category TEXT DEFAULT 'direct';

ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sync existing destination_url to redirect_url
UPDATE dynamic_qr_codes
SET redirect_url = destination_url
WHERE redirect_url IS NULL AND destination_url IS NOT NULL;

-- =====================================================
-- 8. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_monthly_key_month ON api_usage_monthly(api_key_id, year_month);
CREATE INDEX IF NOT EXISTS idx_api_idempotency_key ON api_idempotency(idempotency_key, user_id);
CREATE INDEX IF NOT EXISTS idx_api_webhooks_user_id ON api_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_content_type ON dynamic_qr_codes(content_type);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_is_dynamic ON dynamic_qr_codes(is_dynamic);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_api_key_id ON dynamic_qr_codes(api_key_id);

-- =====================================================
-- 9. CREATE FUNCTIONS
-- =====================================================

-- Function: Check Rate Limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_api_key_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate_limit INTEGER;
  v_current_usage INTEGER;
  v_year_month VARCHAR(7);
BEGIN
  v_year_month := TO_CHAR(NOW(), 'YYYY-MM');

  -- Get rate limit for the API key
  SELECT rate_limit INTO v_rate_limit
  FROM api_keys
  WHERE id = p_api_key_id AND is_active = true;

  IF v_rate_limit IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'API key not found or inactive', 'limit', 0, 'used', 0, 'remaining', 0);
  END IF;

  -- Get current month usage
  SELECT COALESCE(request_count, 0) INTO v_current_usage
  FROM api_usage_monthly
  WHERE api_key_id = p_api_key_id AND year_month = v_year_month;

  IF v_current_usage IS NULL THEN
    v_current_usage := 0;
  END IF;

  IF v_current_usage >= v_rate_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded',
      'limit', v_rate_limit,
      'used', v_current_usage,
      'remaining', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_rate_limit,
    'used', v_current_usage,
    'remaining', v_rate_limit - v_current_usage
  );
END;
$$;

-- Function: Increment API Usage
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_api_key_id UUID,
  p_user_id UUID,
  p_success BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year_month VARCHAR(7);
BEGIN
  v_year_month := TO_CHAR(NOW(), 'YYYY-MM');

  INSERT INTO api_usage_monthly (api_key_id, year_month, request_count, successful_requests, failed_requests)
  VALUES (p_api_key_id, v_year_month, 1, CASE WHEN p_success THEN 1 ELSE 0 END, CASE WHEN p_success THEN 0 ELSE 1 END)
  ON CONFLICT (api_key_id, year_month)
  DO UPDATE SET
    request_count = api_usage_monthly.request_count + 1,
    successful_requests = api_usage_monthly.successful_requests + CASE WHEN p_success THEN 1 ELSE 0 END,
    failed_requests = api_usage_monthly.failed_requests + CASE WHEN p_success THEN 0 ELSE 1 END,
    updated_at = NOW();
END;
$$;

-- =====================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- API Keys Policies
DROP POLICY IF EXISTS "Users can manage own API keys" ON api_keys;
CREATE POLICY "Users can manage own API keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);

-- API Usage Policies
DROP POLICY IF EXISTS "Users can view own API usage" ON api_usage;
CREATE POLICY "Users can view own API usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert API usage" ON api_usage;
CREATE POLICY "Service can insert API usage" ON api_usage
  FOR INSERT WITH CHECK (true);

-- API Usage Monthly Policies
DROP POLICY IF EXISTS "Users can view own monthly usage" ON api_usage_monthly;
CREATE POLICY "Users can view own monthly usage" ON api_usage_monthly
  FOR SELECT USING (
    api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service can manage monthly usage" ON api_usage_monthly;
CREATE POLICY "Service can manage monthly usage" ON api_usage_monthly
  FOR ALL USING (true);

-- Idempotency Policies
DROP POLICY IF EXISTS "Users can manage own idempotency" ON api_idempotency;
CREATE POLICY "Users can manage own idempotency" ON api_idempotency
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage idempotency" ON api_idempotency;
CREATE POLICY "Service can manage idempotency" ON api_idempotency
  FOR ALL USING (true);

-- Webhooks Policies
DROP POLICY IF EXISTS "Users can manage own webhooks" ON api_webhooks;
CREATE POLICY "Users can manage own webhooks" ON api_webhooks
  FOR ALL USING (auth.uid() = user_id);

-- Webhook Deliveries Policies
DROP POLICY IF EXISTS "Users can view own webhook deliveries" ON webhook_deliveries;
CREATE POLICY "Users can view own webhook deliveries" ON webhook_deliveries
  FOR SELECT USING (
    webhook_id IN (SELECT id FROM api_webhooks WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service can insert webhook deliveries" ON webhook_deliveries;
CREATE POLICY "Service can insert webhook deliveries" ON webhook_deliveries
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- DONE! All API tables, columns, and functions created
-- =====================================================
SELECT 'API Database Setup Complete!' as status;
