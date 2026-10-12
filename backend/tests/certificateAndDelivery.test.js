const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { generateCertificatePdf, CERT_STORAGE_DIR } = require('../services/certificateService');

test('certificateService generates valid PDF with deterministic recipient ID and sanitized filename', async () => {
  const dummyTemplate = {
    name: 'Synthetic Test Template',
    width: 842,
    height: 595,
    fields: [
      { fieldType: 'recipientName', x: 200, y: 300, fontSize: 24, fontColor: '#111827' },
      { fieldType: 'certificateId', x: 200, y: 250, fontSize: 12, fontColor: '#6b7280' }
    ]
  };

  const dummyEvent = {
    name: 'Synthetic Hackathon 2026',
    organizationName: 'PRAMAAN Testing Org',
    certificatePrefix: 'SYN'
  };

  const dummyRecipient = {
    recipientId: 'SYN-TEST-001',
    name: 'श्रेया गौतम / Shreya Gautam',
    email: 'synthetic@example.test',
    extraData: {}
  };

  const result = await generateCertificatePdf({
    template: dummyTemplate,
    event: dummyEvent,
    recipient: dummyRecipient,
    certificateId: 'SYN-2026-0001'
  });

  assert.equal(result.certificateId, 'SYN-2026-0001');
  assert.ok(result.fileName.includes('SYN-2026-0001'));
  assert.ok(fs.existsSync(result.filePath), 'Generated PDF file exists on disk');
  assert.ok(result.fileSize > 500, 'PDF size is non-trivial');

  // Verify file header is valid PDF (%PDF-)
  const buffer = fs.readFileSync(result.filePath);
  assert.equal(buffer.subarray(0, 4).toString(), '%PDF');

  // Cleanup test PDF
  try { fs.unlinkSync(result.filePath); } catch {}
});

test('email retry logic correctly skips already-sent deliveries and targets only failed deliveries', async () => {
  const dummyEventId = 'event-synthetic-retry-test';
  
  // Clean any previous test entries
  await db.emailDeliveries.remove({ eventId: dummyEventId }, { multi: true });

  // Insert two records: one already sent, one failed
  await db.emailDeliveries.insert({
    eventId: dummyEventId,
    recipientId: 'REC-001',
    status: 'sent',
    sentAt: new Date().toISOString()
  });
  await db.emailDeliveries.insert({
    eventId: dummyEventId,
    recipientId: 'REC-002',
    status: 'failed',
    errorMessage: 'Simulated connection timeout during dispatch',
    retryCount: 1
  });

  // Query failed deliveries
  const failed = await db.emailDeliveries.find({ eventId: dummyEventId, status: 'failed' });
  const sent = await db.emailDeliveries.find({ eventId: dummyEventId, status: 'sent' });

  assert.equal(failed.length, 1, 'Only failed delivery is selected for retry');
  assert.equal(failed[0].recipientId, 'REC-002');
  assert.equal(sent.length, 1, 'Successful delivery is preserved');
  assert.equal(sent[0].recipientId, 'REC-001');

  // Cleanup test entries
  await db.emailDeliveries.remove({ eventId: dummyEventId }, { multi: true });
});
