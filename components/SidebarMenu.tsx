import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, LogOut, LogIn, Settings, Crown, Mail, Bell, HelpCircle,
  BarChart3, Code, User, CreditCard, ChevronRight, LayoutGrid, Zap
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
    showArrow = false,
    isDanger = false
  }: {
    icon: any;
    label: string;
    onClick: () => void;
    badge?: number;
    showArrow?: boolean;
    isDanger?: boolean;
  }) => (
    <button
      onClick={() => {
        onClick();
        setIsOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors rounded-xl hover:bg-gray-100 ${
        isDanger ? 'hover:bg-gray-100' : ''
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isDanger ? 'bg-gray-100' : 'bg-gray-100'
      }`}>
        <Icon size={16} className={isDanger ? 'text-gray-900' : 'text-gray-700'} />
      </div>
      <span className={`font-medium text-sm flex-1 ${isDanger ? 'text-gray-900' : 'text-gray-700'}`}>
        {label}
      </span>
      {badge !== undefined && (
        <span className="min-w-[20px] h-5 bg-gray-900 text-white text-[10px] font-medium rounded-full flex items-center justify-center px-1.5">
          {badge}
        </span>
      )}
      {showArrow && (
        <ChevronRight size={16} className="text-gray-400" />
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
          className="fixed inset-0 bg-black/30 z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-[280px] max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
              <LayoutGrid size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Nexus QR</h2>
              <p className="text-[9px] text-gray-500 font-medium">Professional AI Generator</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-65px)] overflow-y-auto">
          {user ? (
            <>
              {/* User Profile Card */}
              <div className="p-4">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                      {getInitials()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{getDisplayName()}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-[10px] bg-gray-900 text-white px-2 py-1 rounded-full font-medium">
                      FREE PLAN
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-4 pb-2">
                <p className="px-1 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Quick Actions
                </p>
                <div className="space-y-1">
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
              </div>

              {/* Upgrade Card */}
              <div className="px-4 py-3">
                <button
                  onClick={() => {
                    onPricingClick();
                    setIsOpen(false);
                  }}
                  className="w-full bg-gray-900 p-4 rounded-2xl hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <Crown size={18} className="text-gray-900" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-white text-sm">Upgrade to Pro</p>
                      <p className="text-[11px] text-gray-400">Unlock all features</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
                  </div>
                </button>
              </div>

              {/* Updates */}
              <div className="px-4 py-2">
                <p className="px-1 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Updates
                </p>
                <div className="space-y-1">
                  <MenuItem
                    icon={Bell}
                    label="Notifications"
                    badge={3}
                    onClick={() => alert('Notifications coming soon!')}
                  />
                  <MenuItem
                    icon={Mail}
                    label="Messages"
                    badge={2}
                    onClick={() => alert('Messages coming soon!')}
                  />
                </div>
              </div>

              {/* Account */}
              <div className="px-4 py-2 flex-1">
                <p className="px-1 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Account
                </p>
                <div className="space-y-1">
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
              </div>

              {/* Sign Out */}
              <div className="px-4 py-4 border-t border-gray-100 mt-auto">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Guest Welcome Card */}
              <div className="p-4">
                <div className="bg-gray-900 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                      <User size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">Welcome!</p>
                      <p className="text-xs text-gray-400">Sign in to access all features</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onLoginClick();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 py-3 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors"
                  >
                    <LogIn size={16} />
                    Sign In / Sign Up
                  </button>
                </div>
              </div>

              {/* Features */}
              <div className="px-4 py-2">
                <p className="px-1 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Why Sign Up?
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                      <BarChart3 size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">Track Analytics</p>
                      <p className="text-[11px] text-gray-500">See who scans your QR codes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                      <Zap size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">Dynamic QR Codes</p>
                      <p className="text-[11px] text-gray-500">Edit destination anytime</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                      <Code size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">API Access</p>
                      <p className="text-[11px] text-gray-500">Integrate QR generation</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="px-4 py-4 mt-auto">
                <button
                  onClick={() => {
                    onPricingClick();
                    setIsOpen(false);
                  }}
                  className="w-full bg-gray-100 p-4 rounded-2xl hover:bg-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                      <Crown size={14} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800 text-sm">View Pricing</p>
                      <p className="text-[11px] text-gray-500">See all plans</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </button>
              </div>

              {/* Help */}
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => alert('Help coming soon!')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-gray-500 font-medium text-sm hover:bg-gray-100 transition-colors"
                >
                  <HelpCircle size={16} />
                  Help & Support
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
