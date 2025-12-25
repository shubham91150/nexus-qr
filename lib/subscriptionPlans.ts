// Nexus QR Subscription Plans Configuration

export type PlanTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export interface PlanLimits {
  // QR Code Limits
  dynamicQRCodes: number;
  staticQRCodes: number; // -1 = unlimited
  scansPerMonth: number;

  // Bulk Generation
  staticBulkPerBatch: number;
  dynamicBulkPerBatch: number;

  // File Upload Limits (in bytes)
  logoUploadSize: number;
  pdfUploadSize: number;
  audioUploadSize: number;
  videoUploadSize: number;
  documentUploadSize: number;
  bulkCSVUploadSize: number;
  totalStorageLimit: number;

  // Analytics
  analyticsRetentionDays: number;
  realTimeTracking: boolean;
  locationTracking: 'none' | 'country' | 'city' | 'full';
  deviceAnalytics: boolean;
  exportAnalytics: boolean;

  // Customization
  qrColorsAndPatterns: boolean;
  logoInQR: boolean;
  customShortURL: boolean;
  customLandingPage: boolean;
  whiteLabel: boolean;
  customDomain: boolean;

  // Advanced Features
  qrExpiryScheduling: boolean;
  passwordProtectedQR: boolean;
  conditionalRedirectRules: number;
  folders: number;
  qrTemplates: number;

  // API Access
  apiRequestsPerMonth: number;

  // Team & Collaboration
  teamMembers: number;
  webhooks: number;
  zapierIntegrations: boolean;

  // Support
  emailSupport: boolean;
  prioritySupport: boolean;
  dedicatedAccountManager: boolean;

  // Branding
  showAds: boolean;
  showNexusBranding: boolean;
}

export interface PlanPricing {
  monthly: number;
  yearly: number;
  yearlyMonthlyEquivalent: number;
  currency: string;
}

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  description: string;
  pricing: PlanPricing;
  limits: PlanLimits;
  features: string[];
  popular?: boolean;
  trialDays: number;
  paddleProductId?: {
    monthly: string;
    yearly: string;
  };
}

// Helper constants for byte sizes
const KB = 1024;
const MB = 1024 * KB;
const GB = 1024 * MB;

