import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Award,
  Sparkles,
  CalendarDays,
  LayoutTemplate,
  Users,
  Send,
  Settings,
  ShieldCheck,
  ExternalLink,
  Command,
  X,
  ArrowRight,
  RotateCw,
  Zap
} from 'lucide-react';
import { api } from '../../services/api';

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  events = [],
  activeEvent,
  onSelectEvent,
  onOpenQuickVerify
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via custom event or direct prop
          window.dispatchEvent(new CustomEvent('toggle-command-palette'));
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navigationActions = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: Sparkles, category: 'Navigation', action: () => onNavigate('dashboard') },
    { id: 'nav-wizard', label: 'Launch Batch Wizard', icon: Sparkles, badge: 'Workflow', category: 'Navigation', action: () => onNavigate('wizard') },
    { id: 'nav-vault', label: 'Open Certificate Vault', icon: Award, category: 'Navigation', action: () => onNavigate('certificates') },
    { id: 'nav-studio', label: 'Open Template Studio', icon: LayoutTemplate, category: 'Navigation', action: () => onNavigate('templates') },
    { id: 'nav-recipients', label: 'View Recipients & Mapping', icon: Users, category: 'Navigation', action: () => onNavigate('recipients') },
    { id: 'nav-dispatch', label: 'Email Dispatch & Delivery Audit', icon: Send, category: 'Navigation', action: () => onNavigate('deliveries') },
    { id: 'nav-events', label: 'Manage Events & Batches', icon: CalendarDays, category: 'Navigation', action: () => onNavigate('events') },
    { id: 'nav-settings', label: 'System & SMTP Configuration', icon: Settings, category: 'Navigation', action: () => onNavigate('settings') },
  ];

  const quickTools = [
    {
      id: 'tool-verify',
      label: 'Verify Certificate by ID',
      description: 'Instant tamper-proof check against cryptographic records',
      icon: ShieldCheck,
      category: 'Quick Tools',
      action: () => {
        onClose();
        if (onOpenQuickVerify) onOpenQuickVerify();
      }
    },
    {
      id: 'tool-retry',
      label: 'Retry Failed Deliveries',
      description: 'One-click safe retry without duplicate certificates',
      icon: RotateCw,
      category: 'Quick Tools',
      action: () => {
        onNavigate('deliveries');
      }
    }
  ];

  const eventItems = (events || []).map(ev => ({
    id: `event-${ev._id}`,
    label: `Switch Batch: ${ev.name}`,
    description: `${ev.organizationName || 'PRAMAAN'} • ${ev.date || 'Active'}`,
    icon: CalendarDays,
    category: 'Batches & Events',
    action: () => {
      onSelectEvent(ev);
      onClose();
    }
  }));

  const allItems = [...quickTools, ...navigationActions, ...eventItems];

  const filteredItems = allItems.filter(item => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.label.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Palette Box */}
      <div className="relative w-full max-w-2xl bg-[#101014] border border-[#27272a] hover:border-[#3f3f46] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-10 glowing-border flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#27272a] bg-[#141418]">
          <Search className="w-5 h-5 text-[#ef4444]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search batch, or navigate (e.g. 'vault', 'verify', 'bhu')..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none font-sans"
          />
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-[#27272a] text-[10px] font-mono text-gray-300">
              ESC to exit
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 divide-y divide-white/5">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              No matching commands or events found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#ca0019]/15 text-white border border-[#ca0019]/40 shadow-sm'
                      : 'text-gray-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#ca0019] text-white shadow-glow-crimson'
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ca0019]/25 text-[#ef4444] border border-[#ca0019]/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-gray-400 truncate">{item.description}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                      {item.category}
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-[#ef4444] translate-x-0.5' : 'text-gray-600'
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-[#27272a] bg-[#0c0c0e] flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#ef4444] font-semibold">
            <Zap className="w-3 h-3" />
            <span>PRAMAAN Command Hub</span>
          </div>
        </div>
      </div>
    </div>
  );
}
