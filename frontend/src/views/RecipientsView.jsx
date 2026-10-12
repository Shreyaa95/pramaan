import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Award,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export function RecipientsView({ activeEvent, events, onSelectEvent, onNavigate }) {
  const { showToast } = useToast();
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (activeEvent?._id) {
      loadRecipients();
    }
  }, [activeEvent, statusFilter]);

  const loadRecipients = async () => {
    if (!activeEvent?._id) return;
    try {
      setLoading(true);
      const res = await api.getRecipients(activeEvent._id, {
        status: statusFilter,
        search
      });
      if (res.success) {
        setRecipients(res.recipients || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadRecipients();
  };

  const handleDeleteRecipient = async (id, name) => {
    if (!window.confirm(`Delete recipient ${name}?`)) return;
    try {
      const res = await api.deleteRecipient(id);
      if (res.success) {
        showToast('Recipient removed.', 'success');
        loadRecipients();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleClearAll = async () => {
    if (!activeEvent?._id) return;
    if (!window.confirm(`Clear all recipients for "${activeEvent.name}"? This will also remove generated certificates for this event.`)) return;

    try {
      const res = await api.clearEventRecipients(activeEvent._id);
      if (res.success) {
        showToast('All recipients cleared for this event.', 'success');
        loadRecipients();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#121215] via-[#151518] to-[#121215] border border-[#27272a] shadow-xl glowing-border">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ca0019]/15 text-[#ef4444] text-[10px] uppercase font-extrabold tracking-wider border border-[#ca0019]/30 mb-1.5">
            <Users className="w-3 h-3" />
            Identity Directory
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 font-display">
            Recipient Registry & Mapping
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Strict deterministic 1-to-1 linkage: Recipient → Recipient ID → Email → Certificate → Delivery Audit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {events && events.length > 0 && (
            <div className="relative">
              <select
                value={activeEvent?._id || ''}
                onChange={(e) => onSelectEvent(events.find(ev => ev._id === e.target.value))}
                className="px-3.5 py-2 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white font-bold focus:outline-none focus:border-[#ca0019] pr-8 appearance-none cursor-pointer"
              >
                {events.map((ev) => (
                  <option key={ev._id} value={ev._id}>{ev.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          )}

          <Button
            variant="accent"
            size="sm"
            onClick={() => onNavigate('wizard')}
            icon={Sparkles}
          >
            Import Data in Wizard
          </Button>

          {recipients.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleClearAll}
              icon={Trash2}
            >
              Clear Batch
            </Button>
          )}
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#18181b] to-[#121215] border border-[#27272a] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-gray-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-sans leading-relaxed">
            <strong className="text-white">Deterministic Mapping Guarantee:</strong> Duplicate names (e.g. two recipients named "Rahul Kumar") are completely isolated by unique recipient IDs to prevent cross-attachment errors.
          </span>
        </div>
        <Badge variant="success">Collision-Safe</Badge>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#121215] border border-[#27272a]">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or recipient ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ca0019]"
          />
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider text-[10px]">Filter Status:</span>
          {['all', 'pending', 'generated', 'sent', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#ca0019] text-white shadow-md shadow-[#ca0019]/40'
                  : 'bg-[#18181b] text-gray-400 hover:text-white border border-[#27272a]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Recipients Table */}
      {loading ? (
        <div className="rounded-2xl border border-[#27272a] bg-[#121215] p-6 space-y-3 animate-fadeIn">
          <div className="h-10 rounded-xl skeleton-shimmer border border-white/5" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl skeleton-shimmer border border-white/5" />
          ))}
        </div>
      ) : recipients.length === 0 ? (
        <Card className="p-12 text-center space-y-3 animate-scaleIn border-[#27272a] bg-[#121215]">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
            <Users className="w-8 h-8 text-[#ca0019]" />
          </div>
          <h3 className="text-base font-bold text-white font-display">No Recipients Found for This Batch</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans">
            Upload an Excel/CSV file or connect to an authorized MongoDB database using the Batch Wizard.
          </p>
          <Button variant="accent" size="sm" onClick={() => onNavigate('wizard')} icon={Sparkles}>
            Launch Batch Wizard
          </Button>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#27272a] bg-[#121215] shadow-2xl animate-fadeIn">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#18181b] text-gray-400 border-b border-[#27272a]">
              <tr>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Recipient ID</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Full Name</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Email Address</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Extra Attributes</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Certificate ID</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Delivery State</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f23] text-gray-300">
              {recipients.map((r) => {
                const cert = r.certificate;
                const delivery = r.delivery;
                const status = delivery?.status || r.status || 'pending';

                return (
                  <tr key={r._id} className="hover:bg-[#18181b]/80 transition-colors group">
                    <td className="p-4 font-mono text-[#ef4444] font-bold">{r.recipientId}</td>
                    <td className="p-4 font-extrabold text-white font-sans">{r.name}</td>
                    <td className="p-4 font-mono text-gray-400">{r.email}</td>
                    <td className="p-4 text-gray-400">
                      {r.extraData && Object.keys(r.extraData).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(r.extraData).map(([k, v]) => (
                            <span key={k} className="px-2 py-0.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[10px] text-gray-300 font-mono">
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-4 font-mono font-bold text-gray-300">
                      {cert?.certificateId || '—'}
                    </td>
                    <td className="p-4">
                      {status === 'sent' && <Badge variant="success" dot>Sent</Badge>}
                      {status === 'failed' && <Badge variant="danger" dot>Failed</Badge>}
                      {status === 'generated' && <Badge variant="info">Ready</Badge>}
                      {status === 'pending' && <Badge variant="warning">Pending</Badge>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {cert?.pdfUrl && (
                          <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Download PDF Certificate"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteRecipient(r._id, r.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#ef4444] hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Remove Recipient"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
