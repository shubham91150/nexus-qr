import React, { useState, useRef, useEffect } from 'react';
import { LogOut, LogIn, Settings, Crown, ChevronDown, Mail, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface ProfileMenuProps {
  onLoginClick: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ onLoginClick }) => {
  const { user, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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
    return (
      <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-gray-800 transition-all"
      >
        <LogIn size={16} />
        Sign In
      </button>
    );
  }

  // Get user initials
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

  // Get display name
  const getDisplayName = () => {
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button - Clean minimal style */}
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

      {/* Dropdown Menu - Clean design like reference */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">

          {/* User Info Header - Clean minimal style */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-[15px] truncate">{getDisplayName()}</p>
                <p className="text-sm text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                  <Mail size={12} className="flex-shrink-0 text-gray-400" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Plan Status Row */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Plan</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
              Free
            </span>
          </div>

          {/* Menu Section */}
          <div className="py-1">
            {/* Upgrade to Pro */}
            <button
              onClick={() => {
                setIsOpen(false);
                alert('Subscription feature coming soon!');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <Crown size={20} className="text-indigo-600 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-sm text-indigo-600">Upgrade to Pro</span>
                <p className="text-xs text-gray-400 mt-0.5">Get unlimited dynamic QRs</p>
              </div>
            </button>

            {/* Notifications - with badge like reference */}
            <button
              onClick={() => {
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <Bell size={20} className="text-gray-500 flex-shrink-0" />
              <span className="font-medium text-sm text-gray-700 flex-1">Notifications</span>
              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </button>
          </div>

          {/* Account Section with Label */}
          <div className="border-t border-gray-100">
            <div className="px-4 pt-3 pb-1">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Account</span>
            </div>

            {/* Settings */}
            <button
              onClick={() => {
                setIsOpen(false);
                alert('Settings feature coming soon!');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <Settings size={20} className="text-gray-500 flex-shrink-0" />
              <span className="font-medium text-sm text-gray-700">Settings</span>
            </button>

            {/* Help */}
            <button
              onClick={() => {
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <HelpCircle size={20} className="text-gray-500 flex-shrink-0" />
              <span className="font-medium text-sm text-gray-700">Help & Support</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} className="text-red-500 flex-shrink-0" />
              <span className="font-medium text-sm text-red-500">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
