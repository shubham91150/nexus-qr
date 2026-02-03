import React, { useState, useRef, useEffect } from 'react';
import { QRType } from '../types';
import {
  Type, Link, Wifi, User, Phone, Mail,
  MapPin, Calendar, Share2, Sparkles, Layers,
  MessageSquare, Store, Youtube, Bitcoin, Ticket,
  IndianRupee, CreditCard, Send, Music, Camera, Twitter, Briefcase, Video,
  Facebook, Ghost, FileText, UtensilsCrossed, Star, PhoneCall, VideoIcon,
  Headphones, Film, Images, File, Plus, X
} from 'lucide-react';

interface Props {
  activeTab: QRType;
  onChange: (tab: QRType) => void;
}

// All available tabs
const allTabs: { id: QRType; icon: any; label: string; category: string }[] = [
  // Essential
  { id: 'text', icon: Type, label: 'Text', category: 'Essential' },
  { id: 'url', icon: Link, label: 'URL', category: 'Essential' },
  { id: 'contact', icon: User, label: 'vCard', category: 'Essential' },
  { id: 'wifi', icon: Wifi, label: 'WiFi', category: 'Essential' },
  { id: 'phone', icon: Phone, label: 'Phone', category: 'Essential' },
  { id: 'email', icon: Mail, label: 'Email', category: 'Essential' },
  { id: 'event', icon: Calendar, label: 'Event', category: 'Essential' },
  { id: 'geo', icon: MapPin, label: 'Location', category: 'Essential' },
  // Social Media
  { id: 'social', icon: Share2, label: 'Social', category: 'Social' },
  { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', category: 'Social' },
  { id: 'telegram', icon: Send, label: 'Telegram', category: 'Social' },
  { id: 'facebook', icon: Facebook, label: 'Facebook', category: 'Social' },
  { id: 'instagram', icon: Camera, label: 'Instagram', category: 'Social' },
  { id: 'twitter', icon: Twitter, label: 'Twitter/X', category: 'Social' },
  { id: 'tiktok', icon: Music, label: 'TikTok', category: 'Social' },
  { id: 'pinterest', icon: Share2, label: 'Pinterest', category: 'Social' },
  { id: 'snapchat', icon: Ghost, label: 'Snapchat', category: 'Social' },
  { id: 'discord', icon: MessageSquare, label: 'Discord', category: 'Social' },
  { id: 'linkedin', icon: Briefcase, label: 'LinkedIn', category: 'Social' },
  { id: 'youtube', icon: Youtube, label: 'YouTube', category: 'Social' },
  { id: 'spotify', icon: Music, label: 'Spotify', category: 'Social' },
  // Communication
  { id: 'sms', icon: MessageSquare, label: 'SMS', category: 'Communication' },
  { id: 'zoom', icon: Video, label: 'Zoom', category: 'Communication' },
  { id: 'googlemeet', icon: VideoIcon, label: 'Google Meet', category: 'Communication' },
  { id: 'skype', icon: PhoneCall, label: 'Skype', category: 'Communication' },
  { id: 'facetime', icon: Video, label: 'FaceTime', category: 'Communication' },
  // Business
  { id: 'appstore', icon: Store, label: 'App Store', category: 'Business' },
  { id: 'pdf', icon: FileText, label: 'PDF/File', category: 'Business' },
  { id: 'menu', icon: UtensilsCrossed, label: 'Menu', category: 'Business' },
  { id: 'googlereview', icon: Star, label: 'Google Review', category: 'Business' },
  // Payment
  { id: 'upi', icon: IndianRupee, label: 'UPI', category: 'Payment' },
  { id: 'paypal', icon: CreditCard, label: 'PayPal', category: 'Payment' },
  { id: 'bitcoin', icon: Bitcoin, label: 'Bitcoin', category: 'Payment' },
  { id: 'coupon', icon: Ticket, label: 'Coupon', category: 'Payment' },
  // Media
  { id: 'audio', icon: Headphones, label: 'Audio', category: 'Media' },
  { id: 'video', icon: Film, label: 'Video', category: 'Media' },
  { id: 'images', icon: Images, label: 'Gallery', category: 'Media' },
  { id: 'document', icon: File, label: 'Document', category: 'Media' },
  // Special
  { id: 'ai', icon: Sparkles, label: 'AI Magic', category: 'Special' },
  { id: 'bulk', icon: Layers, label: 'Bulk QR', category: 'Special' },
];

// Primary tabs that are always visible (7 items + More button = 8 items for 4x2 grid)
const primaryTabIds: QRType[] = ['url', 'contact', 'wifi', 'email', 'phone', 'appstore', 'pdf'];

export const QRTabs: React.FC<Props> = ({ activeTab, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModalOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const primaryTabs = allTabs.filter(tab => primaryTabIds.includes(tab.id));

  // Check if active tab is in primary tabs
  const activeTabInfo = allTabs.find(tab => tab.id === activeTab);
  const isActiveInPrimary = primaryTabIds.includes(activeTab);

  // Get categories for modal
  const categories = [...new Set(allTabs.map(tab => tab.category))];

  const handleTabClick = (tabId: QRType) => {
    onChange(tabId);
    setIsModalOpen(false);
  };

  return (
    <div className="relative mb-6">
      {/* Main Grid Container - White background */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
              <Layers size={14} className="text-gray-600" />
            </div>
            Pick a Content Type
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {/* Primary Tabs */}
          {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200
                  ${isActive
                    ? 'bg-gray-800 text-white shadow-md'
                    : 'bg-[#f5f5f5] text-gray-600 hover:bg-gray-200'}
                `}
              >
                <tab.icon size={22} className="mb-1.5" />
                <span className="text-[11px] font-medium truncate w-full text-center">{tab.label}</span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200
              ${!isActiveInPrimary && activeTabInfo
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'}
            `}
          >
            {!isActiveInPrimary && activeTabInfo ? (
              <>
                <activeTabInfo.icon size={22} className="mb-1.5" />
                <span className="text-[11px] font-medium truncate w-full text-center">{activeTabInfo.label}</span>
              </>
            ) : (
              <>
                <Plus size={22} className="mb-1.5" />
                <span className="text-[11px] font-medium">More</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal/Dropdown */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsModalOpen(false)} />

          {/* Modal Content */}
          <div
            ref={modalRef}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl z-50 max-h-[70vh] overflow-hidden animate-slideUp"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-sm font-semibold text-gray-800">All Content Types</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(70vh-50px)]">
              {categories.map((category) => (
                <div key={category} className="mb-4 last:mb-0">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    {category}
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {allTabs
                      .filter(tab => tab.category === category)
                      .map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`
                              flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200
                              ${isActive
                                ? 'bg-gray-800 text-white'
                                : 'bg-[#f5f5f5] text-gray-600 hover:bg-gray-200'}
                            `}
                          >
                            <tab.icon size={20} className="mb-1.5" />
                            <span className="text-[10px] font-medium truncate w-full text-center">{tab.label}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
