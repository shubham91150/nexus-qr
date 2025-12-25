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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="p-8 pb-0 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600/20 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Upgrade to Unlock More Features
          </h2>
          {reason && (
            <p className="text-gray-400 max-w-md mx-auto">
              {reason}
            </p>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mt-6">
          <div className="inline-flex items-center bg-gray-800 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                -25%
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {plansToShow.map((tier) => {
            const plan = SUBSCRIPTION_PLANS[tier];
            const isRecommended = tier === recommendedPlan;
            const price = billingCycle === 'monthly'
              ? plan.pricing.monthly
              : plan.pricing.yearlyMonthlyEquivalent;

            return (
              <div
                key={tier}
                className={`relative rounded-xl p-6 ${
                  isRecommended
                    ? 'bg-indigo-600/20 ring-2 ring-indigo-500'
                    : 'bg-gray-800'
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Recommended
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${
                    isRecommended ? 'bg-indigo-500/30 text-indigo-300' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {getPlanIcon(tier)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{plan.name}</h3>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">${price}</span>
                  <span className="text-gray-400">/mo</span>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Billed ${plan.pricing.yearly}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(tier)}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                    isRecommended
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {plan.trialDays > 0 ? `Start ${plan.trialDays}-Day Trial` : 'Upgrade Now'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 text-center">
          <p className="text-sm text-gray-500">
            All plans include a 7-day free trial. Cancel anytime.
            <br />
            Need more? <a href="#" className="text-indigo-400 hover:underline">Contact us</a> for Enterprise pricing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
