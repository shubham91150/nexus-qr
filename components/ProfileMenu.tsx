import React, { useState, useRef, useEffect } from 'react';
import { LogOut, LogIn, Settings, Crown, ChevronUp, Mail } from 'lucide-react';
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
      <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
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
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Profile menu"
        aria-expanded={isOpen}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
          {getInitials()}
        </div>
        <ChevronUp
          size={14}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden z-50 animate-fadeIn">
          {/* User Info Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{getDisplayName()}</p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                  <Mail size={10} className="flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Plan Status */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Plan</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                Free
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Upgrade Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                alert('Subscription feature coming soon!');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-indigo-50 transition-colors"
            >
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Crown size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-indigo-600 block">Upgrade to Pro</span>
                <span className="text-xs text-gray-400">Get unlimited dynamic QRs</span>
              </div>
            </button>

            {/* Settings */}
            <button
              onClick={() => {
                setIsOpen(false);
                alert('Settings feature coming soon!');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Settings size={16} className="text-gray-600" />
              </div>
              <span className="font-medium text-sm text-gray-700">Settings</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-100 py-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-red-50 transition-colors"
            >
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <LogOut size={16} className="text-red-500" />
              </div>
              <span className="font-medium text-sm text-red-500">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
