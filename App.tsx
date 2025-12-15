
import React, { useState, useEffect } from 'react';
import { QRType, QRContentData, QRStyleConfig } from './types';
import { QRTabs } from './components/QRTabs';
import { QRInputs } from './components/QRInputs';
import { QRStylePanel } from './components/QRStylePanel';
import { QRPreview } from './components/QRPreview';
import { generatePayload, encryptPayload } from './services/qrUtils';
import { LayoutGrid, Lock, Zap, BarChart3, HelpCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { AuthLoadingScreen, DashboardSkeleton } from './components/auth/AuthLoadingScreen';
import { DynamicQRDashboard } from './components/dynamic/DynamicQRDashboard';
import { ErrorBoundary, OfflineBanner } from './components/ErrorBoundary';
import { ProfileMenu } from './components/ProfileMenu';
import {
  WelcomeModal,
  TourController,
  generatorTourSteps,
  hasSeenWelcome,
  markWelcomeShown,
  completeOnboarding,
} from './components/onboarding/OnboardingTour';
import { BusinessCardLanding } from './components/BusinessCardLanding';

// Analytics tracking options type
export interface AnalyticsOptions {
  trackLocation: boolean;
  trackDevice: boolean;
  trackBrowser: boolean;
  trackTime: boolean;
  trackReferrer: boolean;
}

const INITIAL_STYLE: QRStyleConfig = {
  size: 1000, // Default to HD
  padding: 20,
  errorCorrectionLevel: 'M',
  fgColor: '#000000',
  bgColor: '#ffffff',
  isGradient: false,
  gradientType: 'linear',
  fgColor2: '#2563eb',
  gradientRotation: 45,
  bgTransparent: false,
  customCornerColor: false,
  cornerSquareColor: '#000000',
  cornerDotColor: '#000000',
  dotsType: 'uniform-pills',
  cornerSquareType: 'three-sided',
  cornerDotType: 'square',
  frameType: 'none',
  logoImage: null,
  logoSize: 0.25,
  logoPadding: 0,
  logoBackground: 'transparent'
};

const INITIAL_CONTENT: QRContentData = {
  type: 'text',
  value: 'Welcome to Nexus QR'
};

// Main QR Generator Component
const QRGenerator: React.FC<{
  onDashboardClick: () => void;
  onAuthRequired: () => void;
}> = ({ onDashboardClick, onAuthRequired }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<QRType>('text');
  const [contentData, setContentData] = useState<QRContentData>(INITIAL_CONTENT);
  const [styleConfig, setStyleConfig] = useState<QRStyleConfig>(INITIAL_STYLE);

  const [isEncrypted, setIsEncrypted] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');

  // Onboarding states
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Check if first visit - only show welcome if user has NEVER seen it before
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSeenWelcome()) {
        setShowWelcome(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Handler when welcome modal closes (user already explored)
  const handleWelcomeClose = () => {
    markWelcomeShown();
    setShowWelcome(false);
  };

  // Dynamic QR states
  const [isDynamic, setIsDynamic] = useState(false);
  const [dynamicTitle, setDynamicTitle] = useState('');
  const [analyticsOptions, setAnalyticsOptions] = useState<AnalyticsOptions>({
    trackLocation: true,
    trackDevice: true,
    trackBrowser: true,
    trackTime: true,
    trackReferrer: true,
  });

  // Handle Dynamic QR toggle
  const handleDynamicToggle = (checked: boolean) => {
    if (checked && !user) {
      onAuthRequired();
      return;
    }
    setIsDynamic(checked);
    if (!checked) {
      setDynamicTitle('');
    }
  };

  const handleTabChange = (type: QRType) => {
    setActiveTab(type);
    setContentData({ ...contentData, type });
  };

  const getPayload = () => {
    let raw = generatePayload(contentData);
    if (isEncrypted && encryptionKey) {
       raw = `ENCRYPTED:AES:${encryptPayload(raw, encryptionKey, 'AES')}`;
    }
    return raw;
  };

  const isBulk = contentData.type === 'bulk';

  return (
    <div className="max-w-[1000px] mx-auto pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-4">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-300">
              <LayoutGrid size={20} />
           </div>
           <div>
              <h1 className="text-xl font-bold text-gray-800">Nexus QR</h1>
              <p className="text-xs text-gray-500 font-medium">Professional AI Generator</p>
           </div>
         </div>

         {/* Right side: Dashboard button + Profile */}
         <div className="flex items-center gap-3">
           {user && (
             <button
               onClick={onDashboardClick}
               className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-xl font-medium text-sm hover:bg-gray-200 transition-all"
             >
               <BarChart3 size={16} />
               <span className="hidden sm:inline">Dashboard</span>
             </button>
           )}
           {/* Help button to restart tour */}
           <button
             onClick={() => setShowTour(true)}
             className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-indigo-600"
             title="App Tour"
           >
             <HelpCircle size={20} />
           </button>
           <ProfileMenu onLoginClick={onAuthRequired} />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-2 md:px-4">
        
        {/* Left Column: Input & Styling */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white rounded-[24px] shadow-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6" data-tour="content-type">
               <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
                  <LayoutGrid size={14} />
               </div>
               <h2 className="text-sm font-semibold text-gray-800">Pick a Content Type</h2>
            </div>

            <QRTabs activeTab={activeTab} onChange={handleTabChange} />

            <div className="min-h-[150px]" data-tour="qr-input">
               <QRInputs type={activeTab} data={contentData} onChange={setContentData} />
            </div>
            
            {/* Encryption Toggle */}
            <div className="mt-6 pt-6 border-t border-gray-100" data-tour="encryption">
               <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                     <Lock size={14} className={isEncrypted ? "text-green-600" : "text-gray-400"} />
                     Password Protection
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isEncrypted} onChange={e => setIsEncrypted(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                  </label>
               </div>

               {isEncrypted && (
                   <input
                      type="password"
                      placeholder="Enter Password"
                      value={encryptionKey}
                      onChange={e => setEncryptionKey(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition-colors"
                   />
               )}
            </div>

            {/* Dynamic QR Toggle */}
            <div className="mt-6 pt-6 border-t border-gray-100" data-tour="dynamic-qr">
               <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                     <Zap size={14} className={isDynamic ? "text-indigo-600" : "text-gray-400"} />
                     Dynamic QR
                     <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                       Trackable
                     </span>
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isDynamic}
                      onChange={e => handleDynamicToggle(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
               </div>

               {isDynamic && (
                  <div className="space-y-4">
                     <p className="text-xs text-gray-500">
                       Create a trackable QR with analytics. You can edit the destination anytime.
                     </p>
                     <input
                        type="text"
                        placeholder="QR Code Title (e.g., My Business Card)"
                        value={dynamicTitle}
                        onChange={e => setDynamicTitle(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-colors"
                        maxLength={255}
                     />

                     {/* Analytics Options */}
                     <div className="bg-indigo-50/50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-indigo-900 mb-3">
                          Track Analytics For:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                           {[
                             { key: 'trackLocation', label: 'Location', icon: '📍' },
                             { key: 'trackDevice', label: 'Device', icon: '📱' },
                             { key: 'trackBrowser', label: 'Browser', icon: '🌐' },
                             { key: 'trackTime', label: 'Scan Time', icon: '🕐' },
                             { key: 'trackReferrer', label: 'Referrer', icon: '🔗' },
                           ].map((option) => (
                             <label
                               key={option.key}
                               className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                                 analyticsOptions[option.key as keyof AnalyticsOptions]
                                   ? 'bg-white border-2 border-indigo-500 shadow-sm'
                                   : 'bg-white/50 border-2 border-transparent hover:bg-white'
                               }`}
                             >
                               <input
                                 type="checkbox"
                                 checked={analyticsOptions[option.key as keyof AnalyticsOptions]}
                                 onChange={(e) =>
                                   setAnalyticsOptions({
                                     ...analyticsOptions,
                                     [option.key]: e.target.checked,
                                   })
                                 }
                                 className="sr-only"
                               />
                               <span className="text-sm">{option.icon}</span>
                               <span className={`text-xs font-medium ${
                                 analyticsOptions[option.key as keyof AnalyticsOptions]
                                   ? 'text-indigo-700'
                                   : 'text-gray-500'
                               }`}>
                                 {option.label}
                               </span>
                             </label>
                           ))}
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* Replaced QRStyling with QRStylePanel which contains the new features */}
            <div data-tour="style-panel">
              <QRStylePanel config={styleConfig} onChange={setStyleConfig} />
            </div>
          </div>
        </div>

        {/* Right Column: Preview (Sticky on Desktop) */}
        <div className="md:col-span-5 relative" data-tour="qr-preview">
           <div className="sticky top-6">
              <QRPreview
                 data={getPayload()}
                 config={styleConfig}
                 bulkItems={isBulk ? contentData.bulk?.items : undefined}
                 onConfigChange={setStyleConfig}
                 isDynamic={isDynamic}
                 dynamicTitle={dynamicTitle}
                 contentData={contentData}
                 isEncrypted={isEncrypted}
                 analyticsOptions={analyticsOptions}
                 onDynamicSuccess={() => {
                   setIsDynamic(false);
                   setDynamicTitle('');
                   setAnalyticsOptions({
                     trackLocation: true,
                     trackDevice: true,
                     trackBrowser: true,
                     trackTime: true,
                     trackReferrer: true,
                   });
                 }}
              />

              <div className="mt-6 text-center text-xs text-gray-400 font-medium">
                 {isDynamic ? (
                   <>
                     This QR will be trackable with analytics.
                     <br/>View stats in your Dashboard.
                   </>
                 ) : (
                   <>
                     Generated securely on your device.
                     <br/>No data is stored on our servers.
                   </>
                 )}
              </div>
           </div>
        </div>

      </div>

      {/* Onboarding Welcome Modal - only shows on first ever visit */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleWelcomeClose}
        onStartTour={() => {
          handleWelcomeClose();
          setShowTour(true);
        }}
      />

      {/* Guided Tour */}
      <TourController
        isActive={showTour}
        onComplete={() => {
          setShowTour(false);
          completeOnboarding();
        }}
        steps={generatorTourSteps}
        storageKey="nexus_qr_onboarding_completed"
      />
    </div>
  );
};

// Main App Component with Routing
const AppContent: React.FC = () => {
  const { user, loading, authStatus } = useAuth();
  const [view, setView] = useState<'generator' | 'dynamic' | 'business-card'>('generator');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [cardSlug, setCardSlug] = useState<string | null>(null);

  // Handle URL-based routing for redirect
  useEffect(() => {
    const path = window.location.pathname;

    // Check for business card landing page route
    if (path.startsWith('/card/')) {
      const slug = path.replace('/card/', '');
      if (slug) {
        setCardSlug(slug);
        setView('business-card');
        return;
      }
    }

    // Check for dashboard route
    if (path.startsWith('/dashboard')) {
      if (user) {
        setView('dynamic');
      } else {
        setShowAuthModal(true);
      }
    }
  }, [user]);

  const handleDashboardClick = () => {
    if (user) {
      setDashboardLoading(true);
      // Small delay for smooth transition
      setTimeout(() => {
        setView('dynamic');
        setDashboardLoading(false);
      }, 300);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleAuthRequired = () => {
    setShowAuthModal(true);
  };

  const handleBackToGenerator = () => {
    setView('generator');
    window.history.pushState({}, '', '/');
  };

  // Show auth loading screen immediately when login starts or during OAuth
  if (authStatus === 'authenticating') {
    return <AuthLoadingScreen status="authenticating" />;
  }

  // Show authenticated state briefly after successful login
  if (loading && authStatus === 'authenticated') {
    return <AuthLoadingScreen status="authenticated" />;
  }

  // Show initializing state on first load
  if (loading && authStatus === 'initializing') {
    return <AuthLoadingScreen status="initializing" />;
  }

  // Show dashboard skeleton while loading
  if (dashboardLoading) {
    return <DashboardSkeleton />;
  }

  // Business Card Landing Page (public - no auth required)
  if (view === 'business-card' && cardSlug) {
    return <BusinessCardLanding slug={cardSlug} />;
  }

  if (view === 'dynamic' && user) {
    return (
      <DynamicQRDashboard onBackToGenerator={handleBackToGenerator} />
    );
  }

  return (
    <>
      <QRGenerator onDashboardClick={handleDashboardClick} onAuthRequired={handleAuthRequired} />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

// Root App with AuthProvider and ErrorBoundary
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <OfflineBanner />
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
