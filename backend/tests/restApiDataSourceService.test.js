const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const test = require('node:test');
const {
  getRestRecords,
  listAuthProfiles
} = require('../services/restApiDataSourceService');

const endpoint = 'http://127.0.0.1:3001/api/integrations/pramaan/inquiries';

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

test('generic REST connector sends backend Bearer profile and maps inquiries without extra fields', async () => {
  const token = randomBytes(32).toString('base64url');
  let capturedAuthorization = '';
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.equal(String(url), endpoint);
    capturedAuthorization = options.headers.Authorization;
    return new Response(JSON.stringify({
      inquiries: [
        { _id: 'synthetic-1', name: '  Ada   Lovelace ', email: ' ADA@example.test ', message: 'must not be mapped' },
        { _id: 'synthetic-2', name: 'Grace Hopper', email: 'grace@example.test', message: 'also omitted' }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    await withEnvironment({
      NODE_ENV: 'test',
      REST_API_AUTH_PROFILES_JSON: JSON.stringify({ portfolioTest: { type: 'bearer', token } })
    }, async () => {
      const profiles = listAuthProfiles();
      assert.deepEqual(profiles, [{ id: 'profile-1', label: 'Backend profile 1', type: 'bearer' }]);
      assert.equal(JSON.stringify(profiles).includes(token), false);

      const records = await getRestRecords({
        connector: 'custom',
        endpoint,
        authProfile: 'profile-1',
        responsePath: 'inquiries',
        mapping: { idField: '_id', nameField: 'name', emailField: 'email' }
      });

      assert.ok(capturedAuthorization === `Bearer ${token}`, 'Authorization header uses the backend-only Bearer profile');
      assert.deepEqual(records.map(({ sourceId, name, email, valid }) => ({ sourceId, name, email, valid })), [
        { sourceId: 'synthetic-1', name: 'Ada Lovelace', email: 'ada@example.test', valid: true },
        { sourceId: 'synthetic-2', name: 'Grace Hopper', email: 'grace@example.test', valid: true }
      ]);
      assert.equal(records.some(record => Object.hasOwn(record, 'message')), false);
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('generic REST connector reports unauthorized source safely without exposing the profile token', async () => {
  const token = randomBytes(32).toString('base64url');
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: { 'content-type': 'application/json' }
  });

  try {
    await withEnvironment({
      NODE_ENV: 'test',
      REST_API_AUTH_PROFILES_JSON: JSON.stringify({ portfolioTest: { type: 'bearer', token } })
    }, async () => {
      await assert.rejects(
        getRestRecords({ connector: 'custom', endpoint, authProfile: 'profile-1', responsePath: 'inquiries' }),
        error => {
          assert.match(error.message, /source API rejected authentication/i);
          assert.equal(error.message.includes(token), false);
          return true;
        }
      );
    });
  } finally {
    global.fetch = originalFetch;
  }
});
