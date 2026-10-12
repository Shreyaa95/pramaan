import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Zap, Menu, X, ChevronDown, Bell, Shield, Sparkles } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export function Navbar({ activeEvent, events, onSelectEvent, mobileMenuOpen, onToggleMobileMenu }) {
  const { admin, logout } = useAuth();

  return (
    <header className="h-16 border-b border-[#27272a] bg-[#0c0c0e]/95 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
      {/* Brand & Community Badge */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 border border-[#27272a] active:scale-95 transition-all cursor-pointer"
          title="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <BrandLogo size="sm" showTagline={true} />
      </div>

      {/* Middle: Active Event Selector */}
      {events && events.length > 0 && (
        <div className="hidden md:flex items-center gap-2 bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] rounded-xl px-3.5 py-1.5 transition-all">
          <div className="w-2 h-2 rounded-full bg-[#ca0019] pulse-beacon" />
          <span className="text-xs text-gray-400 font-semibold">Active Batch:</span>
          <div className="relative flex items-center">
            <select
              value={activeEvent?._id || ''}
              onChange={(e) => onSelectEvent(events.find(ev => ev._id === e.target.value))}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-5 max-w-[200px] lg:max-w-[280px] truncate appearance-none"
            >
              {events.map((ev) => (
                <option key={ev._id} value={ev._id} className="bg-[#18181b] text-white">
                  {ev.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 pointer-events-none absolute right-0" />
          </div>
        </div>
      )}

      {/* Right Tools & Admin Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Core Live Beacon */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Automation Core Live</span>
        </div>

        <div className="flex items-center gap-3 pl-3 border-l border-[#27272a]">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">{admin?.username || 'Administrator'}</div>
            <div className="text-[10px] text-gray-400 font-medium">{admin?.role || 'System Master'}</div>
          </div>

          <button
            onClick={logout}
            title="Sign out of PRAMAAN"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/30 hover:bg-[#ca0019] text-red-300 hover:text-white border border-red-500/30 hover:border-[#ca0019] text-xs font-bold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
