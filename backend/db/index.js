const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');
const { MongoClient } = require('mongodb');

// Ensure db data directory exists
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let useMongo = false;
let mongoDb = null;
let mongoClient = null;

// Persistent NeDB collections for standalone mode
const nedbStores = {
  admins: Datastore.create({ filename: path.join(dbDir, 'admins.db'), autoload: true }),
  events: Datastore.create({ filename: path.join(dbDir, 'events.db'), autoload: true }),
  templates: Datastore.create({ filename: path.join(dbDir, 'templates.db'), autoload: true }),
  recipients: Datastore.create({ filename: path.join(dbDir, 'recipients.db'), autoload: true }),
  certificates: Datastore.create({ filename: path.join(dbDir, 'certificates.db'), autoload: true }),
  emailDeliveries: Datastore.create({ filename: path.join(dbDir, 'email_deliveries.db'), autoload: true }),
  settings: Datastore.create({ filename: path.join(dbDir, 'settings.db'), autoload: true })
};

async function initDatabase(mongoUri = process.env.MONGODB_URI) {
  if (mongoUri && typeof mongoUri === 'string' && mongoUri.trim().startsWith('mongodb')) {
    try {
      console.log('[DB] Connecting to primary MongoDB at configured URI...');
      mongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
      await mongoClient.connect();
      mongoDb = mongoClient.db();
      useMongo = true;
      console.log('[DB] Successfully connected to primary MongoDB!');
      return;
    } catch (err) {
      console.warn('[DB] Failed to connect to MongoDB URI:', err.message);
      console.warn('[DB] Falling back to persistent local storage engine.');
      useMongo = false;
    }
  } else {
    console.log('[DB] Using persistent embedded datastore (Zero-config local engine active).');
    useMongo = false;
  }
}

// Unified wrapper providing identical API across both stores
function getStore(name) {
  if (useMongo && mongoDb) {
    const col = mongoDb.collection(name);
    return {
      find: async (query = {}, options = {}) => {
        let cursor = col.find(query);
        if (options.sort) cursor = cursor.sort(options.sort);
        if (options.skip) cursor = cursor.skip(options.skip);
        if (options.limit) cursor = cursor.limit(options.limit);
        return await cursor.toArray();
      },
      findOne: async (query) => {
        return await col.findOne(query);
      },
      insert: async (doc) => {
        const toInsert = { ...doc };
        if (!toInsert._id) {
          toInsert._id = require('crypto').randomUUID();
        }
        await col.insertOne(toInsert);
        return toInsert;
      },
      insertMany: async (docs) => {
        const toInsert = docs.map(d => ({
          _id: d._id || require('crypto').randomUUID(),
          ...d
        }));
        if (toInsert.length > 0) {
          await col.insertMany(toInsert);
        }
        return toInsert;
      },
      update: async (query, update, options = {}) => {
        const mongoUpdate = update.$set || update.$unset ? update : { $set: update };
        const result = await col.updateMany(query, mongoUpdate, { upsert: options.upsert || false });
        return result.modifiedCount || result.upsertedCount;
      },
      remove: async (query, options = {}) => {
        if (options.multi) {
          const res = await col.deleteMany(query);
          return res.deletedCount;
        } else {
          const res = await col.deleteOne(query);
          return res.deletedCount;
        }
      },
      count: async (query = {}) => {
        return await col.countDocuments(query);
      }
    };
  } else {
    const store = nedbStores[name];
    return {
      find: async (query = {}, options = {}) => {
        let cursor = store.find(query);
        if (options.sort) cursor = cursor.sort(options.sort);
        if (options.skip) cursor = cursor.skip(options.skip);
        if (options.limit) cursor = cursor.limit(options.limit);
        return await cursor.exec();
      },
      findOne: async (query) => {
        return await store.findOne(query);
      },
      insert: async (doc) => {
        const toInsert = { ...doc };
        if (!toInsert._id) {
          toInsert._id = require('crypto').randomUUID();
        }
        return await store.insert(toInsert);
      },
      insertMany: async (docs) => {
        const toInsert = docs.map(d => ({
          _id: d._id || require('crypto').randomUUID(),
          ...d
        }));
        return await store.insert(toInsert);
      },
      update: async (query, update, options = {}) => {
        const nedbUpdate = (update.$set || update.$unset || update.$inc) ? update : { $set: update };
        return await store.update(query, nedbUpdate, options);
      },
      remove: async (query, options = {}) => {
        return await store.remove(query, options);
      },
      count: async (query = {}) => {
        return await store.count(query);
      }
    };
  }
}

module.exports = {
  initDatabase,
  get admins() { return getStore('admins'); },
  get events() { return getStore('events'); },
  get templates() { return getStore('templates'); },
  get recipients() { return getStore('recipients'); },
  get certificates() { return getStore('certificates'); },
  get emailDeliveries() { return getStore('emailDeliveries'); },
  get settings() { return getStore('settings'); },
  isUsingMongo: () => useMongo
};