export const SUBSCRIPTION_PLANS: Record<PlanTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out Nexus QR',
    pricing: {
      monthly: 0,
      yearly: 0,
      yearlyMonthlyEquivalent: 0,
      currency: 'USD',
    },
    trialDays: 0,
    limits: {
      // QR Code Limits
      dynamicQRCodes: 5,
      staticQRCodes: -1, // unlimited
      scansPerMonth: 500,

      // Bulk Generation
      staticBulkPerBatch: 50,
      dynamicBulkPerBatch: 0,

      // File Upload Limits
      logoUploadSize: 500 * KB,
      pdfUploadSize: 0,
      audioUploadSize: 0,
      videoUploadSize: 0,
      documentUploadSize: 0,
      bulkCSVUploadSize: 0,
      totalStorageLimit: 50 * MB,

      // Analytics
      analyticsRetentionDays: 7,
      realTimeTracking: false,
      locationTracking: 'none',
      deviceAnalytics: false,
      exportAnalytics: false,

      // Customization
      qrColorsAndPatterns: false,
      logoInQR: false,
      customShortURL: false,
      customLandingPage: false,
      whiteLabel: false,
      customDomain: false,

      // Advanced Features
      qrExpiryScheduling: false,
      passwordProtectedQR: false,
      conditionalRedirectRules: 0,
      folders: 0,
      qrTemplates: 3,

      // API Access
      apiRequestsPerMonth: 0,

      // Team & Collaboration
      teamMembers: 0,
      webhooks: 0,
      zapierIntegrations: false,

      // Support
      emailSupport: false,
      prioritySupport: false,
      dedicatedAccountManager: false,

      // Branding
      showAds: true,
      showNexusBranding: true,
    },
    features: [
      '5 Dynamic QR Codes',
      'Unlimited Static QR Codes',
      '500 Scans/month',
      'Basic Analytics (7 days)',
      '50 Static QR Bulk Generation',
    ],
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Great for individuals and small projects',
    pricing: {
      monthly: 7,
      yearly: 63,
      yearlyMonthlyEquivalent: 5.25,
      currency: 'USD',
    },
    trialDays: 7,
    limits: {
      // QR Code Limits
      dynamicQRCodes: 50,
      staticQRCodes: -1,
      scansPerMonth: 10000,

      // Bulk Generation
      staticBulkPerBatch: 500,
      dynamicBulkPerBatch: 5,

      // File Upload Limits
      logoUploadSize: 2 * MB,
      pdfUploadSize: 5 * MB,
      audioUploadSize: 5 * MB,
      videoUploadSize: 0,
      documentUploadSize: 5 * MB,
      bulkCSVUploadSize: 1 * MB,
      totalStorageLimit: 500 * MB,

      // Analytics
      analyticsRetentionDays: 30,
      realTimeTracking: true,
      locationTracking: 'country',
      deviceAnalytics: true,
      exportAnalytics: false,

      // Customization
      qrColorsAndPatterns: true,
      logoInQR: true,
      customShortURL: false,
      customLandingPage: false,
      whiteLabel: false,
      customDomain: false,

      // Advanced Features
      qrExpiryScheduling: false,
      passwordProtectedQR: false,
      conditionalRedirectRules: 0,
      folders: 5,
      qrTemplates: 10,

      // API Access
      apiRequestsPerMonth: 100,

      // Team & Collaboration
      teamMembers: 0,
      webhooks: 0,
      zapierIntegrations: false,

      // Support
      emailSupport: true,
      prioritySupport: false,
      dedicatedAccountManager: false,

      // Branding
      showAds: false,
      showNexusBranding: true,
    },
    features: [
      '50 Dynamic QR Codes',
      '10,000 Scans/month',
      '500 Static QR Bulk Generation',
      'Logo in QR Code',
      '30 Days Analytics',
      'Country-level Tracking',
      'Email Support',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Best for growing businesses',
    popular: true,
    pricing: {
      monthly: 16,
      yearly: 144,
      yearlyMonthlyEquivalent: 12,
      currency: 'USD',
    },
    trialDays: 7,
    limits: {
      // QR Code Limits
      dynamicQRCodes: 300,
      staticQRCodes: -1,
      scansPerMonth: 50000,

      // Bulk Generation
      staticBulkPerBatch: 3000,
      dynamicBulkPerBatch: 25,

      // File Upload Limits
      logoUploadSize: 5 * MB,
      pdfUploadSize: 25 * MB,
      audioUploadSize: 25 * MB,
      videoUploadSize: 50 * MB,
      documentUploadSize: 25 * MB,
      bulkCSVUploadSize: 5 * MB,
      totalStorageLimit: 5 * GB,

      // Analytics
      analyticsRetentionDays: 365,
      realTimeTracking: true,
      locationTracking: 'city',
      deviceAnalytics: true,
      exportAnalytics: true,

      // Customization
      qrColorsAndPatterns: true,
      logoInQR: true,
      customShortURL: true,
      customLandingPage: true,
      whiteLabel: false,
      customDomain: false,

      // Advanced Features
      qrExpiryScheduling: true,
      passwordProtectedQR: true,
      conditionalRedirectRules: 3,
      folders: 20,
      qrTemplates: 50,

      // API Access
      apiRequestsPerMonth: 500,

      // Team & Collaboration
      teamMembers: 0,
      webhooks: 0,
      zapierIntegrations: false,

      // Support
      emailSupport: true,
      prioritySupport: false,
      dedicatedAccountManager: false,

      // Branding
      showAds: false,
      showNexusBranding: true,
    },
    features: [
      '300 Dynamic QR Codes',
      '50,000 Scans/month',
      '3,000 Static QR Bulk Generation',
      'Custom Short URLs',
      'QR Expiry & Scheduling',
      'Password Protected QR',
      '1 Year Analytics',
      'City-level Tracking',
      'Video Upload (50MB)',
    ],
  },

  business: {
    id: 'business',
    name: 'Business',
    description: 'For teams and enterprises',
    pricing: {
      monthly: 37,
      yearly: 333,
      yearlyMonthlyEquivalent: 27.75,
      currency: 'USD',
    },
    trialDays: 7,
    limits: {
      // QR Code Limits
      dynamicQRCodes: 1000,
      staticQRCodes: -1,
      scansPerMonth: 200000,

      // Bulk Generation
      staticBulkPerBatch: 5000,
      dynamicBulkPerBatch: 100,

      // File Upload Limits
      logoUploadSize: 10 * MB,
      pdfUploadSize: 50 * MB,
      audioUploadSize: 50 * MB,
      videoUploadSize: 200 * MB,
      documentUploadSize: 50 * MB,
      bulkCSVUploadSize: 25 * MB,
      totalStorageLimit: 25 * GB,

      // Analytics
      analyticsRetentionDays: 730, // 2 years
      realTimeTracking: true,
      locationTracking: 'full',
      deviceAnalytics: true,
      exportAnalytics: true,

      // Customization
      qrColorsAndPatterns: true,
      logoInQR: true,
      customShortURL: true,
      customLandingPage: true,
      whiteLabel: true,
      customDomain: false,

      // Advanced Features
      qrExpiryScheduling: true,
      passwordProtectedQR: true,
      conditionalRedirectRules: 10,
      folders: 100,
      qrTemplates: -1, // unlimited

      // API Access
      apiRequestsPerMonth: 2000,

      // Team & Collaboration
      teamMembers: 3,
      webhooks: 5,
      zapierIntegrations: true,

      // Support
      emailSupport: true,
      prioritySupport: true,
      dedicatedAccountManager: false,

      // Branding
      showAds: false,
      showNexusBranding: false,
    },
    features: [
      '1,000 Dynamic QR Codes',
      '200,000 Scans/month',
      '5,000 Static QR Bulk Generation',
      'White Label (Remove Branding)',
      'Full GPS Tracking',
      '2 Years Analytics',
      '3 Team Members',
      '5 Webhooks',
      'Zapier Integration',
      'Priority Support',
    ],
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with advanced needs',
    pricing: {
      monthly: 89,
      yearly: 800,
      yearlyMonthlyEquivalent: 66.67,
      currency: 'USD',
    },
    trialDays: 7,
    limits: {
      // QR Code Limits
      dynamicQRCodes: -1, // unlimited
      staticQRCodes: -1,
      scansPerMonth: -1, // unlimited

      // Bulk Generation
      staticBulkPerBatch: 10000,
      dynamicBulkPerBatch: 500,

      // File Upload Limits
      logoUploadSize: 25 * MB,
      pdfUploadSize: 100 * MB,
      audioUploadSize: 100 * MB,
      videoUploadSize: 500 * MB,
      documentUploadSize: 100 * MB,
      bulkCSVUploadSize: 100 * MB,
      totalStorageLimit: 100 * GB,

      // Analytics
      analyticsRetentionDays: -1, // forever
      realTimeTracking: true,
      locationTracking: 'full',
      deviceAnalytics: true,
      exportAnalytics: true,

      // Customization
      qrColorsAndPatterns: true,
      logoInQR: true,
      customShortURL: true,
      customLandingPage: true,
      whiteLabel: true,
      customDomain: true,

      // Advanced Features
      qrExpiryScheduling: true,
      passwordProtectedQR: true,
      conditionalRedirectRules: -1, // unlimited
      folders: -1, // unlimited
      qrTemplates: -1, // unlimited

      // API Access
      apiRequestsPerMonth: 5000,

      // Team & Collaboration
      teamMembers: 15,
      webhooks: 20,
      zapierIntegrations: true,

      // Support
      emailSupport: true,
      prioritySupport: true,
      dedicatedAccountManager: true,

      // Branding
      showAds: false,
      showNexusBranding: false,
    },
    features: [
      'Unlimited Dynamic QR Codes',
      'Unlimited Scans',
      '10,000 Static QR Bulk Generation',
      'Custom Domain',
      'White Label',
      'Lifetime Analytics',
      '15 Team Members',
      '20 Webhooks',
      'Dedicated Account Manager',
      'Priority Support',
    ],
  },
};

