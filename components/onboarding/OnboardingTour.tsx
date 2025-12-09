import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, QrCode, Palette, Lock, Zap, BarChart3,
  ChevronRight, ChevronLeft, X, Check, ArrowRight,
  Download, Settings, Globe, Smartphone, Eye
} from 'lucide-react';

// Onboarding storage keys
const ONBOARDING_KEY = 'nexus_qr_onboarding_completed';
const WELCOME_SHOWN_KEY = 'nexus_qr_welcome_shown';
const DASHBOARD_ONBOARDING_KEY = 'nexus_qr_dashboard_onboarding_completed';

// Check if user has seen the welcome modal (first visit)
export const hasSeenWelcome = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(WELCOME_SHOWN_KEY) === 'true';
};

// Mark welcome as shown
export const markWelcomeShown = () => {
  localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
};

// Check if user has completed onboarding tour
export const hasCompletedOnboarding = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
};

export const hasCompletedDashboardOnboarding = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(DASHBOARD_ONBOARDING_KEY) === 'true';
};

// Mark onboarding as complete
export const completeOnboarding = () => {
  localStorage.setItem(ONBOARDING_KEY, 'true');
  localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
};

export const completeDashboardOnboarding = () => {
  localStorage.setItem(DASHBOARD_ONBOARDING_KEY, 'true');
};

// Reset onboarding (for testing)
export const resetOnboarding = () => {
  localStorage.removeItem(ONBOARDING_KEY);
  localStorage.removeItem(WELCOME_SHOWN_KEY);
  localStorage.removeItem(DASHBOARD_ONBOARDING_KEY);
};

// Feature card data
interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: <QrCode size={24} />,
    title: '10+ QR Types',
    description: 'URL, Text, WiFi, vCard, Email, Phone, SMS, UPI, Location, Event & more',
    color: 'bg-indigo-500',
  },
  {
    icon: <Palette size={24} />,
    title: 'Full Customization',
    description: 'Colors, gradients, patterns, corner styles, and logo embedding',
    color: 'bg-purple-500',
  },
  {
    icon: <Lock size={24} />,
    title: 'Password Protection',
    description: 'Encrypt your QR content with AES encryption for security',
    color: 'bg-green-500',
  },
  {
    icon: <Zap size={24} />,
    title: 'Dynamic QR',
    description: 'Update destination anytime. Track scans with real-time analytics',
    color: 'bg-orange-500',
  },
];

// Tour step interface
interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon: React.ReactNode;
}

// Main Generator Tour Steps
const generatorTourSteps: TourStep[] = [
  {
    target: '[data-tour="content-type"]',
    title: 'Content Type Select करें',
    content: 'यहाँ से QR type चुनें - URL, Text, WiFi, vCard, और बहुत कुछ। हर type के लिए specific fields मिलेंगे।',
    position: 'bottom',
    icon: <QrCode size={18} />,
  },
  {
    target: '[data-tour="qr-input"]',
    title: 'Content Enter करें',
    content: 'अपना data यहाँ डालें। जैसे URL type में website link, WiFi में network details।',
    position: 'right',
    icon: <ArrowRight size={18} />,
  },
  {
    target: '[data-tour="encryption"]',
    title: 'Password Protection',
    content: 'Sensitive data के लिए password protection enable करें। QR scan करने पर password माँगेगा।',
    position: 'top',
    icon: <Lock size={18} />,
  },
  {
    target: '[data-tour="dynamic-qr"]',
    title: 'Dynamic QR बनाएं',
    content: 'Enable करें तो QR print होने के बाद भी destination बदल सकते हैं। Plus analytics free!',
    position: 'top',
    icon: <Zap size={18} />,
  },
  {
    target: '[data-tour="style-panel"]',
    title: 'Style Customize करें',
    content: 'Colors, gradients, patterns, corners - सब कुछ customize करें। Logo भी add कर सकते हैं!',
    position: 'top',
    icon: <Palette size={18} />,
  },
  {
    target: '[data-tour="qr-preview"]',
    title: 'Preview & Download',
    content: 'Real-time preview देखें। PNG या SVG में HD quality में download करें।',
    position: 'left',
    icon: <Download size={18} />,
  },
];

