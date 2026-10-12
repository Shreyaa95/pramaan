import React from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';

export function DatabaseConnector({ configured, connected, dbName, collections, collectionName, fields, onConnect, onDbChange, onCollectionChange, onPreview, loading, testState }) {
  if (!configured) return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 text-sm text-amber-100">
      <div className="flex items-center gap-2 font-bold"><Database className="h-5 w-5" /> Direct database connector is not configured</div>
      <p className="mt-2 text-xs leading-relaxed">An administrator must configure EXTERNAL_MONGODB_URI in the PRAMAAN backend environment and restart the backend. This is separate from PRAMAAN’s own MONGODB_URI. Do not enter database credentials here.</p>
    </div>
  );
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#12141c] p-5">
      <div className="flex items-start gap-3"><Database className="mt-0.5 h-5 w-5 text-blue-300" /><div><h3 className="text-sm font-bold text-white">Backend-configured MongoDB source</h3><p className="mt-1 text-xs text-gray-400">Credentials stay in the backend environment; this workflow selects only a database and collection.</p></div></div>
      <p className="flex items-start gap-2 text-[11px] text-gray-400"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />No connection string or password is sent through the browser.</p>
      {testState && <p role="status" className={`text-xs ${testState.error ? 'text-rose-300' : 'text-emerald-300'}`}>{testState.error || testState.message}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-xs text-gray-300">Database
          <input value={dbName} onChange={event => onDbChange(event.target.value)} placeholder="Database name" className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white" />
        </label>
        <Button variant="secondary" onClick={onConnect} loading={loading}>{connected ? 'Refresh connection' : 'Test connection'}</Button>
      </div>
      {connected && (
        <>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs text-gray-300">Collection</label>
              {collections.length > 0 && (
                <button
                  type="button"
                  onClick={() => onCollectionChange('')}
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                >
                  Type manually
                </button>
              )}
            </div>
            {collections.length > 0 ? (
              <select
                value={collectionName}
                onChange={event => onCollectionChange(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs"
              >
                <option value="">Choose collection</option>
                {collections.map(collection => (
                  <option key={collection} value={collection}>{collection}</option>
                ))}
              </select>
            ) : (
              <input
                value={collectionName}
                onChange={event => onCollectionChange(event.target.value)}
                placeholder="Enter authorized collection name"
                className="w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs"
              />
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            Available fields: {fields.length > 0 ? fields.join(', ') : 'Select or specify a collection to discover schema.'}
          </p>
          <Button variant="primary" onClick={onPreview} loading={loading} disabled={!collectionName?.trim()}>
            Preview recipients
          </Button>
        </>
      )}
    </div>
  );
}
