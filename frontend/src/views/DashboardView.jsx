import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Send,
  AlertOctagon,
  Clock,
  Sparkles,
  TrendingUp,
  ArrowRight,
  RotateCw,
  ExternalLink,
  Plus,
  ShieldCheck,
  CheckCircle2,
  CalendarDays,
  LayoutTemplate,
  Layers,
  ChevronRight,
  Search,
  Globe,
  Command
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useBranding } from '../context/BrandingContext';

export function DashboardView({ onNavigate, onSelectEvent }) {
  const { showToast } = useToast();
  const { tagline } = useBranding();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRetry = async (eventId) => {
    try {
      setRetrying(true);
      const res = await api.retryFailedEmails(eventId);
      if (res.success) {
        showToast(`Retried ${res.totalRetried} emails!`, 'success');
        loadDashboardData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fadeIn">
        {/* Skeleton Hero */}
        <div className="h-64 rounded-3xl skeleton-shimmer border border-[#27272a]" />

        {/* Skeleton KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-2xl skeleton-shimmer border border-[#27272a] p-4" />
          ))}
        </div>

        {/* Skeleton Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-80 rounded-2xl skeleton-shimmer border border-[#27272a]" />
          <div className="lg:col-span-5 h-80 rounded-2xl skeleton-shimmer border border-[#27272a]" />
        </div>
      </div>
    );
  }

  const s = stats?.stats || {};
  const recentEvents = stats?.recentEvents || [];
  const failedAlerts = stats?.failedAlerts || [];
  const recentDeliveries = stats?.recentDeliveries || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Hero Welcome Banner - Space Grotesk typography, ambient mesh, and quick actions */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 md:p-10 bg-gradient-to-br from-[#121215] via-[#151518] to-[#09090b] border border-[#27272a] shadow-2xl glowing-border">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ca0019]/15 border border-[#ca0019]/35 text-[#ef4444] text-xs font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#ef4444] pulse-beacon" />
            <span>{tagline} &bull;</span>
            <span className="font-extrabold text-[#ff4d64]" style={{ fontFamily: "'Rozha One', serif" }}>प्र</span>
            <span className="text-white font-extrabold tracking-[0.14em] font-display">MAAN</span>
            <span className="text-[10px] bg-red-950/60 px-1.5 py-0.5 rounded text-red-300 font-mono">CORE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ef4444] via-[#ca0019] to-[#ff4d64]">Admin</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-xl font-sans">
            Manage batches, personalize certificate templates, and monitor automated 1-to-1 Nodemailer delivery from a single control plane.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Button
              variant="accent"
              size="md"
              onClick={() => onNavigate('wizard')}
              icon={Sparkles}
            >
              Launch Batch Wizard
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onNavigate('events')}
              icon={Plus}
            >
              Create New Event
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('templates')}
              icon={LayoutTemplate}
            >
              Visual Template Studio
            </Button>
          </div>

          {/* Instant Cryptographic Verifier Bar inside Hero */}
          <div className="pt-4 max-w-lg">
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#09090b]/90 border border-white/10 hover:border-[#ca0019]/50 transition-colors shadow-lg">
              <div className="pl-2.5 text-[#ef4444]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="hero-verify-input"
                placeholder="Quick-verify Certificate ID (e.g. IJ26-2026-0001)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    window.dispatchEvent(
                      new CustomEvent('open-quick-verify', {
                        detail: { certificateId: e.target.value.trim() }
                      })
                    );
                    e.target.value = '';
                  }
                }}
                className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none font-mono py-1"
              />
              <Button
                size="xs"
                variant="accent"
                onClick={() => {
                  const input = document.getElementById('hero-verify-input');
                  if (input && input.value.trim()) {
                    window.dispatchEvent(
                      new CustomEvent('open-quick-verify', {
                        detail: { certificateId: input.value.trim() }
                      })
                    );
                    input.value = '';
                  } else {
                    window.dispatchEvent(new CustomEvent('open-quick-verify', { detail: {} }));
                  }
                }}
              >
                Verify
              </Button>
            </div>
          </div>
        </div>

        {/* Ambient background glows */}
        <div className="absolute right-0 top-0 w-80 sm:w-96 h-80 sm:h-96 bg-[#ca0019]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Stats Grid with Hover Lift & Staggered Motion */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[11px] uppercase font-extrabold tracking-widest text-gray-500 font-display">
            Live Platform Telemetry
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Total Events */}
          <Card hoverEffect glowingTop className="p-4 bg-[#121215] border-[#27272a] animate-slideUp stagger-1 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold text-gray-300">Batches</span>
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <CalendarDays className="w-4 h-4 text-gray-300" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">{s.totalEvents || 0}</div>
              <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Configured events</div>
            </div>
          </Card>

          {/* Total Recipients */}
          <Card hoverEffect glowingTop className="p-4 bg-[#121215] border-[#27272a] animate-slideUp stagger-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold text-gray-300">Recipients</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">{s.totalRecipients || 0}</div>
              <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Verified identities</div>
            </div>
          </Card>

          {/* Certificates Generated */}
          <Card hoverEffect glowingTop className="p-4 bg-[#121215] border-[#27272a] animate-slideUp stagger-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold text-gray-300">Generated</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Award className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">{s.certificatesGenerated || 0}</div>
              <div className="text-[10px] uppercase font-bold text-purple-400 mt-1">PDFs in vault</div>
            </div>
          </Card>

          {/* Emails Sent */}
          <Card hoverEffect glowingTop className="p-4 bg-[#121215] border-[#27272a] animate-slideUp stagger-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold text-gray-300">Dispatched</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Send className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight font-display">{s.emailsSent || 0}</div>
              <div className="text-[10px] uppercase font-bold text-emerald-500 mt-1">Nodemailer delivered</div>
            </div>
          </Card>

          {/* Emails Failed */}
          <Card hoverEffect glowingTop className="p-4 bg-[#121215] border-[#27272a] animate-slideUp stagger-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold text-gray-300">Failed</span>
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <AlertOctagon className="w-4 h-4 text-[#ef4444]" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#ef4444] tracking-tight font-display">{s.emailsFailed || 0}</div>
              <div className="text-[10px] uppercase font-bold text-red-400 mt-1">Retry ready</div>
            </div>
          </Card>

          {/* Pending */}
          <Card hoverEffect glowingTop className="p-4 bg-[#121215] border-[#27272a] animate-slideUp stagger-6 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold text-gray-300">Pending</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-tight font-display">{s.pendingEmails || 0}</div>
              <div className="text-[10px] uppercase font-bold text-amber-400 mt-1">Awaiting send</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Browser Extension Announcement & Feature Showcase */}
      <div className="relative rounded-3xl overflow-hidden p-6 bg-gradient-to-r from-[#121217] via-[#16161c] to-[#0f0f13] border border-[#27272a] shadow-xl flex flex-wrap items-center justify-between gap-6 hover:border-[#ca0019]/40 transition-colors">
        <div className="flex items-center gap-4 max-w-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#ca0019]/20 border border-[#ca0019]/40 flex items-center justify-center text-[#ef4444] shrink-0 shadow-glow-crimson">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#ca0019]/15 text-[#ef4444] text-[10px] font-extrabold uppercase tracking-wider mb-1">
              Browser Extension Integration
            </div>
            <h3 className="text-base font-extrabold text-white font-display">
              PRAMAAN Web Extension Ready for Chrome, Edge & Brave
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Verify credentials instantly, inspect certificate IDs across spreadsheets and web forms, and trigger dispatches right from your browser toolbar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-quick-verify', { detail: {} }));
            }}
            icon={ShieldCheck}
          >
            Open Verifier
          </Button>
          <Button
            size="sm"
            variant="accent"
            onClick={() => onNavigate('settings')}
            icon={ArrowRight}
          >
            Extension Guide & API
          </Button>
        </div>
      </div>
      {failedAlerts.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#18181b] to-red-950/40 border border-[#ca0019]/50 flex flex-wrap items-center justify-between gap-4 animate-scaleIn shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6 text-[#ef4444]" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-red-200 font-display">
                Action Required: {failedAlerts.length} Failed Email Deliveries Detected
              </h3>
              <p className="text-xs text-red-300/80 mt-0.5 font-sans">
                SMTP errors occurred for some recipients. You can retry them instantly with zero duplication of certificates.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="danger"
            onClick={() => handleQuickRetry(failedAlerts[0]?.eventId)}
            loading={retrying}
            icon={RotateCw}
          >
            Retry Failed Deliveries
          </Button>
        </div>
      )}

      {/* Quick Launch Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('wizard')}
          className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] hover:border-[#ca0019] hover:bg-[#18181b] transition-all cursor-pointer group hover-lift-crimson"
        >
          <div className="w-10 h-10 rounded-xl bg-[#ca0019]/15 border border-[#ca0019]/30 text-[#ef4444] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-[#ef4444] transition-colors font-display">
            Batch Wizard
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            7-step guided workflow from CSV to automated delivery.
          </p>
        </div>

        <div
          onClick={() => onNavigate('templates')}
          className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] hover:border-[#ca0019] hover:bg-[#18181b] transition-all cursor-pointer group hover-lift-crimson"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-[#ef4444] transition-colors font-display">
            Template Studio
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Visual drag & drop canvas editor with dynamic field tags.
          </p>
        </div>

        <div
          onClick={() => onNavigate('certificates')}
          className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] hover:border-[#ca0019] hover:bg-[#18181b] transition-all cursor-pointer group hover-lift-crimson"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-[#ef4444] transition-colors font-display">
            Certificate Vault
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Browse, search, and preview rendered PDF certificates.
          </p>
        </div>

        <div
          onClick={() => onNavigate('deliveries')}
          className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] hover:border-[#ca0019] hover:bg-[#18181b] transition-all cursor-pointer group hover-lift-crimson"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Send className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-[#ef4444] transition-colors font-display">
            Email Dispatch
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Inspect Nodemailer delivery audit and real-time logs.
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Events & Live Delivery Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Batches (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 font-display">
              <CalendarDays className="w-4 h-4 text-[#ca0019]" />
              Recent Events & Batches
            </h2>
            <button
              onClick={() => onNavigate('events')}
              className="text-xs text-[#ef4444] hover:underline font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              View All Events <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentEvents.map((ev) => (
              <Card
                key={ev._id}
                hoverEffect
                className="p-5 flex flex-col justify-between group border-[#27272a] bg-[#121215]"
                onClick={() => {
                  onSelectEvent(ev);
                  onNavigate('wizard');
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#ef4444] transition-colors font-display">
                      {ev.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {ev.organizationName} • {ev.eventDate}
                    </p>
                  </div>
                  <Badge variant="neutral" size="xs">
                    {ev.certificatePrefix || 'CERT'}
                  </Badge>
                </div>

                <div className="pt-3 border-t border-[#27272a] flex items-center justify-between text-xs text-gray-400">
                  <span className="group-hover:text-gray-200 transition-colors">Click to launch workflow wizard</span>
                  <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#ef4444] group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            ))}

            {recentEvents.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-[#121215] border border-[#27272a] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-white font-display">No batches created yet</div>
                <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans">
                  Create your first certificate batch to import recipients, configure templates, and start automated generation.
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onNavigate('wizard')}
                  icon={Plus}
                >
                  Create First Batch
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Dispatch Audit (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 font-display">
              <Send className="w-4 h-4 text-[#ca0019]" />
              Latest Email Activity
            </h2>
            <button
              onClick={() => onNavigate('deliveries')}
              className="text-xs text-[#ef4444] hover:underline font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              Audit Logs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentDeliveries.map((d) => (
              <div
                key={d._id}
                className="p-3.5 rounded-xl bg-[#121215] border border-[#27272a] hover:border-[#3f3f46] flex items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">{d.recipientName}</div>
                  <div className="text-[11px] text-gray-400 font-mono truncate">{d.recipientEmail}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {d.status === 'sent' && <Badge variant="success" dot>Sent</Badge>}
                  {d.status === 'failed' && <Badge variant="danger" dot>Failed</Badge>}
                  {d.previewUrl && (
                    <a
                      href={d.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded-lg text-blue-400 hover:text-white hover:bg-white/5 transition-colors"
                      title="Preview test email"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}

            {recentDeliveries.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-[#121215] border border-[#27272a] space-y-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto text-gray-400">
                  <Send className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white font-display">No delivery history yet</div>
                <p className="text-[11px] text-gray-400 font-sans">
                  Emails dispatched from the wizard or retry actions will appear here in real time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
