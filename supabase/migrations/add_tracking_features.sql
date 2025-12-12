-- =====================================================
-- Migration: Add Retargeting and GPS Tracking Features
-- =====================================================

-- 1. Add retargeting_config column to dynamic_qr_codes
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS retargeting_config JSONB DEFAULT NULL;

-- 2. Add gps_tracking_config column to dynamic_qr_codes (optional, not used currently)
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS gps_tracking_config JSONB DEFAULT NULL;

-- 3. Add city and country columns to qr_scans (for IP-based tracking)
ALTER TABLE qr_scans
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT NULL;

ALTER TABLE qr_scans
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT NULL;

-- 4. Create index for faster location queries
CREATE INDEX IF NOT EXISTS idx_qr_scans_city
ON qr_scans (qr_id, city)
WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qr_scans_country
ON qr_scans (qr_id, country)
WHERE country IS NOT NULL;

-- 5. Add comments for documentation
COMMENT ON COLUMN dynamic_qr_codes.retargeting_config IS 'JSON config for GTM, Facebook Pixel, TikTok Pixel integration';
COMMENT ON COLUMN qr_scans.city IS 'City of scan location (from IP geolocation)';
COMMENT ON COLUMN qr_scans.country IS 'Country of scan location (from IP geolocation)';

-- =====================================================
-- Example retargeting_config structure:
-- {
--   "enabled": true,
--   "gtm_id": "GTM-XXXXXXX",
--   "facebook_pixel_id": "123456789",
--   "tiktok_pixel_id": "XXXXXXXXX",
--   "google_ads_id": "AW-XXXXXXXXX"
-- }
-- =====================================================
