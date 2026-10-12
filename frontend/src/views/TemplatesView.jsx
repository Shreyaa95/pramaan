import React, { useState, useEffect } from 'react';
import {
  LayoutTemplate,
  Plus,
  Upload,
  Edit,
  Trash2,
  Sparkles,
  Download,
  Eye,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { CertificateVisualEditor } from '../components/editor/CertificateVisualEditor';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export function TemplatesView() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // New Template Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTemplateData, setNewTemplateData] = useState({
    name: '',
    description: '',
    width: 842,
    height: 595
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.getTemplates();
      if (res.success) setTemplates(res.templates || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateData.name.trim()) {
      showToast('Template name is required.', 'error');
      return;
    }

    try {
      setUploading(true);
      let backgroundPath = '';
      let backgroundUrl = '';

      if (uploadFile) {
        const uploadRes = await api.uploadTemplateBackground(uploadFile);
        if (uploadRes.success) {
          backgroundPath = uploadRes.filePath;
          backgroundUrl = uploadRes.fileUrl;
        }
      }

      const res = await api.createTemplate({
        ...newTemplateData,
        backgroundPath,
        backgroundUrl,
        backgroundType: backgroundUrl ? 'image' : 'canvas'
      });

      if (res.success) {
        showToast('Template created successfully!', 'success');
        setCreateModalOpen(false);
        setUploadFile(null);
        setNewTemplateData({ name: '', description: '', width: 842, height: 595 });
        loadTemplates();
        setEditingTemplate(res.template); // Open visual editor directly
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async (id, name) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      const res = await api.deleteTemplate(id);
      if (res.success) {
        showToast('Template deleted.', 'success');
        loadTemplates();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {editingTemplate ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#121215] border border-[#27272a]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingTemplate(null)}
            >
              ← Back to Template Gallery
            </Button>
            <span className="text-xs font-bold text-gray-300 font-display">
              Editing: <span className="text-[#ef4444]">{editingTemplate.name}</span>
            </span>
          </div>
          <CertificateVisualEditor
            template={editingTemplate}
            onSave={(updated) => {
              setEditingTemplate(updated);
              loadTemplates();
              showToast('Template fields saved successfully!', 'success');
            }}
          />
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#121215] via-[#151518] to-[#121215] border border-[#27272a] shadow-xl glowing-border">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ca0019]/15 text-[#ef4444] text-[10px] uppercase font-extrabold tracking-wider border border-[#ca0019]/30 mb-1.5">
                <Layers className="w-3 h-3" />
                Visual Studio
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 font-display">
                Certificate Template Studio
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Upload custom certificate designs from Figma/Canva and visually place dynamic fields (Name, Event, Date, ID, Role).
              </p>
            </div>

            <Button variant="accent" onClick={() => setCreateModalOpen(true)} icon={Plus}>
              Create / Upload Template
            </Button>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-72 rounded-2xl skeleton-shimmer border border-[#27272a] p-4" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card className="p-12 text-center space-y-4 animate-scaleIn border-[#27272a] bg-[#121215]">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <LayoutTemplate className="w-8 h-8 text-[#ca0019]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-display">No Templates Uploaded</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto font-sans">
                  Upload an existing certificate image or choose a predefined canvas to begin customizing fields.
                </p>
              </div>
              <Button variant="accent" onClick={() => setCreateModalOpen(true)} icon={Plus}>
                Create / Upload Template
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
              {templates.map((tpl, idx) => (
                <Card
                  key={tpl._id}
                  hoverEffect
                  glowingTop
                  className={`flex flex-col justify-between space-y-4 group animate-slideUp stagger-${(idx % 6) + 1} border-[#27272a] bg-[#121215]`}
                >
                  <div>
                    {/* Visual Preview Box */}
                    <div className="aspect-[842/595] rounded-xl overflow-hidden bg-[#09090b] border border-[#27272a] mb-3.5 relative flex items-center justify-center group/preview">
                      {tpl.backgroundUrl ? (
                        <img src={tpl.backgroundUrl} alt={tpl.name} className="w-full h-full object-cover transition-transform duration-300 group-hover/preview:scale-105" />
                      ) : (
                        <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-[#18181b] to-[#121215] text-gray-200 text-center text-xs border border-[#27272a]">
                          <div className="border border-[#ca0019]/60 rounded-lg h-full p-3 flex flex-col justify-between bg-black/30">
                            <span className="font-extrabold text-[#ef4444] uppercase tracking-wider font-display">{tpl.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">Dynamic Canvas Framework</span>
                          </div>
                        </div>
                      )}

                      {/* Hover Overlay Button */}
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="accent"
                          onClick={() => setEditingTemplate(tpl)}
                          icon={Sparkles}
                        >
                          Open Visual Studio
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-extrabold text-white tracking-tight group-hover:text-[#ef4444] transition-colors font-display">
                          {tpl.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed font-sans">
                          {tpl.description || 'Standard certificate template'}
                        </p>
                      </div>
                      <Badge variant="purple" size="xs">
                        {tpl.fields?.length || 0} fields
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#27272a] flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingTemplate(tpl)}
                      icon={Edit}
                    >
                      Configure Fields
                    </Button>

                    <button
                      onClick={() => handleDeleteTemplate(tpl._id, tpl.name)}
                      className="p-2 text-gray-400 hover:text-[#ef4444] rounded-lg hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Create Template Modal */}
          <Modal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            title="Create Certificate Template"
          >
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Template Name <span className="text-[#ca0019]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Certificate of Excellence, Hackathon Honor"
                  value={newTemplateData.name}
                  onChange={(e) => setNewTemplateData({ ...newTemplateData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Upload Background Design (PNG, JPG, PDF)
                </label>
                <div className="border border-dashed border-[#3f3f46] hover:border-[#ca0019] transition-colors rounded-2xl p-6 text-center bg-[#18181b]/50">
                  <div className="w-10 h-10 rounded-xl bg-white/5 mx-auto flex items-center justify-center text-gray-400 mb-2">
                    <Upload className="w-5 h-5 text-[#ef4444]" />
                  </div>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#ca0019] file:text-white hover:file:bg-[#b91c1c] cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-400 mt-2">
                    Supported: PNG, JPG, or PDF up to 10MB. Leave blank to generate standard canvas.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newTemplateData.description}
                  onChange={(e) => setNewTemplateData({ ...newTemplateData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#27272a]">
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={uploading}>
                  Create & Launch Studio
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
