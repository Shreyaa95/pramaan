const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

test('Excel/CSV parsing and recipient mapping regression verification', () => {
  const csvPath = path.join(__dirname, '..', 'sample_recipients_bhu_tech.csv');
  assert.ok(fs.existsSync(csvPath), 'sample_recipients_bhu_tech.csv exists');

  const workbook = xlsx.readFile(csvPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  assert.equal(rawRows.length, 5, 'Parses all rows from sample CSV');
  
  const headers = Object.keys(rawRows[0]);
  assert.ok(headers.includes('Candidate Name'));
  assert.ok(headers.includes('Registered Email'));
  assert.ok(headers.includes('Roll Number'));

  // Auto-detect check
  const detectedName = headers.find(h => /name|student|participant|recipient/i.test(h));
  const detectedEmail = headers.find(h => /email|mail/i.test(h));
  const detectedId = headers.find(h => !/name|email|mail/i.test(h) && (/(^|[^a-z])id($|[^a-z])|roll|reg|number|code/i.test(h)));

  assert.equal(detectedName, 'Candidate Name');
  assert.equal(detectedEmail, 'Registered Email');
  assert.equal(detectedId, 'Roll Number');

  // Verify duplicate name handling with distinct email/ID
  const priyaRows = rawRows.filter(r => r['Candidate Name'] === 'Priya Singh');
  assert.equal(priyaRows.length, 2);
  assert.notEqual(priyaRows[0]['Roll Number'], priyaRows[1]['Roll Number']);
  assert.notEqual(priyaRows[0]['Registered Email'], priyaRows[1]['Registered Email']);

  // Verify invalid email detection
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidRow = rawRows.find(r => !EMAIL_REGEX.test(r['Registered Email']));
  assert.ok(invalidRow, 'Flags row with invalid-email-format');
  assert.equal(invalidRow['Roll Number'], 'BHU-2026-05');
});
