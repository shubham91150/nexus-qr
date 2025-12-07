-- =====================================================
-- NEXUS QR - DATABASE MIGRATION
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD NEW COLUMNS TO dynamic_qr_codes TABLE
-- =====================================================
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS expired_redirect_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS conditional_rules JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ab_testing_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ab_variants JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS multi_language_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS language_contents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS analytics_options JSONB DEFAULT '{"trackLocation": true, "trackDevice": true, "trackBrowser": true, "trackTime": true, "trackReferrer": true}',
ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0,
-- NEW: Security & UTM Features
ADD COLUMN IF NOT EXISTS password_protection JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS geofence_settings JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ip_restriction JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS utm_parameters JSONB DEFAULT NULL;

-- =====================================================
-- 2. ADD NEW COLUMNS TO qr_scans TABLE
-- =====================================================
ALTER TABLE qr_scans
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS user_agent TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ab_variant_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 3. ENABLE REALTIME FOR qr_scans TABLE
-- =====================================================
-- Check if already added before running
ALTER PUBLICATION supabase_realtime ADD TABLE qr_scans;

-- =====================================================
-- 4. CREATE FUNCTION TO UPDATE SCAN COUNT
-- =====================================================
CREATE OR REPLACE FUNCTION update_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dynamic_qr_codes
  SET scan_count = scan_count + 1
  WHERE id = NEW.qr_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGER FOR AUTO SCAN COUNT UPDATE
-- =====================================================
DROP TRIGGER IF EXISTS increment_scan_count ON qr_scans;
CREATE TRIGGER increment_scan_count
AFTER INSERT ON qr_scans
FOR EACH ROW
EXECUTE FUNCTION update_scan_count();

-- =====================================================
-- 6. CREATE FUNCTION TO DISABLE EXPIRED QR CODES
-- =====================================================
CREATE OR REPLACE FUNCTION disable_expired_qr_codes()
RETURNS void AS $$
BEGIN
  UPDATE dynamic_qr_codes
  SET is_active = FALSE
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE INDEX FOR FASTER QUERIES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_id ON qr_scans(qr_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_expires_at ON dynamic_qr_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_short_code ON dynamic_qr_codes(short_code);

-- =====================================================
-- DONE! Your database is now ready for advanced features
-- =====================================================
