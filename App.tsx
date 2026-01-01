
import React, { useState, useEffect } from 'react';
import { QRType, QRContentData, QRStyleConfig } from './types';
import { QRTabs } from './components/QRTabs';
import { QRInputs } from './components/QRInputs';
import { QRStylePanel } from './components/QRStylePanel';
import { QRPreview } from './components/QRPreview';
import { SaveTemplateModal, TemplateGallery } from './components/templates';
import { generatePayload, encryptPayload } from './services/qrUtils';
import { LayoutGrid, Lock, Zap, BarChart3, HelpCircle, Info, Code, Crown, Bookmark, Sparkles } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { SubscriptionProvider, useSubscription } from './lib/SubscriptionContext';
import UpgradeModal from './components/UpgradeModal';
import PricingPage from './components/PricingPage';
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
import ApiDashboard from './components/ApiDashboard';
import ApiDocs from './components/ApiDocs';
import ApiDocsInteractive from './components/ApiDocsInteractive';
import ApiWebhooks from './components/ApiWebhooks';
import ApiPlayground from './components/ApiPlayground';
import ApiAnalytics from './components/ApiAnalytics';
import ApiLogs from './components/ApiLogs';
import WebhookDeliveryLogs from './components/WebhookDeliveryLogs';
import TeamAccessControl from './components/TeamAccessControl';
import ApiPerformanceMonitor from './components/ApiPerformanceMonitor';
import CustomDomainConfig from './components/CustomDomainConfig';
import WebhookSignatureVerification from './components/WebhookSignatureVerification';
import ApiAuditTrail from './components/ApiAuditTrail';
import ApiUsageQuota from './components/ApiUsageQuota';
import ApiOnboardingWizard from './components/ApiOnboardingWizard';
import RateLimitingPanel from './components/RateLimitingPanel';
import IpWhitelisting from './components/IpWhitelisting';
import CorsConfiguration from './components/CorsConfiguration';
import ApiKeyRotation from './components/ApiKeyRotation';
import ApiKeyScopes from './components/ApiKeyScopes';
import ApiChangelog from './components/ApiChangelog';
import ApiStatusPage from './components/ApiStatusPage';
import ApiSDKExamples from './components/ApiSDKExamples';
import PostmanCollectionExport from './components/PostmanCollectionExport';
import ErrorCodesReference from './components/ErrorCodesReference';
import DeveloperPortal from './components/DeveloperPortal';
import ApiTestingSandbox from './components/ApiTestingSandbox';

// QR Type Categories for Dynamic/Static handling
// Category 1: ONLY DYNAMIC - Requires server for file hosting, editability, tracking
const ONLY_DYNAMIC_TYPES: QRType[] = [
  'pdf', 'menu', 'audio', 'video', 'images', 'document', 'coupon', 'ai', 'bulk'
];

// Category 2: BOTH - Can work as static (direct encoding) or dynamic (trackable)
const BOTH_DYNAMIC_STATIC_TYPES: QRType[] = [
  'url', 'text', 'youtube', 'instagram', 'twitter', 'linkedin', 'facebook',
  'tiktok', 'pinterest', 'snapchat', 'discord', 'telegram', 'spotify',
  'whatsapp', 'zoom', 'googlemeet', 'googlereview', 'paypal', 'skype',
  'appstore', 'social'
];

// Category 3: ONLY STATIC - Native phone protocols (tel:, mailto:, WIFI:, vCard, etc.)
const ONLY_STATIC_TYPES: QRType[] = [
  'wifi', 'contact', 'phone', 'sms', 'email', 'geo', 'event', 'bitcoin', 'upi', 'facetime'
];

// Helper function to get QR type category
const getQRTypeCategory = (type: QRType): 'only-dynamic' | 'both' | 'only-static' => {
  if (ONLY_DYNAMIC_TYPES.includes(type)) return 'only-dynamic';
  if (ONLY_STATIC_TYPES.includes(type)) return 'only-static';
  return 'both';
};

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
  logoUseCustomColors: false,
  logoForegroundColor: '#000000',
  logoBackgroundColor: '#ffffff',
  logoShape: 'auto',
};

