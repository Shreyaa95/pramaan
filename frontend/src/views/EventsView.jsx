import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Users,
  Award,
  Send,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Layers
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export function EventsView({ onSelectEvent, onNavigate }) {
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventDate: new Date().toISOString().split('T')[0],
    organizationName: 'The Uniques Community',
    certificatePrefix: 'CERT',
    templateId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsRes, templatesRes] = await Promise.all([
        api.getEvents(),
        api.getTemplates()
      ]);
      if (eventsRes.success) setEvents(eventsRes.events || []);
      if (templatesRes.success) setTemplates(templatesRes.templates || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      name: '',
      description: '',
      eventDate: new Date().toISOString().split('T')[0],
      organizationName: 'The Uniques Community',
      certificatePrefix: 'CERT',
      templateId: templates[0]?._id || ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (ev) => {
    setEditingEvent(ev);
    setFormData({
      name: ev.name || '',
      description: ev.description || '',
      eventDate: ev.eventDate || '',
      organizationName: ev.organizationName || '',
      certificatePrefix: ev.certificatePrefix || 'CERT',
      templateId: ev.templateId || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Event name is required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingEvent) {
        const res = await api.updateEvent(editingEvent._id, formData);
        if (res.success) {
          showToast('Event updated successfully.', 'success');
          setModalOpen(false);
          loadData();
        }
      } else {
        const res = await api.createEvent(formData);
        if (res.success) {
          showToast('Event batch created successfully.', 'success');
          setModalOpen(false);
          loadData();
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete event "${name}"? This will delete all recipient data and certificates for this event.`)) {
      return;
    }

    try {
      const res = await api.deleteEvent(id);
      if (res.success) {
        showToast('Event deleted.', 'success');
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#121215] via-[#151518] to-[#121215] border border-[#27272a] shadow-xl glowing-border">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ca0019]/15 text-[#ef4444] text-[10px] uppercase font-extrabold tracking-wider border border-[#ca0019]/30 mb-1.5">
            <Layers className="w-3 h-3" />
            Batch Administration
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 font-display">
            Events & Batch Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Organize workshops, hackathons, and certifications. Each event holds isolated recipient records and custom certificate templates.
          </p>
        </div>

        <Button
          variant="accent"
          onClick={handleOpenCreateModal}
          icon={Plus}
          size="md"
        >
          Create New Event
        </Button>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl skeleton-shimmer border border-[#27272a] p-6" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center space-y-4 animate-scaleIn border-[#27272a] bg-[#121215]">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
            <CalendarDays className="w-8 h-8 text-[#ca0019]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-display">No Events Configured Yet</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans">
              Get started by creating your first event or workshop batch to begin importing recipients.
            </p>
          </div>
          <Button variant="accent" onClick={handleOpenCreateModal} icon={Plus}>
            Create First Event
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {events.map((ev, idx) => {
            const stats = ev.stats || {};
            const sentRate = stats.totalRecipients > 0 ? Math.round((stats.sentCount / stats.totalRecipients) * 100) : 0;

            return (
              <Card
                key={ev._id}
                hoverEffect
                glowingTop
                className={`flex flex-col justify-between space-y-5 group animate-slideUp stagger-${(idx % 6) + 1} border-[#27272a] bg-[#121215]`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Badge variant="purple" size="xs">
                      Prefix: {ev.certificatePrefix || 'CERT'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(ev)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Edit event"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ev._id, ev.name)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#ef4444] hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-white tracking-tight group-hover:text-[#ef4444] transition-colors font-display">
                    {ev.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span className="font-semibold text-gray-300">{ev.organizationName}</span>
                    <span>•</span>
                    <span className="font-mono text-gray-400">{ev.eventDate}</span>
                  </div>

                  {ev.description && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed font-sans">
                      {ev.description}
                    </p>
                  )}
                </div>

                {/* Event Metrics Pills */}
                <div className="space-y-3 pt-3 border-t border-[#27272a]">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block font-semibold">Recipients</span>
                      <strong className="text-white text-base font-display">{stats.totalRecipients || 0}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-400 block font-semibold">Sent</span>
                      <strong className="text-emerald-300 text-base font-display">{stats.sentCount || 0}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-red-950/20 border border-red-500/20">
                      <span className="text-[10px] text-red-400 block font-semibold">Failed</span>
                      <strong className="text-[#ef4444] text-base font-display">{stats.failedCount || 0}</strong>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  {stats.totalRecipients > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                        <span>Dispatch Progress</span>
                        <span className="text-white">{sentRate}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#18181b] rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-[#ca0019] to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${sentRate}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onSelectEvent(ev);
                        onNavigate('wizard');
                      }}
                      icon={Sparkles}
                    >
                      Open Workflow Wizard
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEvent ? 'Edit Event Details' : 'Create New Event Batch'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">
              Event Name <span className="text-[#ca0019]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. IdeaJam 2026, FullStack Certification, SVIET Hackathon"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Event Date
              </label>
              <input
                type="text"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Certificate ID Prefix
              </label>
              <input
                type="text"
                value={formData.certificatePrefix}
                onChange={(e) => setFormData({ ...formData, certificatePrefix: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white font-mono focus:outline-none focus:border-[#ca0019]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Assigned Template
              </label>
              <select
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
              >
                <option value="">-- Choose Template --</option>
                {templates.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#27272a]">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingEvent ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
