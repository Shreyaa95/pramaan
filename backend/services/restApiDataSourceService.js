const dns = require('dns').promises;
const net = require('net');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10000;

function getAuthProfiles() {
  let profiles = {};
  try {
    profiles = JSON.parse(process.env.REST_API_AUTH_PROFILES_JSON || '{}');
  } catch {
    throw new Error('REST API authentication profiles are not valid server configuration.');
  }
  if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles)) {
    throw new Error('REST API authentication profiles are not valid server configuration.');
  }
  return profiles;
}

function usableAuthProfiles() {
  return Object.values(getAuthProfiles()).filter(profile => ['bearer', 'apiKey', 'basic'].includes(profile?.type));
}

function listAuthProfiles() {
  return usableAuthProfiles().map((profile, index) => ({
    id: `profile-${index + 1}`,
    label: `Backend profile ${index + 1}`,
    type: profile.type
  }));
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    return lower === '::' || lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') ||
      lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb') ||
      lower.startsWith('::ffff:127.') || lower.startsWith('::ffff:10.') || lower.startsWith('::ffff:192.168.');
  }
  return true;
}

async function validateEndpoint(endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('Enter a valid REST API endpoint URL.'); }
  if (url.username || url.password || url.hash) throw new Error('Endpoint URLs cannot contain credentials or fragments.');
  if ([...url.searchParams.keys()].some(key => /token|secret|password|api[-_]?key|auth/i.test(key))) {
    throw new Error('Do not put credentials in REST endpoint query parameters. Configure a backend authentication profile.');
  }
  const localDevelopment = ['development', 'test'].includes(process.env.NODE_ENV) && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(localDevelopment && url.protocol === 'http:')) {
    throw new Error('REST API endpoints must use HTTPS. HTTP is allowed only for local development endpoints.');
  }
  const configuredHosts = (process.env.REST_API_ALLOWED_HOSTS || '').split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
  const portfolioHost = process.env.PORTFOLIO_INQUIRIES_API_URL ? new URL(process.env.PORTFOLIO_INQUIRIES_API_URL).hostname.toLowerCase() : '';
  const hostAllowed = localDevelopment || configuredHosts.includes(url.hostname.toLowerCase()) || url.hostname.toLowerCase() === portfolioHost;
  if (!hostAllowed) throw new Error('This REST API host is not in the backend allow-list.');
  if (net.isIP(url.hostname)) {
    if (!localDevelopment && isPrivateAddress(url.hostname)) throw new Error('Private network endpoints are not allowed.');
  } else if (!localDevelopment) {
    const addresses = await dns.lookup(url.hostname, { all: true }).catch(() => []);
    if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) {
      throw new Error('REST API host could not be safely resolved.');
    }
  }
  return url;
}

function makeHeaders(profileId, isPortfolio = false) {
  const headers = { Accept: 'application/json' };
  if (isPortfolio) {
    const token = process.env.PRAMAAN_INTEGRATION_TOKEN;
    if (!token?.trim()) throw new Error('Portfolio integration is not configured on the PRAMAAN backend.');
    headers.Authorization = `Bearer ${token}`;
    return headers;
  }
  if (!profileId || profileId === 'none') return headers;
  const match = /^profile-(\d{1,3})$/.exec(profileId);
  const profile = match ? usableAuthProfiles()[Number(match[1]) - 1] : null;
  if (!profile || !profile.type) throw new Error('Select a valid backend-configured authentication profile.');
  if (profile.type === 'bearer' && profile.token) headers.Authorization = `Bearer ${profile.token}`;
  else if (profile.type === 'apiKey' && /^[A-Za-z0-9-]{1,80}$/.test(profile.name || '') && profile.value) headers[profile.name] = profile.value;
  else if (profile.type === 'basic' && profile.username && profile.password) {
    headers.Authorization = `Basic ${Buffer.from(`${profile.username}:${profile.password}`).toString('base64')}`;
  } else throw new Error('The selected REST API authentication profile is incomplete.');
  return headers;
}

function pathValue(value, path) {
  if (!path) return value;
  return path.split('.').reduce((current, key) => current == null ? undefined : current[key], value);
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

async function fetchJson(endpoint, profileId, isPortfolio = false) {
  const url = await validateEndpoint(endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: makeHeaders(profileId, isPortfolio), signal: controller.signal, redirect: 'error' });
    if (response.status === 401 || response.status === 403) throw new Error(isPortfolio
      ? 'The portfolio API rejected authentication. Check that PRAMAAN_INTEGRATION_TOKEN matches the portfolio server token.'
      : 'The source API rejected authentication. Check its backend authentication profile.');
    if (!response.ok) throw new Error(`The source API returned HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) throw new Error('The source API did not return JSON.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('The source API returned an empty response.');
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error('The source API response exceeds the 5 MB limit.'); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    try { return JSON.parse(bytes.toString('utf8')); } catch { throw new Error('The source API returned invalid JSON.'); }
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The source API request timed out.');
    if (error.message?.startsWith('The source API') || error.message?.startsWith('The portfolio API') || error.message?.startsWith('REST API') || error.message?.startsWith('Select ') || error.message?.startsWith('Portfolio ') || error.message?.startsWith('Private ')) throw error;
    throw new Error('Could not connect to the source API. Check the endpoint and backend network access.');
  } finally { clearTimeout(timer); }
}

function normalizeRecords(payload, mapping = {}, responsePath = '') {
  const rows = pathValue(payload, responsePath);
  if (!Array.isArray(rows)) throw new Error('The source response does not contain an array at the configured response path.');
  if (rows.length > 5000) throw new Error('The source API returned more than 5,000 records. Narrow the source query.');
  const seenIds = new Set();
  const seenEmails = new Set();
  return rows.map((row, index) => {
    const sourceId = cleanText(pathValue(row, mapping.idField || '_id'), 200);
    const name = cleanText(pathValue(row, mapping.nameField || 'name'), 120);
    const email = cleanText(pathValue(row, mapping.emailField || 'email'), 254).toLowerCase();
    let error = '';
    if (!sourceId) error = 'Missing source record ID';
    else if (!name) error = 'Missing recipient name';
    else if (!EMAIL_REGEX.test(email)) error = 'Invalid email address';
    else if (seenIds.has(sourceId)) error = 'Duplicate source record ID in response';
    else if (seenEmails.has(email)) error = 'Duplicate email address in response';
    if (sourceId) seenIds.add(sourceId);
    if (email) seenEmails.add(email);
    const duplicateReason = error?.startsWith('Duplicate ') ? error : '';
    return { sourceId: sourceId || `invalid-${index}`, name, email, valid: !error, error, duplicate: Boolean(duplicateReason), duplicateReason };
  });
}

async function getPortfolioInquiries() {
  const endpoint = process.env.PORTFOLIO_INQUIRIES_API_URL;
  if (!endpoint) throw new Error('Portfolio connector is not configured on the PRAMAAN backend.');
  const payload = await fetchJson(endpoint, null, true);
  return normalizeRecords(payload, { idField: '_id', nameField: 'name', emailField: 'email' }, 'inquiries');
}

async function getRestRecords(config) {
  if (config.connector === 'portfolio') return getPortfolioInquiries();
  const payload = await fetchJson(config.endpoint, config.authProfile || 'none');
  return normalizeRecords(payload, config.mapping || {}, config.responsePath || '');
}

async function testRestConnection(config) {
  const records = await getRestRecords(config);
  return { success: true, total: records.length, validCount: records.filter(row => row.valid).length };
}

module.exports = { getAuthProfiles, listAuthProfiles, getPortfolioInquiries, getRestRecords, testRestConnection, validateEndpoint };
