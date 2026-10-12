const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');
const store = require('../db');
const { testMongoConnection, listMongoCollections, sampleMongoData } = require('../services/dataSourceService');
const { listAuthProfiles, getPortfolioInquiries, getRestRecords, testRestConnection } = require('../services/restApiDataSourceService');

router.get('/rest-config', requireAuth, (req, res) => {
  let portfolioApiUrl = '';
  try {
    const parsed = new URL(process.env.PORTFOLIO_INQUIRIES_API_URL || '');
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    portfolioApiUrl = parsed.toString();
  } catch {}
  res.json({
    success: true,
    portfolioConfigured: Boolean(process.env.PORTFOLIO_INQUIRIES_API_URL && process.env.PRAMAAN_INTEGRATION_TOKEN?.trim()),
    portfolioApiUrl,
    externalMongoConfigured: Boolean(process.env.EXTERNAL_MONGODB_URI?.trim().startsWith('mongodb')),
    authProfiles: [{ id: 'none', label: 'No authentication', type: 'none' }, ...listAuthProfiles()]
  });
});

router.post('/rest-test', requireAuth, async (req, res) => {
  try {
    const result = req.body.connector === 'portfolio'
      ? await testRestConnection({ connector: 'portfolio' })
      : await testRestConnection(req.body);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Could not connect to the REST source.' });
  }
});

router.post('/rest-preview', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId || !(await store.events.findOne({ _id: eventId }))) {
      return res.status(404).json({ success: false, error: 'Select an existing event before previewing recipients.' });
    }
    const records = req.body.connector === 'portfolio'
      ? await getPortfolioInquiries()
      : await getRestRecords(req.body);
    const allRecipients = await store.recipients.find({});
    const importedSources = new Set(allRecipients.map(row => row.sourceRecordKey).filter(Boolean));
    const eventEmails = new Set(allRecipients.filter(row => row.eventId === eventId).map(row => String(row.email || '').toLowerCase()));
    const emailsInResponse = new Set();
    const preview = records.map(row => {
      const sourceIdentity = req.body.connector === 'portfolio' ? 'portfolio' : new URL(req.body.endpoint).origin + new URL(req.body.endpoint).pathname;
      const sourceRecordKey = `rest:${crypto.createHash('sha256').update(sourceIdentity).digest('hex').slice(0, 24)}:${row.sourceId}`;
      let duplicateReason = row.duplicateReason || '';
      if (row.valid && importedSources.has(sourceRecordKey)) duplicateReason = 'This source record was already imported.';
      else if (row.valid && eventEmails.has(row.email)) duplicateReason = 'This email already exists in the selected event.';
      else if (row.valid && emailsInResponse.has(row.email)) duplicateReason = 'Duplicate email in source response.';
      if (row.valid) emailsInResponse.add(row.email);
      return { ...row, sourceRecordKey, duplicate: Boolean(duplicateReason), duplicateReason, selectable: row.valid && !duplicateReason };
    });
    return res.json({ success: true, total: preview.length, validCount: preview.filter(row => row.valid).length, duplicateCount: preview.filter(row => row.duplicate).length, records: preview });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Could not preview the REST source.' });
  }
});

router.post('/test-mongo', requireAuth, async (req, res) => {
  try {
    const result = await testMongoConnection();
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/list-collections', requireAuth, async (req, res) => {
  try {
    if (!req.body.dbName) return res.status(400).json({ success: false, error: 'dbName is required.' });
    const collections = await listMongoCollections(req.body.dbName);
    return res.json({ success: true, collections });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/sample-data', requireAuth, async (req, res) => {
  try {
    const { dbName, collectionName } = req.body;
    if (!dbName || !collectionName) return res.status(400).json({ success: false, error: 'dbName and collectionName are required.' });
    const sample = await sampleMongoData(dbName, collectionName, 5);
    return res.json({ success: true, ...sample });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/mongo-preview', requireAuth, async (req, res) => {
  try {
    const { dbName, collectionName, mapping, eventId } = req.body;
    if (!dbName || !collectionName || !eventId || !mapping?.nameField || !mapping?.emailField) {
      return res.status(400).json({ success: false, error: 'Event, database, collection, and recipient mappings are required.' });
    }
    if (!(await store.events.findOne({ _id: eventId }))) return res.status(404).json({ success: false, error: 'Target event not found.' });
    const { fetchAndMapMongoRecords } = require('../services/dataSourceService');
    const fetched = await fetchAndMapMongoRecords(dbName, collectionName, mapping, {}, 5000);
    const allRecipients = await store.recipients.find({});
    const imported = new Set(allRecipients.map(row => row.sourceRecordKey).filter(Boolean));
    const eventEmails = new Set(allRecipients.filter(row => row.eventId === eventId).map(row => String(row.email || '').toLowerCase()));
    const seenEmails = new Set();
    const records = fetched.records.map((row, index) => {
      const sourceId = String(row.sourceId || `row-${index}`);
      const sourceRecordKey = `mongo:${dbName}.${collectionName}:${sourceId}`;
      const email = String(row.email || '').trim().toLowerCase();
      const duplicateReason = imported.has(sourceRecordKey) ? 'This source record was already imported.' : (eventEmails.has(email) ? 'This email already exists in the selected event.' : (seenEmails.has(email) ? 'Duplicate email in source response.' : ''));
      if (email) seenEmails.add(email);
      return { sourceId, sourceRecordKey, name: String(row.name || '').trim(), email, valid: Boolean(row.isValid), error: row.validationError || '', duplicate: Boolean(duplicateReason), duplicateReason, selectable: Boolean(row.isValid && !duplicateReason) };
    });
    return res.json({ success: true, total: fetched.totalFound, records });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Could not preview the configured MongoDB source.' });
  }
});

module.exports = router;
