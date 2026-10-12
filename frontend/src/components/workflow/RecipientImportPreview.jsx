import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';

export function RecipientImportPreview({ records = [], selectedIds = [], onSelectionChange, onConfirm, loading = false, confirmLabel = 'Import selected recipients' }) {
  const selectable = records.filter(record => record.selectable);
  const selected = new Set(selectedIds);
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange([...next]);
  };
  const toggleAll = () => onSelectionChange(selected.size === selectable.length ? [] : selectable.map(record => record.sourceId));
  const invalidCount = records.filter(record => !record.valid).length;
  const duplicateCount = records.filter(record => record.duplicate).length;

  return (
    <section className="space-y-3" aria-label="Recipient preview">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#161822] p-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-gray-300">
          <span>{records.length} records</span>
          <span className="text-emerald-300">{selectable.length} available</span>
          {invalidCount > 0 && <span className="text-amber-300">{invalidCount} invalid</span>}
          {duplicateCount > 0 && <span className="text-amber-300">{duplicateCount} duplicates</span>}
        </div>
        <button type="button" onClick={toggleAll} disabled={!selectable.length} className="text-[#ff7184] hover:text-white disabled:opacity-40">
          {selected.size === selectable.length && selectable.length ? 'Clear selection' : 'Select all available'}
        </button>
      </div>

      {(invalidCount > 0 || duplicateCount > 0) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Invalid and duplicate records are disabled. Existing recipients will be preserved.</span>
        </div>
      )}

      <div className="max-h-80 overflow-auto rounded-xl border border-white/10 bg-[#0d0f15]">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#141620] text-gray-400">
            <tr><th className="p-3">Select</th><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300">
            {records.map(record => (
              <tr key={record.sourceId} className="hover:bg-white/5">
                <td className="p-3"><input type="checkbox" aria-label={`Select ${record.name || 'recipient'}`} disabled={!record.selectable} checked={selected.has(record.sourceId)} onChange={() => toggle(record.sourceId)} /></td>
                <td className="p-3 font-semibold text-white">{record.name || '—'}</td>
                <td className="p-3 font-mono">{record.email || '—'}</td>
                <td className="p-3">
                  {record.selectable ? <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Ready</span> : <span className="text-amber-300">{record.error || record.duplicateReason || 'Unavailable'}</span>}
                </td>
              </tr>
            ))}
            {!records.length && <tr><td colSpan="4" className="p-6 text-center text-gray-500">No records to preview.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
        <p className="text-xs text-gray-400">{selected.size} selected. Import only adds recipients; certificates and emails are separate steps.</p>
        <Button variant="primary" onClick={onConfirm} loading={loading} disabled={!selected.size || loading}>{confirmLabel}</Button>
      </div>
    </section>
  );
}