const INITIAL_CONTENT: QRContentData = {
  type: 'text',
  value: ''
};

// Key for saving QR state before login
const PENDING_QR_STATE_KEY = 'nexus_qr_pending_state';

// Interface for saved QR state
interface PendingQRState {
  activeTab: QRType;
  contentData: QRContentData;
  styleConfig: QRStyleConfig;
  enableDynamicAfterLogin: boolean;
  dynamicTitle: string;
  analyticsOptions: AnalyticsOptions;
  timestamp: number;
}

// Save QR state before login redirect
const savePendingQRState = (state: Omit<PendingQRState, 'timestamp'>) => {
  try {
    const stateWithTimestamp: PendingQRState = {
      ...state,
      timestamp: Date.now()
    };
    localStorage.setItem(PENDING_QR_STATE_KEY, JSON.stringify(stateWithTimestamp));
  } catch (e) {
    console.error('Failed to save pending QR state:', e);
  }
};

// Get saved QR state after login
const getPendingQRState = (): PendingQRState | null => {
  try {
    const saved = localStorage.getItem(PENDING_QR_STATE_KEY);
    if (!saved) return null;

    const state = JSON.parse(saved) as PendingQRState;

    // Check if state is not older than 30 minutes
    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - state.timestamp > thirtyMinutes) {
      localStorage.removeItem(PENDING_QR_STATE_KEY);
      return null;
    }

    return state;
  } catch (e) {
    console.error('Failed to get pending QR state:', e);
    return null;
  }
};

// Clear saved QR state
const clearPendingQRState = () => {
  localStorage.removeItem(PENDING_QR_STATE_KEY);
};

