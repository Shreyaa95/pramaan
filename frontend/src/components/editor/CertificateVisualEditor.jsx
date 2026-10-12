import React, { useState, useRef } from 'react';
import {
  Type,
  Move,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Trash2,
  Eye,
  FileCheck,
  Download,
  Save,
  Check,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

const AVAILABLE_FIELD_PRESETS = [
  { key: 'recipientName', label: 'Recipient Name', defaultFont: 'Times', defaultSize: 32, defaultWeight: 'bold', defaultColor: '#ca0019', sample: 'Rahul Kumar' },
  { key: 'eventName', label: 'Event Name', defaultFont: 'Helvetica', defaultSize: 24, defaultWeight: 'bold', defaultColor: '#111827', sample: 'IdeaJam 2026 Hackathon' },
  { key: 'certificateId', label: 'Certificate ID', defaultFont: 'Courier', defaultSize: 12, defaultWeight: 'bold', defaultColor: '#6b7280', sample: 'CERT-2026-0001' },
  { key: 'date', label: 'Issue Date', defaultFont: 'Helvetica', defaultSize: 12, defaultWeight: 'normal', defaultColor: '#6b7280', sample: 'October 15, 2026' },
  { key: 'organizationName', label: 'Organization Name', defaultFont: 'Helvetica', defaultSize: 20, defaultWeight: 'bold', defaultColor: '#ca0019', sample: 'THE UNIQUES COMMUNITY' },
  { key: 'position', label: 'Role / Track / Achievement', defaultFont: 'Helvetica', defaultSize: 14, defaultWeight: 'normal', defaultColor: '#4b5563', sample: 'Winner - Web & Agentic AI Track' }
];

export function CertificateVisualEditor({ template, onSave, isSaving = false }) {
  const { showToast } = useToast();
  const canvasRef = useRef(null);

  const [fields, setFields] = useState(template?.fields || []);
  const [selectedFieldId, setSelectedFieldId] = useState(fields[0]?.id || null);
  const [showSampleData, setShowSampleData] = useState(true);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const selectedField = fields.find(f => f.id === selectedFieldId) || fields[0];

  const handleUpdateSelectedField = (patch) => {
    if (!selectedFieldId) return;
    setFields(prev =>
      prev.map(f => (f.id === selectedFieldId ? { ...f, ...patch } : f))
    );
  };

  const handleAddField = (preset = null) => {
    const newId = `field_${Date.now()}`;
    const newField = {
      id: newId,
      key: preset?.key || `custom_${fields.length + 1}`,
      label: preset?.label || `Custom Field ${fields.length + 1}`,
      xPercent: 50,
      yPercent: 50,
      font: preset?.defaultFont || 'Helvetica',
      fontSize: preset?.defaultSize || 18,
      fontWeight: preset?.defaultWeight || 'normal',
      color: preset?.defaultColor || '#111827',
      align: 'center',
      sampleValue: preset?.sample || 'Sample Value'
    };

    setFields([...fields, newField]);
    setSelectedFieldId(newId);
    showToast(`Added dynamic field: ${newField.label}`, 'success');
  };

  const handleRemoveField = (id) => {
    const remaining = fields.filter(f => f.id !== id);
    setFields(remaining);
    if (selectedFieldId === id) {
      setSelectedFieldId(remaining[0]?.id || null);
    }
  };

  const handleCanvasClick = (e) => {
    if (!selectedFieldId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.round((clickX / rect.width) * 100);
    const yPercent = Math.round((clickY / rect.height) * 100);

    handleUpdateSelectedField({ xPercent, yPercent });
  };

  const handleGeneratePreviewPdf = async () => {
    try {
      setGeneratingPreview(true);
      const res = await api.previewSampleCertificate(
        { ...template, fields },
        {
          recipientName: 'Rahul Kumar',
          eventName: 'IdeaJam 2026 Hackathon',
          organizationName: 'The Uniques Community',
          date: 'October 15, 2026',
          position: 'Special Recognition Award',
          certificateId: 'CERT-PREVIEW-2026'
        }
      );

      if (res.success && res.pdfUrl) {
        setPreviewPdfUrl(res.pdfUrl);
        window.open(res.pdfUrl, '_blank');
        showToast('PDF preview generated! Opened in new tab.', 'success');
      }
    } catch (err) {
      showToast(`Preview error: ${err.message}`, 'error');
    } finally {
      setGeneratingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#12141c] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ca0019]/20 border border-[#ca0019]/30 flex items-center justify-center text-[#ff4d64]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Visual Field Studio & Canvas Placement
            </h2>
            <p className="text-xs text-gray-400">
              Click anywhere on the certificate preview to reposition the selected field with pixel precision.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSampleData(!showSampleData)}
            icon={Eye}
          >
            {showSampleData ? 'View Placeholders' : 'Preview Real Data'}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleGeneratePreviewPdf}
            loading={generatingPreview}
            icon={Download}
          >
            Generate Test PDF
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => onSave({ ...template, fields })}
            loading={isSaving}
            icon={Save}
          >
            Save Template Fields
          </Button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Canvas Preview Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="w-full mb-3 flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Certificate Canvas (A4 Landscape 842 x 595)
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ca0019]" />
              Selected Pin: <strong className="text-white">{selectedField?.label || 'None'}</strong>
            </span>
          </div>

          {/* Certificate Surface Frame */}
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full aspect-[842/595] rounded-xl overflow-hidden relative shadow-2xl border-2 border-white/20 cursor-crosshair select-none transition-all duration-200"
            style={{
              backgroundColor: '#fbfbfb',
              backgroundImage: template?.backgroundUrl ? `url(${template.backgroundUrl})` : undefined,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* If no image background, show luxury default certificate SVG motif */}
            {!template?.backgroundUrl && (
              <div className="absolute inset-0 pointer-events-none p-6">
                <div className="w-full h-full border-4 border-[#0b0c10] p-2 flex flex-col justify-between">
                  <div className="w-full h-full border border-[#ca0019]/80 p-6 flex flex-col justify-between relative bg-gradient-to-b from-white/95 to-slate-50/95">
                    {/* Corner decorative crests */}
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#ca0019]" />
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#ca0019]" />
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#ca0019]" />
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#ca0019]" />
                  </div>
                </div>
              </div>
            )}

            {/* Render all field pins on canvas */}
            {fields.map((f) => {
              const isSelected = f.id === selectedFieldId;
              const displayVal = showSampleData
                ? (f.sampleValue || f.label)
                : `{{${f.key}}}`;

              return (
                <div
                  key={f.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFieldId(f.id);
                  }}
                  className={`
                    absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-150 group px-2 py-0.5 rounded
                    ${isSelected
                      ? 'ring-2 ring-[#ca0019] bg-[#ca0019]/10 shadow-lg shadow-[#ca0019]/30 z-20 scale-105'
                      : 'hover:ring-1 hover:ring-black/40 hover:bg-black/5 z-10'
                    }
                  `}
                  style={{
                    left: `${f.xPercent}%`,
                    top: `${f.yPercent}%`,
                    fontFamily: f.font === 'Times' ? 'serif' : f.font === 'Courier' ? 'monospace' : 'sans-serif',
                    fontSize: `${Math.max(10, (f.fontSize || 16) * 0.7)}px`,
                    fontWeight: f.fontWeight || 'normal',
                    fontStyle: f.fontStyle || 'normal',
                    color: f.color || '#111827',
                    textAlign: f.align || 'center'
                  }}
                >
                  <span className="whitespace-nowrap">{displayVal}</span>

                  {/* Indicator badge on hover or select */}
                  {isSelected && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#ca0019] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                      {f.label} ({f.xPercent}%, {f.yPercent}%)
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-500 mt-3 text-center">
            Click on any text pin to select it, or click anywhere on the certificate to reposition the active pin.
          </p>
        </div>

        {/* Right Configuration Inspector Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Field Selector list */}
          <div className="p-4 rounded-xl bg-[#12141c] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Configured Dynamic Fields ({fields.length})
              </span>
              <div className="relative group">
                <Button size="sm" variant="outline" className="text-xs py-1" icon={Plus}>
                  Add Field
                </Button>
                {/* Preset Dropdown */}
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#161924] border border-white/10 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-30">
                  <div className="text-[10px] uppercase font-bold text-gray-400 px-2 py-1">Choose Preset</div>
                  {AVAILABLE_FIELD_PRESETS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => handleAddField(p)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <span>{p.label}</span>
                      <span className="text-[10px] text-gray-500 font-mono">`{p.key}`</span>
                    </button>
                  ))}
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={() => handleAddField(null)}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#ff4d64] hover:bg-[#ca0019]/20 rounded-lg transition-colors font-semibold"
                  >
                    + Custom Dynamic Field
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
              {fields.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFieldId(f.id)}
                  className={`
                    px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5
                    ${f.id === selectedFieldId
                      ? 'bg-[#ca0019] text-white shadow-md shadow-[#ca0019]/30'
                      : 'bg-[#181b26] text-gray-300 hover:bg-[#222736] border border-white/5'
                    }
                  `}
                >
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Field Properties Form */}
          {selectedField ? (
            <div className="p-5 rounded-xl bg-[#12141c] border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedField.label}</h3>
                  <span className="text-[11px] text-gray-400 font-mono">Mapping Key: `{selectedField.key}`</span>
                </div>
                <button
                  onClick={() => handleRemoveField(selectedField.id)}
                  title="Remove Field"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Field Label & Key */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 block mb-1">Field Label</label>
                  <input
                    type="text"
                    value={selectedField.label || ''}
                    onChange={(e) => handleUpdateSelectedField({ label: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#181b26] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ca0019]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 block mb-1">Sample Value</label>
                  <input
                    type="text"
                    value={selectedField.sampleValue || ''}
                    onChange={(e) => handleUpdateSelectedField({ sampleValue: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#181b26] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ca0019]"
                  />
                </div>
              </div>

              {/* Coordinates Sliders */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs text-gray-300 font-medium mb-1">
                    <span>Horizontal Position (X)</span>
                    <span className="font-mono text-[#ff4d64] font-bold">{selectedField.xPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedField.xPercent || 50}
                    onChange={(e) => handleUpdateSelectedField({ xPercent: Number(e.target.value) })}
                    className="w-full accent-[#ca0019] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-300 font-medium mb-1">
                    <span>Vertical Position (Y)</span>
                    <span className="font-mono text-[#ff4d64] font-bold">{selectedField.yPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedField.yPercent || 50}
                    onChange={(e) => handleUpdateSelectedField({ yPercent: Number(e.target.value) })}
                    className="w-full accent-[#ca0019] cursor-pointer"
                  />
                </div>
              </div>

              {/* Typography & Styling */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">Font Family</label>
                    <select
                      value={selectedField.font || 'Helvetica'}
                      onChange={(e) => handleUpdateSelectedField({ font: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#181b26] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ca0019]"
                    >
                      <option value="Helvetica">Modern Sans (Helvetica)</option>
                      <option value="Times">Classic Serif (Times Roman)</option>
                      <option value="Courier">Technical Mono (Courier)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">Font Size (px)</label>
                    <input
                      type="number"
                      min="8"
                      max="72"
                      value={selectedField.fontSize || 18}
                      onChange={(e) => handleUpdateSelectedField({ fontSize: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#181b26] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-[#ca0019]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Alignment */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">Alignment</label>
                    <div className="flex border border-white/10 rounded-lg overflow-hidden">
                      {['left', 'center', 'right'].map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => handleUpdateSelectedField({ align })}
                          className={`flex-1 py-1 flex items-center justify-center transition-colors ${
                            selectedField.align === align ? 'bg-[#ca0019] text-white' : 'bg-[#181b26] text-gray-400 hover:text-white'
                          }`}
                        >
                          {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                          {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                          {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">Style</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedField({ fontWeight: selectedField.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          selectedField.fontWeight === 'bold'
                            ? 'bg-[#ca0019] text-white border-transparent'
                            : 'bg-[#181b26] text-gray-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedField({ fontStyle: selectedField.fontStyle === 'italic' ? 'normal' : 'italic' })}
                        className={`flex-1 py-1 rounded-lg text-xs italic border transition-colors ${
                          selectedField.fontStyle === 'italic'
                            ? 'bg-[#ca0019] text-white border-transparent'
                            : 'bg-[#181b26] text-gray-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        I
                      </button>
                    </div>
                  </div>
                </div>

                {/* Color Picker with presets */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 block mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedField.color || '#111827'}
                      onChange={(e) => handleUpdateSelectedField({ color: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={selectedField.color || '#111827'}
                      onChange={(e) => handleUpdateSelectedField({ color: e.target.value })}
                      className="w-24 px-2 py-1 text-xs bg-[#181b26] border border-white/10 rounded-lg text-white font-mono focus:outline-none"
                    />
                    <div className="flex gap-1">
                      {['#ca0019', '#111827', '#4b5563', '#b45309', '#1e40af'].map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => handleUpdateSelectedField({ color: hex })}
                          className="w-5 h-5 rounded-full border border-black/40 hover:scale-110 transition-transform"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 rounded-xl bg-[#12141c] border border-white/10">
              No field selected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
