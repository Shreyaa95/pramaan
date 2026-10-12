import React from 'react';
import { Globe2, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';

export function RestApiConnector({ config, onChange, profiles = [], portfolioConfigured, portfolioApiUrl = '', onTest, onPreview, loading, testState }) {
  const updateMapping = (key, value) => onChange({ ...config, mapping: { ...config.mapping, [key]: value } });
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#12141c] p-5">
      <div className="flex items-start gap-3">
        <Globe2 className="mt-0.5 h-5 w-5 text-sky-300" />
        <div><h3 className="text-sm font-bold text-white">REST API data source</h3><p className="mt-1 text-xs text-gray-400">Connect to an HTTPS JSON API. API endpoints are separate from database connection settings.</p></div>
      </div>
      <label className="block text-xs text-gray-300">Connector
        <select value={config.connector} onChange={event => onChange({ ...config, connector: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white">
          <option value="portfolio" disabled={!portfolioConfigured}>Portfolio Message Box {!portfolioConfigured ? '(backend setup required)' : ''}</option>
          <option value="custom">Other compatible REST API</option>
        </select>
      </label>
      {config.connector === 'portfolio' ? (
        <div className="rounded-lg border border-sky-400/20 bg-sky-500/10 p-3 text-xs text-sky-100">
          <label className="block text-sky-100">Backend-configured endpoint
            <input aria-label="Portfolio REST endpoint URL" readOnly value={portfolioApiUrl} placeholder="Configure PORTFOLIO_INQUIRIES_API_URL in backend/.env" className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#101a27] px-3 py-2 font-mono text-[11px] text-white" />
          </label>
          <p className="mt-2">Fixed field mapping: <code>_id</code> → source ID, <code>name</code> → recipient name, <code>email</code> → recipient email. Message content is not imported or displayed.</p>
          {!portfolioConfigured && <p className="mt-2 text-amber-200">Set PORTFOLIO_INQUIRIES_API_URL and PRAMAAN_INTEGRATION_TOKEN in the backend environment to enable this connector.</p>}
        </div>
      ) : (
        <>
          <label className="block text-xs text-gray-300">Endpoint URL
            <input type="url" value={config.endpoint} onChange={event => onChange({ ...config, endpoint: event.target.value })} placeholder="https://api.example.com/recipients" className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white" />
          </label>
          <label className="block text-xs text-gray-300">Backend authentication profile
            <select value={config.authProfile} onChange={event => onChange({ ...config, authProfile: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white">
              {profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label} ({profile.type})</option>)}
            </select>
          </label>
          <p className="flex items-start gap-2 text-[11px] text-gray-400"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />Credentials are configured in the PRAMAAN backend environment. They are never entered or returned by this screen.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-gray-300">Response array path
              <input value={config.responsePath} onChange={event => onChange({ ...config, responsePath: event.target.value })} placeholder="data.records (blank if root array)" className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white" />
            </label>
            {['idField', 'nameField', 'emailField'].map((field) => <label key={field} className="text-xs text-gray-300">{field === 'idField' ? 'Source ID field' : field === 'nameField' ? 'Recipient name field' : 'Recipient email field'}
              <input value={config.mapping[field]} onChange={event => updateMapping(field, event.target.value)} placeholder={field === 'idField' ? '_id' : field === 'nameField' ? 'name' : 'email'} className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white" />
            </label>)}
          </div>
        </>
      )}
      {testState && <p role="status" className={`text-xs ${testState.error ? 'text-rose-300' : 'text-emerald-300'}`}>{testState.error || testState.message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onTest} loading={loading} disabled={config.connector === 'portfolio' && !portfolioConfigured}>Test connection</Button>
        <Button variant="primary" onClick={onPreview} loading={loading} disabled={config.connector === 'portfolio' && !portfolioConfigured}>Load recipient preview</Button>
      </div>
    </div>
  );
}
