import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import {
  PlanTier,
  BillingCycle,
  PlanLimits,
  SUBSCRIPTION_PLANS,
  getPlan,
  hasFeature,
  getLimit,
  isLimitExceeded,
  formatLimit,
  getUpgradePlan,
} from './subscriptionPlans';
import { initPaddle, openCheckout } from './paddle';

// Subscription status types
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused' | 'none';

// User subscription interface
export interface UserSubscription {
  id: string;
  userId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  paddleSubscriptionId?: string;
  paddleCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Usage tracking interface
export interface UsageStats {
  dynamicQRCodesCreated: number;
  scansThisMonth: number;
  storageUsed: number;
  apiRequestsThisMonth: number;
  foldersCreated: number;
  teamMembersAdded: number;
  webhooksCreated: number;
}

// Context interface
interface SubscriptionContextType {
  // Subscription state
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;

  // Current plan info
  currentPlan: PlanTier;
  planLimits: PlanLimits;
  isFreePlan: boolean;
  isPaidPlan: boolean;
  isTrialing: boolean;

  // Usage tracking
  usage: UsageStats;
  refreshUsage: () => Promise<void>;

  // Feature checking
  hasFeature: (feature: keyof PlanLimits) => boolean;
  getLimit: (limit: keyof PlanLimits) => number | boolean | string;
  isLimitReached: (limit: keyof PlanLimits, currentValue?: number) => boolean;
  canUseFeature: (feature: keyof PlanLimits) => { allowed: boolean; reason?: string };

  // Subscription management
  subscribe: (planTier: PlanTier, billingCycle: BillingCycle) => Promise<void>;
  changePlan: (newPlanTier: PlanTier, billingCycle: BillingCycle) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;

  // Upgrade prompts
  showUpgradeModal: boolean;
  upgradeReason: string;
  requiredPlan: PlanTier | null;
  openUpgradeModal: (reason: string, requiredPlan?: PlanTier) => void;
  closeUpgradeModal: () => void;

  // Refresh subscription data
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Default usage stats
const defaultUsage: UsageStats = {
  dynamicQRCodesCreated: 0,
  scansThisMonth: 0,
  storageUsed: 0,
  apiRequestsThisMonth: 0,
  foldersCreated: 0,
  teamMembersAdded: 0,
  webhooksCreated: 0,
};

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Subscription state
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Usage state
  const [usage, setUsage] = useState<UsageStats>(defaultUsage);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [requiredPlan, setRequiredPlan] = useState<PlanTier | null>(null);

  // Derived state
  const currentPlan: PlanTier = subscription?.planTier || 'free';
  const planLimits = SUBSCRIPTION_PLANS[currentPlan].limits;
  const isFreePlan = currentPlan === 'free';
  const isPaidPlan = !isFreePlan;
  const isTrialing = subscription?.status === 'trialing';

  // Initialize Paddle on mount
  useEffect(() => {
    initPaddle();
  }, []);

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (user has no subscription)
        throw fetchError;
      }

