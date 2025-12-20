-- =====================================================
-- Nexus QR API Service - Database Schema
-- =====================================================

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'Default Key',
  key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of the API key
  key_prefix VARCHAR(12) NOT NULL, -- First 8 chars for display (nxqr_xxxx...)
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Rate limits (requests per month)
  rate_limit INTEGER NOT NULL DEFAULT 100,

  -- IP Whitelisting (null means all IPs allowed)
  ip_whitelist TEXT[] DEFAULT NULL,

  -- Permissions
  permissions JSONB DEFAULT '{"create": true, "read": true, "update": true, "delete": true, "analytics": true, "bulk": false, "webhooks": false}'::jsonb
);

-- API Usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id VARCHAR(36) NOT NULL, -- UUID for request tracking
  endpoint VARCHAR(100) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_body JSONB,
  error_code INTEGER, -- Structured error code if failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly usage aggregates (for billing and limits)
CREATE TABLE IF NOT EXISTS api_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  request_count INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  total_response_time_ms BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(api_key_id, year_month)
);

-- Webhooks configuration
CREATE TABLE IF NOT EXISTS api_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(64), -- For webhook signature verification
  events TEXT[] NOT NULL DEFAULT ARRAY['qr.scanned'], -- Events to trigger webhook
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES api_webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  retry_count INTEGER DEFAULT 0, -- Number of retry attempts
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT false
);

-- Idempotency keys for POST requests
CREATE TABLE IF NOT EXISTS api_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(64) NOT NULL,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(100) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',

  UNIQUE(idempotency_key, api_key_id)
);

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_request_id ON api_usage(request_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_monthly_key_month ON api_usage_monthly(api_key_id, year_month);
CREATE INDEX IF NOT EXISTS idx_api_webhooks_user_id ON api_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_api_idempotency_key ON api_idempotency(idempotency_key, api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_idempotency_expires ON api_idempotency(expires_at);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_idempotency ENABLE ROW LEVEL SECURITY;

-- API Keys policies
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own API keys" ON api_keys;
CREATE POLICY "Users can create own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
CREATE POLICY "Users can update own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
CREATE POLICY "Users can delete own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- API Usage policies
DROP POLICY IF EXISTS "Users can view own API usage" ON api_usage;
CREATE POLICY "Users can view own API usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

-- API Usage Monthly policies
DROP POLICY IF EXISTS "Users can view own monthly usage" ON api_usage_monthly;
CREATE POLICY "Users can view own monthly usage" ON api_usage_monthly
  FOR SELECT USING (auth.uid() = user_id);

-- Webhooks policies
DROP POLICY IF EXISTS "Users can manage own webhooks" ON api_webhooks;
CREATE POLICY "Users can manage own webhooks" ON api_webhooks
  FOR ALL USING (auth.uid() = user_id);

-- Webhook deliveries policies
DROP POLICY IF EXISTS "Users can view own webhook deliveries" ON webhook_deliveries;
CREATE POLICY "Users can view own webhook deliveries" ON webhook_deliveries
  FOR SELECT USING (
    webhook_id IN (SELECT id FROM api_webhooks WHERE user_id = auth.uid())
  );

-- Idempotency policies (service role only for insert/select)
DROP POLICY IF EXISTS "Service can manage idempotency" ON api_idempotency;
CREATE POLICY "Service can manage idempotency" ON api_idempotency
  FOR ALL USING (
    api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid())
  );

-- =====================================================
-- Functions
-- =====================================================

-- Function to increment API usage
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_api_key_id UUID,
  p_user_id UUID,
  p_success BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year_month VARCHAR(7);
BEGIN
  v_year_month := TO_CHAR(NOW(), 'YYYY-MM');

  INSERT INTO api_usage_monthly (api_key_id, user_id, year_month, request_count, successful_requests, failed_requests)
  VALUES (p_api_key_id, p_user_id, v_year_month, 1,
          CASE WHEN p_success THEN 1 ELSE 0 END,
          CASE WHEN p_success THEN 0 ELSE 1 END)
  ON CONFLICT (api_key_id, year_month)
  DO UPDATE SET
    request_count = api_usage_monthly.request_count + 1,
    successful_requests = api_usage_monthly.successful_requests + CASE WHEN p_success THEN 1 ELSE 0 END,
    failed_requests = api_usage_monthly.failed_requests + CASE WHEN p_success THEN 0 ELSE 1 END,
    updated_at = NOW();
END;
$$;

-- Function to check rate limit
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
    RETURN jsonb_build_object('allowed', false, 'reason', 'API key not found or inactive');
  END IF;

  -- Get current month usage
  SELECT COALESCE(request_count, 0) INTO v_current_usage
  FROM api_usage_monthly
  WHERE api_key_id = p_api_key_id AND year_month = v_year_month;

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

-- Function to validate API key and return key details
CREATE OR REPLACE FUNCTION validate_api_key(p_key_hash VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_record RECORD;
BEGIN
  SELECT id, user_id, tier, is_active, permissions, rate_limit, expires_at, ip_whitelist
  INTO v_key_record
  FROM api_keys
  WHERE key_hash = p_key_hash;

  IF v_key_record IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Invalid API key');
  END IF;

  IF NOT v_key_record.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'API key is inactive');
  END IF;

  IF v_key_record.expires_at IS NOT NULL AND v_key_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'API key has expired');
  END IF;

  -- Update last used timestamp
  UPDATE api_keys SET last_used_at = NOW() WHERE id = v_key_record.id;

  RETURN jsonb_build_object(
    'valid', true,
    'key_id', v_key_record.id,
    'user_id', v_key_record.user_id,
    'tier', v_key_record.tier,
    'permissions', v_key_record.permissions,
    'rate_limit', v_key_record.rate_limit,
    'ip_whitelist', v_key_record.ip_whitelist
  );
END;
$$;

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_webhooks_updated_at ON api_webhooks;
CREATE TRIGGER update_api_webhooks_updated_at
  BEFORE UPDATE ON api_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Cleanup Functions
-- =====================================================

-- Function to clean up expired idempotency keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_idempotency
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to update IP whitelist for an API key
CREATE OR REPLACE FUNCTION update_api_key_ip_whitelist(
  p_key_id UUID,
  p_ip_list TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE api_keys
  SET ip_whitelist = p_ip_list, updated_at = NOW()
  WHERE id = p_key_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- =====================================================
-- Tier rate limits reference
-- =====================================================
-- free: 100 requests/month
-- starter: 5000 requests/month
-- pro: 50000 requests/month
-- enterprise: unlimited (set to 999999999)
