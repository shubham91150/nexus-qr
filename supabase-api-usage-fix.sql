-- =====================================================
-- API Usage Tracking Fix - Run this in Supabase SQL Editor
-- =====================================================
-- This script fixes the API usage tracking by adding proper policies
-- and ensuring the increment function works correctly.

-- 1. Add INSERT policies for api_usage table
DROP POLICY IF EXISTS "Service role can insert api_usage" ON api_usage;
DROP POLICY IF EXISTS "Allow insert api_usage" ON api_usage;

-- Allow authenticated users and service role to insert
CREATE POLICY "Allow insert api_usage" ON api_usage
  FOR INSERT WITH CHECK (true);

-- 2. Add INSERT and UPDATE policies for api_usage_monthly table
DROP POLICY IF EXISTS "Service role can insert monthly usage" ON api_usage_monthly;
DROP POLICY IF EXISTS "Allow insert api_usage_monthly" ON api_usage_monthly;
DROP POLICY IF EXISTS "Allow update api_usage_monthly" ON api_usage_monthly;

CREATE POLICY "Allow insert api_usage_monthly" ON api_usage_monthly
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update api_usage_monthly" ON api_usage_monthly
  FOR UPDATE USING (true);

-- 3. Recreate the increment_api_usage function with SECURITY DEFINER
-- This ensures it runs with elevated privileges
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_api_key_id UUID,
  p_user_id UUID,
  p_success BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION increment_api_usage TO authenticated;
GRANT EXECUTE ON FUNCTION increment_api_usage TO anon;
GRANT EXECUTE ON FUNCTION increment_api_usage TO service_role;

-- 5. Verify tables exist with correct structure
-- Check api_usage table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage') THEN
    CREATE TABLE api_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL,
      user_id UUID NOT NULL,
      request_id VARCHAR(64),
      endpoint VARCHAR(255),
      method VARCHAR(10),
      status_code INTEGER,
      response_time_ms INTEGER,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own API usage" ON api_usage
      FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Allow insert api_usage" ON api_usage
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Check api_usage_monthly table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage_monthly') THEN
    CREATE TABLE api_usage_monthly (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL,
      user_id UUID NOT NULL,
      year_month VARCHAR(7) NOT NULL,
      request_count INTEGER DEFAULT 0,
      successful_requests INTEGER DEFAULT 0,
      failed_requests INTEGER DEFAULT 0,
      total_response_time_ms BIGINT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(api_key_id, year_month)
    );

    ALTER TABLE api_usage_monthly ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own monthly usage" ON api_usage_monthly
      FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Allow insert api_usage_monthly" ON api_usage_monthly
      FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow update api_usage_monthly" ON api_usage_monthly
      FOR UPDATE USING (true);
  END IF;
END $$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_usage_monthly_lookup
  ON api_usage_monthly(api_key_id, year_month);
CREATE INDEX IF NOT EXISTS idx_api_usage_monthly_user
  ON api_usage_monthly(user_id, year_month);

-- 7. Test the function (optional - run manually)
-- SELECT increment_api_usage('your-api-key-id'::uuid, 'your-user-id'::uuid, true);

-- 8. Check current data
-- SELECT * FROM api_usage_monthly ORDER BY created_at DESC LIMIT 10;
