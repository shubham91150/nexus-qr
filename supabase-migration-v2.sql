-- =====================================================
-- NEXUS QR - DATABASE MIGRATION V2
-- Security & UTM Features
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD NEW COLUMNS TO dynamic_qr_codes TABLE
-- =====================================================
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS password_protection JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS geofence_settings JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ip_restriction JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS utm_parameters JSONB DEFAULT NULL;

-- =====================================================
-- 2. CREATE IP SCAN TRACKING TABLE (for IP Restriction)
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_scan_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id UUID NOT NULL REFERENCES dynamic_qr_codes(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(qr_id, ip_address, scanned_at)
);

-- =====================================================
-- 3. CREATE INDEX FOR IP SCAN TRACKING
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ip_scan_tracking_qr_ip ON ip_scan_tracking(qr_id, ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_scan_tracking_scanned_at ON ip_scan_tracking(scanned_at);

-- =====================================================
-- 4. CREATE FUNCTION TO CLEAN OLD IP TRACKING RECORDS
-- (Runs daily to remove records older than 24 hours)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_ip_tracking()
RETURNS void AS $$
BEGIN
  DELETE FROM ip_scan_tracking
  WHERE scanned_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. ENABLE RLS ON IP SCAN TRACKING TABLE
-- =====================================================
ALTER TABLE ip_scan_tracking ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage ip_scan_tracking"
ON ip_scan_tracking
FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- DONE! Your database now supports:
-- - Password Protection
-- - Geofencing
-- - IP Restriction
-- - UTM Parameters
-- =====================================================
