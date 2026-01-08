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

  if (loading) return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;

  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg font-medium text-xs hover:bg-gray-800 transition-all"
      >
        <LogIn size={14} />
        Sign In
      </button>
    );
  }

  const getInitials = () => {
    const name = user.user_metadata?.full_name || user.email || '';
    if (user.user_metadata?.full_name) {
      const parts = name.split(' ');
      return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
    }
    return name[0]?.toUpperCase() || 'U';
  };

  const getDisplayName = () => user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  const MenuItem = ({ icon: Icon, label, onClick, badge, badgeColor = 'bg-emerald-400' }: {
    icon: any; label: string; onClick: () => void; badge?: number; badgeColor?: string;
  }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors">
      <Icon size={16} strokeWidth={1.5} className="text-gray-400" />
      <span className="font-medium text-xs text-gray-700 flex-1">{label}</span>
      {badge !== undefined && (
        <span className={`min-w-[18px] h-[18px] ${badgeColor} text-gray-800 text-[10px] font-semibold rounded-full flex items-center justify-center`}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-0.5 p-0.5 rounded-full hover:bg-gray-50 transition-colors"
        aria-label="Profile menu"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs">
          {getInitials()}
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50">
          {/* User Header */}
          <div className="px-3 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-xs truncate">{getDisplayName()}</p>
                <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Plan Toggle */}
          <div className="px-3 py-2.5">
            <div className="flex bg-gray-100 rounded-full p-0.5">
              <button className="flex-1 py-1.5 px-3 bg-indigo-600 text-white text-[10px] font-semibold rounded-full">
                FREE
              </button>
              <button
                onClick={() => { setIsOpen(false); alert('Upgrade coming soon!'); }}
                className="flex-1 py-1.5 px-3 text-gray-500 text-[10px] font-medium rounded-full hover:text-gray-700"
              >
                PRO
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-0.5">
            <MenuItem icon={Crown} label="Upgrade to Pro" onClick={() => { setIsOpen(false); alert('Upgrade coming soon!'); }} />
            <MenuItem icon={Bell} label="Notifications" badge={3} badgeColor="bg-emerald-400" onClick={() => setIsOpen(false)} />
            <MenuItem icon={Mail} label="Messages" badge={2} badgeColor="bg-amber-400" onClick={() => setIsOpen(false)} />
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-gray-100" />

          {/* Account Section */}
          <div className="pt-2 pb-1">
            <p className="px-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Account</p>
            <MenuItem icon={Settings} label="Settings" onClick={() => { setIsOpen(false); alert('Settings coming soon!'); }} />
            <MenuItem icon={HelpCircle} label="Help & Support" onClick={() => setIsOpen(false)} />
            <MenuItem icon={LogOut} label="Sign Out" onClick={handleSignOut} />
          </div>
        </div>
      )}
    </div>
  );
};
