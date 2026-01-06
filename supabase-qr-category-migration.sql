-- =====================================================
-- QR CATEGORY MIGRATION
-- Adds qr_category column to identify landing page QR codes
-- Landing page QRs have locked destination URLs
-- =====================================================

-- 1. ADD qr_category COLUMN
-- Values: 'url' (destination URL changeable) or 'landing_page' (destination URL locked)
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS qr_category TEXT DEFAULT 'url';

-- 2. CREATE INDEX FOR FASTER QUERIES
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_qr_category ON dynamic_qr_codes(qr_category);

-- 3. UPDATE EXISTING RECORDS
-- Set qr_category to 'landing_page' for QR codes that have landing page content types
-- This checks the qr_style->contentData->type field
UPDATE dynamic_qr_codes
SET qr_category = 'landing_page'
WHERE qr_style IS NOT NULL
  AND qr_style->'contentData'->>'type' IN ('pdf', 'menu', 'audio', 'video', 'images', 'document', 'coupon', 'text');

-- 4. ADD COMMENT FOR DOCUMENTATION
COMMENT ON COLUMN dynamic_qr_codes.qr_category IS
'QR code category: "url" for regular URL QRs (destination changeable), "landing_page" for file/media QRs (destination locked, only files can be updated)';

-- =====================================================
-- VERIFICATION QUERY (Optional - run to check results)
-- =====================================================
-- SELECT id, title, qr_category, qr_style->'contentData'->>'type' as content_type
-- FROM dynamic_qr_codes
-- ORDER BY created_at DESC
-- LIMIT 20;

-- =====================================================
-- DONE!
-- Landing page QR codes will now have qr_category = 'landing_page'
-- Regular URL QR codes will have qr_category = 'url'
-- =====================================================
