-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Plan Details
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'pro', 'business', 'enterprise')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'paused', 'none')),
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),

    -- Paddle Integration
    paddle_subscription_id VARCHAR(100),
    paddle_customer_id VARCHAR(100),
    paddle_price_id VARCHAR(100),

    -- Billing Period
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    trial_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one subscription per user
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_sub_id ON user_subscriptions(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);

-- Subscription History Table (for tracking changes)
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,

    -- Change Details
    action VARCHAR(50) NOT NULL, -- 'created', 'upgraded', 'downgraded', 'canceled', 'resumed', 'payment_failed'
    from_plan VARCHAR(20),
    to_plan VARCHAR(20),
    from_billing_cycle VARCHAR(10),
    to_billing_cycle VARCHAR(10),

    -- Payment Details
    amount DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    paddle_transaction_id VARCHAR(100),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_sub ON subscription_history(subscription_id);

-- Usage Tracking Table
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Usage Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Counters
    dynamic_qr_created INTEGER DEFAULT 0,
    static_qr_created INTEGER DEFAULT 0,
    scans_count INTEGER DEFAULT 0,
    api_requests INTEGER DEFAULT 0,
    storage_used_bytes BIGINT DEFAULT 0,
    bulk_operations INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One record per user per period
    UNIQUE(user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);

-- Payment History Table
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,

    -- Paddle Details
    paddle_transaction_id VARCHAR(100) UNIQUE,
    paddle_invoice_id VARCHAR(100),

    -- Payment Details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL, -- 'completed', 'refunded', 'failed', 'pending'

    -- Invoice Details
    invoice_url TEXT,
    receipt_url TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_paddle ON payment_history(paddle_transaction_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_subscription_updated_at ON user_subscriptions;
CREATE TRIGGER trigger_subscription_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_updated_at();

-- Function to create default free subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_subscriptions (user_id, plan_tier, status, billing_cycle)
    VALUES (NEW.id, 'free', 'active', 'monthly')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create subscription for new users
DROP TRIGGER IF EXISTS trigger_create_default_subscription ON auth.users;
CREATE TRIGGER trigger_create_default_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_subscription();

-- RLS Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
CREATE POLICY "Users can view own subscription"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Only backend/service role can modify subscriptions
CREATE POLICY "Service role can manage subscriptions"
    ON user_subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- Users can view their own subscription history
CREATE POLICY "Users can view own subscription history"
    ON subscription_history FOR SELECT
    USING (auth.uid() = user_id);

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
    ON usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

-- Users can view their own payment history
CREATE POLICY "Users can view own payment history"
    ON payment_history FOR SELECT
    USING (auth.uid() = user_id);

-- Drop existing view first (if exists) to allow column structure changes
DROP VIEW IF EXISTS user_subscription_status;

-- Create view for easy subscription checking (SECURITY INVOKER - runs as querying user)
-- Only returns the current user's subscription status from user_subscriptions table
-- Does NOT join with auth.users to avoid exposing sensitive data
CREATE VIEW user_subscription_status
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
WHERE s.user_id = auth.uid(); -- Only return current user's data

-- Revoke all access first
REVOKE ALL ON user_subscription_status FROM PUBLIC;
REVOKE ALL ON user_subscription_status FROM anon;
REVOKE ALL ON user_subscription_status FROM authenticated;

-- Grant only to authenticated users
GRANT SELECT ON user_subscription_status TO authenticated;
