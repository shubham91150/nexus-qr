-- =====================================================
-- Scheduled Campaigns Migration
-- Allows scheduling QR code activation/deactivation
-- =====================================================

-- Add scheduled campaign columns to dynamic_qr_codes
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS campaign_config JSONB DEFAULT NULL;

-- Campaign config structure:
-- {
--   "enabled": true,
--   "name": "Black Friday Sale",
--   "scheduled_start": "2024-11-29T00:00:00Z",
--   "scheduled_end": "2024-11-30T23:59:59Z",
--   "timezone": "Asia/Kolkata",
--   "auto_activate": true,
--   "auto_deactivate": true,
--   "repeat": null | "daily" | "weekly" | "monthly",
--   "repeat_end_date": null | "2024-12-31",
--   "pre_campaign_url": "https://coming-soon.com",
--   "post_campaign_url": "https://sale-ended.com",
--   "notify_on_start": true,
--   "notify_on_end": true
-- }

-- Create campaign logs table for tracking
CREATE TABLE IF NOT EXISTS qr_campaign_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_id UUID NOT NULL REFERENCES dynamic_qr_codes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'scheduled', 'activated', 'deactivated', 'extended', 'cancelled'
  event_time TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_campaign_logs_qr_id ON qr_campaign_logs(qr_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_event_time ON qr_campaign_logs(event_time);

-- RLS for campaign logs
ALTER TABLE qr_campaign_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own campaign logs" ON qr_campaign_logs;
CREATE POLICY "Users can view own campaign logs" ON qr_campaign_logs
  FOR SELECT USING (
    qr_id IN (SELECT id FROM dynamic_qr_codes WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own campaign logs" ON qr_campaign_logs;
CREATE POLICY "Users can insert own campaign logs" ON qr_campaign_logs
  FOR INSERT WITH CHECK (
    qr_id IN (SELECT id FROM dynamic_qr_codes WHERE user_id = auth.uid())
  );

-- Function to check and update campaign status
-- This can be called periodically or triggered
CREATE OR REPLACE FUNCTION check_campaign_status()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  qr_record RECORD;
  campaign JSONB;
  scheduled_start TIMESTAMPTZ;
  scheduled_end TIMESTAMPTZ;
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- Find QR codes with active campaigns
  FOR qr_record IN
    SELECT id, is_active, campaign_config
    FROM dynamic_qr_codes
    WHERE campaign_config IS NOT NULL
      AND (campaign_config->>'enabled')::boolean = true
  LOOP
    campaign := qr_record.campaign_config;

    -- Parse dates
    scheduled_start := (campaign->>'scheduled_start')::timestamptz;
    scheduled_end := (campaign->>'scheduled_end')::timestamptz;

    -- Check if should activate
    IF scheduled_start IS NOT NULL
       AND current_time >= scheduled_start
       AND (scheduled_end IS NULL OR current_time < scheduled_end)
       AND NOT qr_record.is_active
       AND (campaign->>'auto_activate')::boolean = true
    THEN
      UPDATE dynamic_qr_codes SET is_active = true WHERE id = qr_record.id;
      INSERT INTO qr_campaign_logs (qr_id, event_type, details)
      VALUES (qr_record.id, 'activated', jsonb_build_object('reason', 'scheduled_start', 'time', current_time));
      updated_count := updated_count + 1;
    END IF;

    -- Check if should deactivate
    IF scheduled_end IS NOT NULL
       AND current_time >= scheduled_end
       AND qr_record.is_active
       AND (campaign->>'auto_deactivate')::boolean = true
    THEN
      UPDATE dynamic_qr_codes SET is_active = false WHERE id = qr_record.id;
      INSERT INTO qr_campaign_logs (qr_id, event_type, details)
      VALUES (qr_record.id, 'deactivated', jsonb_build_object('reason', 'scheduled_end', 'time', current_time));
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_campaign_status TO authenticated;
GRANT SELECT, INSERT ON qr_campaign_logs TO authenticated;
