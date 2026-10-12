const { MongoClient } = require('mongodb');

// Helper to mask credentials in connection strings for security
function maskUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/i, '$1*****$3');
  } catch (e) {
    return 'mongodb://*****';
  }
}

/**
 * Test external MongoDB connection
 */
function getExternalMongoUri() {
  const connectionUri = process.env.EXTERNAL_MONGODB_URI;
  if (!connectionUri || !connectionUri.trim().startsWith('mongodb')) {
    throw new Error('External MongoDB is not configured on the PRAMAAN backend. See backend environment setup.');
  }
  return connectionUri;
}

async function testMongoConnection() {
  const connectionUri = getExternalMongoUri();
  if (!connectionUri || !connectionUri.trim().startsWith('mongodb')) {
    throw new Error('Invalid connection string. Must start with mongodb:// or mongodb+srv://');
  }

  let client;
  try {
    client = new MongoClient(connectionUri, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000
    });
    await client.connect();
    const adminDb = client.db().admin();
    const dbsResult = await adminDb.listDatabases();
    const databases = dbsResult.databases.map(d => d.name);

    return {
      connected: true,
      databases,
      defaultDatabase: client.db().databaseName
    };
  } catch (err) {
    throw new Error('Could not connect to the backend-configured external MongoDB source.');
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}

/**
 * List collections in target database
 */
async function listMongoCollections(dbName) {
  const connectionUri = getExternalMongoUri();
  let client;
  try {
    client = new MongoClient(connectionUri, {
      serverSelectionTimeoutMS: 6000
    });
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    return collections.map(c => c.name);
  } catch (err) {
    throw new Error('Could not list collections from the configured external MongoDB source.');
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}

/**
 * Sample documents from target collection to discover fields
 */
async function sampleMongoData(dbName, collectionName, sampleSize = 5) {
  const connectionUri = getExternalMongoUri();
  let client;
  try {
    client = new MongoClient(connectionUri, {
      serverSelectionTimeoutMS: 6000
    });
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const docs = await collection.find({}).limit(sampleSize).toArray();

    // Collect all field keys across sample docs
    const fieldSet = new Set();
    docs.forEach(doc => {
      Object.keys(doc).forEach(k => {
        if (k !== '_id') fieldSet.add(k);
      });
    });

    return { availableFields: Array.from(fieldSet) };
  } catch (err) {
    throw new Error('Could not preview data from the configured external MongoDB source.');
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}

/**
 * Fetch records from MongoDB using admin's field mapping
 */
async function fetchAndMapMongoRecords(dbName, collectionName, mapping, filter = {}, limit = 5000) {
  const connectionUri = getExternalMongoUri();
  let client;
  try {
    client = new MongoClient(connectionUri, {
      serverSelectionTimeoutMS: 10000
    });
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Only project requested fields to minimize overhead and protect privacy
    const projection = { _id: 1 };
    if (mapping.nameField) projection[mapping.nameField] = 1;
    if (mapping.emailField) projection[mapping.emailField] = 1;
    if (mapping.recipientIdField) projection[mapping.recipientIdField] = 1;

    // Additional extra mapped fields
    if (mapping.extraFields && Array.isArray(mapping.extraFields)) {
      mapping.extraFields.forEach(f => {
        if (f.sourceField) projection[f.sourceField] = 1;
      });
    }

    const docs = await collection.find(filter, { projection }).limit(limit).toArray();

    const normalizedRecords = [];
    const seenEmails = new Set();
    const duplicateEmails = [];
    const invalidRecords = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    docs.forEach((doc, idx) => {
      const rawName = mapping.nameField ? doc[mapping.nameField] : '';
      const rawEmail = mapping.emailField ? doc[mapping.emailField] : '';
      const rawId = mapping.recipientIdField ? doc[mapping.recipientIdField] : (doc._id ? String(doc._id) : `REC-${idx + 1}`);

      const name = String(rawName || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      const email = String(rawEmail || '').trim().toLowerCase().slice(0, 254);
      const recipientId = String(rawId || '').trim().slice(0, 200);

      const extraData = {};
      if (mapping.extraFields && Array.isArray(mapping.extraFields)) {
        mapping.extraFields.forEach(f => {
          if (f.targetField && f.sourceField) {
            extraData[f.targetField] = doc[f.sourceField] !== undefined ? String(doc[f.sourceField]) : '';
          }
        });
      }

      // Check validation
      let error = null;
      if (!name) error = 'Missing recipient name';
      else if (!email) error = 'Missing email address';
      else if (!emailRegex.test(email)) error = 'Invalid email address format';

      if (email) {
        if (seenEmails.has(email)) {
          duplicateEmails.push(email);
        } else {
          seenEmails.add(email);
        }
      }

      const record = {
        sourceId: doc._id ? String(doc._id) : recipientId || `row-${idx}`,
        recipientId: recipientId || `REC-${idx + 1}`,
        name,
        email,
        extraData,
        isValid: !error,
        validationError: error
      };

      if (!record.isValid) {
        invalidRecords.push(record);
      }
      normalizedRecords.push(record);
    });

    return {
      totalFound: docs.length,
      validCount: normalizedRecords.filter(r => r.isValid).length,
      invalidCount: invalidRecords.length,
      duplicateEmailCount: duplicateEmails.length,
      records: normalizedRecords
    };
  } catch (err) {
    if (err.message?.startsWith('External MongoDB')) throw err;
    throw new Error('Failed to fetch data from the configured external MongoDB source.');
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}

module.exports = {
  maskUri,
  getExternalMongoUri,
  testMongoConnection,
  listMongoCollections,
  sampleMongoData,
  fetchAndMapMongoRecords
};
