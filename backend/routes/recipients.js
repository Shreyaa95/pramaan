const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const xlsx = require('xlsx');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { fetchAndMapMongoRecords } = require('../services/dataSourceService');
const { getRestRecords } = require('../services/restApiDataSourceService');

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/recipients/event/:eventId - List recipients for specific event
router.get('/event/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, search } = req.query;

    let query = { eventId };
    if (status && status !== 'all') {
      query.status = status;
    }

    let recipients = await db.recipients.find(query, { sort: { createdAt: 1 } });

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      recipients = recipients.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.recipientId && r.recipientId.toLowerCase().includes(q))
      );
    }

    // Attach generated certificate info if available
    const enriched = await Promise.all(
      recipients.map(async r => {
        const cert = await db.certificates.findOne({ recipientId: r.recipientId, eventId });
        const delivery = await db.emailDeliveries.findOne({ recipientId: r.recipientId, eventId });
        return {
          ...r,
          certificate: cert || null,
          delivery: delivery || null
        };
      })
    );

    return res.json({ success: true, count: enriched.length, recipients: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/recipients/parse-file - Parse uploaded Excel/CSV file to extract headers and preview rows
router.post('/parse-file', requireAuth, upload.single('dataFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV or Excel file uploaded.' });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON array of objects
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    // Remove temp file
    fs.unlink(filePath, () => {});

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ success: false, error: 'The uploaded file contains no data rows.' });
    }

    // Extract all header columns
    const headers = Object.keys(rawRows[0]);
    const previewRows = rawRows.slice(0, 5);

    // Auto-detect likely mappings
    let suggestedName = headers.find(h => /name|student|participant|recipient/i.test(h)) || headers[0];
    let suggestedEmail = headers.find(h => /email|mail/i.test(h)) || '';
    let suggestedId = headers.find(h => /id|roll|reg|number|code/i.test(h)) || '';

    return res.json({
      success: true,
      totalRows: rawRows.length,
      headers,
      previewRows,
      allRows: rawRows,
      suggestedMapping: {
        nameField: suggestedName,
        emailField: suggestedEmail,
        recipientIdField: suggestedId
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: `Failed to parse file: ${err.message}` });
  }
});

