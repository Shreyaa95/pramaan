const assert = require('node:assert/strict');
const test = require('node:test');
const {
  validateMongoUriScheme,
  maskUri,
  sanitizeMongoError,
  testMongoConnection
} = require('../services/dataSourceService');

test('validateMongoUriScheme enforces mongodb:// or mongodb+srv://', () => {
  assert.equal(validateMongoUriScheme('mongodb://localhost:27017/test'), 'mongodb://localhost:27017/test');
  assert.equal(validateMongoUriScheme('mongodb+srv://user:pass@cluster0.abc.mongodb.net/test'), 'mongodb+srv://user:pass@cluster0.abc.mongodb.net/test');
  
  assert.throws(() => validateMongoUriScheme('http://localhost:5000'), {
    message: /Enter a valid MongoDB connection string\. Must start with mongodb:\/\/ or mongodb\+srv:\/\//
  });
  assert.throws(() => validateMongoUriScheme('https://example.com/recipients'), {
    message: /Enter a valid MongoDB connection string\. Must start with mongodb:\/\/ or mongodb\+srv:\/\//
  });
  assert.throws(() => validateMongoUriScheme(''), {
    message: /Enter a valid MongoDB connection string/
  });
});

test('maskUri masks credentials safely', () => {
  const masked = maskUri('mongodb+srv://admin_user:secret123@cluster0.abc.mongodb.net/myDb?retryWrites=true');
  assert.equal(masked.includes('secret123'), false);
  assert.match(masked, /mongodb\+srv:\/\/admin_user:\*\*\*\*\*@cluster0\.abc\.mongodb\.net/);
});

test('sanitizeMongoError hides raw error details and provides safe user messages', () => {
  const authErr = new Error('MongoServerError: Authentication failed for user bob:bad password');
  assert.equal(sanitizeMongoError(authErr), 'Database authentication failed. Check the configured database user credentials.');
  assert.equal(sanitizeMongoError(authErr).includes('bob:bad password'), false);

  const permErr = new Error('MongoServerError: command listDatabases requires authentication or user not authorized');
  assert.equal(sanitizeMongoError(permErr), 'The configured database user does not have permission for this operation.');

  const netErr = new Error('MongoServerSelectionError: server selection timed out after 6000 ms');
  assert.equal(sanitizeMongoError(netErr), 'Could not reach the database. Check Atlas Network Access, firewall, and connection settings.');

  const unknownErr = new Error('Random internal driver failure with raw uri mongodb+srv://...');
  assert.equal(sanitizeMongoError(unknownErr), 'Could not connect to the backend-configured external MongoDB source.');
  assert.equal(sanitizeMongoError(unknownErr).includes('mongodb+srv'), false);
});

test('testMongoConnection fails safely when EXTERNAL_MONGODB_URI is unconfigured or invalid', async () => {
  const prev = process.env.EXTERNAL_MONGODB_URI;
  try {
    delete process.env.EXTERNAL_MONGODB_URI;
    await assert.rejects(
      testMongoConnection(),
      /External MongoDB is not configured on the PRAMAAN backend/
    );

    process.env.EXTERNAL_MONGODB_URI = 'https://some-web-url.com';
    await assert.rejects(
      testMongoConnection(),
      /Enter a valid MongoDB connection string/
    );
  } finally {
    if (prev !== undefined) process.env.EXTERNAL_MONGODB_URI = prev;
    else delete process.env.EXTERNAL_MONGODB_URI;
  }
});
