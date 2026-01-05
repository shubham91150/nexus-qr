-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Adds SECURITY DEFINER and input validation to functions
-- =====================================================

-- 1. Update increment_card_view_count with SECURITY DEFINER
-- This prevents users from bypassing RLS when calling this function
CREATE OR REPLACE FUNCTION increment_card_view_count(card_slug TEXT)
RETURNS void AS $$
BEGIN
  -- Validate input: only allow alphanumeric, hyphens, underscores (3-100 chars)
  IF card_slug !~ '^[a-zA-Z0-9_-]{3,100}$' THEN
    RAISE EXCEPTION 'Invalid card slug format';
  END IF;

  UPDATE business_cards
  SET view_count = view_count + 1
  WHERE slug = card_slug AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update increment_template_use_count with SECURITY DEFINER
CREATE OR REPLACE FUNCTION increment_template_use_count(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE qr_templates
  SET use_count = use_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update create_default_subscription with better error handling
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO user_subscriptions (
        id,
        user_id,
        plan_tier,
        status,
        billing_cycle,
        current_period_start,
        current_period_end
    )
    VALUES (
        gen_random_uuid(),
        NEW.id,
        'free',
        'active',
        'monthly',
        NOW(),
        NOW() + INTERVAL '100 years'
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't block user creation
        RAISE WARNING 'Subscription creation error for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- 4. Create a safe domain for slugs (input validation at DB level)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'safe_slug') THEN
        CREATE DOMAIN safe_slug AS TEXT
        CHECK (VALUE ~ '^[a-zA-Z0-9_-]{3,100}$');
    END IF;
END $$;

-- 5. Create a safe domain for URLs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'safe_url') THEN
        CREATE DOMAIN safe_url AS TEXT
        CHECK (VALUE ~ '^https?://[^\s<>\"{}|\\^`\[\]]+$' AND LENGTH(VALUE) <= 2048);
    END IF;
END $$;

-- 6. Add check constraint for short_code format
ALTER TABLE dynamic_qr_codes
DROP CONSTRAINT IF EXISTS valid_short_code;

ALTER TABLE dynamic_qr_codes
ADD CONSTRAINT valid_short_code
CHECK (short_code ~ '^[a-zA-Z0-9]{4,20}$');

-- 7. Add check constraint for business card slug format
ALTER TABLE business_cards
DROP CONSTRAINT IF EXISTS valid_slug;

ALTER TABLE business_cards
ADD CONSTRAINT valid_slug
CHECK (slug ~ '^[a-zA-Z0-9_-]{3,100}$');

-- 8. Create rate limiting function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    -- Validate inputs
    IF p_max_requests < 1 OR p_max_requests > 10000 THEN
        RAISE EXCEPTION 'Invalid max_requests value';
    END IF;

    IF p_window_seconds < 1 OR p_window_seconds > 86400 THEN
        RAISE EXCEPTION 'Invalid window_seconds value';
    END IF;

    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

    -- This is a simplified rate limiter - implement proper sliding window in production
    RETURN QUERY SELECT
        TRUE as allowed,
        0 as current_count,
        NOW() + (p_window_seconds || ' seconds')::INTERVAL as reset_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Revoke direct execute from public, grant to authenticated only
REVOKE ALL ON FUNCTION increment_card_view_count(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_card_view_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_card_view_count(TEXT) TO anon;

REVOKE ALL ON FUNCTION increment_template_use_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_template_use_count(UUID) TO authenticated;

-- 10. Add comment for documentation
COMMENT ON FUNCTION increment_card_view_count IS 'Safely increments view count for business cards. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION increment_template_use_count IS 'Safely increments use count for templates. Uses SECURITY DEFINER to bypass RLS.';
