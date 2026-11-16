const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { generateCertificatePdf, CERT_STORAGE_DIR } = require('../services/certificateService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to generate padded unique certificate ID
function createCertificateId(prefix, index) {
  const year = new Date().getFullYear();
  const padded = String(index).padStart(4, '0');
  return `${prefix || 'CERT'}-${year}-${padded}`;
}

// Helper to validate recipients and template before generation
function validateRecipientsForEvent(event, template, recipients) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  const seenEmails = new Set();

  recipients.forEach((r, idx) => {
    const rowNumber = idx + 1;
    const name = String(r.name || '').trim();
    const email = String(r.email || '').trim().toLowerCase();
    const id = String(r.recipientId || '').trim();

    if (!name) {
      errors.push({ rowNumber, recipientId: id || `Row ${rowNumber}`, name: '', email, error: 'Recipient Name is missing' });
    }
    if (!email) {
      errors.push({ rowNumber, recipientId: id || `Row ${rowNumber}`, name, email: '', error: 'Email address is missing' });
    } else if (!EMAIL_REGEX.test(email)) {
      errors.push({ rowNumber, recipientId: id || `Row ${rowNumber}`, name, email, error: 'Invalid email address format' });
    }
    if (!id) {
      errors.push({ rowNumber, recipientId: '', name, email, error: 'Recipient ID is missing' });
    } else if (seenIds.has(id)) {
      errors.push({ rowNumber, recipientId: id, name, email, error: `Duplicate Recipient ID "${id}" detected in batch` });
    } else {
      seenIds.add(id);
    }

    if (email && email.length > 0) {
      if (seenEmails.has(email)) {
        warnings.push({ rowNumber, recipientId: id, name, email, warning: `Email address "${email}" is shared by multiple recipients (certificates will be generated for each recipient)` });
      } else {
        seenEmails.add(email);
      }
    }

    if (r.status === 'invalid' && r.validationError && !errors.some(e => e.rowNumber === rowNumber)) {
      errors.push({ rowNumber, recipientId: id || `Row ${rowNumber}`, name, email, error: r.validationError });
    }
  });

  return {
    isValid: errors.length === 0,
    totalCount: recipients.length,
    validCount: recipients.length - errors.length,
    invalidCount: errors.length,
    errors,
    warnings
  };
}

