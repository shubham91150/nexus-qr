import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, LogOut, LogIn, Settings, Crown, Mail, Bell, HelpCircle,
  BarChart3, Code, User, CreditCard, ChevronRight, Sparkles, LayoutGrid, Zap
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
    badgeColor = 'bg-emerald-500',
    showArrow = false,
    variant = 'default',
    iconBg
  }: {
    icon: any;
    label: string;
    onClick: () => void;
    badge?: number;
    badgeColor?: string;
    showArrow?: boolean;
    variant?: 'default' | 'highlight' | 'danger' | 'primary';
    iconBg?: string;
  }) => (
    <button
      onClick={() => {
        onClick();
        setIsOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all rounded-xl mx-2 my-0.5 ${
        variant === 'highlight'
          ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20'
          : variant === 'danger'
          ? 'hover:bg-red-50'
          : variant === 'primary'
          ? 'bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white'
          : 'hover:bg-gray-100/80'
      }`}
      style={{ width: 'calc(100% - 16px)' }}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        iconBg ? iconBg :
        variant === 'highlight'
          ? 'bg-gradient-to-br from-amber-400 to-orange-500'
          : variant === 'danger'
          ? 'bg-red-100'
          : variant === 'primary'
          ? 'bg-white/20'
          : 'bg-gray-100'
      }`}>
        <Icon
          size={18}
          strokeWidth={2}
          className={
            iconBg ? 'text-white' :
            variant === 'highlight'
              ? 'text-white'
              : variant === 'danger'
              ? 'text-red-500'
              : variant === 'primary'
              ? 'text-white'
              : 'text-gray-600'
          }
        />
      </div>
      <span className={`font-medium text-sm flex-1 ${
        variant === 'highlight'
          ? 'text-amber-700'
          : variant === 'danger'
          ? 'text-red-600'
          : variant === 'primary'
          ? 'text-white'
          : 'text-gray-700'
      }`}>
        {label}
      </span>
      {badge !== undefined && (
        <span className={`min-w-[22px] h-5 ${badgeColor} text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-sm`}>
          {badge}
        </span>
      )}
      {showArrow && (
        <ChevronRight size={16} className={variant === 'primary' ? 'text-white/60' : 'text-gray-400'} />
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-gradient-to-b from-white to-gray-50 shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
                <LayoutGrid size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">Nexus QR</h2>
                <p className="text-[10px] text-white/60 font-medium">Professional AI Generator</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close menu"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-88px)] overflow-y-auto">
          {user ? (
            <>
              {/* User Profile Section */}
              <div className="px-4 py-5">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200 flex-shrink-0">
                      {getInitials()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{getDisplayName()}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2.5 py-1 rounded-full font-semibold shadow-sm">
                          FREE PLAN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-2 pb-2">
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Quick Actions
                </p>
                <MenuItem
                  icon={BarChart3}
                  label="Dashboard"
                  onClick={onDashboardClick}
                  showArrow
                  iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
                />
                <MenuItem
                  icon={Code}
                  label="API Console"
                  onClick={onApiClick}
                  showArrow
                  iconBg="bg-gradient-to-br from-violet-500 to-purple-500"
                />
              </div>

              {/* Upgrade Section */}
              <div className="px-4 py-3">
                <button
                  onClick={() => {
                    onPricingClick();
                    setIsOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 p-4 rounded-2xl shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                      <Crown size={24} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-white text-sm">Upgrade to Pro</p>
                      <p className="text-[11px] text-white/80 mt-0.5">Unlock unlimited features</p>
                    </div>
                    <Sparkles size={20} className="text-white/80" />
                  </div>
                </button>
              </div>

              {/* Updates Section */}
              <div className="px-2 py-2">
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Updates
                </p>
                <MenuItem
                  icon={Bell}
                  label="Notifications"
                  badge={3}
                  badgeColor="bg-emerald-500"
                  onClick={() => alert('Notifications coming soon!')}
                  iconBg="bg-gradient-to-br from-emerald-400 to-green-500"
                />
                <MenuItem
                  icon={Mail}
                  label="Messages"
                  badge={2}
                  badgeColor="bg-amber-500"
                  onClick={() => alert('Messages coming soon!')}
                  iconBg="bg-gradient-to-br from-amber-400 to-yellow-500"
                />
              </div>

              {/* Account Section */}
              <div className="px-2 py-2 flex-1">
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
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
              <div className="px-4 py-4 border-t border-gray-100 mt-auto bg-white">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 text-red-500 font-medium text-sm hover:bg-red-50 hover:border-red-300 transition-all"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Guest Welcome Section */}
              <div className="px-4 py-6">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                      <User size={28} className="text-white/80" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white text-lg">Welcome!</p>
                      <p className="text-xs text-white/60 mt-0.5">Sign in to unlock all features</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onLoginClick();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all shadow-lg"
                  >
                    <LogIn size={18} />
                    Sign In / Sign Up
                  </button>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="px-4 py-2">
                <p className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Why Sign Up?
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <BarChart3 size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">Track Analytics</p>
                      <p className="text-[11px] text-gray-400">See who scans your QR codes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                      <Zap size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">Dynamic QR Codes</p>
                      <p className="text-[11px] text-gray-400">Edit destination anytime</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                      <Code size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">API Access</p>
                      <p className="text-[11px] text-gray-400">Integrate QR generation</p>
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
                  className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 p-4 rounded-2xl shadow-lg shadow-orange-200 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                      <Crown size={20} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-white text-sm">View Pricing</p>
                      <p className="text-[11px] text-white/80">See all plans & features</p>
                    </div>
                    <ChevronRight size={18} className="text-white/80" />
                  </div>
                </button>
              </div>

              {/* Help */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white">
                <button
                  onClick={() => alert('Help coming soon!')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-gray-500 font-medium text-sm hover:bg-gray-100 transition-all"
                >
                  <HelpCircle size={18} />
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
