-- =====================================================
-- Nexus QR Extended API Service - Additional Tables
-- =====================================================

-- =====================================================
-- Team Members & Access Control
-- =====================================================

-- Team Members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- The team owner
  member_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- The actual member (if registered)
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  api_keys_count INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  mfa_enabled BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '[]'::jsonb,
  invited_by UUID REFERENCES auth.users(id),
  invitation_token VARCHAR(64),
  invitation_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, email)
);

-- Team Activity Logs
CREATE TABLE IF NOT EXISTS team_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_name VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(100),
  target_name VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Custom Domains
-- =====================================================

CREATE TABLE IF NOT EXISTS custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'failed', 'verifying')),
  ssl_status VARCHAR(20) DEFAULT 'none' CHECK (ssl_status IN ('active', 'pending', 'expired', 'none')),
  ssl_expiry TIMESTAMPTZ,
  is_primary BOOLEAN DEFAULT false,
  dns_verified BOOLEAN DEFAULT false,
  dns_records JSONB DEFAULT '[]'::jsonb,
  verification_token VARCHAR(64),
  total_redirects INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, domain)
);

-- =====================================================
-- API Audit Events (Detailed audit trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS api_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('user', 'api_key', 'system')),
  actor_id VARCHAR(100) NOT NULL,
  actor_name VARCHAR(100),
  actor_email VARCHAR(255),
  api_key_prefix VARCHAR(20),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  resource_name VARCHAR(255),
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure', 'warning')),
  ip_address INET,
  user_agent TEXT,
  location VARCHAR(255),
  changes JSONB,  -- For tracking field changes
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Usage Quota Alerts
-- =====================================================

CREATE TABLE IF NOT EXISTS usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('warning', 'critical', 'info')),
  message TEXT NOT NULL,
  metric VARCHAR(50) NOT NULL,
  threshold INTEGER,
  current_value INTEGER,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert Notification Settings
CREATE TABLE IF NOT EXISTS alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  warning_threshold INTEGER DEFAULT 75,
  critical_threshold INTEGER DEFAULT 90,
  email_notify BOOLEAN DEFAULT true,
  slack_notify BOOLEAN DEFAULT false,
  webhook_notify BOOLEAN DEFAULT true,
  slack_webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Daily Usage Statistics (for charts)
-- =====================================================

CREATE TABLE IF NOT EXISTS api_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  api_calls INTEGER DEFAULT 0,
  qr_codes_created INTEGER DEFAULT 0,
  bandwidth_bytes BIGINT DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, api_key_id, date)
);

-- =====================================================
-- Performance Metrics (for ApiPerformanceMonitor)
-- =====================================================

CREATE TABLE IF NOT EXISTS api_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint VARCHAR(100) NOT NULL,
  method VARCHAR(10) NOT NULL,
  time_bucket TIMESTAMPTZ NOT NULL,  -- 15-minute buckets
  request_count INTEGER DEFAULT 0,
  avg_latency_ms INTEGER DEFAULT 0,
  p50_latency_ms INTEGER DEFAULT 0,
  p95_latency_ms INTEGER DEFAULT 0,
  p99_latency_ms INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_rate DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, endpoint, method, time_bucket)
);

-- API Errors tracking
CREATE TABLE IF NOT EXISTS api_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint VARCHAR(100) NOT NULL,
  status_code INTEGER NOT NULL,
  error_message TEXT,
  error_count INTEGER DEFAULT 1,
  first_occurred TIMESTAMPTZ DEFAULT NOW(),
  last_occurred TIMESTAMPTZ DEFAULT NOW(),
  trend VARCHAR(10) DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_activity_user_id ON team_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_created_at ON team_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON api_audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON api_audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_user_id ON usage_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_user_date ON api_usage_daily(user_id, date);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user ON api_performance_metrics(user_id, time_bucket);
CREATE INDEX IF NOT EXISTS idx_api_errors_user_id ON api_errors(user_id);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_errors ENABLE ROW LEVEL SECURITY;

-- Team Members policies
DROP POLICY IF EXISTS "Users can manage own team" ON team_members;
CREATE POLICY "Users can manage own team" ON team_members
  FOR ALL USING (auth.uid() = user_id);

-- Team Activity policies
DROP POLICY IF EXISTS "Users can view own team activity" ON team_activity_logs;
CREATE POLICY "Users can view own team activity" ON team_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Custom Domains policies
DROP POLICY IF EXISTS "Users can manage own domains" ON custom_domains;
CREATE POLICY "Users can manage own domains" ON custom_domains
  FOR ALL USING (auth.uid() = user_id);