      if (data) {
        setSubscription({
          id: data.id,
          userId: data.user_id,
          planTier: data.plan_tier as PlanTier,
          status: data.status as SubscriptionStatus,
          billingCycle: data.billing_cycle as BillingCycle,
          paddleSubscriptionId: data.paddle_subscription_id,
          paddleCustomerId: data.paddle_customer_id,
          currentPeriodStart: new Date(data.current_period_start),
          currentPeriodEnd: new Date(data.current_period_end),
          trialEnd: data.trial_end ? new Date(data.trial_end) : undefined,
          cancelAtPeriodEnd: data.cancel_at_period_end,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        });
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch usage stats
  const fetchUsage = useCallback(async () => {
    if (!user) {
      setUsage(defaultUsage);
      return;
    }

    try {
      // Get dynamic QR count
      const { count: qrCount } = await supabase
        .from('dynamic_qr_codes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get scans this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: scanCount } = await supabase
        .from('qr_scans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('scanned_at', startOfMonth.toISOString());

      // Get folders count
      const { count: folderCount } = await supabase
        .from('qr_folders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get API requests this month
      const { count: apiCount } = await supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      setUsage({
        dynamicQRCodesCreated: qrCount || 0,
        scansThisMonth: scanCount || 0,
        storageUsed: 0, // TODO: Calculate from storage
        apiRequestsThisMonth: apiCount || 0,
        foldersCreated: folderCount || 0,
        teamMembersAdded: 0, // TODO: Get from team table
        webhooksCreated: 0, // TODO: Get from webhooks table
      });
    } catch (err) {
      console.error('Error fetching usage:', err);
    }
  }, [user]);

  // Load subscription and usage on user change
  useEffect(() => {
    fetchSubscription();
    fetchUsage();
  }, [fetchSubscription, fetchUsage]);

  // Feature checking functions
  const checkHasFeature = useCallback(
    (feature: keyof PlanLimits): boolean => {
      return hasFeature(currentPlan, feature);
    },
    [currentPlan]
  );

  const checkGetLimit = useCallback(
    (limit: keyof PlanLimits): number | boolean | string => {
      return getLimit(currentPlan, limit);
    },
    [currentPlan]
  );

  const checkIsLimitReached = useCallback(
    (limit: keyof PlanLimits, currentValue?: number): boolean => {
      const limitValue = SUBSCRIPTION_PLANS[currentPlan].limits[limit];

      if (typeof limitValue !== 'number') return false;
      if (limitValue === -1) return false; // unlimited

      // Use provided value or get from usage stats
      let usageValue = currentValue;
      if (usageValue === undefined) {
        switch (limit) {
          case 'dynamicQRCodes':
            usageValue = usage.dynamicQRCodesCreated;
            break;
          case 'scansPerMonth':
            usageValue = usage.scansThisMonth;
            break;
          case 'apiRequestsPerMonth':
            usageValue = usage.apiRequestsThisMonth;
            break;
          case 'folders':
            usageValue = usage.foldersCreated;
            break;
          default:
            usageValue = 0;
        }
      }

      return usageValue >= limitValue;
    },
    [currentPlan, usage]
  );

  const canUseFeature = useCallback(
    (feature: keyof PlanLimits): { allowed: boolean; reason?: string } => {
      const featureValue = SUBSCRIPTION_PLANS[currentPlan].limits[feature];

      // Boolean features
      if (typeof featureValue === 'boolean') {
        if (!featureValue) {
          const upgradePlan = getUpgradePlan(currentPlan);
          return {
            allowed: false,
            reason: `This feature requires ${upgradePlan ? SUBSCRIPTION_PLANS[upgradePlan].name : 'an upgraded'} plan`,
          };
        }
        return { allowed: true };
      }

      // Numeric limits
      if (typeof featureValue === 'number') {
        if (featureValue === 0) {
          return {
            allowed: false,
            reason: 'This feature is not available on your current plan',
          };
        }

        if (featureValue !== -1 && checkIsLimitReached(feature)) {
          return {
            allowed: false,
            reason: `You've reached your ${formatLimit(featureValue)} limit for this feature`,
          };
        }

        return { allowed: true };
      }

      // String values (like locationTracking)
      if (featureValue === 'none') {
        return {
          allowed: false,
          reason: 'This feature requires an upgraded plan',
        };
      }

      return { allowed: true };
    },
    [currentPlan, checkIsLimitReached]
  );

  // Subscription management functions
  const subscribe = useCallback(
    async (planTier: PlanTier, billingCycle: BillingCycle) => {
      if (!user) {
        throw new Error('You must be logged in to subscribe');
      }

      await openCheckout({
        planTier,
        billingCycle,
        userEmail: user.email,
        userId: user.id,
      });
    },
    [user]
  );

  const changePlan = useCallback(
    async (newPlanTier: PlanTier, billingCycle: BillingCycle) => {
      if (!user || !subscription) {
        throw new Error('No active subscription to change');
      }

      // For plan changes, we need to call our backend API
      const response = await fetch('/api/subscription/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.paddleSubscriptionId,
          newPlanTier,
          billingCycle,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to change plan');
      }

      // Refresh subscription data
      await fetchSubscription();
    },
    [user, subscription, fetchSubscription]
  );

  const cancelSubscriptionHandler = useCallback(async () => {
    if (!subscription?.paddleSubscriptionId) {
      throw new Error('No active subscription to cancel');
    }

    const response = await fetch('/api/subscription/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: subscription.paddleSubscriptionId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }

    await fetchSubscription();
  }, [subscription, fetchSubscription]);

  const resumeSubscription = useCallback(async () => {
    if (!subscription?.paddleSubscriptionId) {
      throw new Error('No subscription to resume');
    }

    const response = await fetch('/api/subscription/resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: subscription.paddleSubscriptionId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to resume subscription');
    }

    await fetchSubscription();
  }, [subscription, fetchSubscription]);

  // Upgrade modal functions
  const openUpgradeModal = useCallback((reason: string, required?: PlanTier) => {
    setUpgradeReason(reason);
    setRequiredPlan(required || null);
    setShowUpgradeModal(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false);
    setUpgradeReason('');
    setRequiredPlan(null);
  }, []);

  const value: SubscriptionContextType = {
    subscription,
    loading,
    error,
    currentPlan,
    planLimits,
    isFreePlan,
    isPaidPlan,
    isTrialing,
    usage,
    refreshUsage: fetchUsage,
    hasFeature: checkHasFeature,
    getLimit: checkGetLimit,
    isLimitReached: checkIsLimitReached,
    canUseFeature,
    subscribe,
    changePlan,
    cancelSubscription: cancelSubscriptionHandler,
    resumeSubscription,
    showUpgradeModal,
    upgradeReason,
    requiredPlan,
    openUpgradeModal,
    closeUpgradeModal,
    refreshSubscription: fetchSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook to use subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// HOC for feature gating
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredFeature: keyof PlanLimits,
  fallback?: React.ReactNode
) {
  return function FeatureGatedComponent(props: P) {
    const { canUseFeature, openUpgradeModal } = useSubscription();
    const { allowed, reason } = canUseFeature(requiredFeature);

    if (!allowed) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="p-4 bg-gray-800 rounded-lg text-center">
          <p className="text-gray-400 mb-4">{reason}</p>
          <button
            onClick={() => openUpgradeModal(reason || 'Upgrade required')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Upgrade Now
          </button>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

// Hook for checking single feature
export function useFeatureCheck(feature: keyof PlanLimits) {
  const { canUseFeature, openUpgradeModal } = useSubscription();
  const result = canUseFeature(feature);

  return {
    ...result,
    promptUpgrade: () => {
      if (!result.allowed && result.reason) {
        openUpgradeModal(result.reason);
      }
    },
  };
}
