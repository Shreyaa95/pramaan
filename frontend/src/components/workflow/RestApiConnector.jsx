import React, { useState } from 'react';
import { Globe2, ShieldCheck, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';

export function RestApiConnector({
  config,
  onChange,
  profiles = [],
  portfolioConfigured,
  portfolioApiUrl = '',
  onTest,
  onPreview,
  loading,
  testState
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateMapping = (key, value) => onChange({ ...config, mapping: { ...config.mapping, [key]: value } });

  const addHeader = () => {
    const list = Array.isArray(config.customHeaders) ? [...config.customHeaders] : [];
    onChange({ ...config, customHeaders: [...list, { key: '', value: '' }] });
  };

  const updateHeader = (index, field, val) => {
    const list = Array.isArray(config.customHeaders) ? [...config.customHeaders] : [];
    list[index] = { ...list[index], [field]: val };
    onChange({ ...config, customHeaders: list });
  };

  const removeHeader = (index) => {
    const list = Array.isArray(config.customHeaders) ? [...config.customHeaders] : [];
    onChange({ ...config, customHeaders: list.filter((_, i) => i !== index) });
  };

  const addQueryParam = () => {
    const list = Array.isArray(config.queryParams) ? [...config.queryParams] : [];
    onChange({ ...config, queryParams: [...list, { key: '', value: '' }] });
  };

  const updateQueryParam = (index, field, val) => {
    const list = Array.isArray(config.queryParams) ? [...config.queryParams] : [];
    list[index] = { ...list[index], [field]: val };
    onChange({ ...config, queryParams: list });
  };

  const removeQueryParam = (index) => {
    const list = Array.isArray(config.queryParams) ? [...config.queryParams] : [];
    onChange({ ...config, queryParams: list.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#12141c] p-5">
      <div className="flex items-start gap-3">
        <Globe2 className="mt-0.5 h-5 w-5 text-sky-300" />
        <div>
          <h3 className="text-sm font-bold text-white">REST API data source</h3>
          <p className="mt-1 text-xs text-gray-400">Connect to an authorized JSON API endpoint to fetch recipients.</p>
        </div>
      </div>

      <label className="block text-xs text-gray-300">Connector Mode
        <select
          value={config.connector}
          onChange={event => onChange({ ...config, connector: event.target.value })}
          className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs"
        >
          <option value="portfolio" disabled={!portfolioConfigured}>Portfolio Inquiries {!portfolioConfigured ? '(backend setup required)' : ''}</option>
          <option value="custom">Authorized REST API Endpoint</option>
        </select>
      </label>

      {config.connector === 'portfolio' ? (
        <div className="rounded-lg border border-sky-400/20 bg-sky-500/10 p-3 text-xs text-sky-100">
          <label className="block text-sky-100 font-semibold">Backend-configured endpoint
            <input
              aria-label="Portfolio REST endpoint URL"
              readOnly
              value={portfolioApiUrl}
              placeholder="Configure PORTFOLIO_INQUIRIES_API_URL in backend/.env"
              className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#101a27] px-3 py-2 font-mono text-[11px] text-white"
            />
          </label>
          <p className="mt-2 text-gray-300">Fixed field mapping: <code>_id</code> → source ID, <code>name</code> → recipient name, <code>email</code> → recipient email.</p>
          {!portfolioConfigured && (
            <p className="mt-2 text-amber-200">Set PORTFOLIO_INQUIRIES_API_URL and PRAMAAN_INTEGRATION_TOKEN in the backend environment to enable this connector.</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <label className="block text-xs text-gray-300">Method
                <select
                  value={config.method || 'GET'}
                  onChange={e => onChange({ ...config, method: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </label>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-gray-300">Endpoint URL <span className="text-[#ca0019]">*</span>
                <input
                  type="url"
                  value={config.endpoint || ''}
                  onChange={event => onChange({ ...config, endpoint: event.target.value })}
                  placeholder="https://api.example.com/v1/recipients"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs font-mono"
                />
              </label>
            </div>
          </div>

          {config.method === 'POST' && (
            <div>
              <label className="block text-xs text-gray-300">JSON Request Body (POST)
                <textarea
                  rows={3}
                  value={typeof config.requestBody === 'object' ? JSON.stringify(config.requestBody, null, 2) : (config.requestBody || '')}
                  onChange={e => onChange({ ...config, requestBody: e.target.value })}
                  placeholder={'{\n  "status": "approved",\n  "batch": 2026\n}'}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] p-2 text-white font-mono text-xs"
                />
              </label>
            </div>
          )}

          {/* Authentication Selector */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-300">Authentication Mode
                <select
                  value={config.authMode || (config.authProfile && config.authProfile !== 'none' ? 'profile' : 'none')}
                  onChange={e => onChange({ ...config, authMode: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs"
                >
                  <option value="none">No Authentication</option>
                  <option value="bearer">Bearer Token (Session)</option>
                  <option value="apiKeyHeader">API Key (Custom Header)</option>
                  <option value="apiKeyQuery">API Key (Query Parameter)</option>
                  <option value="profile">Backend Auth Profile</option>
                </select>
              </label>
            </div>

            {config.authMode === 'profile' && (
              <div>
                <label className="block text-xs text-gray-300">Backend Profile
                  <select
                    value={config.authProfile || 'none'}
                    onChange={e => onChange({ ...config, authProfile: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs"
                  >
                    {profiles.map(profile => (
                      <option key={profile.id} value={profile.id}>{profile.label} ({profile.type})</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {config.authMode === 'bearer' && (
              <div>
                <label className="block text-xs text-gray-300">Bearer Token
                  <input
                    type="password"
                    value={config.bearerToken || ''}
                    onChange={e => onChange({ ...config, bearerToken: e.target.value })}
                    placeholder="Enter Bearer token"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs font-mono"
                  />
                </label>
              </div>
            )}

            {(config.authMode === 'apiKeyHeader' || config.authMode === 'apiKeyQuery') && (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs text-gray-300">{config.authMode === 'apiKeyHeader' ? 'Header Name' : 'Query Parameter Name'}
                  <input
                    type="text"
                    value={config.apiKeyName || (config.authMode === 'apiKeyHeader' ? 'X-API-Key' : 'api_key')}
                    onChange={e => onChange({ ...config, apiKeyName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs font-mono"
                  />
                </label>
                <label className="block text-xs text-gray-300">API Key Secret
                  <input
                    type="password"
                    value={config.apiKeyValue || ''}
                    onChange={e => onChange({ ...config, apiKeyValue: e.target.value })}
                    placeholder="Enter API Key"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs font-mono"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Response Array & Mapping */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <label className="block text-xs text-gray-300">Response Array Path
                <input
                  value={config.responsePath || ''}
                  onChange={e => onChange({ ...config, responsePath: e.target.value })}
                  placeholder="data or results"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs font-mono"
                />
              </label>
            </div>
            {['idField', 'nameField', 'emailField'].map((field) => (
              <div key={field} className="sm:col-span-1">
                <label className="block text-xs text-gray-300">
                  {field === 'idField' ? 'Recipient ID Field' : field === 'nameField' ? 'Name Field' : 'Email Field'}
                  <input
                    value={config.mapping?.[field] || ''}
                    onChange={e => updateMapping(field, e.target.value)}
                    placeholder={field === 'idField' ? '_id' : field === 'nameField' ? 'name' : 'email'}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#181b26] px-3 py-2 text-white text-xs font-mono"
                  />
                </label>
              </div>
            ))}
          </div>

          {/* Collapsible Headers, Query Params & Pagination */}
          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAdvanced ? 'Hide Advanced Options (Headers, Parameters, Pagination)' : 'Show Advanced Options (Headers, Parameters, Pagination)'}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 rounded-xl border border-white/5 bg-[#0f1118] p-4 text-xs">
                {/* Additional Query Parameters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-300">Additional Query Parameters</span>
                    <button type="button" onClick={addQueryParam} className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300">
                      <Plus className="h-3 w-3" /> Add Parameter
                    </button>
                  </div>
                  {Array.isArray(config.queryParams) && config.queryParams.map((param, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        placeholder="Key (e.g. status)"
                        value={param.key}
                        onChange={e => updateQueryParam(idx, 'key', e.target.value)}
                        className="w-1/2 rounded border border-white/10 bg-[#181b26] px-2.5 py-1.5 text-white text-xs"
                      />
                      <input
                        placeholder="Value (e.g. active)"
                        value={param.value}
                        onChange={e => updateQueryParam(idx, 'value', e.target.value)}
                        className="w-1/2 rounded border border-white/10 bg-[#181b26] px-2.5 py-1.5 text-white text-xs"
                      />
                      <button type="button" onClick={() => removeQueryParam(idx)} className="text-rose-400 hover:text-rose-300 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {(!config.queryParams || config.queryParams.length === 0) && (
                    <p className="text-[11px] text-gray-500 italic">No custom query parameters added.</p>
                  )}
                </div>

                {/* Additional Headers */}
                <div className="border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-300">Additional Request Headers</span>
                    <button type="button" onClick={addHeader} className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300">
                      <Plus className="h-3 w-3" /> Add Header
                    </button>
                  </div>
                  {Array.isArray(config.customHeaders) && config.customHeaders.map((hdr, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        placeholder="Header (e.g. X-Tenant-Id)"
                        value={hdr.key}
                        onChange={e => updateHeader(idx, 'key', e.target.value)}
                        className="w-1/2 rounded border border-white/10 bg-[#181b26] px-2.5 py-1.5 text-white text-xs"
                      />
                      <input
                        placeholder="Value"
                        value={hdr.value}
                        onChange={e => updateHeader(idx, 'value', e.target.value)}
                        className="w-1/2 rounded border border-white/10 bg-[#181b26] px-2.5 py-1.5 text-white text-xs"
                      />
                      <button type="button" onClick={() => removeHeader(idx)} className="text-rose-400 hover:text-rose-300 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {(!config.customHeaders || config.customHeaders.length === 0) && (
                    <p className="text-[11px] text-gray-500 italic">No custom headers added.</p>
                  )}
                </div>

                {/* Pagination */}
                <div className="border-t border-white/5 pt-3">
                  <label className="flex items-center gap-2 text-gray-300 font-semibold mb-2">
                    <input
                      type="checkbox"
                      checked={Boolean(config.pagination?.enabled)}
                      onChange={e => onChange({
                        ...config,
                        pagination: {
                          ...config.pagination,
                          enabled: e.target.checked,
                          type: config.pagination?.type || 'page',
                          pageParam: config.pagination?.pageParam || 'page',
                          limitParam: config.pagination?.limitParam || 'pageSize',
                          pageSize: config.pagination?.pageSize || 50,
                          maxPages: config.pagination?.maxPages || 5
                        }
                      })}
                      className="rounded accent-[#ca0019]"
                    />
                    Enable API Pagination (Bounded to max 5,000 records)
                  </label>

                  {config.pagination?.enabled && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <label className="text-[11px] text-gray-400">Type
                        <select
                          value={config.pagination?.type || 'page'}
                          onChange={e => onChange({ ...config, pagination: { ...config.pagination, type: e.target.value } })}
                          className="mt-1 w-full rounded border border-white/10 bg-[#181b26] p-1.5 text-white text-xs"
                        >
                          <option value="page">Page number</option>
                          <option value="offset">Offset</option>
                        </select>
                      </label>
                      <label className="text-[11px] text-gray-400">Page/Offset Param
                        <input
                          value={config.pagination?.type === 'offset' ? (config.pagination?.offsetParam || 'offset') : (config.pagination?.pageParam || 'page')}
                          onChange={e => onChange({
                            ...config,
                            pagination: {
                              ...config.pagination,
                              [config.pagination?.type === 'offset' ? 'offsetParam' : 'pageParam']: e.target.value
                            }
                          })}
                          className="mt-1 w-full rounded border border-white/10 bg-[#181b26] p-1.5 text-white text-xs"
                        />
                      </label>
                      <label className="text-[11px] text-gray-400">Page Size
                        <input
                          type="number"
                          value={config.pagination?.pageSize || 50}
                          onChange={e => onChange({ ...config, pagination: { ...config.pagination, pageSize: Number(e.target.value) } })}
                          className="mt-1 w-full rounded border border-white/10 bg-[#181b26] p-1.5 text-white text-xs"
                        />
                      </label>
                      <label className="text-[11px] text-gray-400">Max Pages (Cap: 20)
                        <input
                          type="number"
                          value={config.pagination?.maxPages || 5}
                          onChange={e => onChange({ ...config, pagination: { ...config.pagination, maxPages: Number(e.target.value) } })}
                          className="mt-1 w-full rounded border border-white/10 bg-[#181b26] p-1.5 text-white text-xs"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="flex items-start gap-2 text-[11px] text-gray-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
            Sensitive parameters are processed exclusively on the backend and are never logged or exposed in client responses.
          </p>
        </>
      )}

      {testState && (
        <p role="status" className={`text-xs ${testState.error ? 'text-rose-300' : 'text-emerald-300'}`}>
          {testState.error || testState.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="secondary" onClick={onTest} loading={loading} disabled={config.connector === 'portfolio' && !portfolioConfigured}>
          Test connection
        </Button>
        <Button variant="primary" onClick={onPreview} loading={loading} disabled={config.connector === 'portfolio' && !portfolioConfigured}>
          Load recipient preview
        </Button>
      </div>
    </div>
  );
}
