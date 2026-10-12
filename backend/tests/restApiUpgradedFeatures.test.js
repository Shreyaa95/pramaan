const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getRestRecords,
  testRestConnection
} = require('../services/restApiDataSourceService');

const endpoint = 'http://127.0.0.1:3001/api/integrations/recipients';

function withEnvironment(values, run) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
}

test('POST request with JSON body, custom headers, and query parameters', async () => {
  const originalFetch = global.fetch;
  let capturedUrl = '';
  let capturedOptions = {};

  global.fetch = async (url, options) => {
    capturedUrl = String(url);
    capturedOptions = options;
    return new Response(JSON.stringify({
      data: [
        { id: '101', fullName: 'Alice Walker', mailAddress: 'alice@example.test' }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    await withEnvironment({ NODE_ENV: 'test' }, async () => {
      const records = await getRestRecords({
        connector: 'custom',
        endpoint,
        method: 'POST',
        requestBody: JSON.stringify({ department: 'Engineering', year: 2026 }),
        customHeaders: [
          { key: 'X-Client-App', value: 'PramaanSuite' }
        ],
        queryParams: [
          { key: 'cohort', value: 'alpha' }
        ],
        responsePath: 'data',
        mapping: { idField: 'id', nameField: 'fullName', emailField: 'mailAddress' }
      });

      assert.equal(capturedOptions.method, 'POST');
      assert.equal(capturedOptions.headers['X-Client-App'], 'PramaanSuite');
      assert.equal(capturedOptions.headers['Content-Type'], 'application/json');
      assert.equal(JSON.parse(capturedOptions.body).department, 'Engineering');
      assert.match(capturedUrl, /cohort=alpha/);

      assert.equal(records.length, 1);
      assert.equal(records[0].sourceId, '101');
      assert.equal(records[0].name, 'Alice Walker');
      assert.equal(records[0].email, 'alice@example.test');
      assert.equal(records[0].valid, true);
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('API Key authentication via header (apiKeyHeader)', async () => {
  const originalFetch = global.fetch;
  let capturedHeaders = {};

  global.fetch = async (url, options) => {
    capturedHeaders = options.headers;
    return new Response(JSON.stringify([
      { id: '202', name: 'Bob Dylan', email: 'bob@example.test' }
    ]), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    await withEnvironment({ NODE_ENV: 'test' }, async () => {
      const records = await getRestRecords({
        connector: 'custom',
        endpoint,
        authMode: 'apiKeyHeader',
        apiKeyName: 'X-API-KEY',
        apiKeyValue: 'secret-token-12345',
        mapping: { idField: 'id', nameField: 'name', emailField: 'email' }
      });

      assert.equal(capturedHeaders['X-API-KEY'], 'secret-token-12345');
      assert.equal(records.length, 1);
      assert.equal(records[0].name, 'Bob Dylan');
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('API Key authentication via query parameter (apiKeyQuery)', async () => {
  const originalFetch = global.fetch;
  let capturedUrl = '';

  global.fetch = async (url) => {
    capturedUrl = String(url);
    return new Response(JSON.stringify([
      { id: '303', name: 'Charlie Brown', email: 'charlie@example.test' }
    ]), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    await withEnvironment({ NODE_ENV: 'test' }, async () => {
      const records = await getRestRecords({
        connector: 'custom',
        endpoint,
        authMode: 'apiKeyQuery',
        apiKeyName: 'api_key',
        apiKeyValue: 'token-abc',
        mapping: { idField: 'id', nameField: 'name', emailField: 'email' }
      });

      assert.match(capturedUrl, /api_key=token-abc/);
      assert.equal(records.length, 1);
      assert.equal(records[0].name, 'Charlie Brown');
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('Pagination support traverses multiple pages up to maxPages', async () => {
  const originalFetch = global.fetch;
  const requestedUrls = [];

  global.fetch = async (url) => {
    const urlStr = String(url);
    requestedUrls.push(urlStr);
    const parsed = new URL(urlStr);
    const page = parsed.searchParams.get('page') || '1';

    if (page === '1') {
      return new Response(JSON.stringify({
        items: [
          { id: '1', name: 'Page One User', email: 'p1@example.test' }
        ]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    } else if (page === '2') {
      return new Response(JSON.stringify({
        items: [
          { id: '2', name: 'Page Two User', email: 'p2@example.test' }
        ]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    await withEnvironment({ NODE_ENV: 'test' }, async () => {
      const records = await getRestRecords({
        connector: 'custom',
        endpoint,
        responsePath: 'items',
        pagination: {
          enabled: true,
          type: 'page',
          pageParam: 'page',
          sizeParam: 'limit',
          pageSize: 1,
          maxPages: 2
        },
        mapping: { idField: 'id', nameField: 'name', emailField: 'email' }
      });

      assert.equal(requestedUrls.length, 2);
      assert.equal(records.length, 2);
      assert.equal(records[0].name, 'Page One User');
      assert.equal(records[1].name, 'Page Two User');
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('Actionable error reporting for HTML response from website URL', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => new Response('<!DOCTYPE html><html><body>Error page</body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });

  try {
    await withEnvironment({ NODE_ENV: 'test' }, async () => {
      await assert.rejects(
        getRestRecords({ connector: 'custom', endpoint }),
        error => {
          assert.match(error.message, /HTML web page instead of a JSON/i);
          return true;
        }
      );
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('Actionable error reporting for 404 and 429 status codes', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'content-type': 'application/json' }
  });

  try {
    await withEnvironment({ NODE_ENV: 'test' }, async () => {
      await assert.rejects(
        getRestRecords({ connector: 'custom', endpoint }),
        error => {
          assert.match(error.message, /404 Not Found/i);
          return true;
        }
      );
    });
  } finally {
    global.fetch = originalFetch;
  }

  global.fetch = async () => new Response(JSON.stringify({ error: 'Rate limited' }), {
    status: 429,
    headers: { 'content-type': 'application/json' }
  });

  try {
    await withEnvironment({ NODE_ENV: 'test' }, async () => {
      await assert.rejects(
        getRestRecords({ connector: 'custom', endpoint }),
        error => {
          assert.match(error.message, /rate limit exceeded \(HTTP 429\)/i);
          return true;
        }
      );
    });
  } finally {
    global.fetch = originalFetch;
  }
});
