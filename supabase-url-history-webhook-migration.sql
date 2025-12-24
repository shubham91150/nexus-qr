-- =====================================================
-- URL History & Webhook Integration Migration
-- Run this to add HIGH priority features
-- =====================================================

-- Add URL history column to track all URL changes
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS url_history JSONB DEFAULT '[]';

-- Add webhook configuration column for scan notifications
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS webhook_config JSONB DEFAULT NULL;

-- Create URL history table for detailed tracking
CREATE TABLE IF NOT EXISTS qr_url_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_id UUID NOT NULL REFERENCES dynamic_qr_codes(id) ON DELETE CASCADE,
  previous_url TEXT NOT NULL,
  new_url TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT DEFAULT NULL
);

-- Create webhook delivery logs table
CREATE TABLE IF NOT EXISTS qr_webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_id UUID NOT NULL REFERENCES dynamic_qr_codes(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'scan', -- scan, url_changed, expired
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE,
  retry_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_url_history_qr_id ON qr_url_history(qr_id);
CREATE INDEX IF NOT EXISTS idx_url_history_changed_at ON qr_url_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_qr_id ON qr_webhook_deliveries(qr_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON qr_webhook_deliveries(delivered_at);

-- RLS Policies
ALTER TABLE qr_url_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- URL History policies
DROP POLICY IF EXISTS "Users can view own QR URL history" ON qr_url_history;
CREATE POLICY "Users can view own QR URL history" ON qr_url_history
  FOR SELECT USING (
    qr_id IN (SELECT id FROM dynamic_qr_codes WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own QR URL history" ON qr_url_history;
CREATE POLICY "Users can insert own QR URL history" ON qr_url_history
  FOR INSERT WITH CHECK (
    qr_id IN (SELECT id FROM dynamic_qr_codes WHERE user_id = auth.uid())
  );

-- Webhook delivery policies
DROP POLICY IF EXISTS "Users can view own webhook deliveries" ON qr_webhook_deliveries;
CREATE POLICY "Users can view own webhook deliveries" ON qr_webhook_deliveries
  FOR SELECT USING (
    qr_id IN (SELECT id FROM dynamic_qr_codes WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "System can insert webhook deliveries" ON qr_webhook_deliveries;
CREATE POLICY "System can insert webhook deliveries" ON qr_webhook_deliveries
  FOR INSERT WITH CHECK (true);

-- Function to log URL change
CREATE OR REPLACE FUNCTION log_url_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.destination_url IS DISTINCT FROM NEW.destination_url THEN
    INSERT INTO qr_url_history (qr_id, previous_url, new_url, changed_by)
    VALUES (NEW.id, OLD.destination_url, NEW.destination_url, auth.uid());

    -- Also update the url_history JSONB array
    NEW.url_history = COALESCE(NEW.url_history, '[]'::jsonb) || jsonb_build_object(
      'url', OLD.destination_url,
      'changed_at', NOW(),
      'changed_to', NEW.destination_url
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to automatically log URL changes
DROP TRIGGER IF EXISTS trigger_log_url_change ON dynamic_qr_codes;
CREATE TRIGGER trigger_log_url_change
  BEFORE UPDATE ON dynamic_qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION log_url_change();

-- Grant permissions
GRANT SELECT, INSERT ON qr_url_history TO authenticated;
GRANT SELECT, INSERT ON qr_webhook_deliveries TO authenticated;
