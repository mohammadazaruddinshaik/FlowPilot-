import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Helper to map URL paths to clean Header titles
const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/templates': 'Campaign Templates',
  '/templates/create': 'Create Template',
  '/datasets': 'Datasets',
  '/executions': 'Executions',
  '/integrations': 'Integrations',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export default function Header() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // Get dynamic title, fallback to capitalized path if not found
  const activeRouteName = routeTitles[location.pathname] || 
    location.pathname.split('/')[1]?.charAt(0).toUpperCase() + location.pathname.split('/')[1]?.slice(1) || 
    'Overview';

  // Dynamic User Initials (Fallback to 'U' if undefined)
  const getInitials = () => {
    if (user?.name) return user.name.substring(0, 2).toUpperCase();
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return 'A';
  };

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E5E7EB] flex items-center justify-between px-8 flex-shrink-0 z-10">
      <h1 className="text-lg font-semibold text-[#111827]">{activeRouteName}</h1>
      
      <div className="flex items-center space-x-6">
        {/* Notifications (No fake red dot for now, keeping it clean) */}
        <button className="text-[#6B7280] hover:text-[#111827] transition-colors relative">
          <Bell size={18} />
        </button>
        
        <div className="w-px h-6 bg-[#E5E7EB]"></div>
        
        {/* User Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // Delay hides so clicks register
            className="flex items-center group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-sm font-medium text-[#059669] mr-3 transition-colors">
              {getInitials()}
            </div>
            <div className="flex flex-col mr-2 text-left">
              <span className="text-sm font-medium text-[#111827] leading-tight">
                {user?.organization_name || 'Organization'}
              </span>
              <span className="text-[11px] text-[#6B7280]">
                {user?.role || 'Admin'}
              </span>
            </div>
            <ChevronDown size={14} className={`text-[#6B7280] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-[#FFFFFF] rounded-lg shadow-lg border border-[#E5E7EB] py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-[#E5E7EB] mb-1">
                <p className="text-xs text-[#6B7280] truncate">{user?.email || 'admin@gmail.com'}</p>
              </div>
              <button className="w-full text-left px-4 py-2 text-sm text-[#111827] hover:bg-[#F8FAFC] flex items-center gap-2 transition-colors">
                <User size={14} className="text-[#6B7280]" /> Profile
              </button>
              <button 
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}