import React from 'react';
import { QRType } from '../types';
import {
  Type, Link, Wifi, User, Phone, Mail,
  MapPin, Calendar, Share2, Sparkles, Layers,
  MessageSquare, Store, Youtube, Bitcoin, Ticket,
  IndianRupee, CreditCard, Send, Music, Camera, Twitter, Briefcase, Video,
  Facebook, Ghost, FileText, UtensilsCrossed, Star, PhoneCall, VideoIcon
} from 'lucide-react';

interface Props {
  activeTab: QRType;
  onChange: (tab: QRType) => void;
}

export const QRTabs: React.FC<Props> = ({ activeTab, onChange }) => {
  const tabs: { id: QRType; icon: any; label: string }[] = [
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'url', icon: Link, label: 'URL' },
    { id: 'contact', icon: User, label: 'Contact' },
    { id: 'wifi', icon: Wifi, label: 'WiFi' },
    { id: 'phone', icon: Phone, label: 'Phone' },
    { id: 'email', icon: Mail, label: 'Email' },
    { id: 'event', icon: Calendar, label: 'Event' },
    { id: 'geo', icon: MapPin, label: 'Geo' },
    { id: 'social', icon: Share2, label: 'Social' },
    { id: 'sms', icon: MessageSquare, label: 'SMS' },
    { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp' },
    { id: 'telegram', icon: Send, label: 'Telegram' },
    { id: 'facebook', icon: Facebook, label: 'Facebook' },
    { id: 'instagram', icon: Camera, label: 'Instagram' },
    { id: 'twitter', icon: Twitter, label: 'Twitter/X' },
    { id: 'tiktok', icon: Music, label: 'TikTok' },
    { id: 'pinterest', icon: Share2, label: 'Pinterest' },
    { id: 'snapchat', icon: Ghost, label: 'Snapchat' },
    { id: 'discord', icon: MessageSquare, label: 'Discord' },
    { id: 'linkedin', icon: Briefcase, label: 'LinkedIn' },
    { id: 'youtube', icon: Youtube, label: 'YouTube' },
    { id: 'spotify', icon: Music, label: 'Spotify' },
    { id: 'zoom', icon: Video, label: 'Zoom' },
    { id: 'googlemeet', icon: VideoIcon, label: 'Google Meet' },
    { id: 'skype', icon: PhoneCall, label: 'Skype' },
    { id: 'facetime', icon: Video, label: 'FaceTime' },
    { id: 'appstore', icon: Store, label: 'App Store' },
    { id: 'pdf', icon: FileText, label: 'PDF/File' },
    { id: 'menu', icon: UtensilsCrossed, label: 'Menu' },
    { id: 'googlereview', icon: Star, label: 'Google Review' },
    { id: 'upi', icon: IndianRupee, label: 'UPI' },
    { id: 'paypal', icon: CreditCard, label: 'PayPal' },
    { id: 'bitcoin', icon: Bitcoin, label: 'Bitcoin' },
    { id: 'coupon', icon: Ticket, label: 'Coupon' },
    { id: 'ai', icon: Sparkles, label: 'AI Magic' },
    { id: 'bulk', icon: Layers, label: 'Bulk QR' },
  ];

  return (
    <div className="w-full overflow-x-auto no-scrollbar pb-2 mb-6">
      <div className="flex gap-2 min-w-max px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-gray-800 text-white shadow-lg transform scale-105' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs
                ${isActive ? 'bg-white/20' : 'bg-white'}
              `}>
                <tab.icon size={14} />
              </div>
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};