-- Audit Events policies
DROP POLICY IF EXISTS "Users can view own audit events" ON api_audit_events;
CREATE POLICY "Users can view own audit events" ON api_audit_events
  FOR SELECT USING (auth.uid() = user_id);

-- Usage Alerts policies
DROP POLICY IF EXISTS "Users can manage own alerts" ON usage_alerts;
CREATE POLICY "Users can manage own alerts" ON usage_alerts
  FOR ALL USING (auth.uid() = user_id);

-- Alert Settings policies
DROP POLICY IF EXISTS "Users can manage own alert settings" ON alert_settings;
CREATE POLICY "Users can manage own alert settings" ON alert_settings
  FOR ALL USING (auth.uid() = user_id);

-- Daily Usage policies
DROP POLICY IF EXISTS "Users can view own daily usage" ON api_usage_daily;
CREATE POLICY "Users can view own daily usage" ON api_usage_daily
  FOR SELECT USING (auth.uid() = user_id);

-- Performance Metrics policies
DROP POLICY IF EXISTS "Users can view own performance metrics" ON api_performance_metrics;
CREATE POLICY "Users can view own performance metrics" ON api_performance_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- API Errors policies
DROP POLICY IF EXISTS "Users can view own errors" ON api_errors;
CREATE POLICY "Users can view own errors" ON api_errors
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- Functions for Audit Trail
-- =====================================================

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_actor_type VARCHAR(20),
  p_actor_id VARCHAR(100),
  p_actor_name VARCHAR(100),
  p_action VARCHAR(100),
  p_resource_type VARCHAR(50),
  p_resource_id VARCHAR(100),
  p_status VARCHAR(20),
  p_ip_address INET DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO api_audit_events (
    user_id, actor_type, actor_id, actor_name, action,
    resource_type, resource_id, status, ip_address, metadata
  )
  VALUES (
    p_user_id, p_actor_type, p_actor_id, p_actor_name, p_action,
    p_resource_type, p_resource_id, p_status, p_ip_address, p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Function to check and create usage alerts
CREATE OR REPLACE FUNCTION check_usage_alerts(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings RECORD;
  v_usage RECORD;
  v_percentage INTEGER;
BEGIN
  -- Get user's alert settings
  SELECT * INTO v_settings FROM alert_settings WHERE user_id = p_user_id;

  IF v_settings IS NULL THEN
    -- Create default settings
    INSERT INTO alert_settings (user_id) VALUES (p_user_id)
    RETURNING * INTO v_settings;
  END IF;

  -- Get current month usage
  SELECT
    COALESCE(SUM(request_count), 0) as total_requests,
    MAX(ak.rate_limit) as rate_limit
  INTO v_usage
  FROM api_usage_monthly aum
  JOIN api_keys ak ON ak.id = aum.api_key_id
  WHERE aum.user_id = p_user_id
    AND aum.year_month = TO_CHAR(NOW(), 'YYYY-MM');

  IF v_usage.rate_limit > 0 THEN
    v_percentage := (v_usage.total_requests * 100) / v_usage.rate_limit;

    -- Check critical threshold
    IF v_percentage >= v_settings.critical_threshold THEN
      INSERT INTO usage_alerts (user_id, alert_type, message, metric, threshold, current_value)
      VALUES (
        p_user_id,
        'critical',
        'API usage is at ' || v_percentage || '% of your limit',
        'API Calls',
        v_settings.critical_threshold,
        v_usage.total_requests
      )
      ON CONFLICT DO NOTHING;
    -- Check warning threshold
    ELSIF v_percentage >= v_settings.warning_threshold THEN
      INSERT INTO usage_alerts (user_id, alert_type, message, metric, threshold, current_value)
      VALUES (
        p_user_id,
        'warning',
        'API usage is at ' || v_percentage || '% of your limit',
        'API Calls',
        v_settings.warning_threshold,
        v_usage.total_requests
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- =====================================================
-- Triggers
-- =====================================================

-- Update timestamps
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_domains_updated_at ON custom_domains;
CREATE TRIGGER update_custom_domains_updated_at
  BEFORE UPDATE ON custom_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alert_settings_updated_at ON alert_settings;
CREATE TRIGGER update_alert_settings_updated_at
  BEFORE UPDATE ON alert_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
