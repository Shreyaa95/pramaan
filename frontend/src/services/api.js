const getApiBase = () => {
  if (import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location.port && window.location.port !== '5000' && window.location.port !== '3000') {
    return `http://${window.location.hostname || 'localhost'}:5000/api`;
  }
  return '/api';
};

const API_BASE = getApiBase();

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? (sessionStorage.getItem('smartcert_token') || localStorage.getItem('smartcert_token')) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function doFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (
      err.name === 'TypeError' ||
      err.message?.toLowerCase().includes('failed to fetch') ||
      err.message?.toLowerCase().includes('networkerror') ||
      err.message?.toLowerCase().includes('load failed')
    ) {
      throw new Error(
        'Unable to connect to PRAMAAN backend server. Please verify the backend is running on http://localhost:5000 (run "npm start" or "npm run dev").'
      );
    }
    throw err;
  }
}

async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    return data;
  }
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}`);
  }
  return response;
}

export const api = {
  // Auth
  async login(email, password) {
    const res = await doFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await doFetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Events
  async getEvents() {
    const res = await doFetch(`${API_BASE}/events`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getEvent(id) {
    const res = await doFetch(`${API_BASE}/events/${id}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async createEvent(eventData) {
    const res = await doFetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(eventData)
    });
    return handleResponse(res);
  },

  async updateEvent(id, eventData) {
    const res = await doFetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(eventData)
    });
    return handleResponse(res);
  },

  async deleteEvent(id) {
    const res = await doFetch(`${API_BASE}/events/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Templates
  async getTemplates() {
    const res = await doFetch(`${API_BASE}/templates`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getTemplate(id) {
    const res = await doFetch(`${API_BASE}/templates/${id}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async uploadTemplateBackground(file) {
    const formData = new FormData();
    formData.append('templateFile', file);
    const res = await doFetch(`${API_BASE}/templates/upload-background`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData
    });
    return handleResponse(res);
  },

  async createTemplate(templateData) {
    const res = await doFetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(templateData)
    });
    return handleResponse(res);
  },

  async updateTemplate(id, templateData) {
    const res = await doFetch(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(templateData)
    });
    return handleResponse(res);
  },

  async deleteTemplate(id) {
    const res = await doFetch(`${API_BASE}/templates/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // Recipients
  async getRecipients(eventId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await doFetch(`${API_BASE}/recipients/event/${eventId}${query ? `?${query}` : ''}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async parseDataFile(file) {
    const formData = new FormData();
    formData.append('dataFile', file);
    const res = await doFetch(`${API_BASE}/recipients/parse-file`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData
    });
    return handleResponse(res);
  },

  async importMappedData(eventId, rows, mapping, sourceFileName = '') {
    const res = await doFetch(`${API_BASE}/recipients/import-mapped-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ eventId, rows, mapping, sourceFileName })
    });
    return handleResponse(res);
  },

  async importMongoRecipients(data) {
    const res = await doFetch(`${API_BASE}/recipients/import-mongo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getRestSourceConfig() {
    const res = await doFetch(`${API_BASE}/datasource/rest-config`, { headers: { ...getAuthHeader() } });
    return handleResponse(res);
  },

  async testRestSource(config) {
    const res = await doFetch(`${API_BASE}/datasource/rest-test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(config)
    });
    return handleResponse(res);
  },

  async previewRestSource(config) {
    const res = await doFetch(`${API_BASE}/datasource/rest-preview`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(config)
    });
    return handleResponse(res);
  },

  async previewMongoSource(config) {
    const res = await doFetch(`${API_BASE}/datasource/mongo-preview`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(config)
    });
    return handleResponse(res);
  },

  async importRestRecipients(eventId, source, selectedIds) {
    const res = await doFetch(`${API_BASE}/recipients/import-rest`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify({ eventId, source, selectedIds })
    });
    return handleResponse(res);
  },

  async deleteRecipient(id) {
    const res = await doFetch(`${API_BASE}/recipients/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async clearEventRecipients(eventId) {
    const res = await doFetch(`${API_BASE}/recipients/event/${eventId}/clear`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // MongoDB DataSource Inspection
  async testMongoConnection() {
    const res = await doFetch(`${API_BASE}/datasource/test-mongo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({})
    });
    return handleResponse(res);
  },

  async listMongoCollections(dbName) {
    const res = await doFetch(`${API_BASE}/datasource/list-collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ dbName })
    });
    return handleResponse(res);
  },

  async sampleMongoData(dbName, collectionName) {
    const res = await doFetch(`${API_BASE}/datasource/sample-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ dbName, collectionName })
    });
    return handleResponse(res);
  },

  // Certificates
  async validateCertificates(eventId) {
    const res = await doFetch(`${API_BASE}/certificates/validate/${eventId}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async generateBulkCertificates(eventId, options = {}) {
    const res = await doFetch(`${API_BASE}/certificates/generate-bulk/${eventId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(options)
    });
    return handleResponse(res);
  },

  async generateSingleCertificate(recipientId, eventId) {
    const res = await doFetch(`${API_BASE}/certificates/generate-single/${recipientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ eventId })
    });
    return handleResponse(res);
  },

  async getCertificates(eventId) {
    const res = await doFetch(`${API_BASE}/certificates/event/${eventId}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async previewSampleCertificate(template, sampleData = null, eventId = null, recipientId = null) {
    const res = await doFetch(`${API_BASE}/certificates/preview-sample`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ template, sampleData, eventId, recipientId })
    });
    return handleResponse(res);
  },

  async getPublicCertificate(certificateId) {
    const res = await doFetch(`${API_BASE}/certificates/public/${certificateId}`);
    return handleResponse(res);
  },

  // Email Delivery
  async sendBulkEmails(eventId, options = {}) {
    const isForce = typeof options === 'boolean'
      ? options
      : Boolean(options && typeof options === 'object' && options.force === true);
    const cleanPayload = { force: isForce };
    const res = await doFetch(`${API_BASE}/email/send-bulk/${encodeURIComponent(String(eventId))}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(cleanPayload)
    });
    return handleResponse(res);
  },

  async sendRecipientEmail(recipientId) {
    const cleanId = typeof recipientId === 'string'
      ? recipientId
      : (recipientId && typeof recipientId === 'object' ? (recipientId._id || recipientId.recipientId) : String(recipientId || ''));
    const res = await doFetch(`${API_BASE}/email/send-recipient/${encodeURIComponent(String(cleanId))}`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async retryFailedEmails(eventId) {
    const res = await doFetch(`${API_BASE}/email/retry-failed/${eventId}`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async retrySingleEmail(deliveryId) {
    const res = await doFetch(`${API_BASE}/email/retry-single/${deliveryId}`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getEmailLogs(eventId) {
    const res = await doFetch(`${API_BASE}/email/logs/${eventId}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getSmtpSettings() {
    const res = await doFetch(`${API_BASE}/email/settings`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async updateSmtpSettings(settings) {
    const cleanSettings = {
      host: String(settings.host || '').trim(),
      port: Number(settings.port) || 587,
      secure: Boolean(settings.secure),
      user: String(settings.user || '').trim(),
      pass: String(settings.pass || '').trim(),
      senderEmail: String(settings.senderEmail || '').trim(),
      senderName: String(settings.senderName || '').trim()
    };
    const res = await doFetch(`${API_BASE}/email/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(cleanSettings)
    });
    return handleResponse(res);
  },

  async resetSmtpSettings() {
    const res = await doFetch(`${API_BASE}/email/settings`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async verifySmtp(config) {
    const res = await doFetch(`${API_BASE}/email/verify-smtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(config)
    });
    return handleResponse(res);
  },

  // Dashboard
  async getDashboardStats() {
    const res = await doFetch(`${API_BASE}/dashboard/stats`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  }
};
