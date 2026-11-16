import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { EventsView } from './views/EventsView';
import { EventWizard } from './components/workflow/EventWizard';
import { TemplatesView } from './views/TemplatesView';
import { RecipientsView } from './views/RecipientsView';
import { CertificatesView } from './views/CertificatesView';
import { DeliveriesView } from './views/DeliveriesView';
import { SettingsView } from './views/SettingsView';
import { PublicCertificateView } from './views/PublicCertificateView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CommandPalette } from './components/common/CommandPalette';
import { QuickVerifierModal } from './components/common/QuickVerifierModal';
import { api } from './services/api';

export default function App() {
  const path = window.location.pathname;
  if (path.startsWith('/view-certificate/')) {
    const certId = decodeURIComponent(path.split('/view-certificate/')[1]);
    return <PublicCertificateView certificateId={certId} />;
  }

  const { isAuthenticated, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickVerifyOpen, setQuickVerifyOpen] = useState(false);
  const [verifyInitialId, setVerifyInitialId] = useState('');

  useEffect(() => {
    const handleToggleCmd = () => setCommandPaletteOpen(prev => !prev);
    const handleOpenVerify = (e) => {
      if (e.detail?.certificateId) {
        setVerifyInitialId(e.detail.certificateId);
      }
      setQuickVerifyOpen(true);
    };
    window.addEventListener('toggle-command-palette', handleToggleCmd);
    window.addEventListener('open-quick-verify', handleOpenVerify);
    return () => {
      window.removeEventListener('toggle-command-palette', handleToggleCmd);
      window.removeEventListener('open-quick-verify', handleOpenVerify);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadEvents();
    }
  }, [isAuthenticated]);

  const loadEvents = async () => {
    try {
      const res = await api.getEvents();
      if (res.success && res.events) {
        setEvents(res.events);
        if (res.events.length > 0 && !activeEvent) {
          setActiveEvent(res.events[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load events in App:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080b] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-[#ca0019] border-t-transparent rounded-full animate-spin" />
            <div className="w-6 h-6 rounded-md bg-[#ca0019]/20 border border-[#ca0019]/40 absolute flex items-center justify-center">
              <span className="text-[10px] font-black text-white font-display">P</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-gray-400">
            <span>Initializing</span>
            <span className="font-extrabold text-[#ef4444]" style={{ fontFamily: "'Rozha One', serif" }}>प्र</span>
            <span className="font-black text-white tracking-[0.16em] font-display">MAAN</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 flex flex-col font-sans selection:bg-[#ca0019] selection:text-white relative">
      {/* Laser Top Progress Beam (Continuous ambient activity) */}
      <div className="page-top-beam" />

      {/* Top Navigation */}
      <Navbar
        activeEvent={activeEvent}
        events={events}
        onSelectEvent={setActiveEvent}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenQuickVerify={() => {
          setVerifyInitialId('');
          setQuickVerifyOpen(true);
        }}
      />

      {/* Global Interactive Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          setCurrentTab(tab);
          setCommandPaletteOpen(false);
        }}
        events={events}
        activeEvent={activeEvent}
        onSelectEvent={setActiveEvent}
        onOpenQuickVerify={() => {
          setVerifyInitialId('');
          setQuickVerifyOpen(true);
        }}
      />

      {/* Cryptographic Instant Verifier Modal */}
      <QuickVerifierModal
        isOpen={quickVerifyOpen}
        onClose={() => setQuickVerifyOpen(false)}
        initialCertId={verifyInitialId}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setMobileMenuOpen(false);
          }}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* View Port Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-transparent">
          <div key={currentTab} className="animate-slideUp">
            <ErrorBoundary>
            {currentTab === 'dashboard' && (
              <DashboardView
                onNavigate={setCurrentTab}
                onSelectEvent={setActiveEvent}
              />
            )}

            {currentTab === 'events' && (
              <EventsView
                onSelectEvent={setActiveEvent}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'wizard' && (
              <EventWizard
                initialEvent={activeEvent}
                onComplete={() => {
                  loadEvents();
                  setCurrentTab('dashboard');
                }}
              />
            )}

            {currentTab === 'templates' && (
              <TemplatesView />
            )}

            {currentTab === 'recipients' && (
              <RecipientsView
                activeEvent={activeEvent}
                events={events}
                onSelectEvent={setActiveEvent}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'certificates' && (
              <CertificatesView
                activeEvent={activeEvent}
                events={events}
                onSelectEvent={setActiveEvent}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'deliveries' && (
              <DeliveriesView
                activeEvent={activeEvent}
                events={events}
                onSelectEvent={setActiveEvent}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView />
            )}
          </ErrorBoundary>
        </div>
      </main>
      </div>
    </div>
  );
}
