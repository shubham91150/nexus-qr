-- =====================================================
-- Daily Usage Tracking - Migration
-- Run this after supabase-extended-api-migration.sql
-- =====================================================

-- Add INSERT/UPDATE policies for api_usage_daily
DROP POLICY IF EXISTS "Users can insert own daily usage" ON api_usage_daily;
CREATE POLICY "Users can insert own daily usage" ON api_usage_daily
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily usage" ON api_usage_daily;
CREATE POLICY "Users can update own daily usage" ON api_usage_daily
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- Function to increment daily usage (similar to monthly)
-- =====================================================

CREATE OR REPLACE FUNCTION increment_daily_usage(
  p_user_id UUID,
  p_api_key_id UUID DEFAULT NULL,
  p_api_calls INTEGER DEFAULT 1,
  p_qr_codes INTEGER DEFAULT 0,
  p_bandwidth BIGINT DEFAULT 0,
  p_success BOOLEAN DEFAULT true,
  p_response_time INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date DATE;
BEGIN
  v_date := CURRENT_DATE;

  INSERT INTO api_usage_daily (
    user_id,
    api_key_id,
    date,
    api_calls,
    qr_codes_created,
    bandwidth_bytes,
    successful_requests,
    failed_requests,
    avg_response_time_ms
  )
  VALUES (
    p_user_id,
    p_api_key_id,
    v_date,
    p_api_calls,
    p_qr_codes,
    p_bandwidth,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    p_response_time
  )
  ON CONFLICT (user_id, api_key_id, date)
  DO UPDATE SET
    api_calls = api_usage_daily.api_calls + p_api_calls,
    qr_codes_created = api_usage_daily.qr_codes_created + p_qr_codes,
    bandwidth_bytes = api_usage_daily.bandwidth_bytes + p_bandwidth,
    successful_requests = api_usage_daily.successful_requests + CASE WHEN p_success THEN 1 ELSE 0 END,
    failed_requests = api_usage_daily.failed_requests + CASE WHEN p_success THEN 0 ELSE 1 END,
    avg_response_time_ms = (
      (api_usage_daily.avg_response_time_ms * (api_usage_daily.successful_requests + api_usage_daily.failed_requests) + p_response_time)
      / (api_usage_daily.successful_requests + api_usage_daily.failed_requests + 1)
    );
END;
$$;

-- =====================================================
-- Function to seed demo daily usage data
-- Call this function to populate test data
-- =====================================================

CREATE OR REPLACE FUNCTION seed_demo_daily_usage(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date DATE;
  v_api_key_id UUID;
  i INTEGER;
BEGIN
  -- Get user's first API key (if any)
  SELECT id INTO v_api_key_id
  FROM api_keys
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Generate 7 days of demo data
  FOR i IN 0..6 LOOP
    v_date := CURRENT_DATE - i;

    INSERT INTO api_usage_daily (
      user_id,
      api_key_id,
      date,
      api_calls,
      qr_codes_created,
      bandwidth_bytes,
      successful_requests,
      failed_requests,
      avg_response_time_ms
    )
    VALUES (
      p_user_id,
      v_api_key_id,
      v_date,
      floor(random() * 500 + 100)::INTEGER,  -- 100-600 API calls
      floor(random() * 50 + 10)::INTEGER,    -- 10-60 QR codes
      floor(random() * 50000000 + 10000000)::BIGINT, -- 10-60 MB bandwidth
      floor(random() * 450 + 90)::INTEGER,   -- ~90% success
      floor(random() * 50 + 10)::INTEGER,    -- ~10% failures
      floor(random() * 150 + 50)::INTEGER    -- 50-200ms response time
    )
    ON CONFLICT (user_id, api_key_id, date) DO NOTHING;
  END LOOP;
END;
$$;

-- =====================================================
-- Grant execute permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION increment_daily_usage TO authenticated;
GRANT EXECUTE ON FUNCTION seed_demo_daily_usage TO authenticated;
