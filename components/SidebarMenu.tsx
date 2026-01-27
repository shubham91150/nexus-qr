import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, LogOut, LogIn, Settings, Crown, Mail, Bell, HelpCircle,
  BarChart3, Code, User, CreditCard, ChevronRight
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface SidebarMenuProps {
  onLoginClick: () => void;
  onPricingClick: () => void;
  onDashboardClick: () => void;
  onApiClick: () => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  onLoginClick,
  onPricingClick,
  onDashboardClick,
  onApiClick
}) => {
  const { user, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  const getInitials = () => {
    if (!user) return 'U';
    const name = user.user_metadata?.full_name || user.email || '';
    if (user.user_metadata?.full_name) {
      const parts = name.split(' ');
      return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
    }
    return name[0]?.toUpperCase() || 'U';
  };

  const getDisplayName = () => user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    badge,
    badgeColor = 'bg-emerald-400',
    showArrow = false,
    variant = 'default'
  }: {
    icon: any;
    label: string;
    onClick: () => void;
    badge?: number;
    badgeColor?: string;
    showArrow?: boolean;
    variant?: 'default' | 'highlight' | 'danger';
  }) => (
    <button
      onClick={() => {
        onClick();
        setIsOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
        variant === 'highlight'
          ? 'bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100'
          : variant === 'danger'
          ? 'hover:bg-red-50'
          : 'hover:bg-gray-50'
      }`}
    >
      <Icon
        size={20}
        strokeWidth={1.5}
        className={
          variant === 'highlight'
            ? 'text-amber-500'
            : variant === 'danger'
            ? 'text-red-400'
            : 'text-gray-400'
        }
      />
      <span className={`font-medium text-sm flex-1 ${
        variant === 'highlight'
          ? 'text-amber-700'
          : variant === 'danger'
          ? 'text-red-600'
          : 'text-gray-700'
      }`}>
        {label}
      </span>
      {badge !== undefined && (
        <span className={`min-w-[22px] h-5 ${badgeColor} text-gray-800 text-[10px] font-semibold rounded-full flex items-center justify-center px-1.5`}>
          {badge}
        </span>
      )}
      {showArrow && (
        <ChevronRight size={16} className="text-gray-300" />
      )}
    </button>
  );

  if (loading) {
    return (
      <button className="p-2 rounded-xl bg-gray-100 animate-pulse">
        <Menu size={20} className="text-gray-400" />
      </button>
    );
  }

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={22} className="text-gray-700" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center text-white">
              <Menu size={16} />
            </div>
            <span className="font-bold text-gray-800">Nexus QR</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-65px)]">
          {user ? (
            <>
              {/* User Profile Section */}
              <div className="px-4 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {getInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{getDisplayName()}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">
                        FREE PLAN
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="py-2 border-b border-gray-100">
                <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Quick Actions
                </p>
                <MenuItem
                  icon={BarChart3}
                  label="Dashboard"
                  onClick={onDashboardClick}
                  showArrow
                />
                <MenuItem
                  icon={Code}
                  label="API"
                  onClick={onApiClick}
                  showArrow
                />
              </div>

              {/* Upgrade Section */}
              <div className="py-2 border-b border-gray-100">
                <MenuItem
                  icon={Crown}
                  label="Upgrade to Pro"
                  onClick={onPricingClick}
                  variant="highlight"
                  showArrow
                />
              </div>

              {/* Notifications */}
              <div className="py-2 border-b border-gray-100">
                <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Updates
                </p>
                <MenuItem
                  icon={Bell}
                  label="Notifications"
                  badge={3}
                  badgeColor="bg-emerald-400"
                  onClick={() => alert('Notifications coming soon!')}
                />
                <MenuItem
                  icon={Mail}
                  label="Messages"
                  badge={2}
                  badgeColor="bg-amber-400"
                  onClick={() => alert('Messages coming soon!')}
                />
              </div>

              {/* Account Section */}
              <div className="py-2 flex-1">
                <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Account
                </p>
                <MenuItem
                  icon={User}
                  label="Profile"
                  onClick={() => alert('Profile coming soon!')}
                />
                <MenuItem
                  icon={Settings}
                  label="Settings"
                  onClick={() => alert('Settings coming soon!')}
                />
                <MenuItem
                  icon={CreditCard}
                  label="Billing"
                  onClick={onPricingClick}
                />
                <MenuItem
                  icon={HelpCircle}
                  label="Help & Support"
                  onClick={() => alert('Help coming soon!')}
                />
              </div>

              {/* Sign Out */}
              <div className="py-3 border-t border-gray-100 mt-auto">
                <MenuItem
                  icon={LogOut}
                  label="Sign Out"
                  onClick={handleSignOut}
                  variant="danger"
                />
              </div>
            </>
          ) : (
            <>
              {/* Guest User Section */}
              <div className="px-4 py-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                    <User size={28} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">Welcome!</p>
                    <p className="text-xs text-gray-400 mt-0.5">Sign in to access all features</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onLoginClick();
                    setIsOpen(false);
                  }}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
                >
                  <LogIn size={18} />
                  Sign In / Sign Up
                </button>
              </div>

              {/* Guest Menu Items */}
              <div className="py-2 border-b border-gray-100">
                <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Explore
                </p>
                <MenuItem
                  icon={Crown}
                  label="View Pricing"
                  onClick={onPricingClick}
                  variant="highlight"
                  showArrow
                />
              </div>

              <div className="py-2 flex-1">
                <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Support
                </p>
                <MenuItem
                  icon={HelpCircle}
                  label="Help & Support"
                  onClick={() => alert('Help coming soon!')}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
