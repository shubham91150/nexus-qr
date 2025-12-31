-- Fix: Change user_subscription_status view from SECURITY DEFINER to SECURITY INVOKER
-- Issue: View was running with creator's permissions, bypassing RLS policies
-- Solution: Recreate view with security_invoker = true

-- Drop the existing view
DROP VIEW IF EXISTS public.user_subscription_status;

-- Recreate view with SECURITY INVOKER (runs as querying user, respects RLS)
CREATE VIEW public.user_subscription_status
WITH (security_barrier = true, security_invoker = true) AS
SELECT
    s.user_id,
    COALESCE(s.plan_tier, 'free') as plan_tier,
    COALESCE(s.status, 'active') as status,
    COALESCE(s.billing_cycle, 'monthly') as billing_cycle,
    s.current_period_start,
    s.current_period_end,
    s.trial_end,
    s.cancel_at_period_end,
    CASE
        WHEN s.trial_end IS NOT NULL AND s.trial_end > NOW() THEN TRUE
        ELSE FALSE
    END as is_trialing,
    CASE
        WHEN s.current_period_end IS NOT NULL AND s.current_period_end < NOW() AND s.status = 'active' THEN TRUE
        ELSE FALSE
    END as is_expired
FROM user_subscriptions s
WHERE s.user_id = auth.uid(); -- Only return current user's data (RLS enforced)

-- Revoke all access first
REVOKE ALL ON public.user_subscription_status FROM PUBLIC;
REVOKE ALL ON public.user_subscription_status FROM anon;
REVOKE ALL ON public.user_subscription_status FROM authenticated;

-- Grant only SELECT to authenticated users
GRANT SELECT ON public.user_subscription_status TO authenticated;

-- Add comment explaining security
COMMENT ON VIEW public.user_subscription_status IS
'User subscription status view with SECURITY INVOKER.
Only returns the authenticated user''s own subscription data.
RLS policies are enforced on underlying tables.';
