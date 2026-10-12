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

function makeHeaders(config = {}, isPortfolio = false) {
  const headers = { Accept: 'application/json' };
  if (isPortfolio) {
    const token = process.env.PRAMAAN_INTEGRATION_TOKEN;
    if (!token?.trim()) throw new Error('Portfolio integration is not configured on the PRAMAAN backend.');
    headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  const authMode = config.authMode || (config.authProfile && config.authProfile !== 'none' ? 'profile' : 'none');

  if (authMode === 'profile' && config.authProfile && config.authProfile !== 'none') {
    const match = /^profile-(\d{1,3})$/.exec(config.authProfile);
    const profile = match ? usableAuthProfiles()[Number(match[1]) - 1] : null;
    if (!profile || !profile.type) throw new Error('Select a valid backend-configured authentication profile.');
    if (profile.type === 'bearer' && profile.token) headers.Authorization = `Bearer ${profile.token}`;
    else if (profile.type === 'apiKey' && /^[A-Za-z0-9-]{1,80}$/.test(profile.name || '') && profile.value) headers[profile.name] = profile.value;
    else if (profile.type === 'basic' && profile.username && profile.password) {
      headers.Authorization = `Basic ${Buffer.from(`${profile.username}:${profile.password}`).toString('base64')}`;
    } else throw new Error('The selected REST API authentication profile is incomplete.');
  } else if (authMode === 'bearer') {
    if (config.bearerToken) {
      const cleanToken = String(config.bearerToken).trim();
      if (cleanToken) headers.Authorization = `Bearer ${cleanToken}`;
    }
  } else if (authMode === 'apiKeyHeader') {
    const keyName = String(config.apiKeyName || 'X-API-Key').trim();
    const keyValue = String(config.apiKeyValue || '').trim();
    if (keyName && keyValue) {
      if (!/^[A-Za-z0-9-_]{1,80}$/.test(keyName)) {
        throw new Error('Invalid API Key header name. Must be alphanumeric or hyphens/underscores.');
      }
      headers[keyName] = keyValue;
    }
  }

  // Additional user-configured custom headers
  if (Array.isArray(config.customHeaders)) {
    for (const h of config.customHeaders) {
      if (h && typeof h.key === 'string' && typeof h.value === 'string') {
        const k = h.key.trim();
        const v = h.value.trim();
        if (k && /^[A-Za-z0-9-_]{1,80}$/.test(k) && !/^authorization$/i.test(k)) {
          headers[k] = v;
        }
      }
    }
  }

  return headers;
}

function pathValue(value, path) {
  if (!path || !path.trim()) return value;
  const parts = path.trim().split('.');
  let current = value;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function buildRequestUrl(rawEndpoint, queryParams = [], authMode = 'none', apiKeyName = '', apiKeyValue = '') {
  const url = new URL(rawEndpoint);

  // Append user-configured query parameters
  if (Array.isArray(queryParams)) {
    for (const p of queryParams) {
      if (p && typeof p.key === 'string' && p.key.trim()) {
        url.searchParams.append(p.key.trim(), String(p.value || '').trim());
      }
    }
  }

  // Append query-based API key if specified
  if (authMode === 'apiKeyQuery' && apiKeyName?.trim() && apiKeyValue?.trim()) {
    url.searchParams.set(apiKeyName.trim(), apiKeyValue.trim());
  }

  return url;
}

async function fetchSinglePage(url, options, isPortfolio = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const fetchOptions = {
      method: options.method || 'GET',
      headers: options.headers,
      signal: controller.signal,
      redirect: 'error'
    };

    if (fetchOptions.method === 'POST') {
      fetchOptions.headers['Content-Type'] = 'application/json';
      if (options.body) {
        fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      }
    }

    const response = await fetch(url, fetchOptions);

    if (response.status === 401 || response.status === 403) {
      throw new Error(isPortfolio
        ? 'The portfolio API rejected authentication. Check that PRAMAAN_INTEGRATION_TOKEN matches the portfolio server token.'
        : `The source API rejected authentication (HTTP ${response.status}). Check Bearer token, API key, or backend authentication profile.`);
    }
    if (response.status === 404) {
      throw new Error('API endpoint returned 404 Not Found. Please check the URL path.');
    }
    if (response.status === 429) {
      throw new Error('The source API rate limit exceeded (HTTP 429). Please wait before retrying.');
    }
    if (response.status >= 500) {
      throw new Error(`The source API encountered an upstream error (HTTP ${response.status}).`);
    }
    if (!response.ok) {
      throw new Error(`The source API returned HTTP ${response.status}.`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      if (contentType.toLowerCase().includes('text/html')) {
        throw new Error('The source URL returned an HTML web page instead of a JSON API response. Please verify the API endpoint URL.');
      }
      throw new Error(`The source API did not return JSON (Content-Type: ${contentType}).`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('The source API returned an empty response.');
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('The source API response exceeds the 5 MB limit.');
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    try {
      return JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new Error('The source API returned malformed or invalid JSON.');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The source API request timed out (10s limit).');
    }
    if (error.message?.startsWith('The source') || error.message?.startsWith('Authentication failed') || error.message?.startsWith('API endpoint') || error.message?.startsWith('The portfolio API') || error.message?.startsWith('REST API') || error.message?.startsWith('Private ') || error.message?.startsWith('Enter a valid')) {
      throw error;
    }
    throw new Error('Could not connect to the source API. Check endpoint, SSL/TLS, and backend network access.');
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithPagination(config, isPortfolio = false) {
  const method = config.method === 'POST' ? 'POST' : 'GET';
  const headers = makeHeaders(config, isPortfolio);

  // Validate initial raw endpoint
  await validateEndpoint(config.endpoint);

  const pagination = config.pagination || { enabled: false };
  const maxPages = Math.min(Math.max(1, Number(pagination.maxPages) || 1), 20); // Maximum 20 pages
  const pageSize = Math.min(Math.max(1, Number(pagination.pageSize) || 50), 500);

  let accumulatedRows = [];
  let currentPage = 1;

  while (currentPage <= maxPages) {
    let currentQueryParams = Array.isArray(config.queryParams) ? [...config.queryParams] : [];

    if (pagination.enabled && currentPage > 1) {
      if (pagination.type === 'offset') {
        const offsetParam = pagination.offsetParam || 'offset';
        const limitParam = pagination.limitParam || 'limit';
        currentQueryParams.push({ key: offsetParam, value: String((currentPage - 1) * pageSize) });
        currentQueryParams.push({ key: limitParam, value: String(pageSize) });
      } else {
        const pageParam = pagination.pageParam || 'page';
        const limitParam = pagination.limitParam || 'pageSize';
        currentQueryParams.push({ key: pageParam, value: String(currentPage) });
        currentQueryParams.push({ key: limitParam, value: String(pageSize) });
      }
    } else if (pagination.enabled && currentPage === 1) {
      const limitParam = pagination.limitParam || (pagination.type === 'offset' ? 'limit' : 'pageSize');
      currentQueryParams.push({ key: limitParam, value: String(pageSize) });
    }

    const targetUrl = buildRequestUrl(
      config.endpoint,
      currentQueryParams,
      config.authMode,
      config.apiKeyName,
      config.apiKeyValue
    );

    const payload = await fetchSinglePage(targetUrl, {
      method,
      headers,
      body: method === 'POST' ? config.requestBody : undefined
    }, isPortfolio);

    const rows = pathValue(payload, config.responsePath || '');
    if (!Array.isArray(rows)) {
      if (currentPage === 1) {
        throw new Error(`The source response does not contain an array at response path "${config.responsePath || '(root)'}".`);
      }
      break;
    }

    accumulatedRows.push(...rows);

    // Stop if less than pageSize returned or limit reached
    if (!pagination.enabled || rows.length < pageSize || accumulatedRows.length >= 5000) {
      break;
    }

    currentPage++;
  }

  if (accumulatedRows.length > 5000) {
    accumulatedRows = accumulatedRows.slice(0, 5000);
  }

  return accumulatedRows;
}

function normalizeRecords(rows, mapping = {}) {
  if (!Array.isArray(rows)) {
    throw new Error('The source response does not contain an array of records.');
  }
  if (rows.length > 5000) {
    rows = rows.slice(0, 5000);
  }
  const seenIds = new Set();
  const seenEmails = new Set();
  return rows.map((row, index) => {
    const rawId = pathValue(row, mapping.idField || '_id');
    const rawName = pathValue(row, mapping.nameField || 'name');
    const rawEmail = pathValue(row, mapping.emailField || 'email');

    const sourceId = cleanText(rawId, 200);
    const name = cleanText(rawName, 120);
    const email = cleanText(rawEmail, 254).toLowerCase();

    let error = '';
    if (!sourceId) error = 'Missing recipient ID';
    else if (!name) error = 'Missing recipient name';
    else if (!email) error = 'Missing email address';
    else if (!EMAIL_REGEX.test(email)) error = 'Invalid email address format';
    else if (seenIds.has(sourceId)) error = 'Duplicate recipient ID in source response';
    else if (seenEmails.has(email)) error = 'Duplicate email address in source response';

    if (sourceId) seenIds.add(sourceId);
    if (email) seenEmails.add(email);
    const duplicateReason = error?.startsWith('Duplicate ') ? error : '';
    return {
      sourceId: sourceId || `invalid-${index + 1}`,
      name,
      email,
      valid: !error,
      error,
      duplicate: Boolean(duplicateReason),
      duplicateReason
    };
  });
}

async function getPortfolioInquiries() {
  const endpoint = process.env.PORTFOLIO_INQUIRIES_API_URL;
  if (!endpoint) throw new Error('Portfolio connector is not configured on the PRAMAAN backend.');
  const rows = await fetchJsonWithPagination({ endpoint, responsePath: 'inquiries' }, true);
  return normalizeRecords(rows, { idField: '_id', nameField: 'name', emailField: 'email' });
}

async function getRestRecords(config) {
  if (config.connector === 'portfolio') return getPortfolioInquiries();
  const rows = await fetchJsonWithPagination(config, false);
  return normalizeRecords(rows, config.mapping || {});
}

async function testRestConnection(config) {
  const records = await getRestRecords(config);
  return { success: true, total: records.length, validCount: records.filter(row => row.valid).length };
}

module.exports = {
  getAuthProfiles,
  listAuthProfiles,
  getPortfolioInquiries,
  getRestRecords,
  testRestConnection,
  validateEndpoint,
  buildRequestUrl,
  makeHeaders,
  pathValue,
  normalizeRecords
};
