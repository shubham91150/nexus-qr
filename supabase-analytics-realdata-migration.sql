-- =====================================================
-- Nexus QR Analytics - Real Data Migration
-- This migration ensures analytics tables have proper data
-- by creating views and functions to aggregate from api_usage
-- =====================================================

-- =====================================================
-- 1. Create API Request Logs Table (Detailed Logs)
-- =====================================================

CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  api_key_name VARCHAR(100),
  request_id VARCHAR(100),
  method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER DEFAULT 0,
  ip_address INET,
  user_agent TEXT,
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_api_request_logs_user_id ON api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_api_key ON api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_status ON api_request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_endpoint ON api_request_logs(endpoint);

-- RLS
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own request logs" ON api_request_logs;
CREATE POLICY "Users can view own request logs" ON api_request_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert request logs" ON api_request_logs;
CREATE POLICY "Service can insert request logs" ON api_request_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 2. Function to Log Detailed API Request
-- =====================================================

CREATE OR REPLACE FUNCTION log_api_request(
  p_user_id UUID,
  p_api_key_id UUID,
  p_api_key_name VARCHAR(100),
  p_request_id VARCHAR(100),
  p_method VARCHAR(10),
  p_endpoint VARCHAR(255),
  p_status_code INTEGER,
  p_response_time_ms INTEGER,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Insert detailed log
  INSERT INTO api_request_logs (
    user_id, api_key_id, api_key_name, request_id,
    method, endpoint, status_code, response_time_ms,
    ip_address, user_agent, error_message
  )
  VALUES (
    p_user_id, p_api_key_id, p_api_key_name, p_request_id,
    p_method, p_endpoint, p_status_code, p_response_time_ms,
    p_ip_address, p_user_agent, p_error_message
  )
  RETURNING id INTO v_log_id;

  -- Also update daily usage
  INSERT INTO api_usage_daily (
    user_id, api_key_id, date,
    api_calls, successful_requests, failed_requests,
    avg_response_time_ms
  )
  VALUES (
    p_user_id, p_api_key_id, CURRENT_DATE,
    1,
    CASE WHEN p_status_code >= 200 AND p_status_code < 400 THEN 1 ELSE 0 END,
    CASE WHEN p_status_code >= 400 THEN 1 ELSE 0 END,
    p_response_time_ms
  )
  ON CONFLICT (user_id, api_key_id, date)
  DO UPDATE SET
    api_calls = api_usage_daily.api_calls + 1,
    successful_requests = api_usage_daily.successful_requests +
      CASE WHEN p_status_code >= 200 AND p_status_code < 400 THEN 1 ELSE 0 END,
    failed_requests = api_usage_daily.failed_requests +
      CASE WHEN p_status_code >= 400 THEN 1 ELSE 0 END,
    avg_response_time_ms = (api_usage_daily.avg_response_time_ms + p_response_time_ms) / 2;

  -- Log audit event for important actions
  IF p_method IN ('POST', 'PATCH', 'DELETE') THEN
    INSERT INTO api_audit_events (
      user_id, actor_type, actor_id, actor_name,
      action, resource_type, status, ip_address, metadata
    )
    VALUES (
      p_user_id, 'api_key', p_api_key_id::TEXT, p_api_key_name,
      p_method || ' ' || p_endpoint, 'qr_code',
      CASE WHEN p_status_code < 400 THEN 'success' ELSE 'failure' END,
      p_ip_address,
      jsonb_build_object('status_code', p_status_code, 'response_time_ms', p_response_time_ms)
    );
  END IF;

  RETURN v_log_id;
END;
$$;

-- =====================================================
-- 3. Function to Get Analytics Summary from api_usage
-- =====================================================

CREATE OR REPLACE FUNCTION get_api_analytics_summary(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  avg_response_time NUMERIC,
  unique_ips BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::BIGINT as successful_requests,
    COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT as failed_requests,
    COALESCE(AVG(response_time_ms), 0)::NUMERIC as avg_response_time,
    COUNT(DISTINCT ip_address)::BIGINT as unique_ips
  FROM api_usage
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

-- =====================================================
-- 4. Function to Get Daily Analytics from api_usage
-- =====================================================

CREATE OR REPLACE FUNCTION get_daily_analytics(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  avg_response_time NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::BIGINT as successful_requests,
    COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT as failed_requests,
    COALESCE(AVG(response_time_ms), 0)::NUMERIC as avg_response_time
  FROM api_usage
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY date ASC;
END;
$$;

-- =====================================================
-- 5. Function to Get Endpoint Analytics
-- =====================================================

CREATE OR REPLACE FUNCTION get_endpoint_analytics(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  endpoint TEXT,
  method TEXT,
  request_count BIGINT,
  avg_response_time NUMERIC,
  error_count BIGINT,
  error_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.endpoint::TEXT,
    au.method::TEXT,
    COUNT(*)::BIGINT as request_count,
    COALESCE(AVG(response_time_ms), 0)::NUMERIC as avg_response_time,
    COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT as error_count,
    CASE
      WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE status_code >= 400)::NUMERIC / COUNT(*) * 100)
      ELSE 0
    END as error_rate
  FROM api_usage au
  WHERE au.user_id = p_user_id
    AND au.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY au.endpoint, au.method
  ORDER BY request_count DESC
  LIMIT 20;
END;
$$;

-- =====================================================
-- 6. Function to Get Status Code Distribution
-- =====================================================

CREATE OR REPLACE FUNCTION get_status_code_distribution(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  status_code INTEGER,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.status_code,
    COUNT(*)::BIGINT as count
  FROM api_usage au
  WHERE au.user_id = p_user_id
    AND au.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY au.status_code
  ORDER BY count DESC;
END;
$$;

-- =====================================================
-- 7. Function to Get Hourly Distribution
-- =====================================================

CREATE OR REPLACE FUNCTION get_hourly_distribution(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  hour INTEGER,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM created_at)::INTEGER as hour,
    COUNT(*)::BIGINT as count
  FROM api_usage
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY hour;
END;
$$;

-- =====================================================
-- 8. Function to Get Recent API Logs
-- =====================================================

CREATE OR REPLACE FUNCTION get_recent_api_logs(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  request_id TEXT,
  method TEXT,
  endpoint TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  api_key_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.request_id::TEXT,
    au.method::TEXT,
    au.endpoint::TEXT,
    au.status_code,
    au.response_time_ms,
    au.ip_address::TEXT,
    au.user_agent::TEXT,
    COALESCE(ak.name, 'Unknown')::TEXT as api_key_name,
    au.created_at
  FROM api_usage au
  LEFT JOIN api_keys ak ON ak.id = au.api_key_id
  WHERE au.user_id = p_user_id
  ORDER BY au.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 9. Migrate existing api_usage data to daily summary
-- =====================================================

-- Aggregate existing data into api_usage_daily (one-time migration)
INSERT INTO api_usage_daily (user_id, api_key_id, date, api_calls, successful_requests, failed_requests, avg_response_time_ms)
SELECT
  user_id,
  api_key_id,
  DATE(created_at) as date,
  COUNT(*)::INTEGER as api_calls,
  COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::INTEGER as successful_requests,
  COUNT(*) FILTER (WHERE status_code >= 400)::INTEGER as failed_requests,
  COALESCE(AVG(response_time_ms), 0)::INTEGER as avg_response_time_ms
FROM api_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, api_key_id, DATE(created_at)
ON CONFLICT (user_id, api_key_id, date)
DO UPDATE SET
  api_calls = EXCLUDED.api_calls,
  successful_requests = EXCLUDED.successful_requests,
  failed_requests = EXCLUDED.failed_requests,
  avg_response_time_ms = EXCLUDED.avg_response_time_ms;

-- =====================================================
-- 10. Grant necessary permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION log_api_request TO authenticated;
GRANT EXECUTE ON FUNCTION log_api_request TO service_role;
GRANT EXECUTE ON FUNCTION get_api_analytics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_endpoint_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_status_code_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_api_logs TO authenticated;