// POST /api/recipients/import-mapped-data - Validate and save parsed rows with dynamic mapping
router.post('/import-mapped-data', requireAuth, async (req, res) => {
  try {
    const { eventId, rows = req.body.data, mapping, sourceFileName } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, error: 'eventId is required.' });
    }
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No data rows to import.' });
    }
    if (!mapping || !mapping.nameField || !mapping.emailField) {
      return res.status(400).json({ success: false, error: 'Name and Email column mappings are required.' });
    }

    const event = await db.events.findOne({ _id: eventId });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Target event not found.' });
    }

    if (rows.length > 5000) return res.status(400).json({ success: false, error: 'Select no more than 5,000 rows per import.' });
    const existingRecipients = await db.recipients.find({ eventId });
    const toInsert = [];
    let skippedCount = 0;
    const duplicates = [];
    const invalidRecords = [];
    const existingEmails = new Set(existingRecipients.map(r => String(r.email || '').toLowerCase()));
    const existingIds = new Set(existingRecipients.map(r => String(r.recipientId || '')));
    const fileSeenEmails = new Set();
    const fileSeenIds = new Set();
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rawName = row[mapping.nameField];
      const rawEmail = row[mapping.emailField];
      const rawId = mapping.recipientIdField ? row[mapping.recipientIdField] : null;
      const name = String(rawName || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      const email = String(rawEmail || '').trim().toLowerCase().slice(0, 254);
      const recipientId = String(rawId || '').trim().slice(0, 200) || `CSV-${crypto.randomUUID()}`;
      let error = null;
      if (!name) error = 'Missing recipient name';
      else if (!email) error = 'Missing email address';
      else if (!EMAIL_REGEX.test(email)) error = 'Invalid email format';
      if (error) {
        invalidRecords.push({ rowNumber: index + 1, name, email, error });
        continue;
      }
      if (existingIds.has(recipientId) || fileSeenIds.has(recipientId)) {
        skippedCount++;
        duplicates.push({ rowNumber: index + 1, name, email, reason: 'Duplicate recipient ID; existing records were preserved.' });
        continue;
      }
      if (existingEmails.has(email) || fileSeenEmails.has(email)) {
        skippedCount++;
        duplicates.push({ rowNumber: index + 1, name, email, reason: 'Duplicate email; existing records were preserved.' });
        continue;
      }
      fileSeenIds.add(recipientId);
      fileSeenEmails.add(email);
      const extraData = {};
      if (mapping.extraFields && Array.isArray(mapping.extraFields)) {
        mapping.extraFields.forEach(f => {
          if (f.targetKey && f.sourceColumn && row[f.sourceColumn] !== undefined) {
            extraData[f.targetKey] = String(row[f.sourceColumn]).trim();
          }
        });
      }

      toInsert.push({
        eventId,
        recipientId,
        name,
        email,
        extraData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }

    if (toInsert.length > 0) {
      await db.recipients.insertMany(toInsert);
    }

    // Persist source metadata and mapping on the event document
    const currentTotalRecipients = await db.recipients.count({ eventId });
    await db.events.update(
      { _id: eventId },
      {
        $set: {
          dataSourceType: 'csv',
          columnMapping: mapping,
          sourceMetadata: {
            sourceType: 'csv',
            fileName: sourceFileName || 'Uploaded Spreadsheet',
            totalRows: rows.length,
            importedRecipients: currentTotalRecipients,
          importedThisRun: toInsert.length,
            importedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        }
      }
    );

    return res.json({
      success: true,
      totalRows: rows.length,
      totalRecipients: currentTotalRecipients,
      importedCount: toInsert.length,
      newCount: toInsert.length,
      skippedCount,
      invalidCount: invalidRecords.length,
      duplicatesCount: duplicates.length,
      invalidRecords,
      duplicates
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/import-rest', requireAuth, async (req, res) => {
  try {
    const { eventId, source, selectedIds } = req.body;
    if (!eventId || !(await db.events.findOne({ _id: eventId }))) return res.status(404).json({ success: false, error: 'Target event not found.' });
    if (!Array.isArray(selectedIds) || selectedIds.length === 0 || selectedIds.length > 5000) return res.status(400).json({ success: false, error: 'Select between 1 and 5,000 source records.' });
    const records = await getRestRecords(source || {});
    const selected = new Set(selectedIds.map(String));
    const selectedRecords = records.filter(row => selected.has(row.sourceId) && row.valid);
    const refreshedSelectedIds = new Set(selectedRecords.map(row => row.sourceId));
    if ([...selected].some(id => !refreshedSelectedIds.has(id))) return res.status(409).json({ success: false, error: 'One or more selected source records are no longer valid or available. Preview again.' });
    const allRecipients = await db.recipients.find({});
    const importedKeys = new Set(allRecipients.map(row => row.sourceRecordKey).filter(Boolean));
    const eventEmails = new Set(allRecipients.filter(row => row.eventId === eventId).map(row => String(row.email || '').toLowerCase()));
    const selectedEmails = new Set();
    const skipped = [];
    const toInsert = [];
    const sourceName = source?.connector === 'portfolio' ? 'portfolio' : new URL(source.endpoint).origin + new URL(source.endpoint).pathname;
    const sourceHash = crypto.createHash('sha256').update(sourceName).digest('hex').slice(0, 24);
    for (const row of selectedRecords) {
      const sourceRecordKey = `rest:${sourceHash}:${row.sourceId}`;
      if (!row.valid) { skipped.push({ sourceId: row.sourceId, reason: row.error }); continue; }
      if (importedKeys.has(sourceRecordKey)) { skipped.push({ sourceId: row.sourceId, reason: 'Source record already imported.' }); continue; }
      if (eventEmails.has(row.email) || selectedEmails.has(row.email)) { skipped.push({ sourceId: row.sourceId, email: row.email, reason: 'Email already exists in this event or selected set.' }); continue; }
      selectedEmails.add(row.email);
      const recipientId = `REST-${sourceHash.slice(0, 8)}-${row.sourceId}`;
      toInsert.push({
        eventId,
        recipientId,
        sourceRecordKey,
        sourceId: row.sourceId,
        sourceType: 'rest',
        name: row.name,
        email: row.email,
        extraData: {},
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
    if (toInsert.length) await db.recipients.insertMany(toInsert);
    return res.json({ success: true, importedCount: toInsert.length, skippedCount: skipped.length, skipped });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Could not import selected REST records.' });
  }
});

// POST /api/recipients/import-mongo - Import records from authorized MongoDB connection
router.post('/import-mongo', requireAuth, async (req, res) => {
  try {
    const { eventId, dbName, collectionName, mapping, selectedIds } = req.body;
    if (!eventId || !dbName || !collectionName || !mapping || !Array.isArray(selectedIds) || selectedIds.length === 0 || selectedIds.length > 5000) {
      return res.status(400).json({ success: false, error: 'Event, configured database source, mapping, and selected records are required.' });
    }
    if (!(await db.events.findOne({ _id: eventId }))) return res.status(404).json({ success: false, error: 'Target event not found.' });
    const fetched = await fetchAndMapMongoRecords(dbName, collectionName, mapping, {}, 5000);
    const selected = new Set(selectedIds.map(String));
    const selectedRows = fetched.records.filter(row => selected.has(String(row.sourceId)));
    if (selectedRows.length !== selected.size) return res.status(409).json({ success: false, error: 'One or more selected records are no longer available. Preview again.' });
    const allRecipients = await db.recipients.find({});
    const importedKeys = new Set(allRecipients.map(row => row.sourceRecordKey).filter(Boolean));
    const eventEmails = new Set(allRecipients.filter(row => row.eventId === eventId).map(row => String(row.email || '').toLowerCase()));
    const selectedEmails = new Set();
    const skipped = [];
    const toInsert = [];
    const dbHash = crypto.createHash('sha256').update(`${dbName}.${collectionName}`).digest('hex').slice(0, 8);
    for (const row of selectedRows) {
      const sourceId = String(row.sourceId);
      const sourceRecordKey = `mongo:${dbName}.${collectionName}:${sourceId}`;
      const email = String(row.email || '').trim().toLowerCase();
      if (!row.isValid) { skipped.push({ sourceId, reason: row.validationError || 'Invalid recipient.' }); continue; }
      if (importedKeys.has(sourceRecordKey)) { skipped.push({ sourceId, reason: 'Source record already imported.' }); continue; }
      if (eventEmails.has(email) || selectedEmails.has(email)) { skipped.push({ sourceId, email, reason: 'Email already exists in this event or selected set.' }); continue; }
      selectedEmails.add(email);
      const recipientId = row.recipientId && row.recipientId !== sourceId ? row.recipientId : `MGO-${dbHash}-${sourceId}`;
      toInsert.push({
        eventId,
        recipientId,
        sourceRecordKey,
        sourceId,
        sourceType: 'mongo',
        name: String(row.name).trim().slice(0, 120),
        email,
        extraData: row.extraData || {},
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
    if (toInsert.length) await db.recipients.insertMany(toInsert);
    return res.json({ success: true, importedCount: toInsert.length, skippedCount: skipped.length, skipped });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Could not import selected database records.' });
  }
});

// DELETE /api/recipients/:id - Delete single recipient
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const recipient = await db.recipients.findOne({ _id: req.params.id });
    if (recipient) {
      const cert = await db.certificates.findOne({ recipientId: recipient.recipientId, eventId: recipient.eventId });
      if (cert && cert.filePath && fs.existsSync(cert.filePath)) {
        try { fs.unlinkSync(cert.filePath); } catch (e) {}
      }
      await db.recipients.remove({ _id: req.params.id });
      await db.certificates.remove({ recipientId: recipient.recipientId, eventId: recipient.eventId }, { multi: true });
      await db.emailDeliveries.remove({ recipientId: recipient.recipientId, eventId: recipient.eventId }, { multi: true });
    }
    return res.json({ success: true, message: 'Recipient deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/recipients/event/:eventId - Clear all recipients for event
router.delete('/event/:eventId/clear', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    await db.recipients.remove({ eventId }, { multi: true });
    await db.certificates.remove({ eventId }, { multi: true });
    await db.emailDeliveries.remove({ eventId }, { multi: true });
    return res.json({ success: true, message: 'All recipients cleared for this event.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
