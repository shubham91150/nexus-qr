import React, { useState } from 'react';
import {
  Check,
  X,
  Zap,
  Crown,
  Building2,
  Rocket,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  Users,
  Globe,
  BarChart3,
  Palette,
  Link,
  Lock,
  Folder,
  FileUp,
  Webhook,
  Headphones,
} from 'lucide-react';
import { useSubscription } from '../lib/SubscriptionContext';
import { useAuth } from '../lib/AuthContext';
import {
  PlanTier,
  BillingCycle,
  SUBSCRIPTION_PLANS,
  getAllPlans,
  calculateDiscountPercentage,
  formatLimit,
} from '../lib/subscriptionPlans';

interface PricingPageProps {
  onClose?: () => void;
  onAuthRequired?: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onClose, onAuthRequired }) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [isLoading, setIsLoading] = useState<PlanTier | null>(null);

  const { user } = useAuth();
  const { currentPlan, subscribe, isTrialing } = useSubscription();

  const plans = getAllPlans();

  const getPlanIcon = (tier: PlanTier) => {
    switch (tier) {
      case 'free':
        return <Zap className="w-6 h-6" />;
      case 'starter':
        return <Rocket className="w-6 h-6" />;
      case 'pro':
        return <Crown className="w-6 h-6" />;
      case 'business':
        return <Building2 className="w-6 h-6" />;
      case 'enterprise':
        return <Sparkles className="w-6 h-6" />;
      default:
        return <Zap className="w-6 h-6" />;
    }
  };

  const getPlanColor = (tier: PlanTier) => {
    switch (tier) {
      case 'free':
        return 'gray';
      case 'starter':
        return 'blue';
      case 'pro':
        return 'indigo';
      case 'business':
        return 'purple';
      case 'enterprise':
        return 'amber';
      default:
        return 'gray';
    }
  };

  const handleSubscribe = async (tier: PlanTier) => {
    if (tier === 'free') return;

    if (!user) {
      onAuthRequired?.();
      return;
    }

    setIsLoading(tier);
    try {
      await subscribe(tier, billingCycle);
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const getButtonText = (tier: PlanTier) => {
    if (tier === currentPlan) {
      return 'Current Plan';
    }
    if (tier === 'free') {
      return 'Get Started';
    }
    const plan = SUBSCRIPTION_PLANS[tier];
    if (plan.trialDays > 0) {
      return `Start ${plan.trialDays}-Day Free Trial`;
    }
    return 'Subscribe Now';
  };

  const isCurrentPlan = (tier: PlanTier) => tier === currentPlan;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Start with a 7-day free trial on any paid plan. No credit card required.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-gray-800 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 25%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {plans.map((plan) => {
            const color = getPlanColor(plan.id);
            const isPopular = plan.popular;
            const isCurrent = isCurrentPlan(plan.id);
            const price = billingCycle === 'monthly'
              ? plan.pricing.monthly
              : plan.pricing.yearlyMonthlyEquivalent;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl overflow-hidden ${
                  isPopular
                    ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/20'
                    : 'border border-gray-700'
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute top-0 inset-x-0 bg-indigo-600 text-white text-center text-sm font-medium py-1">
                    Most Popular
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute top-0 inset-x-0 bg-green-600 text-white text-center text-sm font-medium py-1">
                    Current Plan
                  </div>
                )}

                <div className={`p-6 bg-gray-800 h-full flex flex-col ${isPopular || isCurrent ? 'pt-10' : ''}`}>
                  {/* Plan Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg bg-${color}-500/20 text-${color}-400`}>
                      {getPlanIcon(plan.id)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="text-sm text-gray-400">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">
                        ${price}
                      </span>
                      {plan.pricing.monthly > 0 && (
                        <span className="text-gray-400">/mo</span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && plan.pricing.yearly > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        ${plan.pricing.yearly} billed annually
                      </p>
                    )}
                    {plan.trialDays > 0 && !isCurrent && (
                      <p className="text-sm text-green-400 mt-1">
                        {plan.trialDays}-day free trial
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || isLoading === plan.id}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : isPopular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    {isLoading === plan.id ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {getButtonText(plan.id)}
                        {!isCurrent && plan.id !== 'free' && (
                          <ArrowRight className="w-4 h-4" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Features List */}
                  <div className="mt-6 space-y-3 flex-grow">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Compare All Features
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Features</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="py-4 px-4 text-center">
                      <span className="text-white font-bold">{plan.name}</span>
                      <div className="text-sm text-gray-400">
                        ${billingCycle === 'monthly' ? plan.pricing.monthly : plan.pricing.yearlyMonthlyEquivalent}/mo
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* QR Code Limits */}
                <tr className="bg-gray-800/50">
                  <td colSpan={6} className="py-3 px-4 text-indigo-400 font-semibold">
                    <Palette className="w-4 h-4 inline mr-2" />
                    QR Code Limits
                  </td>
                </tr>
                <FeatureRow
                  feature="Dynamic QR Codes"
                  values={plans.map((p) => formatLimit(p.limits.dynamicQRCodes))}
                />
                <FeatureRow
                  feature="Static QR Codes"
                  values={plans.map((p) => formatLimit(p.limits.staticQRCodes))}
                />
                <FeatureRow
                  feature="Scans per Month"
                  values={plans.map((p) => formatLimit(p.limits.scansPerMonth))}
                />

                {/* Bulk Generation */}
                <tr className="bg-gray-800/50">
                  <td colSpan={6} className="py-3 px-4 text-indigo-400 font-semibold">
                    <FileUp className="w-4 h-4 inline mr-2" />
                    Bulk Generation
                  </td>
                </tr>
                <FeatureRow
                  feature="Static Bulk (per batch)"
                  values={plans.map((p) => formatLimit(p.limits.staticBulkPerBatch))}
                />
                <FeatureRow
                  feature="Dynamic Bulk (per batch)"
                  values={plans.map((p) => formatLimit(p.limits.dynamicBulkPerBatch))}
                />

                {/* File Upload */}
                <tr className="bg-gray-800/50">
                  <td colSpan={6} className="py-3 px-4 text-indigo-400 font-semibold">
                    <FileUp className="w-4 h-4 inline mr-2" />
                    File Upload Limits
                  </td>
                </tr>
                <FeatureRow
                  feature="Logo Upload"
                  values={plans.map((p) => formatLimit(p.limits.logoUploadSize))}
                />
                <FeatureRow
                  feature="PDF Upload"
                  values={plans.map((p) => formatLimit(p.limits.pdfUploadSize))}
                />
                <FeatureRow
                  feature="Video Upload"
                  values={plans.map((p) => formatLimit(p.limits.videoUploadSize))}
                />
                <FeatureRow
                  feature="Total Storage"
                  values={plans.map((p) => formatLimit(p.limits.totalStorageLimit))}
                />

                {/* Analytics */}
                <tr className="bg-gray-800/50">
                  <td colSpan={6} className="py-3 px-4 text-indigo-400 font-semibold">
                    <BarChart3 className="w-4 h-4 inline mr-2" />
                    Analytics & Tracking
                  </td>
                </tr>
                <FeatureRow
                  feature="Analytics Retention"
                  values={plans.map((p) =>
                    p.limits.analyticsRetentionDays === -1
                      ? 'Forever'
                      : `${p.limits.analyticsRetentionDays} days`
                  )}
                />
                <FeatureRow
                  feature="Location Tracking"
                  values={plans.map((p) =>
                    p.limits.locationTracking === 'none'
                      ? '—'
                      : p.limits.locationTracking.charAt(0).toUpperCase() + p.limits.locationTracking.slice(1)
                  )}
                />
                <BooleanFeatureRow
                  feature="Real-time Tracking"
                  values={plans.map((p) => p.limits.realTimeTracking)}
                />
                <BooleanFeatureRow
                  feature="Export Analytics"
                  values={plans.map((p) => p.limits.exportAnalytics)}
                />

                {/* Advanced Features */}
                <tr className="bg-gray-800/50">
                  <td colSpan={6} className="py-3 px-4 text-indigo-400 font-semibold">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Advanced Features
                  </td>
                </tr>
                <BooleanFeatureRow
                  feature="Custom Short URL"
                  values={plans.map((p) => p.limits.customShortURL)}
                />
                <BooleanFeatureRow
                  feature="Password Protected QR"
                  values={plans.map((p) => p.limits.passwordProtectedQR)}
                />
                <BooleanFeatureRow
                  feature="QR Expiry & Scheduling"
                  values={plans.map((p) => p.limits.qrExpiryScheduling)}
                />
                <FeatureRow
                  feature="Conditional Redirects"
                  values={plans.map((p) => formatLimit(p.limits.conditionalRedirectRules))}
                />
                <FeatureRow
                  feature="Folders"
                  values={plans.map((p) => formatLimit(p.limits.folders))}
                />

                {/* Customization */}
                <tr className="bg-gray-800/50">
                  <td colSpan={6} className="py-3 px-4 text-indigo-400 font-semibold">
                    <Globe className="w-4 h-4 inline mr-2" />
                    Branding & Customization
                  </td>
                </tr>
                <BooleanFeatureRow
                  feature="Logo in QR"
                  values={plans.map((p) => p.limits.logoInQR)}
                />
                <BooleanFeatureRow
                  feature="White Label"
                  values={plans.map((p) => p.limits.whiteLabel)}
                />
                <BooleanFeatureRow
                  feature="Custom Domain"
                  values={plans.map((p) => p.limits.customDomain)}
                />

                {/* Team & API */}
                <tr className="bg-gray-800/50">
                  <td colSpan={6} className="py-3 px-4 text-indigo-400 font-semibold">
                    <Users className="w-4 h-4 inline mr-2" />
                    Team & Integrations
                  </td>
                </tr>
                <FeatureRow
                  feature="Team Members"
                  values={plans.map((p) => formatLimit(p.limits.teamMembers))}
                />
                <FeatureRow
                  feature="Webhooks"
                  values={plans.map((p) => formatLimit(p.limits.webhooks))}
                />
                <FeatureRow
                  feature="API Requests/month"
                  values={plans.map((p) => formatLimit(p.limits.apiRequestsPerMonth))}
                />
                <BooleanFeatureRow
                  feature="Zapier Integration"
                  values={plans.map((p) => p.limits.zapierIntegrations)}
                />

                {/* Support */}
                <tr className="bg-gray-800/50">
                  <td colSpan={6} className="py-3 px-4 text-indigo-400 font-semibold">
                    <Headphones className="w-4 h-4 inline mr-2" />
                    Support
                  </td>
                </tr>
                <BooleanFeatureRow
                  feature="Email Support"
                  values={plans.map((p) => p.limits.emailSupport)}
                />
                <BooleanFeatureRow
                  feature="Priority Support"
                  values={plans.map((p) => p.limits.prioritySupport)}
                />
                <BooleanFeatureRow
                  feature="Dedicated Account Manager"
                  values={plans.map((p) => p.limits.dedicatedAccountManager)}
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <FaqItem
              question="Can I change my plan later?"
              answer="Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the change will take effect at the end of your current billing period."
            />
            <FaqItem
              question="What happens after my free trial ends?"
              answer="After your 7-day free trial, you'll be automatically charged for the plan you selected. You can cancel anytime before the trial ends to avoid being charged."
            />
            <FaqItem
              question="Do you offer refunds?"
              answer="Yes, we offer a 30-day money-back guarantee. If you're not satisfied with our service, contact support for a full refund."
            />
            <FaqItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards, PayPal, and bank transfers for annual plans. Payments are processed securely through Paddle."
            />
            <FaqItem
              question="Can I use the API on any plan?"
              answer="Basic API access is included with Starter plan and above. For heavy API usage, we recommend our dedicated API plans with higher rate limits."
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses using Nexus QR to create dynamic, trackable QR codes.
            </p>
            <button
              onClick={() => handleSubscribe('pro')}
              className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components
const FeatureRow: React.FC<{ feature: string; values: string[] }> = ({ feature, values }) => (
  <tr className="border-b border-gray-700/50">
    <td className="py-3 px-4 text-gray-300">{feature}</td>
    {values.map((value, index) => (
      <td key={index} className="py-3 px-4 text-center text-white">
        {value}
      </td>
    ))}
  </tr>
);

const BooleanFeatureRow: React.FC<{ feature: string; values: boolean[] }> = ({ feature, values }) => (
  <tr className="border-b border-gray-700/50">
    <td className="py-3 px-4 text-gray-300">{feature}</td>
    {values.map((value, index) => (
      <td key={index} className="py-3 px-4 text-center">
        {value ? (
          <Check className="w-5 h-5 text-green-400 mx-auto" />
        ) : (
          <X className="w-5 h-5 text-gray-600 mx-auto" />
        )}
      </td>
    ))}
  </tr>
);

const FaqItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex items-center justify-between bg-gray-800 hover:bg-gray-700 transition-colors"
      >
        <span className="font-medium text-white">{question}</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
        </span>
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-gray-800/50 text-gray-300">
          {answer}
        </div>
      )}
    </div>
  );
};

export default PricingPage;
