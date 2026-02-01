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
    <div className="min-h-screen bg-[#f5f5f5] py-8 sm:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <span className="inline-block px-4 py-1.5 bg-white text-gray-600 text-xs sm:text-sm font-medium rounded-full mb-4">
            Pricing
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">
            Choose Your Plan
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Start with a 7-day free trial on any paid plan. No credit card required.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-full p-1.5">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Yearly
              <span className="bg-gray-800 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full">
                -25%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {plans.map((plan) => {
            const isPopular = plan.popular;
            const isCurrent = isCurrentPlan(plan.id);
            const price = billingCycle === 'monthly'
              ? plan.pricing.monthly
              : plan.pricing.yearlyMonthlyEquivalent;

            return (
              <div
                key={plan.id}
                className="relative rounded-2xl sm:rounded-[24px] overflow-hidden bg-white hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-4 sm:p-6 h-full flex flex-col">
                  {/* Plan Icon & Name */}
                  <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black flex items-center justify-center text-white flex-shrink-0">
                      {getPlanIcon(plan.id)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800">{plan.name}</h3>
                        {/* Pill Badges */}
                        {isCurrent && (
                          <span className="px-2.5 py-0.5 bg-gray-900 text-white text-[10px] sm:text-xs font-medium rounded-full">
                            Active
                          </span>
                        )}
                        {isPopular && !isCurrent && (
                          <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] sm:text-xs font-medium rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-bold text-gray-800">
                        ${price}
                      </span>
                      {plan.pricing.monthly > 0 && (
                        <span className="text-gray-400 text-sm">/mo</span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && plan.pricing.yearly > 0 && (
                      <p className="text-xs sm:text-sm text-gray-400 mt-1">
                        ${plan.pricing.yearly} billed annually
                      </p>
                    )}
                    {plan.trialDays > 0 && !isCurrent && (
                      <p className="text-xs sm:text-sm text-gray-600 font-medium mt-1">
                        {plan.trialDays}-day free trial
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || isLoading === plan.id}
                    className={`w-full py-2.5 sm:py-3 px-4 rounded-full font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isPopular
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isLoading === plan.id ? (
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
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
                  <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 flex-grow">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-700" />
                        </div>
                        <span className="text-xs sm:text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <div className="mt-12 sm:mt-20">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-4 py-1.5 bg-white text-gray-600 text-xs sm:text-sm font-medium rounded-full mb-4">
              Features
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
              Compare All Features
            </h2>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-[24px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-[#fafafa]">
                    <th className="text-left py-3 sm:py-4 px-3 sm:px-4 text-gray-500 font-medium text-xs sm:text-sm">Features</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="py-3 sm:py-4 px-3 sm:px-4 text-center">
                        <span className="text-gray-800 font-bold text-xs sm:text-sm">{plan.name}</span>
                        <div className="text-[10px] sm:text-xs text-gray-500">
                          ${billingCycle === 'monthly' ? plan.pricing.monthly : plan.pricing.yearlyMonthlyEquivalent}/mo
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* QR Code Limits */}
                  <tr className="bg-[#fafafa]">
                    <td colSpan={6} className="py-2 sm:py-3 px-3 sm:px-4 text-gray-800 font-semibold text-xs sm:text-sm">
                      <Palette className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2 text-gray-600" />
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
                <tr className="bg-gray-50">
                  <td colSpan={6} className="py-2 sm:py-3 px-3 sm:px-4 text-gray-800 font-semibold text-xs sm:text-sm">
                    <FileUp className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2 text-gray-600" />
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
                <tr className="bg-gray-50">
                  <td colSpan={6} className="py-2 sm:py-3 px-3 sm:px-4 text-gray-800 font-semibold text-xs sm:text-sm">
                    <FileUp className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2 text-gray-600" />
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
                <tr className="bg-gray-50">
                  <td colSpan={6} className="py-2 sm:py-3 px-3 sm:px-4 text-gray-800 font-semibold text-xs sm:text-sm">
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2 text-gray-600" />
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
                <tr className="bg-gray-50">
                  <td colSpan={6} className="py-2 sm:py-3 px-3 sm:px-4 text-gray-800 font-semibold text-xs sm:text-sm">
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2 text-gray-600" />
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
                <tr className="bg-gray-50">
                  <td colSpan={6} className="py-2 sm:py-3 px-3 sm:px-4 text-gray-800 font-semibold text-xs sm:text-sm">
                    <Globe className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2 text-gray-600" />
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
                <tr className="bg-gray-50">
                  <td colSpan={6} className="py-2 sm:py-3 px-3 sm:px-4 text-gray-800 font-semibold text-xs sm:text-sm">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2 text-gray-600" />
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
                <tr className="bg-gray-50">
                  <td colSpan={6} className="py-2 sm:py-3 px-3 sm:px-4 text-gray-800 font-semibold text-xs sm:text-sm">
                    <Headphones className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2 text-gray-600" />
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
        </div>

        {/* FAQ Section */}
        <div className="mt-12 sm:mt-20 max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-4 py-1.5 bg-white text-gray-600 text-xs sm:text-sm font-medium rounded-full mb-4">
              FAQ
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
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
        <div className="mt-12 sm:mt-20 text-center">
          <div className="bg-white rounded-2xl sm:rounded-[24px] p-6 sm:p-8 md:p-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">
              Ready to get started?
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join thousands of businesses using Nexus QR to create dynamic, trackable QR codes.
            </p>
            <button
              onClick={() => handleSubscribe('pro')}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors inline-flex items-center gap-2 text-sm sm:text-base"
            >
              Start Your Free Trial
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components
const FeatureRow: React.FC<{ feature: string; values: string[] }> = ({ feature, values }) => (
  <tr className="border-b border-gray-100">
    <td className="py-2 sm:py-3 px-3 sm:px-4 text-gray-600 text-xs sm:text-sm">{feature}</td>
    {values.map((value, index) => (
      <td key={index} className="py-2 sm:py-3 px-3 sm:px-4 text-center text-gray-800 text-xs sm:text-sm font-medium">
        {value}
      </td>
    ))}
  </tr>
);

const BooleanFeatureRow: React.FC<{ feature: string; values: boolean[] }> = ({ feature, values }) => (
  <tr className="border-b border-gray-100">
    <td className="py-2 sm:py-3 px-3 sm:px-4 text-gray-600 text-xs sm:text-sm">{feature}</td>
    {values.map((value, index) => (
      <td key={index} className="py-2 sm:py-3 px-3 sm:px-4 text-center">
        {value ? (
          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" />
        ) : (
          <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 mx-auto" />
        )}
      </td>
    ))}
  </tr>
);

const FaqItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-800 text-sm sm:text-base">{question}</span>
        <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 rotate-90" />
        </span>
      </button>
      {isOpen && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 text-gray-500 text-sm">
          {answer}
        </div>
      )}
    </div>
  );
};

export default PricingPage;