// Dashboard Tour Steps
const dashboardTourSteps: TourStep[] = [
  {
    target: '[data-tour="qr-list"]',
    title: 'आपके QR Codes',
    content: 'सभी Dynamic QR codes यहाँ दिखेंगे। Click करके select करें।',
    position: 'right',
    icon: <QrCode size={18} />,
  },
  {
    target: '[data-tour="qr-actions"]',
    title: 'Quick Actions',
    content: 'Copy link, edit, clone, settings, pause/activate, delete - सब यहाँ से करें।',
    position: 'bottom',
    icon: <Settings size={18} />,
  },
  {
    target: '[data-tour="analytics"]',
    title: 'Live Analytics',
    content: 'Real-time scan data देखें - total scans, today, this week।',
    position: 'left',
    icon: <BarChart3 size={18} />,
  },
  {
    target: '[data-tour="device-stats"]',
    title: 'Device & Location',
    content: 'कौन से device और country से scans आ रहे हैं - detailed breakdown।',
    position: 'top',
    icon: <Smartphone size={18} />,
  },
];

// Welcome Modal Component
interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, onStartTour }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const handleSkip = () => {
    completeOnboarding();
    onClose();
  };

  const handleStartTour = () => {
    onClose();
    onStartTour();
  };

  const handleNext = () => {
    if (currentSlide < features.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-slideUp sm:animate-fadeIn max-h-[90vh] sm:max-h-none overflow-y-auto">
        {/* Header with gradient - smaller on mobile */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-5 sm:p-8 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 sm:w-24 h-20 sm:h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Sparkles className="text-white" size={24} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">
              Nexus QR में स्वागत है!
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm">
              Professional QR Generator
            </p>
          </div>
        </div>

        {/* Feature Carousel */}
        <div className="p-4 sm:p-6">
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {features.map((feature, index) => (
                <div key={index} className="w-full flex-shrink-0 px-1 sm:px-2">
                  <div className="text-center">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 ${feature.color} rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-white shadow-lg`}>
                      {feature.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">{feature.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Dots */}
          <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-indigo-600 w-5 sm:w-6'
                    : 'bg-gray-200 w-1.5 sm:w-2 hover:bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="flex justify-between items-center mt-3 sm:mt-4">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <span className="text-[10px] sm:text-xs text-gray-400">
              {currentSlide + 1} / {features.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentSlide === features.length - 1}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 sm:p-6 pt-0 space-y-2 sm:space-y-3">
          <button
            onClick={handleStartTour}
            className="w-full bg-indigo-600 text-white py-3 sm:py-3.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            App Tour शुरू करें
          </button>
          <button
            onClick={handleSkip}
            className="w-full bg-gray-100 text-gray-600 py-2.5 sm:py-3 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Skip करें
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// Tooltip Component for Tour
interface TooltipProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  targetRect: DOMRect | null;
}

const TourTooltip: React.FC<TooltipProps> = ({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  targetRect,
}) => {
  if (!targetRect) return null;

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Calculate position based on step.position
  const getPosition = () => {
    const padding = 12;
    const tooltipWidth = isMobile ? Math.min(window.innerWidth - 24, 300) : 300;
    const tooltipHeight = 180;

    let top = 0;
    let left = 0;

    // On mobile, always show at bottom of screen
    if (isMobile) {
      return { top: 'auto', left: 12, bottom: 12, right: 12, position: 'fixed' };
    }

    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + padding;
        break;
    }

    // Keep within viewport
    const maxLeft = window.innerWidth - tooltipWidth - 12;
    const maxTop = window.innerHeight - tooltipHeight - 12;

    left = Math.max(12, Math.min(left, maxLeft));
    top = Math.max(12, Math.min(top, maxTop));

    return { top, left };
  };

  const position = getPosition();
  const isLastStep = currentStep === totalSteps - 1;

  // Mobile: fixed bottom sheet style
  if (isMobile) {
    return (
      <div
        className="fixed z-[102] left-3 right-3 bottom-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slideUp"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-3 flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
            {step.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-xs truncate">{step.title}</h3>
            <p className="text-indigo-200 text-[10px]">
              {currentStep + 1} / {totalSteps}
            </p>
          </div>
          <button
            onClick={onSkip}
            className="text-white/60 hover:text-white transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          <p className="text-gray-600 text-xs leading-relaxed">{step.content}</p>
        </div>

        {/* Progress + Actions */}
        <div className="px-3 pb-3 flex items-center gap-3">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={currentStep === 0}
              className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onNext}
              className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              {isLastStep ? 'Done' : 'Next'}
              {!isLastStep && <ChevronRight size={14} />}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slideUp {
            animation: slideUp 0.25s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Desktop: positioned tooltip
  return (
    <div
      className="fixed z-[102] w-[300px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-tooltipIn"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-3 flex items-center gap-2">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white">
          {step.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white text-sm">{step.title}</h3>
          <p className="text-indigo-200 text-xs">
            Step {currentStep + 1} of {totalSteps}
          </p>
        </div>
        <button
          onClick={onSkip}
          className="text-white/60 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-gray-600 text-sm leading-relaxed">{step.content}</p>
      </div>

      {/* Progress Bar */}
      <div className="px-3 pb-2">
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 pt-1 flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={currentStep === 0}
          className="flex items-center gap-1 text-gray-500 text-xs font-medium hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
        >
          {isLastStep ? (
            <>
              <Check size={14} />
              Done
            </>
          ) : (
            <>
              Next
              <ChevronRight size={14} />
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-tooltipIn {
          animation: tooltipIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

// Spotlight Overlay for highlighting elements
interface SpotlightProps {
  targetRect: DOMRect | null;
}

const Spotlight: React.FC<SpotlightProps> = ({ targetRect }) => {
  if (!targetRect) return null;

  const padding = 8;

  return (
    <>
      {/* Dark overlay with cutout */}
      <div className="fixed inset-0 z-[101]" style={{ pointerEvents: 'none' }}>
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Highlight ring */}
      <div
        className="fixed z-[101] border-2 border-indigo-500 rounded-xl pointer-events-none animate-pulse-ring"
        style={{
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.3)',
        }}
      />

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.1); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

// Main Tour Controller Component
interface TourControllerProps {
  isActive: boolean;
  onComplete: () => void;
  steps: TourStep[];
  storageKey: string;
}

export const TourController: React.FC<TourControllerProps> = ({
  isActive,
  onComplete,
  steps,
  storageKey,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateTargetRect = useCallback(() => {
    if (!isActive || currentStep >= steps.length) return;

    const target = document.querySelector(steps[currentStep].target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll element into view
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Element not found, skip to next step
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleComplete();
      }
    }
  }, [isActive, currentStep, steps]);

  useEffect(() => {
    updateTargetRect();

    // Update on resize/scroll
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [updateTargetRect]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    onComplete();
  };

  if (!isActive) return null;

  return (
    <>
      <Spotlight targetRect={targetRect} />
      <TourTooltip
        step={steps[currentStep]}
        currentStep={currentStep}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleComplete}
        targetRect={targetRect}
      />
    </>
  );
};

// Export tour steps for use in different contexts
export { generatorTourSteps, dashboardTourSteps };

// Quick Tips Component - shows subtle hints
interface QuickTipProps {
  text: string;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

export const QuickTip: React.FC<QuickTipProps> = ({ text, icon, onDismiss }) => {
  return (
    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3 animate-fadeIn">
      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 flex-shrink-0">
        {icon || <Sparkles size={16} />}
      </div>
      <p className="text-sm text-indigo-700 flex-1">{text}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

// Floating Help Button
interface HelpButtonProps {
  onClick: () => void;
}

export const FloatingHelpButton: React.FC<HelpButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center hover:bg-indigo-700 transition-all hover:scale-105 z-50"
      title="Help & Tour"
    >
      <Sparkles size={24} />
    </button>
  );
};
