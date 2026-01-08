import React, { useState, useRef, useEffect } from 'react';
import { LogOut, LogIn, Settings, Crown, ChevronDown, Mail, Bell, HelpCircle, Sliders } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface ProfileMenuProps {
  onLoginClick: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ onLoginClick }) => {
  const { user, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-gray-800 transition-all"
      >
        <LogIn size={18} />
        Sign In
      </button>
    );
  }

  const getInitials = () => {
    const name = user.user_metadata?.full_name || user.email || '';
    if (user.user_metadata?.full_name) {
      const parts = name.split(' ');
      return parts.length > 1
        ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
        : name.charAt(0).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  };

  // Menu item component for consistent styling
  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    badge,
    badgeColor = 'bg-emerald-400',
    textColor = 'text-gray-700'
  }: {
    icon: any;
    label: string;
    onClick: () => void;
    badge?: number;
    badgeColor?: string;
    textColor?: string;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
    >
      <Icon size={22} strokeWidth={1.5} className="text-gray-400" />
      <span className={`font-medium text-[15px] ${textColor} flex-1`}>{label}</span>
      {badge !== undefined && (
        <span className={`min-w-[24px] h-6 ${badgeColor} text-gray-800 text-xs font-semibold rounded-full flex items-center justify-center px-1.5`}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-0.5 rounded-full hover:bg-gray-50 transition-colors"
        aria-label="Profile menu"
        aria-expanded={isOpen}
      >
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
          {getInitials()}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu - Card style like reference */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-[20px] shadow-xl border border-gray-100 overflow-hidden z-50">

          {/* User Header */}
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-[15px] truncate">{getDisplayName()}</p>
                <p className="text-sm text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Plan Toggle - Like PERSONAL/BUSINESS tabs */}
          <div className="px-5 py-4">
            <div className="flex bg-gray-100 rounded-full p-1">
              <button className="flex-1 py-2 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-full transition-all">
                FREE
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  alert('Upgrade feature coming soon!');
                }}
                className="flex-1 py-2 px-4 text-gray-500 text-sm font-medium rounded-full hover:text-gray-700 transition-all"
              >
                PRO
              </button>
            </div>
          </div>

          {/* Main Menu Items */}
          <div className="py-1">
            <MenuItem
              icon={Crown}
              label="Upgrade to Pro"
              onClick={() => {
                setIsOpen(false);
                alert('Upgrade feature coming soon!');
              }}
            />
            <MenuItem
              icon={Bell}
              label="Notifications"
              badge={3}
              badgeColor="bg-emerald-400"
              onClick={() => setIsOpen(false)}
            />
            <MenuItem
              icon={Mail}
              label="Messages"
              badge={2}
              badgeColor="bg-amber-400"
              onClick={() => setIsOpen(false)}
            />
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-gray-100" />

          {/* Account Section */}
          <div className="pt-3 pb-2">
            <p className="px-5 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Account
            </p>

            <MenuItem
              icon={Sliders}
              label="Settings"
              onClick={() => {
                setIsOpen(false);
                alert('Settings coming soon!');
              }}
            />
            <MenuItem
              icon={HelpCircle}
              label="Help & Support"
              onClick={() => setIsOpen(false)}
            />
            <MenuItem
              icon={LogOut}
              label="Sign Out"
              textColor="text-gray-700"
              onClick={handleSignOut}
            />
          </div>
        </div>
      )}
    </div>
  );
};