// Main QR Generator Component
const QRGenerator: React.FC<{
  onDashboardClick: () => void;
  onAuthRequired: () => void;
  onApiClick: () => void;
  onPricingClick: () => void;
}> = ({ onDashboardClick, onAuthRequired, onApiClick, onPricingClick }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<QRType>('text');
  const [contentData, setContentData] = useState<QRContentData>(INITIAL_CONTENT);
  const [styleConfig, setStyleConfig] = useState<QRStyleConfig>(INITIAL_STYLE);

  const [isEncrypted, setIsEncrypted] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');

  // Onboarding states
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Template states
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

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

  // Restore pending QR state after login
  useEffect(() => {
    if (user) {
      const pendingState = getPendingQRState();
      if (pendingState) {
        // Restore all saved state
        setActiveTab(pendingState.activeTab);
        setContentData(pendingState.contentData);
        setStyleConfig(pendingState.styleConfig);
        setAnalyticsOptions(pendingState.analyticsOptions);

        // Enable dynamic QR if user was trying to enable it
        if (pendingState.enableDynamicAfterLogin) {
          setIsDynamic(true);
          setDynamicTitle(pendingState.dynamicTitle);
        }

        // Clear the saved state after restoring
        clearPendingQRState();
      }
    }
  }, [user]);

  // Auto-generate title based on content type and data
  const generateAutoTitle = (type: QRType, data: QRContentData): string => {
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const typeLabels: Record<string, string> = {
      url: 'Link', text: 'Text', wifi: 'WiFi', contact: 'Contact', email: 'Email',
      phone: 'Phone', geo: 'Location', event: 'Event', social: 'Social', sms: 'SMS',
      whatsapp: 'WhatsApp', youtube: 'YouTube', bitcoin: 'Bitcoin', coupon: 'Coupon',
      upi: 'UPI', paypal: 'PayPal', telegram: 'Telegram', spotify: 'Spotify',
      instagram: 'Instagram', twitter: 'Twitter', linkedin: 'LinkedIn', zoom: 'Zoom',
      facebook: 'Facebook', tiktok: 'TikTok', pinterest: 'Pinterest', snapchat: 'Snapchat',
      discord: 'Discord', skype: 'Skype', facetime: 'FaceTime', googlemeet: 'Meet',
      googlereview: 'Review', pdf: 'PDF', menu: 'Menu', audio: 'Audio', video: 'Video',
      images: 'Gallery', document: 'Document', appstore: 'App', ai: 'AI'
    };

    const label = typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);

    // Try to get a meaningful name from the data
    let name = '';
    if (data.contact?.firstName) name = data.contact.firstName;
    else if (data.wifi?.ssid) name = data.wifi.ssid;
    else if (data.event?.title) name = data.event.title;
    else if (data.audio?.title) name = data.audio.title;
    else if (data.video?.title) name = data.video.title;
    else if (data.pdf?.title) name = data.pdf.title;
    else if (data.images?.title) name = data.images.title;
    else if (data.document?.title) name = data.document.title;
    else if (data.coupon?.code) name = data.coupon.code;
    else if (data.instagram?.username) name = `@${data.instagram.username}`;
    else if (data.twitter?.username) name = `@${data.twitter.username}`;
    else if (data.linkedin?.username) name = data.linkedin.username;

    if (name) {
      return `${label} - ${name}`;
    }
    return `${label} QR - ${timestamp}`;
  };

  // Handle Dynamic QR toggle
  const handleDynamicToggle = (checked: boolean) => {
    if (checked && !user) {
      // Save current state before login redirect
      const autoTitle = generateAutoTitle(activeTab, contentData);
      savePendingQRState({
        activeTab,
        contentData,
        styleConfig,
        enableDynamicAfterLogin: true,
        dynamicTitle: autoTitle,
        analyticsOptions
      });
      onAuthRequired();
      return;
    }
    setIsDynamic(checked);
    if (checked && !dynamicTitle) {
      setDynamicTitle(generateAutoTitle(activeTab, contentData));
    }
    if (!checked) {
      setDynamicTitle('');
    }
  };

  const handleTabChange = (type: QRType) => {
    setActiveTab(type);
    const newContentData = { ...contentData, type };
    setContentData(newContentData);

    // Auto-manage isDynamic based on QR type category
    const category = getQRTypeCategory(type);
    if (category === 'only-dynamic') {
      // Auto-enable dynamic for file-based content types
      if (user) {
        setIsDynamic(true);
        // Auto-generate title for dynamic-only types
        setDynamicTitle(generateAutoTitle(type, newContentData));
      } else {
        // Save current state before login redirect for dynamic-only types
        const autoTitle = generateAutoTitle(type, newContentData);
        savePendingQRState({
          activeTab: type,
          contentData: newContentData,
          styleConfig,
          enableDynamicAfterLogin: true,
          dynamicTitle: autoTitle,
          analyticsOptions
        });
        // If not logged in, prompt login when switching to dynamic-only types
        onAuthRequired();
      }
    } else if (category === 'only-static') {
      // Force disable dynamic for native protocol types
      setIsDynamic(false);
      setDynamicTitle('');
    }
    // For 'both' category, keep the current state - user decides
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
           {/* Pricing button - visible to all */}
           <button
             onClick={onPricingClick}
             className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2 rounded-xl font-medium text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
           >
             <Crown size={16} />
             <span className="hidden sm:inline">Pricing</span>
           </button>
           {user && (
             <>
               <button
                 onClick={onApiClick}
                 className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl font-medium text-sm hover:bg-indigo-200 transition-all"
               >
                 <Code size={16} />
                 <span className="hidden sm:inline">API</span>
               </button>
               <button
                 onClick={onDashboardClick}
                 className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-xl font-medium text-sm hover:bg-gray-200 transition-all"
               >
                 <BarChart3 size={16} />
                 <span className="hidden sm:inline">Dashboard</span>
               </button>
             </>
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

            {/* Dynamic QR Toggle - Hidden for ONLY_STATIC types */}
            {getQRTypeCategory(activeTab) !== 'only-static' && (
              <div className="mt-6 pt-6 border-t border-gray-100" data-tour="dynamic-qr">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Zap size={14} className={isDynamic ? "text-indigo-600" : "text-gray-400"} />
                    Dynamic QR
                    {getQRTypeCategory(activeTab) === 'only-dynamic' ? (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        Required
                      </span>
                    ) : (
                      <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                        Trackable
                      </span>
                    )}
                  </h3>

                  {/* Show different UI based on category */}
                  {getQRTypeCategory(activeTab) === 'only-dynamic' ? (
                    // ONLY_DYNAMIC: Always enabled, no toggle
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-600 font-medium">Always On</span>
                      <div className="w-11 h-6 bg-indigo-600 rounded-full relative">
                        <div className="absolute top-[2px] right-[2px] bg-white border-gray-300 border rounded-full h-5 w-5"></div>
                      </div>
                    </div>
                  ) : (
                    // BOTH: Normal toggle
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isDynamic}
                        onChange={e => handleDynamicToggle(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  )}
                </div>

                {/* Info message for ONLY_DYNAMIC types */}
                {getQRTypeCategory(activeTab) === 'only-dynamic' && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl mb-4">
                    <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      This content type requires Dynamic QR for file hosting and tracking.
                      Your files will be stored securely and you can update them anytime.
                    </p>
                  </div>
                )}

                {isDynamic && (
                  <div className="space-y-4">
                    {getQRTypeCategory(activeTab) !== 'only-dynamic' && (
                      <p className="text-xs text-gray-500">
                        Create a trackable QR with analytics. You can edit the destination anytime.
                      </p>
                    )}
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
            )}

            {/* Info message for ONLY_STATIC types */}
            {getQRTypeCategory(activeTab) === 'only-static' && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-start gap-2 p-3 bg-green-50 rounded-xl">
                  <Info size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-green-800 mb-1">Static QR Only</p>
                    <p className="text-xs text-green-700">
                      This content type uses native phone protocols ({activeTab === 'wifi' ? 'WiFi auto-connect' :
                        activeTab === 'contact' ? 'vCard contact save' :
                        activeTab === 'phone' ? 'direct dial' :
                        activeTab === 'sms' ? 'SMS compose' :
                        activeTab === 'email' ? 'email compose' :
                        activeTab === 'geo' ? 'maps location' :
                        activeTab === 'event' ? 'calendar event' :
                        activeTab === 'bitcoin' ? 'crypto wallet' :
                        activeTab === 'upi' ? 'UPI payment' :
                        'native protocol'}).
                      Works offline directly on any phone scanner.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Template Buttons */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-500" />
                  Design Templates
                </h3>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTemplateGallery(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm"
                >
                  <Sparkles size={16} />
                  Browse Templates
                </button>
                <button
                  onClick={() => {
                    if (!user) {
                      onAuthRequired();
                      return;
                    }
                    setShowSaveTemplate(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-all"
                >
                  <Bookmark size={16} />
                  Save as Template
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Save your design to reuse anytime, or browse preset templates
              </p>
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
                 isDynamicOnly={getQRTypeCategory(activeTab) === 'only-dynamic'}
                 dynamicTitle={dynamicTitle}
                 onTitleChange={setDynamicTitle}
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

      {/* Template Modals */}
      <SaveTemplateModal
        isOpen={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        styleConfig={styleConfig}
        onSaved={() => {
          // Optionally show a success message or refresh templates
        }}
      />

      <TemplateGallery
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onApply={(newStyle) => {
          setStyleConfig(newStyle);
          setShowTemplateGallery(false);
        }}
        currentStyle={styleConfig}
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
  const [view, setView] = useState<'generator' | 'dynamic' | 'business-card' | 'api' | 'api-docs' | 'api-docs-interactive' | 'api-webhooks' | 'api-playground' | 'api-analytics' | 'api-logs' | 'webhook-delivery-logs' | 'team-access' | 'api-performance' | 'custom-domain' | 'webhook-signature' | 'api-audit' | 'api-usage-quota' | 'api-onboarding' | 'rate-limiting' | 'ip-whitelisting' | 'cors-config' | 'api-key-rotation' | 'api-key-scopes' | 'api-changelog' | 'api-status' | 'api-sdk-examples' | 'postman-export' | 'error-codes' | 'developer-portal' | 'api-testing-sandbox' | 'pricing'>('generator');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [cardSlug, setCardSlug] = useState<string | null>(null);

  // Route handler function - reusable for both initial load and popstate
  const handleRouteChange = (path: string) => {

    // Check for business card landing page route
    if (path.startsWith('/card/')) {
      const slug = path.replace('/card/', '');
      if (slug) {
        setCardSlug(slug);
        setView('business-card');
        return;
      }
    }

    // Check for pricing page route
    if (path === '/pricing' || path === '/plans') {
      setView('pricing');
      return;
    }

    // Check for API docs route
    if (path === '/api/docs' || path === '/api-docs') {
      setView('api-docs');
      return;
    }

    // Check for interactive API reference route
    if (path === '/api/reference') {
      setView('api-docs-interactive');
      return;
    }

    // Check for webhook delivery logs route
    if (path === '/api/webhooks/logs') {
      if (user) {
        setView('webhook-delivery-logs');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API webhooks route
    if (path === '/api/webhooks') {
      if (user) {
        setView('api-webhooks');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API playground route
    if (path === '/api/playground') {
      if (user) {
        setView('api-playground');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API analytics route
    if (path === '/api/analytics') {
      if (user) {
        setView('api-analytics');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API logs route
    if (path === '/api/logs') {
      if (user) {
        setView('api-logs');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for team access route
    if (path === '/api/team') {
      if (user) {
        setView('team-access');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API performance monitor route
    if (path === '/api/performance') {
      if (user) {
        setView('api-performance');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for custom domain route
    if (path === '/api/domains') {
      if (user) {
        setView('custom-domain');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for webhook signature verification route
    if (path === '/api/webhooks/security') {
      if (user) {
        setView('webhook-signature');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API audit trail route
    if (path === '/api/audit') {
      if (user) {
        setView('api-audit');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API usage quota route
    if (path === '/api/usage') {
      if (user) {
        setView('api-usage-quota');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API onboarding wizard route
    if (path === '/api/onboarding' || path === '/api/getting-started') {
      if (user) {
        setView('api-onboarding');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for rate limiting route
    if (path === '/api/rate-limiting') {
      if (user) {
        setView('rate-limiting');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for IP whitelisting route
    if (path === '/api/ip-whitelist') {
      if (user) {
        setView('ip-whitelisting');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for CORS configuration route
    if (path === '/api/cors') {
      if (user) {
        setView('cors-config');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API key rotation route
    if (path === '/api/keys/rotation') {
      if (user) {
        setView('api-key-rotation');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API key scopes route
    if (path === '/api/keys/scopes') {
      if (user) {
        setView('api-key-scopes');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API changelog route
    if (path === '/api/changelog') {
      setView('api-changelog');
      return;
    }

    // Check for API status page route
    if (path === '/api/status') {
      setView('api-status');
      return;
    }

    // Check for SDK examples route
    if (path === '/api/sdk' || path === '/api/examples') {
      setView('api-sdk-examples');
      return;
    }

    // Check for Postman export route
    if (path === '/api/postman') {
      if (user) {
        setView('postman-export');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for error codes reference route
    if (path === '/api/errors') {
      setView('error-codes');
      return;
    }

    // Check for developer portal route
    if (path === '/developers' || path === '/api/developers') {
      setView('developer-portal');
      return;
    }

    // Check for API testing sandbox route
    if (path === '/api/sandbox' || path === '/api/testing') {
      if (user) {
        setView('api-testing-sandbox');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for API dashboard route
    if (path === '/api' || path === '/api-dashboard') {
      if (user) {
        setView('api');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Check for dashboard route
    if (path.startsWith('/dashboard')) {
      if (user) {
        setView('dynamic');
      } else {
        setShowAuthModal(true);
      }
      return;
    }

    // Default to generator for root or unknown paths
    if (path === '/' || path === '') {
      setView('generator');
    }
  };

  // Handle URL-based routing on initial load and user change
  useEffect(() => {
    handleRouteChange(window.location.pathname);
  }, [user]);

  // Handle browser back/forward button
  useEffect(() => {
    const handlePopState = () => {
      handleRouteChange(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  const handlePricingClick = () => {
    setView('pricing');
    window.history.pushState({}, '', '/pricing');
  };

  const handleApiClick = () => {
    if (user) {
      setView('api');
      window.history.pushState({}, '', '/api');
    } else {
      setShowAuthModal(true);
    }
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

  // API Documentation (public - no auth required)
  if (view === 'api-docs') {
    return <ApiDocs />;
  }

  // Interactive API Reference (public - no auth required)
  if (view === 'api-docs-interactive') {
    return <ApiDocsInteractive onBack={() => {
      setView('api');
      window.history.pushState({}, '', '/api');
    }} />;
  }

  // Pricing Page (public)
  if (view === 'pricing') {
    return <PricingPage
      onClose={handleBackToGenerator}
      onAuthRequired={handleAuthRequired}
    />;
  }

  // API Dashboard (auth required) - Simplified with consolidated features
  if (view === 'api' && user) {
    return <ApiDashboard
      onBack={handleBackToGenerator}
      onWebhooksClick={() => {
        setView('api-webhooks');
        window.history.pushState({}, '', '/api/webhooks');
      }}
      onDocsClick={() => {
        setView('api-docs-interactive');
        window.history.pushState({}, '', '/api/docs');
      }}
      onPlaygroundClick={() => {
        setView('api-playground');
        window.history.pushState({}, '', '/api/playground');
      }}
      onAnalyticsClick={() => {
        setView('api-analytics');
        window.history.pushState({}, '', '/api/analytics');
      }}
      onLogsClick={() => {
        setView('api-logs');
        window.history.pushState({}, '', '/api/logs');
      }}
      onTeamAccessClick={() => {
        setView('team-access');
        window.history.pushState({}, '', '/api/team');
      }}
      onOnboardingClick={() => {
        setView('api-onboarding');
        window.history.pushState({}, '', '/api/onboarding');
      }}
      onSecurityClick={() => {
        setView('api-key-scopes');
        window.history.pushState({}, '', '/api/security');
      }}
    />;
  }

  // API Webhooks (auth required)
  if (view === 'api-webhooks' && user) {
    return <ApiWebhooks onBack={() => {
      setView('api');
      window.history.pushState({}, '', '/api');
    }} onDeliveryLogsClick={() => {
      setView('webhook-delivery-logs');
      window.history.pushState({}, '', '/api/webhooks/logs');
    }} />;
  }

  // API Playground (auth required)
  if (view === 'api-playground' && user) {
    return <ApiPlayground onBack={() => {
      setView('api');
      window.history.pushState({}, '', '/api');
    }} />;
  }

  // API Analytics (auth required)
  if (view === 'api-analytics' && user) {
    return <ApiAnalytics onBack={() => {
      setView('api');
      window.history.pushState({}, '', '/api');
    }} />;
  }

  // API Logs (auth required)
  if (view === 'api-logs' && user) {
    return <ApiLogs onBack={() => {
      setView('api');
      window.history.pushState({}, '', '/api');
    }} />;
  }

  // Webhook Delivery Logs (auth required)
  if (view === 'webhook-delivery-logs' && user) {
    return <WebhookDeliveryLogs onBack={() => {
      setView('api-webhooks');
      window.history.pushState({}, '', '/api/webhooks');
    }} />;
  }

  // Team Access Control (auth required)
  if (view === 'team-access' && user) {
    return <TeamAccessControl
      userId={user.id}
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // API Performance Monitor (auth required)
  if (view === 'api-performance' && user) {
    return <ApiPerformanceMonitor
      userId={user.id}
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // Custom Domain Config (auth required)
  if (view === 'custom-domain' && user) {
    return <CustomDomainConfig
      userId={user.id}
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // Webhook Signature Verification (auth required)
  if (view === 'webhook-signature' && user) {
    return <WebhookSignatureVerification
      userId={user.id}
      onBack={() => {
        setView('api-webhooks');
        window.history.pushState({}, '', '/api/webhooks');
      }}
    />;
  }

  // API Audit Trail (auth required)
  if (view === 'api-audit' && user) {
    return <ApiAuditTrail
      userId={user.id}
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // API Usage Quota (auth required)
  if (view === 'api-usage-quota' && user) {
    return <ApiUsageQuota
      userId={user.id}
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // API Onboarding Wizard (auth required)
  if (view === 'api-onboarding' && user) {
    return <ApiOnboardingWizard
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
      onComplete={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // Rate Limiting Panel (auth required)
  if (view === 'rate-limiting' && user) {
    return <RateLimitingPanel
      userId={user.id}
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // IP Whitelisting (auth required)
  if (view === 'ip-whitelisting' && user) {
    return <IpWhitelisting
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // CORS Configuration (auth required)
  if (view === 'cors-config' && user) {
    return <CorsConfiguration
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // API Key Rotation (auth required)
  if (view === 'api-key-rotation' && user) {
    return <ApiKeyRotation
      userId={user.id}
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // API Key Scopes (auth required)
  if (view === 'api-key-scopes' && user) {
    return <ApiKeyScopes
      userId={user.id}
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // API Changelog
  if (view === 'api-changelog') {
    return <ApiChangelog
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // API Status Page
  if (view === 'api-status') {
    return <ApiStatusPage
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // API SDK Examples
  if (view === 'api-sdk-examples') {
    return <ApiSDKExamples
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // Postman Collection Export (auth required)
  if (view === 'postman-export' && user) {
    return <PostmanCollectionExport
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // Error Codes Reference
  if (view === 'error-codes') {
    return <ErrorCodesReference
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // Developer Portal
  if (view === 'developer-portal') {
    return <DeveloperPortal
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  // API Testing Sandbox (auth required)
  if (view === 'api-testing-sandbox' && user) {
    return <ApiTestingSandbox
      onBack={() => {
        setView('api');
        window.history.pushState({}, '', '/api');
      }}
    />;
  }

  if (view === 'dynamic' && user) {
    return (
      <DynamicQRDashboard onBackToGenerator={handleBackToGenerator} />
    );
  }

  return (
    <>
      <QRGenerator onDashboardClick={handleDashboardClick} onAuthRequired={handleAuthRequired} onApiClick={handleApiClick} onPricingClick={handlePricingClick} />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

// Upgrade Modal Wrapper Component
const UpgradeModalWrapper: React.FC = () => {
  const { showUpgradeModal, upgradeReason, requiredPlan, closeUpgradeModal } = useSubscription();

  return (
    <UpgradeModal
      isOpen={showUpgradeModal}
      onClose={closeUpgradeModal}
      reason={upgradeReason}
      requiredPlan={requiredPlan}
    />
  );
};

// Root App with AuthProvider, SubscriptionProvider and ErrorBoundary
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
          <OfflineBanner />
          <AppContent />
          <UpgradeModalWrapper />
        </SubscriptionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