// GET /api/certificates/validate/:eventId - Pre-generation validation check
router.get('/validate/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await db.events.findOne({ _id: eventId });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    if (!event.templateId) {
      return res.json({
        success: true,
        isValid: false,
        totalCount: 0,
        validCount: 0,
        invalidCount: 1,
        errors: [{ rowNumber: 0, error: 'No certificate template has been assigned to this event.' }]
      });
    }

    const template = await db.templates.findOne({ _id: event.templateId });
    if (!template) {
      return res.json({
        success: true,
        isValid: false,
        totalCount: 0,
        validCount: 0,
        invalidCount: 1,
        errors: [{ rowNumber: 0, error: 'Assigned template was deleted or not found.' }]
      });
    }

    const recipients = await db.recipients.find({ eventId });
    if (recipients.length === 0) {
      return res.json({
        success: true,
        isValid: false,
        totalCount: 0,
        validCount: 0,
        invalidCount: 1,
        errors: [{ rowNumber: 0, error: 'No recipients imported for this event. Please import recipients first.' }]
      });
    }

    const validation = validateRecipientsForEvent(event, template, recipients);
    return res.json({
      success: true,
      ...validation
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/certificates/generate-bulk/:eventId - Bulk generate certificates with validation & duplicate protection
router.post('/generate-bulk/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const mode = req.body?.mode || 'skip_existing'; // 'skip_existing' (default safe reuse) | 'regenerate'

    const event = await db.events.findOne({ _id: eventId });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    if (!event.templateId) {
      return res.status(400).json({ success: false, error: 'Please assign a certificate template to this event before generating.' });
    }

    const template = await db.templates.findOne({ _id: event.templateId });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Assigned template not found.' });
    }

    const recipients = await db.recipients.find({ eventId });
    if (recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'No recipients found for this event. Please import recipients first.' });
    }

    // Comprehensive Pre-Generation Validation: block if invalid records exist
    const validation = validateRecipientsForEvent(event, template, recipients);
    if (!validation.isValid && validation.invalidCount > 0) {
      const firstFew = validation.errors.slice(0, 3).map(e => `Row ${e.rowNumber}: ${e.error}`).join('; ');
      return res.status(400).json({
        success: false,
        error: `Validation failed. ${validation.invalidCount} record(s) contain errors (${firstFew}). Please fix these issues before generating certificates.`,
        validation
      });
    }

    const generatedResults = [];
    const errors = [];
    let counter = 1;
    let reusedCount = 0;
    let newlyGeneratedCount = 0;

    // Determine starting certificate index by inspecting existing certificate numbers
    const existingCerts = await db.certificates.find({ eventId });
    let maxExistingSeq = 0;
    existingCerts.forEach(c => {
      if (c.certificateId) {
        const parts = c.certificateId.split('-');
        const lastPart = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastPart) && lastPart > maxExistingSeq) {
          maxExistingSeq = lastPart;
        }
      }
    });
    counter = maxExistingSeq + 1;

    for (const recipient of recipients) {
      try {
        let certDoc = await db.certificates.findOne({ recipientId: recipient.recipientId, eventId });

        // Safe Duplicate Handling: If certificate already exists on disk and mode is 'skip_existing', reuse it!
        if (certDoc && certDoc.filePath && fs.existsSync(certDoc.filePath) && mode === 'skip_existing') {
          reusedCount++;
          generatedResults.push({
            recipientId: recipient.recipientId,
            name: recipient.name,
            email: recipient.email,
            certificateId: certDoc.certificateId,
            pdfUrl: certDoc.pdfUrl,
            reused: true
          });
          continue;
        }

        // Keep stable certificateId if regenerating, or allocate new collision-safe ID
        let certificateId = certDoc ? certDoc.certificateId : createCertificateId(event.certificatePrefix, counter++);

        const generated = await generateCertificatePdf({
          template,
          event,
          recipient,
          certificateId
        });

        const certRecord = {
          certificateId: generated.certificateId,
          eventId,
          recipientId: recipient.recipientId,
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          fileName: generated.fileName,
          filePath: generated.filePath,
          pdfUrl: generated.pdfUrl,
          fileSize: generated.fileSize,
          status: 'generated',
          generatedAt: new Date().toISOString()
        };

        if (certDoc) {
          await db.certificates.update({ _id: certDoc._id }, certRecord);
        } else {
          await db.certificates.insert(certRecord);
        }

        await db.recipients.update({ _id: recipient._id }, { status: 'generated' });
        newlyGeneratedCount++;

        generatedResults.push({
          recipientId: recipient.recipientId,
          name: recipient.name,
          email: recipient.email,
          certificateId: generated.certificateId,
          pdfUrl: generated.pdfUrl,
          reused: false
        });
      } catch (err) {
        console.error(`Error generating certificate for ${recipient.email}:`, err);
        errors.push({ recipientId: recipient.recipientId, name: recipient.name, error: err.message });
      }
    }

    return res.json({
      success: true,
      totalRecipients: recipients.length,
      generatedCount: newlyGeneratedCount,
      reusedCount,
      totalActiveCertificates: generatedResults.length,
      errorCount: errors.length,
      certificates: generatedResults,
      errors
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/certificates/generate-single/:recipientId
router.post('/generate-single/:recipientId', requireAuth, async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { eventId } = req.body;

    const recipient = await db.recipients.findOne({ recipientId, eventId });
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient record not found.' });
    }

    const event = await db.events.findOne({ _id: eventId });
    if (!event || !event.templateId) {
      return res.status(400).json({ success: false, error: 'Event or template missing.' });
    }

    const template = await db.templates.findOne({ _id: event.templateId });
    if (!template) {
      return res.status(400).json({ success: false, error: 'Template missing.' });
    }

    let certDoc = await db.certificates.findOne({ recipientId, eventId });
    const count = (await db.certificates.count({ eventId })) + 1;
    const certificateId = certDoc ? certDoc.certificateId : createCertificateId(event.certificatePrefix, count);

    const generated = await generateCertificatePdf({
      template,
      event,
      recipient,
      certificateId
    });

    const certRecord = {
      certificateId: generated.certificateId,
      eventId,
      recipientId: recipient.recipientId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      fileName: generated.fileName,
      filePath: generated.filePath,
      pdfUrl: generated.pdfUrl,
      fileSize: generated.fileSize,
      status: 'generated',
      generatedAt: new Date().toISOString()
    };

    if (certDoc) {
      await db.certificates.update({ _id: certDoc._id }, certRecord);
    } else {
      await db.certificates.insert(certRecord);
    }

    await db.recipients.update({ _id: recipient._id }, { status: 'generated' });

    return res.json({ success: true, certificate: certRecord });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/certificates/vault - List certificates with query filter
router.get('/vault', requireAuth, async (req, res) => {
  try {
    const { eventId, search } = req.query;
    const query = {};
    if (eventId) query.eventId = eventId;
    let certs = await db.certificates.find(query, { sort: { generatedAt: -1 } });
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      certs = certs.filter(c =>
        (c.recipientName && c.recipientName.toLowerCase().includes(q)) ||
        (c.certificateId && c.certificateId.toLowerCase().includes(q)) ||
        (c.recipientEmail && c.recipientEmail.toLowerCase().includes(q))
      );
    }
    return res.json({ success: true, count: certs.length, certificates: certs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/certificates - List certificates
router.get('/', requireAuth, async (req, res) => {
  try {
    const { eventId, search } = req.query;
    const query = {};
    if (eventId) query.eventId = eventId;
    let certs = await db.certificates.find(query, { sort: { generatedAt: -1 } });
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      certs = certs.filter(c =>
        (c.recipientName && c.recipientName.toLowerCase().includes(q)) ||
        (c.certificateId && c.certificateId.toLowerCase().includes(q)) ||
        (c.recipientEmail && c.recipientEmail.toLowerCase().includes(q))
      );
    }
    return res.json({ success: true, count: certs.length, certificates: certs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/certificates/event/:eventId - List certificates for event
router.get('/event/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const certs = await db.certificates.find({ eventId }, { sort: { generatedAt: -1 } });
    return res.json({ success: true, count: certs.length, certificates: certs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/certificates/download/:filename - Download / View PDF (public or auth)
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(CERT_STORAGE_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Certificate file not found.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/certificates/public/:certificateId - Public certificate view & verification (tracks view)
router.get('/public/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;
    const cert = await db.certificates.findOne({ certificateId });

    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found.' });
    }

    const event = await db.events.findOne({ _id: cert.eventId });
    const recipient = await db.recipients.findOne({ recipientId: cert.recipientId, eventId: cert.eventId });

    // Track that the user viewed the certificate
    const viewedAt = new Date().toISOString();
    await db.certificates.update(
      { _id: cert._id },
      {
        $set: {
          isViewed: true,
          viewedAt: viewedAt
        },
        $inc: { viewCount: 1 }
      }
    );

    // Update email delivery record if exists
    await db.emailDeliveries.update(
      { certificateId: cert.certificateId },
      {
        $set: {
          isViewed: true,
          viewedAt: viewedAt
        }
      }
    );

    return res.json({
      success: true,
      certificate: {
        certificateId: cert.certificateId,
        recipientName: cert.recipientName,
        recipientEmail: cert.recipientEmail,
        pdfUrl: cert.pdfUrl,
        fileName: cert.fileName,
        generatedAt: cert.generatedAt,
        isViewed: true,
        viewedAt
      },
      event: event ? {
        name: event.name,
        organizationName: event.organizationName,
        eventDate: event.eventDate,
        description: event.description
      } : null,
      recipient: recipient ? {
        recipientId: recipient.recipientId,
        extraData: recipient.extraData
      } : null
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/certificates/track-pixel/:certificateId - Tracking pixel to detect when user opens email
router.get('/track-pixel/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;
    const cert = await db.certificates.findOne({ certificateId });

    if (cert) {
      const viewedAt = new Date().toISOString();
      await db.certificates.update(
        { _id: cert._id },
        {
          $set: {
            isViewed: true,
            viewedAt: viewedAt
          },
          $inc: { viewCount: 1 }
        }
      );

      await db.emailDeliveries.update(
        { certificateId: cert.certificateId },
        {
          $set: {
            isViewed: true,
            viewedAt: viewedAt
          }
        }
      );
    }

    // 1x1 transparent PNG buffer
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.end(pixel);
  } catch (err) {
    return res.status(500).end();
  }
});

// POST /api/certificates/preview-sample - Live preview of template with sample or real recipient
router.post('/preview-sample', requireAuth, async (req, res) => {
  try {
    const { template, sampleData, eventId, recipientId } = req.body;
    if (!template) {
      return res.status(400).json({ success: false, error: 'Template configuration required.' });
    }

    let targetEvent = null;
    if (eventId) {
      targetEvent = await db.events.findOne({ _id: eventId });
    }

    let targetRecipient = null;
    if (eventId) {
      if (recipientId) {
        targetRecipient = await db.recipients.findOne({ recipientId, eventId });
      } else {
        targetRecipient = await db.recipients.findOne({ eventId });
      }
    }

    const dummyEvent = {
      name: sampleData?.eventName || targetEvent?.name || 'Global Innovation Summit 2026',
      organizationName: sampleData?.organizationName || targetEvent?.organizationName || 'Global Certification Authority',
      eventDate: sampleData?.date || targetEvent?.eventDate || 'October 15, 2026'
    };

    const dummyRecipient = {
      recipientId: targetRecipient?.recipientId || 'PREVIEW-001',
      name: sampleData?.recipientName || targetRecipient?.name || 'Rahul Kumar',
      email: targetRecipient?.email || 'preview@example.com',
      extraData: targetRecipient?.extraData || {
        position: sampleData?.position || 'First Place Winner - AI Systems',
        role: sampleData?.role || 'Lead Architect'
      }
    };

    const generated = await generateCertificatePdf({
      template,
      event: dummyEvent,
      recipient: dummyRecipient,
      certificateId: targetRecipient?.certificateId || 'CERT-PREVIEW-2026'
    });

    return res.json({
      success: true,
      pdfUrl: generated.pdfUrl,
      fileName: generated.fileName
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