// Helper function to get plan by tier
export function getPlan(tier: PlanTier): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[tier];
}

// Helper function to check if a feature is available for a plan
export function hasFeature(tier: PlanTier, feature: keyof PlanLimits): boolean {
  const plan = SUBSCRIPTION_PLANS[tier];
  const value = plan.limits[feature];

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value !== 'none';

  return false;
}

// Helper function to get limit value
export function getLimit(tier: PlanTier, limit: keyof PlanLimits): number | boolean | string {
  return SUBSCRIPTION_PLANS[tier].limits[limit];
}

// Helper function to check if user has exceeded a limit
export function isLimitExceeded(tier: PlanTier, limit: keyof PlanLimits, currentUsage: number): boolean {
  const limitValue = SUBSCRIPTION_PLANS[tier].limits[limit];

  if (typeof limitValue !== 'number') return false;
  if (limitValue === -1) return false; // unlimited

  return currentUsage >= limitValue;
}

// Helper function to format limit for display
export function formatLimit(value: number): string {
  if (value === -1) return 'Unlimited';
  if (value === 0) return '—';
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(0)} GB`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)} MB`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)} KB`;
  return value.toLocaleString();
}

// Helper function to calculate yearly savings
export function calculateYearlySavings(tier: PlanTier): number {
  const plan = SUBSCRIPTION_PLANS[tier];
  const monthlyTotal = plan.pricing.monthly * 12;
  const yearlyCost = plan.pricing.yearly;
  return monthlyTotal - yearlyCost;
}

// Helper function to calculate discount percentage
export function calculateDiscountPercentage(tier: PlanTier): number {
  const plan = SUBSCRIPTION_PLANS[tier];
  if (plan.pricing.monthly === 0) return 0;
  const monthlyTotal = plan.pricing.monthly * 12;
  const yearlyCost = plan.pricing.yearly;
  return Math.round(((monthlyTotal - yearlyCost) / monthlyTotal) * 100);
}

// Get all available plans for pricing page
export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

// Get paid plans only
export function getPaidPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS).filter(plan => plan.pricing.monthly > 0);
}

// Compare two plans
export function comparePlans(tierA: PlanTier, tierB: PlanTier): -1 | 0 | 1 {
  const order: PlanTier[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
  const indexA = order.indexOf(tierA);
  const indexB = order.indexOf(tierB);

  if (indexA < indexB) return -1;
  if (indexA > indexB) return 1;
  return 0;
}

// Check if plan upgrade is needed
export function needsUpgrade(currentTier: PlanTier, requiredTier: PlanTier): boolean {
  return comparePlans(currentTier, requiredTier) < 0;
}

// Get recommended upgrade plan
export function getUpgradePlan(currentTier: PlanTier): PlanTier | null {
  const order: PlanTier[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
  const currentIndex = order.indexOf(currentTier);

  if (currentIndex >= order.length - 1) return null;
  return order[currentIndex + 1];
}
