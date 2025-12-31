-- Fix: Set search_path for all functions to prevent search_path injection attacks
-- Issue: Functions without fixed search_path can be exploited via schema manipulation
-- Solution: Add SET search_path = '' to all functions (most secure - uses fully qualified names)

-- 1. check_rate_limit
ALTER FUNCTION public.check_rate_limit SET search_path = '';

-- 2. validate_api_key
ALTER FUNCTION public.validate_api_key SET search_path = '';

-- 3. log_audit_event
ALTER FUNCTION public.log_audit_event SET search_path = '';

-- 4. check_usage_alerts
ALTER FUNCTION public.check_usage_alerts SET search_path = '';

-- 5. increment_daily_usage
ALTER FUNCTION public.increment_daily_usage SET search_path = '';

-- 6. seed_demo_daily_usage
ALTER FUNCTION public.seed_demo_daily_usage SET search_path = '';

-- 7. log_url_change
ALTER FUNCTION public.log_url_change SET search_path = '';

-- 8. check_campaign_status
ALTER FUNCTION public.check_campaign_status SET search_path = '';

-- 9. update_folder_updated_at
ALTER FUNCTION public.update_folder_updated_at SET search_path = '';

-- 10. get_folder_qr_count
ALTER FUNCTION public.get_folder_qr_count SET search_path = '';

-- 11. create_default_subscription
ALTER FUNCTION public.create_default_subscription SET search_path = '';

-- 12. update_qr_timestamp
ALTER FUNCTION public.update_qr_timestamp SET search_path = '';

-- 13. update_business_card_timestamp
ALTER FUNCTION public.update_business_card_timestamp SET search_path = '';

-- 14. increment_card_view_count
ALTER FUNCTION public.increment_card_view_count SET search_path = '';

-- 15. cleanup_old_ip_tracking
ALTER FUNCTION public.cleanup_old_ip_tracking SET search_path = '';

-- 16. update_subscription_updated_at
ALTER FUNCTION public.update_subscription_updated_at SET search_path = '';

-- 17. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column SET search_path = '';

-- 18. increment_api_usage
ALTER FUNCTION public.increment_api_usage SET search_path = '';

-- 19. cleanup_expired_idempotency
ALTER FUNCTION public.cleanup_expired_idempotency SET search_path = '';

-- 20. update_api_key_ip_whitelist
ALTER FUNCTION public.update_api_key_ip_whitelist SET search_path = '';

-- 21. update_template_timestamp
ALTER FUNCTION public.update_template_timestamp SET search_path = '';

-- 22. update_updated_at
ALTER FUNCTION public.update_updated_at SET search_path = '';

-- 23. update_scan_count
ALTER FUNCTION public.update_scan_count SET search_path = '';

-- 24. disable_expired_qr_codes
ALTER FUNCTION public.disable_expired_qr_codes SET search_path = '';

-- Note: Setting search_path = '' is the most secure option
-- It forces all table/function references to be fully qualified (schema.table)
-- This prevents attackers from creating malicious objects in other schemas
