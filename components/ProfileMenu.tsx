import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, LogIn, Settings, Crown, ChevronDown, Mail } from 'lucide-react';
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
    const email = user.email || '';
    return email.charAt(0).toUpperCase();
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
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
          {getInitials()}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn">
          {/* User Info Header */}
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{getDisplayName()}</p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                  <Mail size={10} />
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {/* Subscription Status */}
            <div className="px-3 py-2 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Plan</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                  Free
                </span>
              </div>
            </div>

            {/* Upgrade Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Open subscription modal
                alert('Subscription feature coming soon!');
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-indigo-50 text-indigo-600 transition-colors group"
            >
              <div className="p-1.5 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                <Crown size={16} />
              </div>
              <div>
                <span className="font-medium text-sm">Upgrade to Pro</span>
                <p className="text-xs text-indigo-400">Get unlimited dynamic QRs</p>
              </div>
            </button>

            {/* Settings */}
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Open settings modal
                alert('Settings feature coming soon!');
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <div className="p-1.5 bg-gray-100 rounded-lg">
                <Settings size={16} />
              </div>
              <span className="font-medium text-sm">Settings</span>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-gray-100" />

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-red-50 text-red-600 transition-colors"
            >
              <div className="p-1.5 bg-red-100 rounded-lg">
                <LogOut size={16} />
              </div>
              <span className="font-medium text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
