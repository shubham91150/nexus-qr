import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { PlanTier, BillingCycle, SUBSCRIPTION_PLANS } from './subscriptionPlans';

// Paddle Configuration
// Replace these with your actual Paddle credentials
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '';
const PADDLE_ENVIRONMENT = (import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

// Paddle Price IDs - Replace with actual IDs from your Paddle dashboard
// These will be different for sandbox vs production
export const PADDLE_PRICE_IDS: Record<PlanTier, { monthly: string; yearly: string } | null> = {
  free: null, // Free plan doesn't have Paddle prices
  starter: {
    monthly: import.meta.env.VITE_PADDLE_STARTER_MONTHLY || 'pri_starter_monthly',
    yearly: import.meta.env.VITE_PADDLE_STARTER_YEARLY || 'pri_starter_yearly',
  },
  pro: {
    monthly: import.meta.env.VITE_PADDLE_PRO_MONTHLY || 'pri_pro_monthly',
    yearly: import.meta.env.VITE_PADDLE_PRO_YEARLY || 'pri_pro_yearly',
  },
  business: {
    monthly: import.meta.env.VITE_PADDLE_BUSINESS_MONTHLY || 'pri_business_monthly',
    yearly: import.meta.env.VITE_PADDLE_BUSINESS_YEARLY || 'pri_business_yearly',
  },
  enterprise: {
    monthly: import.meta.env.VITE_PADDLE_ENTERPRISE_MONTHLY || 'pri_enterprise_monthly',
    yearly: import.meta.env.VITE_PADDLE_ENTERPRISE_YEARLY || 'pri_enterprise_yearly',
  },
};

let paddleInstance: Paddle | null = null;

// Initialize Paddle
export async function initPaddle(): Promise<Paddle | null> {
  if (paddleInstance) return paddleInstance;

  if (!PADDLE_CLIENT_TOKEN) {
    console.warn('Paddle client token not configured');
    return null;
  }

  try {
    paddleInstance = await initializePaddle({
      token: PADDLE_CLIENT_TOKEN,
      environment: PADDLE_ENVIRONMENT,
      eventCallback: handlePaddleEvent,
    });

    console.log('Paddle initialized successfully');
    return paddleInstance;
  } catch (error) {
    console.error('Failed to initialize Paddle:', error);
    return null;
  }
}

// Get Paddle instance
export function getPaddle(): Paddle | null {
  return paddleInstance;
}

// Handle Paddle events
function handlePaddleEvent(event: { name: string; data?: unknown }) {
  console.log('Paddle event:', event.name, event.data);

  switch (event.name) {
    case 'checkout.loaded':
      console.log('Checkout loaded');
      break;
    case 'checkout.completed':
      console.log('Checkout completed');
      // Handle successful checkout - update user subscription
      break;
    case 'checkout.closed':
      console.log('Checkout closed');
      break;
    case 'checkout.error':
      console.error('Checkout error:', event.data);
      break;
  }
}

// Open checkout for a specific plan
export interface CheckoutOptions {
  planTier: PlanTier;
  billingCycle: BillingCycle;
  userEmail?: string;
  userId?: string;
  successUrl?: string;
  customData?: Record<string, string>;
}

export async function openCheckout(options: CheckoutOptions): Promise<void> {
  const paddle = await initPaddle();

  if (!paddle) {
    throw new Error('Paddle not initialized');
  }

  const priceIds = PADDLE_PRICE_IDS[options.planTier];
  if (!priceIds) {
    throw new Error(`No price configured for plan: ${options.planTier}`);
  }

  const priceId = options.billingCycle === 'monthly' ? priceIds.monthly : priceIds.yearly;

  const checkoutSettings: Parameters<Paddle['Checkout']['open']>[0] = {
    items: [{ priceId, quantity: 1 }],
    settings: {
      displayMode: 'overlay',
      theme: 'dark',
      locale: 'en',
      successUrl: options.successUrl || `${window.location.origin}/subscription/success`,
      allowLogout: false,
    },
    customData: {
      userId: options.userId || '',
      planTier: options.planTier,
      billingCycle: options.billingCycle,
      ...options.customData,
    },
  };

  if (options.userEmail) {
    checkoutSettings.customer = {
      email: options.userEmail,
    };
  }

  paddle.Checkout.open(checkoutSettings);
}

// Update payment method
export async function openUpdatePaymentMethod(subscriptionId: string): Promise<void> {
  const paddle = await initPaddle();

  if (!paddle) {
    throw new Error('Paddle not initialized');
  }

  // Paddle Retain SDK would be used here for subscription management
  // For now, redirect to Paddle customer portal
  window.open(`https://checkout.paddle.com/subscription/${subscriptionId}`, '_blank');
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  // This should be handled via your backend API
  // Paddle requires server-side API calls for subscription management
  console.log('Cancel subscription:', subscriptionId);

  // Make API call to your backend
  try {
    const response = await fetch('/api/subscription/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return false;
  }
}

// Get subscription details
export interface SubscriptionDetails {
  id: string;
  status: 'active' | 'paused' | 'past_due' | 'canceled' | 'trialing';
  planTier: PlanTier;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
}

export async function getSubscriptionDetails(subscriptionId: string): Promise<SubscriptionDetails | null> {
  // This should be fetched from your backend
  try {
    const response = await fetch(`/api/subscription/${subscriptionId}`);
    if (!response.ok) return null;

    const data = await response.json();
    return {
      id: data.id,
      status: data.status,
      planTier: data.plan_tier,
      billingCycle: data.billing_cycle,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      cancelAtPeriodEnd: data.cancel_at_period_end,
      trialEnd: data.trial_end ? new Date(data.trial_end) : undefined,
    };
  } catch (error) {
    console.error('Failed to get subscription details:', error);
    return null;
  }
}

// Format price for display
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Get price display text
export function getPriceDisplay(planTier: PlanTier, billingCycle: BillingCycle): string {
  const plan = SUBSCRIPTION_PLANS[planTier];

  if (planTier === 'free') {
    return 'Free';
  }

  if (billingCycle === 'monthly') {
    return `${formatPrice(plan.pricing.monthly)}/mo`;
  } else {
    return `${formatPrice(plan.pricing.yearlyMonthlyEquivalent)}/mo`;
  }
}

// Get billing cycle price
export function getBillingCyclePrice(planTier: PlanTier, billingCycle: BillingCycle): number {
  const plan = SUBSCRIPTION_PLANS[planTier];

  if (billingCycle === 'monthly') {
    return plan.pricing.monthly;
  } else {
    return plan.pricing.yearly;
  }
}
