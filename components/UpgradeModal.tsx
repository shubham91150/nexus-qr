import React, { useState } from 'react';
import {
  X,
  Crown,
  Zap,
  Check,
  ArrowRight,
  Sparkles,
  Shield,
  Rocket,
} from 'lucide-react';
import { useSubscription } from '../lib/SubscriptionContext';
import {
  PlanTier,
  BillingCycle,
  SUBSCRIPTION_PLANS,
  getUpgradePlan,
  calculateDiscountPercentage,
} from '../lib/subscriptionPlans';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  requiredPlan?: PlanTier | null;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  reason,
  requiredPlan,
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const { currentPlan, subscribe } = useSubscription();

  if (!isOpen) return null;

  // Determine which plans to show
  const recommendedPlan = requiredPlan || getUpgradePlan(currentPlan) || 'pro';
  const plansToShow: PlanTier[] = ['starter', 'pro', 'business'].filter(
    (p) => SUBSCRIPTION_PLANS[p].pricing.monthly > SUBSCRIPTION_PLANS[currentPlan].pricing.monthly
  );

  const handleUpgrade = async (tier: PlanTier) => {
    setIsLoading(true);
    try {
      await subscribe(tier, billingCycle);
      onClose();
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanIcon = (tier: PlanTier) => {
    switch (tier) {
      case 'starter':
        return <Rocket className="w-6 h-6" />;
      case 'pro':
        return <Crown className="w-6 h-6" />;
      case 'business':
        return <Shield className="w-6 h-6" />;
      default:
        return <Zap className="w-6 h-6" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-500/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button - Circular dark background */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="pt-16 pb-4 px-6 text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-8 h-8 text-gray-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            Premium Features
          </h2>
          <p className="text-gray-400 text-sm">
            Unlock Premium Functionality
          </p>
          {reason && (
            <p className="text-gray-600 text-sm mt-3 max-w-md mx-auto">
              {reason}
            </p>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center px-6">
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Yearly
              <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full">
                -25%
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {plansToShow.map((tier) => {
            const plan = SUBSCRIPTION_PLANS[tier];
            const isRecommended = tier === recommendedPlan;
            const price = billingCycle === 'monthly'
              ? plan.pricing.monthly
              : plan.pricing.yearlyMonthlyEquivalent;

            return (
              <div
                key={tier}
                className={`relative rounded-2xl p-5 ${
                  isRecommended
                    ? 'bg-gray-50'
                    : 'bg-white'
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gray-800 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white">
                    {getPlanIcon(tier)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-2xl font-bold text-gray-900">${price}</span>
                  <span className="text-gray-400 text-sm">/mo</span>
                  {billingCycle === 'yearly' && (
                    <p className="text-xs text-gray-400 mt-1">
                      Billed ${plan.pricing.yearly}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-5">
                  {plan.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(tier)}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    isRecommended
                      ? 'bg-gray-800 text-white hover:bg-gray-900'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      {plan.trialDays > 0 ? `Start ${plan.trialDays}-Day Trial` : 'Upgrade'}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-400">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
