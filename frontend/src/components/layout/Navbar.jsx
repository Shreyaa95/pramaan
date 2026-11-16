import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Zap, Menu, X, ChevronDown, Bell, ShieldCheck, Sparkles, Search, Command } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export function Navbar({
  activeEvent,
  events,
  onSelectEvent,
  mobileMenuOpen,
  onToggleMobileMenu,
  onOpenCommandPalette,
  onOpenQuickVerify
}) {
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

      {/* Middle: Active Event Selector & Quick Action Bar */}
      <div className="flex items-center gap-3">
        {events && events.length > 0 && (
          <div className="hidden md:flex items-center gap-2 bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] rounded-xl px-3 py-1.5 transition-all">
            <div className="w-2 h-2 rounded-full bg-[#ca0019] pulse-beacon" />
            <span className="text-xs text-gray-400 font-semibold">Active:</span>
            <div className="relative flex items-center">
              <select
                value={activeEvent?._id || ''}
                onChange={(e) => onSelectEvent(events.find(ev => ev._id === e.target.value))}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-5 max-w-[160px] lg:max-w-[220px] truncate appearance-none"
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

        {/* Global Search / Command Hub Button */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141418] hover:bg-[#1a1a20] border border-[#27272a] hover:border-[#ca0019]/40 text-xs text-gray-400 hover:text-white transition-all cursor-pointer group shadow-inner"
          title="Open Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#ef4444] transition-colors" />
          <span className="font-medium text-xs">Search & Actions...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-gray-400">
            Ctrl K
          </kbd>
        </button>

        {/* Quick Certificate Verify Pill */}
        <button
          onClick={onOpenQuickVerify}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ca0019]/10 hover:bg-[#ca0019]/20 border border-[#ca0019]/30 text-xs font-bold text-[#ef4444] transition-all cursor-pointer active:scale-95 shadow-sm"
          title="Verify any certificate ID"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#ef4444]" />
          <span className="hidden sm:inline">Verify ID</span>
        </button>
      </div>

      {/* Right Tools & Admin Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Core Live Beacon */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Automation Engine Active</span>
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
