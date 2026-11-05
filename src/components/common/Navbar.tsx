import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShieldAlert, User as UserIcon, LogOut, ChevronDown, Bell } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, unreadCount = 0 }) => {
  const { user, logout, openAuthModal, demoLogin } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'citizen', label: 'Citizen', desc: 'Request aid & find nearby supplies' },
    { role: 'provider', label: 'Resource Provider', desc: 'Publish supplies & manage requests' },
    { role: 'coordinator', label: 'Emergency Coordinator', desc: 'Command map & intelligent allocation' },
    { role: 'admin', label: 'Administrator', desc: 'Platform oversight & analytics' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCurrentTab('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-[#102A43] flex items-center justify-center text-white shadow-sm group-hover:bg-[#E63946] transition-colors">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#102A43] whitespace-nowrap">
                Geo<span className="text-[#E63946]">ResQ</span>
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: 4-5 clean single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => setCurrentTab('home')}
            className={`transition-colors whitespace-nowrap hover:text-[#102A43] ${
              currentTab === 'home' ? 'text-[#102A43] font-semibold' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentTab('discover')}
            className={`transition-colors whitespace-nowrap hover:text-[#102A43] ${
              currentTab === 'discover' ? 'text-[#102A43] font-semibold' : ''
            }`}
          >
            Discover Resources
          </button>
          <button
            onClick={() => setCurrentTab('emergency')}
            className={`transition-colors whitespace-nowrap hover:text-[#E63946] ${
              currentTab === 'emergency' ? 'text-[#E63946] font-semibold' : ''
            }`}
          >
            Emergency Assistance
          </button>
          <button
            onClick={() => setCurrentTab('map')}
            className={`transition-colors whitespace-nowrap hover:text-[#102A43] ${
              currentTab === 'map' ? 'text-[#102A43] font-semibold' : ''
            }`}
          >
            Geospatial Map
          </button>
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`transition-colors whitespace-nowrap hover:text-[#102A43] ${
              currentTab === 'dashboard' ? 'text-[#102A43] font-semibold' : ''
            }`}
          >
            Dashboard
          </button>
        </nav>

        {/* Zone 3: 1 primary action or user session dropdown */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="relative">
              <div className="flex items-center gap-2">
                {/* Notification trigger button */}
                <button
                  onClick={() => setCurrentTab('notifications')}
                  title="Notifications"
                  className="relative p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E63946]" />
                  )}
                </button>

                {/* Role Switcher & Profile Button */}
                <button
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-800"
                >
                  <div className="w-5 h-5 rounded-full bg-[#102A43] text-white flex items-center justify-center text-[10px] font-bold">
                    {user.full_name.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <span className="font-semibold block leading-tight">{user.full_name.split(' ')[0]}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {showRoleDropdown && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs"
                  onMouseLeave={() => setShowRoleDropdown(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-semibold text-slate-900">{user.full_name}</p>
                    <p className="text-slate-500 truncate">{user.email}</p>
                    <p className="text-[11px] text-[#0F766E] font-medium mt-1">
                      Current Role: {user.role.toUpperCase()}
                    </p>
                  </div>

                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Role (Review Mode)
                    </div>
                    {roles.map((r) => (
                      <button
                        key={r.role}
                        onClick={() => {
                          demoLogin(r.role);
                          setShowRoleDropdown(false);
                          setCurrentTab('dashboard');
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex flex-col transition-colors ${
                          user.role === r.role ? 'bg-slate-50 font-semibold text-[#102A43]' : 'text-slate-700'
                        }`}
                      >
                        <span className="font-medium">{r.label}</span>
                        <span className="text-[10px] text-slate-500">{r.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setCurrentTab('profile');
                        setShowRoleDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setShowRoleDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#102A43] hover:bg-[#1E3A8A] rounded-lg shadow-sm transition-colors whitespace-nowrap"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
