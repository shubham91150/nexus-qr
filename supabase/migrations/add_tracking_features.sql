-- =====================================================
-- Migration: Add Retargeting and GPS Tracking Features
-- =====================================================

-- 1. Add retargeting_config column to dynamic_qr_codes
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS retargeting_config JSONB DEFAULT NULL;

-- 2. Add gps_tracking_config column to dynamic_qr_codes
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS gps_tracking_config JSONB DEFAULT NULL;

-- 3. Add GPS location fields to qr_scans table
ALTER TABLE qr_scans
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT NULL;

ALTER TABLE qr_scans
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT NULL;

ALTER TABLE qr_scans
ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION DEFAULT NULL;

ALTER TABLE qr_scans
ADD COLUMN IF NOT EXISTS location_timestamp TIMESTAMPTZ DEFAULT NULL;

-- 4. Create index for faster geo queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_qr_scans_geo
ON qr_scans (qr_id, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 5. Add comments for documentation
COMMENT ON COLUMN dynamic_qr_codes.retargeting_config IS 'JSON config for GTM, Facebook Pixel, TikTok Pixel integration';
COMMENT ON COLUMN dynamic_qr_codes.gps_tracking_config IS 'JSON config for GPS location tracking settings';
COMMENT ON COLUMN qr_scans.latitude IS 'GPS latitude of scan location';
COMMENT ON COLUMN qr_scans.longitude IS 'GPS longitude of scan location';
COMMENT ON COLUMN qr_scans.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN qr_scans.location_timestamp IS 'Timestamp when GPS location was captured';

-- =====================================================
-- Example retargeting_config structure:
-- {
--   "enabled": true,
--   "gtm_id": "GTM-XXXXXXX",
--   "facebook_pixel_id": "123456789",
--   "tiktok_pixel_id": "XXXXXXXXX",
--   "google_ads_id": "AW-XXXXXXXXX"
-- }
--
-- Example gps_tracking_config structure:
-- {
--   "enabled": true,
--   "require_permission": true,
--   "track_precise_location": true,
--   "store_for_heatmap": true
-- }
-- =====================================================
