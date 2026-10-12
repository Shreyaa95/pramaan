import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  LayoutTemplate,
  Users,
  Award,
  Send,
  Settings,
  ShieldCheck,
  ChevronRight,
  LogOut,
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';

export function Sidebar({ currentTab, onSelectTab, mobileMenuOpen, onCloseMobileMenu }) {
  const { logout, admin } = useAuth();
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
    { id: 'events', label: 'Events & Batches', icon: CalendarDays, section: 'Management' },
    { id: 'wizard', label: 'Batch Wizard', icon: Sparkles, badge: 'Workflow', section: 'Management' },
    { id: 'templates', label: 'Template Studio', icon: LayoutTemplate, section: 'Design & Assets' },
    { id: 'recipients', label: 'Recipients & Map', icon: Users, section: 'Design & Assets' },
    { id: 'certificates', label: 'Certificate Vault', icon: Award, section: 'Delivery & Audit' },
    { id: 'deliveries', label: 'Email Dispatch', icon: Send, section: 'Delivery & Audit' },
    { id: 'settings', label: 'System & SMTP', icon: Settings, section: 'System' },
  ];

  const content = (
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-6">
        {/* Brand / Logo Area in Sidebar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272a]">
          <BrandLogo size="md" showTagline={true} />

          {mobileMenuOpen && (
            <button
              onClick={onCloseMobileMenu}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="space-y-4">
          <div className="px-2">
            <p className="text-[10px] uppercase font-extrabold tracking-widest text-gray-500 mb-2 font-display">
              Workspace Menu
            </p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobileMenu) onCloseMobileMenu();
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group text-left cursor-pointer active:scale-[0.98]
                    ${isActive
                      ? 'bg-[#18181b] text-white border border-[#3f3f46] shadow-lg shadow-black/50 relative overflow-hidden'
                      : 'text-gray-400 hover:text-white hover:bg-[#18181b]/60 border border-transparent'
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#ca0019] rounded-r-full shadow-glow-crimson" />
                  )}
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-[#ca0019] text-white shadow-glow-crimson' 
                        : 'bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-white/10'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-sans text-xs tracking-tight">{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ca0019]/20 text-[#ef4444] border border-[#ca0019]/40 animate-pulse">
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className={`w-3.5 h-3.5 transition-all transform group-hover:translate-x-1 ${
                      isActive ? 'opacity-100 text-[#ef4444]' : 'opacity-0 text-gray-600'
                    }`} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Admin Profile & Sign Out Footer */}
      <div className="space-y-3 pt-4 border-t border-[#27272a]">
        <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ca0019] to-[#ef4444] text-white font-extrabold text-xs flex items-center justify-center shadow-md">
              {(admin?.username || 'A')[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate max-w-[110px]">
                {admin?.username || 'Admin'}
              </p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-semibold">Online</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign out of console"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-red-950/40 hover:border-red-500/40 border border-transparent transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-400" />
          </button>
        </div>

        {/* Security badge note */}
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#121215] to-[#18181b] border border-[#27272a] flex items-center gap-2 text-[10px] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
          <span>Strict 1-to-1 Recipient Validation</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Navigation */}
      <aside className="hidden md:flex w-64 border-r border-[#27272a] bg-[#0c0c0e] flex-col p-4 shrink-0 h-[calc(100vh-4rem)] sticky top-16 z-30">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fadeIn"
            onClick={onCloseMobileMenu}
          />
          <aside className="fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-[#0c0c0e] border-r border-[#27272a] p-5 flex flex-col justify-between z-50 animate-slideUp shadow-2xl shadow-black">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
