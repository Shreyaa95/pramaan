import React, { useState, useEffect } from 'react';
import {
  Send,
  RotateCw,
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  Info,
  Eye,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export function DeliveriesView({ activeEvent, events, onSelectEvent, onNavigate }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [retryingBulk, setRetryingBulk] = useState(false);
  const [selectedError, setSelectedError] = useState(null);

  useEffect(() => {
    if (activeEvent?._id) {
      loadLogs();
    }
  }, [activeEvent]);

  const loadLogs = async () => {
    if (!activeEvent?._id) return;
    try {
      setLoading(true);
      const res = await api.getEmailLogs(activeEvent._id);
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryBulk = async () => {
    if (!activeEvent?._id) return;
    try {
      setRetryingBulk(true);
      const res = await api.retryFailedEmails(activeEvent._id);
      if (res.success) {
        if (res.totalRetried === 0) {
          showToast('No failed deliveries found to retry. All deliveries are currently sent.', 'info');
        } else {
          showToast(`Retried ${res.totalRetried} failed deliveries (${res.successfulRetries} succeeded, ${res.failedRetries} failed)!`, res.failedRetries > 0 ? 'warning' : 'success');
        }
        loadLogs();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRetryingBulk(false);
    }
  };

  const handleRetrySingle = async (deliveryId) => {
    try {
      const res = await api.retrySingleEmail(deliveryId);
      if (res.success) {
        showToast('Successfully retried email delivery!', 'success');
        loadLogs();
      }
    } catch (err) {
      showToast(`Retry failed: ${err.message}`, 'error');
    }
  };

  const safeLogs = Array.isArray(logs) ? logs : [];
  const filteredLogs = safeLogs.filter(l => {
    if (!l) return false;
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const q = (search || '').toLowerCase().trim();
    const matchesSearch = !q ||
      (l.recipientName && l.recipientName.toLowerCase().includes(q)) ||
      (l.recipientEmail && l.recipientEmail.toLowerCase().includes(q)) ||
      (l.certificateId && l.certificateId.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const failedCount = safeLogs.filter(l => l && l.status === 'failed').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#121215] via-[#151518] to-[#121215] border border-[#27272a] shadow-xl glowing-border">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ca0019]/15 text-[#ef4444] text-[10px] uppercase font-extrabold tracking-wider border border-[#ca0019]/30 mb-1.5">
            <Send className="w-3 h-3" />
            Nodemailer Engine
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 font-display">
            Email Delivery & Audit Trail
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time delivery status tracking (Sent / Failed / Pending). Failed emails can be safely retried without regenerating duplicate certificates.
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

          {failedCount > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleRetryBulk()}
              loading={retryingBulk}
              icon={RotateCw}
            >
              Retry All {failedCount} Failed
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#121215] border border-[#27272a]">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs by name, email, or certificate ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ca0019]"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'sent', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#ca0019] text-white shadow-md shadow-[#ca0019]/40'
                  : 'bg-[#18181b] text-gray-400 hover:text-white border border-[#27272a]'
              }`}
            >
              {st} ({logs.filter(l => st === 'all' ? true : l.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="rounded-2xl border border-[#27272a] bg-[#121215] p-6 space-y-3 animate-fadeIn">
          <div className="h-10 rounded-xl skeleton-shimmer border border-white/5" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl skeleton-shimmer border border-white/5" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-12 text-center space-y-3 animate-scaleIn border-[#27272a] bg-[#121215]">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
            <Send className="w-8 h-8 text-[#ca0019]" />
          </div>
          <h3 className="text-base font-bold text-white font-display">No Delivery Logs Found for This Batch</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans">
            Dispatch certificates through the Batch Wizard to generate live Nodemailer audit logs.
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
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Recipient Name</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Email</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Certificate ID</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Delivery Status</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">View Status</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Timestamp</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Retries</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f23] text-gray-300">
              {filteredLogs.map((log) => (
                <tr key={log._id} className="hover:bg-[#18181b]/80 transition-colors group">
                  <td className="p-4 font-extrabold text-white font-sans">
                    {log.recipientName}
                  </td>
                  <td className="p-4 font-mono text-gray-400">
                    {log.recipientEmail}
                  </td>
                  <td className="p-4 font-mono text-[#ef4444] font-bold">
                    {log.certificateId}
                  </td>
                  <td className="p-4">
                    {log.status === 'sent' && (
                      <Badge variant="success" dot>Sent</Badge>
                    )}
                    {log.status === 'failed' && (
                      <div className="inline-flex items-center gap-1.5">
                        <Badge variant="danger" dot>Failed</Badge>
                        {log.errorMessage && (
                          <button
                            onClick={() => setSelectedError(log.errorMessage)}
                            className="text-gray-500 hover:text-white cursor-pointer"
                            title="Inspect Error Detail"
                          >
                            <Info className="w-3.5 h-3.5 text-[#ef4444]" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {log.isViewed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                        <Eye className="w-3.5 h-3.5" />
                        Viewed {log.viewedAt ? new Date(log.viewedAt).toLocaleTimeString() : ''}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-[11px] italic">
                        Not viewed yet
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-gray-400 font-mono text-[11px]">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : log.lastAttemptAt ? new Date(log.lastAttemptAt).toLocaleString() : '—'}
                  </td>
                  <td className="p-4 font-mono text-gray-400 font-bold">
                    {log.retryCount || 0}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {log.certificateId && (
                        <a
                          href={`/view-certificate/${log.certificateId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-[#18181b] text-white hover:text-[#ef4444] border border-[#27272a] hover:border-[#ca0019] flex items-center gap-1.5 text-xs font-bold transition-colors"
                          title="Open Recipient Certificate View"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#ef4444]" />
                          View
                        </a>
                      )}

                      {log.previewUrl && (
                        <a
                          href={log.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-xl text-blue-400 hover:text-white hover:bg-white/5 transition-colors"
                          title="View Test Mode Email"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {log.status === 'failed' && (
                        <button
                          onClick={() => handleRetrySingle(log._id)}
                          className="px-2.5 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs font-bold text-red-200 hover:bg-[#ca0019] hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error Inspection Modal */}
      <Modal
        isOpen={!!selectedError}
        onClose={() => setSelectedError(null)}
        title="Email Delivery Failure Details"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-950/30 border border-[#ca0019]/40 text-red-200 text-xs font-mono break-all whitespace-pre-wrap">
            {selectedError}
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setSelectedError(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
