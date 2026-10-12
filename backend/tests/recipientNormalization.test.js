const assert = require('node:assert/strict');
const test = require('node:test');
const { getRestRecords } = require('../services/restApiDataSourceService');

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

test('normalizeRecords preserves Unicode names, trims whitespace, and reports distinct validation errors', async () => {
  const endpoint = 'http://127.0.0.1:3001/api/synthetic/recipients';
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({
    data: [
      { id: 'REC-001', full_name: '  श्रेया गौतम  ', email_addr: ' shreya@example.com ' },
      { id: '', full_name: 'राहुल कुमार', email_addr: 'rahul@example.com' },
      { id: 'REC-003', full_name: '   ', email_addr: 'blank-name@example.com' },
      { id: 'REC-004', full_name: 'Aarav Patel', email_addr: '' },
      { id: 'REC-005', full_name: 'Pooja Roy', email_addr: 'not-an-email' },
      { id: 'REC-006', full_name: 'Duplicate ID 1', email_addr: 'user1@example.com' },
      { id: 'REC-006', full_name: 'Duplicate ID 2', email_addr: 'user2@example.com' },
      { id: 'REC-007', full_name: 'Duplicate Email 1', email_addr: 'shared@example.com' },
      { id: 'REC-008', full_name: 'Duplicate Email 2', email_addr: 'shared@example.com' }
    ]
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    await withEnvironment({ NODE_ENV: 'test' }, async () => {
      const records = await getRestRecords({
        connector: 'custom',
        endpoint,
        responsePath: 'data',
        mapping: { idField: 'id', nameField: 'full_name', emailField: 'email_addr' }
      });

      assert.equal(records.length, 9);

      // Record 1: Valid with Unicode preservation and whitespace trimming
      assert.equal(records[0].sourceId, 'REC-001');
      assert.equal(records[0].name, 'श्रेया गौतम');
      assert.equal(records[0].email, 'shreya@example.com');
      assert.equal(records[0].valid, true);

      // Record 2: Missing recipient ID
      assert.equal(records[1].valid, false);
      assert.equal(records[1].error, 'Missing recipient ID');

      // Record 3: Missing recipient name
      assert.equal(records[2].valid, false);
      assert.equal(records[2].error, 'Missing recipient name');

      // Record 4: Missing email address
      assert.equal(records[3].valid, false);
      assert.equal(records[3].error, 'Missing email address');

      // Record 5: Invalid email format
      assert.equal(records[4].valid, false);
      assert.equal(records[4].error, 'Invalid email address format');

      // Record 6 & 7: Duplicate ID
      assert.equal(records[5].valid, true);
      assert.equal(records[6].valid, false);
      assert.equal(records[6].duplicate, true);
      assert.match(records[6].duplicateReason, /Duplicate recipient ID/);

      // Record 8 & 9: Duplicate email
      assert.equal(records[7].valid, true);
      assert.equal(records[8].valid, false);
      assert.equal(records[8].duplicate, true);
      assert.match(records[8].duplicateReason, /Duplicate email address/);
    });
  } finally {
    global.fetch = originalFetch;
  }
});
