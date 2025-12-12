-- =====================================================
-- Migration: Add Email Notification Feature
-- =====================================================

-- 1. Add email_notification_config column to dynamic_qr_codes
ALTER TABLE dynamic_qr_codes
ADD COLUMN IF NOT EXISTS email_notification_config JSONB DEFAULT NULL;

-- 2. Add comment for documentation
COMMENT ON COLUMN dynamic_qr_codes.email_notification_config IS 'JSON config for email notifications on scan alerts';

-- =====================================================
-- Example email_notification_config structure:
-- {
--   "enabled": true,
--   "email": "user@example.com",
--   "frequency": "every_scan" | "first_daily" | "every_10_scans"
-- }
-- =====================================================
