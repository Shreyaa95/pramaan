import React, { useState, useEffect } from 'react';
import {
  Award,
  Download,
  Eye,
  Search,
  ExternalLink,
  Sparkles,
  FileText,
  RotateCw,
  Layers,
  ChevronDown,
  LayoutGrid,
  List
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export function CertificatesView({ activeEvent, events, onSelectEvent, onNavigate }) {
  const { showToast } = useToast();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  useEffect(() => {
    if (activeEvent?._id) {
      loadCertificates();
    }
  }, [activeEvent]);

  const loadCertificates = async () => {
    if (!activeEvent?._id) return;
    try {
      setLoading(true);
      const res = await api.getCertificates(activeEvent._id);
      if (res.success) {
        setCertificates(res.certificates || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = certificates.filter(c =>
    (c.recipientName && c.recipientName.toLowerCase().includes(search.toLowerCase())) ||
    (c.recipientEmail && c.recipientEmail.toLowerCase().includes(search.toLowerCase())) ||
    (c.certificateId && c.certificateId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#121215] via-[#151518] to-[#121215] border border-[#27272a] shadow-xl glowing-border">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ca0019]/15 text-[#ef4444] text-[10px] uppercase font-extrabold tracking-wider border border-[#ca0019]/30 mb-1.5">
            <Award className="w-3 h-3" />
            Digital Document Repository
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 font-display">
            Certificate Vault
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Every certificate is generated dynamically with sanitized filenames and collision-safe cryptographic identity.
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
            Generate in Wizard
          </Button>
        </div>
      </div>

      {/* Search & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#121215] border border-[#27272a]">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search certificate by ID, recipient name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ca0019]"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle (Table / Grid) */}
          <div className="flex items-center p-1 rounded-xl bg-[#18181b] border border-[#27272a]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-[#ca0019] text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#ca0019] text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs text-gray-400 font-mono">
            {filtered.length} of {certificates.length} certificates
          </span>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="rounded-2xl border border-[#27272a] bg-[#121215] p-6 space-y-3 animate-fadeIn">
          <div className="h-10 rounded-xl skeleton-shimmer border border-white/5" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl skeleton-shimmer border border-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center space-y-3 animate-scaleIn border-[#27272a] bg-[#121215]">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
            <Award className="w-8 h-8 text-[#ca0019]" />
          </div>
          <h3 className="text-base font-bold text-white font-display">No Certificates Generated Yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans">
            Run bulk generation from the Batch Wizard to personalize and compile PDFs.
          </p>
          <Button variant="accent" size="sm" onClick={() => onNavigate('wizard')} icon={Sparkles}>
            Launch Batch Wizard
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid / Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {filtered.map((cert) => (
            <Card
              key={cert._id}
              hoverEffect
              glowingTop
              className="p-5 flex flex-col justify-between space-y-4 border-[#27272a] bg-[#121215]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-[#ef4444]">{cert.certificateId}</span>
                  {cert.status === 'sent' ? (
                    <Badge variant="success" dot size="xs">Sent</Badge>
                  ) : (
                    <Badge variant="info" dot size="xs">Ready</Badge>
                  )}
                </div>

                <div className="aspect-[842/595] rounded-xl overflow-hidden bg-black/40 border border-[#27272a] mb-3 flex items-center justify-center relative group/preview">
                  <FileText className="w-12 h-12 text-[#ef4444] opacity-50" />
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => setPreviewPdfUrl(cert.pdfUrl)}
                      icon={Eye}
                    >
                      Preview
                    </Button>
                  </div>
                </div>

                <h3 className="text-sm font-extrabold text-white truncate font-display">{cert.recipientName}</h3>
                <p className="text-xs text-gray-400 font-mono truncate">{cert.recipientEmail}</p>
              </div>

              <div className="pt-3 border-t border-[#27272a] flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-mono">
                  {cert.fileSize ? `${Math.round(cert.fileSize / 1024)} KB` : 'PDF'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewPdfUrl(cert.pdfUrl)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Preview Certificate"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <a
                    href={cert.pdfUrl}
                    download
                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#ef4444] hover:bg-white/10 transition-colors cursor-pointer"
                    title="Download Certificate PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-2xl border border-[#27272a] bg-[#121215] shadow-2xl animate-fadeIn">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#18181b] text-gray-400 border-b border-[#27272a]">
              <tr>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Certificate ID</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Recipient Name</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Recipient Email</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">File Name</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Size</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Status</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f23] text-gray-300">
              {filtered.map((cert) => (
                <tr key={cert._id} className="hover:bg-[#18181b]/80 transition-colors group">
                  <td className="p-4 font-mono text-[#ef4444] font-bold">
                    {cert.certificateId}
                  </td>
                  <td className="p-4 font-extrabold text-white font-sans">
                    {cert.recipientName}
                  </td>
                  <td className="p-4 font-mono text-gray-400">
                    {cert.recipientEmail}
                  </td>
                  <td className="p-4 font-mono text-gray-400 truncate max-w-xs">
                    {cert.fileName}
                  </td>
                  <td className="p-4 text-gray-400 font-mono">
                    {cert.fileSize ? `${Math.round(cert.fileSize / 1024)} KB` : 'PDF'}
                  </td>
                  <td className="p-4">
                    {cert.status === 'sent' ? (
                      <Badge variant="success" dot>Sent</Badge>
                    ) : (
                      <Badge variant="info" dot>Generated</Badge>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setPreviewPdfUrl(cert.pdfUrl)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Preview Certificate"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <a
                        href={cert.pdfUrl}
                        download
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#ef4444] hover:bg-white/10 transition-colors cursor-pointer"
                        title="Download Certificate PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PDF Preview Modal */}
      <Modal
        isOpen={!!previewPdfUrl}
        onClose={() => setPreviewPdfUrl(null)}
        title="Personalized Certificate PDF Preview"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="aspect-[842/595] w-full rounded-2xl overflow-hidden border border-[#27272a] bg-black shadow-2xl">
            <iframe
              src={previewPdfUrl}
              className="w-full h-full border-0"
              title="Certificate PDF Viewer"
            />
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-gray-400 font-mono">Rendered via PRAMAAN Vector Engine</span>
            <div className="flex gap-2">
              <a
                href={previewPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#18181b] text-white hover:bg-[#27272a] border border-[#27272a] flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Fullscreen
              </a>
              <Button size="sm" variant="primary" onClick={() => setPreviewPdfUrl(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
