const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const {
  getActiveSmtpConfig,
  verifySmtp,
  sendCertificateEmail,
  clearTransporterCache
} = require('../services/emailService');
const { generateCertificatePdf } = require('../services/certificateService');

// POST /api/email/send-bulk/:eventId - Send certificates to all generated recipients in event
router.post('/send-bulk/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const force = req.body?.force === true || req.query?.force === 'true';
    const event = await db.events.findOne({ _id: eventId });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    // Find all generated certificates for this event
    const certificates = await db.certificates.find({ eventId });
    if (certificates.length === 0) {
      return res.status(400).json({ success: false, error: 'No generated certificates found for this event. Generate certificates first.' });
    }

    const sentResults = [];
    const failedResults = [];

    for (const cert of certificates) {
      // Find EXACT matching recipient by recipientId - NEVER by name!
      const recipient = await db.recipients.findOne({ recipientId: cert.recipientId, eventId });
      if (!recipient) {
        failedResults.push({
          recipientId: cert.recipientId,
          error: 'Recipient record not found for certificate.'
        });
        continue;
      }

      // Check if delivery already succeeded (skip already sent unless forced)
      const existingDelivery = await db.emailDeliveries.findOne({ recipientId: recipient.recipientId, eventId });
      if (!force && existingDelivery && existingDelivery.status === 'sent') {
        continue; // Already successfully delivered and force resend was not requested
      }

      try {
        const sendResult = await sendCertificateEmail({
          event,
          recipient,
          certificate: cert
        });

        // Record successful delivery
        const deliveryRecord = {
          eventId,
          certificateId: cert.certificateId,
          recipientId: recipient.recipientId,
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          status: 'sent',
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl || null,
          isTest: !!sendResult.isTest,
          sentAt: new Date().toISOString(),
          errorMessage: null,
          retryCount: existingDelivery ? (existingDelivery.retryCount || 0) + 1 : 0
        };

        if (existingDelivery) {
          await db.emailDeliveries.update({ _id: existingDelivery._id }, deliveryRecord);
        } else {
          await db.emailDeliveries.insert(deliveryRecord);
        }

        await db.certificates.update({ _id: cert._id }, { status: 'sent' });
        await db.recipients.update({ _id: recipient._id }, { status: 'sent' });

        sentResults.push({
          recipientId: recipient.recipientId,
          name: recipient.name,
          email: recipient.email,
          previewUrl: sendResult.previewUrl
        });
      } catch (sendErr) {
        // Record failed delivery with detailed error
        const deliveryRecord = {
          eventId,
          certificateId: cert.certificateId,
          recipientId: recipient.recipientId,
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          status: 'failed',
          errorMessage: sendErr.message,
          retryCount: existingDelivery ? (existingDelivery.retryCount || 0) + 1 : 0,
          lastAttemptAt: new Date().toISOString()
        };

        if (existingDelivery) {
          await db.emailDeliveries.update({ _id: existingDelivery._id }, deliveryRecord);
        } else {
          await db.emailDeliveries.insert(deliveryRecord);
        }

        await db.certificates.update({ _id: cert._id }, { status: 'failed' });
        await db.recipients.update({ _id: recipient._id }, { status: 'failed' });

        failedResults.push({
          recipientId: recipient.recipientId,
          name: recipient.name,
          email: recipient.email,
          error: sendErr.message
        });
      }
    }

    return res.json({
      success: true,
      totalProcessed: sentResults.length + failedResults.length,
      sentCount: sentResults.length,
      failedCount: failedResults.length,
      sent: sentResults,
      failed: failedResults
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/email/retry-failed/:eventId - Retry all failed email deliveries for an event
router.post('/retry-failed/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await db.events.findOne({ _id: eventId });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    const failedDeliveries = await db.emailDeliveries.find({ eventId, status: 'failed' });
    if (failedDeliveries.length === 0) {
      return res.json({
        success: true,
        message: 'No failed deliveries found to retry. All deliveries are currently marked as sent.',
        totalRetried: 0,
        successfulRetries: 0,
        failedRetries: 0,
        sent: [],
        failed: []
      });
    }

    const retriedSent = [];
    const retriedFailed = [];

    for (const delivery of failedDeliveries) {
      // Find exact recipient and exact certificate - DO NOT regenerate certificate
      const recipient = await db.recipients.findOne({ recipientId: delivery.recipientId, eventId });
      const certificate = await db.certificates.findOne({ recipientId: delivery.recipientId, eventId });

      if (!recipient || !certificate) {
        retriedFailed.push({
          recipientId: delivery.recipientId,
          error: 'Missing recipient or certificate file for retry.'
        });
        continue;
      }

      try {
        const sendResult = await sendCertificateEmail({
          event,
          recipient,
          certificate
        });

        await db.emailDeliveries.update(
          { _id: delivery._id },
          {
            status: 'sent',
            sentAt: new Date().toISOString(),
            errorMessage: null,
            messageId: sendResult.messageId,
            previewUrl: sendResult.previewUrl || null,
            retryCount: (delivery.retryCount || 0) + 1
          }
        );

        await db.certificates.update({ _id: certificate._id }, { status: 'sent' });
        await db.recipients.update({ _id: recipient._id }, { status: 'sent' });

        retriedSent.push({
          recipientId: recipient.recipientId,
          email: recipient.email,
          previewUrl: sendResult.previewUrl
        });
      } catch (err) {
        await db.emailDeliveries.update(
          { _id: delivery._id },
          {
            status: 'failed',
            errorMessage: err.message,
            lastAttemptAt: new Date().toISOString(),
            retryCount: (delivery.retryCount || 0) + 1
          }
        );

        retriedFailed.push({
          recipientId: recipient.recipientId,
          email: recipient.email,
          error: err.message
        });
      }
    }

    return res.json({
      success: true,
      totalRetried: failedDeliveries.length,
      successfulRetries: retriedSent.length,
      failedRetries: retriedFailed.length,
      sent: retriedSent,
      failed: retriedFailed
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/email/mark-failed/:deliveryId - Mark delivery as failed for simulation/retry verification
router.post('/mark-failed/:deliveryId', requireAuth, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const delivery = await db.emailDeliveries.findOne({ _id: deliveryId });
    if (!delivery) return res.status(404).json({ success: false, error: 'Delivery not found.' });
    await db.emailDeliveries.update(
      { _id: deliveryId },
      { $set: { status: 'failed', errorMessage: 'Simulated connection timeout during dispatch' } }
    );
    await db.recipients.update(
      { recipientId: delivery.recipientId, eventId: delivery.eventId },
      { $set: { status: 'failed' } }
    );
    return res.json({ success: true, message: 'Delivery marked as failed.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/email/retry-single/:deliveryId
router.post('/retry-single/:deliveryId', requireAuth, async (req, res) => {
  try {
    const delivery = await db.emailDeliveries.findOne({ _id: req.params.deliveryId });
    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery record not found.' });
    }

    const event = await db.events.findOne({ _id: delivery.eventId });
    const recipient = await db.recipients.findOne({ recipientId: delivery.recipientId, eventId: delivery.eventId });
    const certificate = await db.certificates.findOne({ recipientId: delivery.recipientId, eventId: delivery.eventId });

    if (!event || !recipient || !certificate) {
      return res.status(400).json({ success: false, error: 'Associated event, recipient or certificate not found.' });
    }

    try {
      const sendResult = await sendCertificateEmail({
        event,
        recipient,
        certificate
      });

      await db.emailDeliveries.update(
        { _id: delivery._id },
        {
          status: 'sent',
          sentAt: new Date().toISOString(),
          errorMessage: null,
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl || null,
          retryCount: (delivery.retryCount || 0) + 1
        }
      );

      await db.certificates.update({ _id: certificate._id }, { status: 'sent' });
      await db.recipients.update({ _id: recipient._id }, { status: 'sent' });

      return res.json({ success: true, previewUrl: sendResult.previewUrl });
    } catch (err) {
      await db.emailDeliveries.update(
        { _id: delivery._id },
        {
          status: 'failed',
          errorMessage: err.message,
          lastAttemptAt: new Date().toISOString(),
          retryCount: (delivery.retryCount || 0) + 1
        }
      );
      return res.status(400).json({ success: false, error: err.message });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/email/send-recipient/:recipientId - Send or resend certificate directly to a specific recipient
router.post('/send-recipient/:recipientId', requireAuth, async (req, res) => {
  try {
    const { recipientId } = req.params;
    let recipient = await db.recipients.findOne({ _id: recipientId });
    if (!recipient) {
      recipient = await db.recipients.findOne({ recipientId: recipientId });
    }
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found.' });
    }

    const event = await db.events.findOne({ _id: recipient.eventId });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found for this recipient.' });
    }

    const certificate = await db.certificates.findOne({ recipientId: recipient.recipientId, eventId: recipient.eventId });
    if (!certificate) {
      return res.status(400).json({ success: false, error: 'Certificate has not been generated yet for this recipient.' });
    }

    try {
      const sendResult = await sendCertificateEmail({
        event,
        recipient,
        certificate
      });

      const existingDelivery = await db.emailDeliveries.findOne({ recipientId: recipient.recipientId, eventId: recipient.eventId });
      const deliveryRecord = {
        eventId: recipient.eventId,
        certificateId: certificate.certificateId,
        recipientId: recipient.recipientId,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        status: 'sent',
        messageId: sendResult.messageId,
        previewUrl: sendResult.previewUrl || null,
        isTest: !!sendResult.isTest,
        sentAt: new Date().toISOString(),
        errorMessage: null,
        retryCount: existingDelivery ? (existingDelivery.retryCount || 0) + 1 : 0
      };

      if (existingDelivery) {
        await db.emailDeliveries.update({ _id: existingDelivery._id }, deliveryRecord);
      } else {
        await db.emailDeliveries.insert(deliveryRecord);
      }

      await db.certificates.update({ _id: certificate._id }, { status: 'sent' });
      await db.recipients.update({ _id: recipient._id }, { status: 'sent' });

      return res.json({
        success: true,
        recipientId: recipient.recipientId,
        email: recipient.email,
        messageId: sendResult.messageId,
        previewUrl: sendResult.previewUrl,
        isTest: sendResult.isTest
      });
    } catch (sendErr) {
      const existingDelivery = await db.emailDeliveries.findOne({ recipientId: recipient.recipientId, eventId: recipient.eventId });
      const deliveryRecord = {
        eventId: recipient.eventId,
        certificateId: certificate.certificateId,
        recipientId: recipient.recipientId,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        status: 'failed',
        errorMessage: sendErr.message,
        retryCount: existingDelivery ? (existingDelivery.retryCount || 0) + 1 : 0,
        lastAttemptAt: new Date().toISOString()
      };

      if (existingDelivery) {
        await db.emailDeliveries.update({ _id: existingDelivery._id }, deliveryRecord);
      } else {
        await db.emailDeliveries.insert(deliveryRecord);
      }

      await db.certificates.update({ _id: certificate._id }, { status: 'failed' });
      await db.recipients.update({ _id: recipient._id }, { status: 'failed' });

      return res.status(400).json({ success: false, error: sendErr.message });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/email/logs/:eventId - Audit delivery logs
router.get('/logs/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const logs = await db.emailDeliveries.find({ eventId }, { sort: { sentAt: -1, lastAttemptAt: -1 } });
    return res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/email/settings - Get active SMTP settings (masked)
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const config = await getActiveSmtpConfig();
    if (!config) {
      return res.json({
        success: true,
        configured: false,
        isTestFallback: true,
        settings: {
          host: '',
          port: 587,
          secure: false,
          user: '',
          pass: '',
          senderEmail: '',
          senderName: 'PRAMAAN Notifications'
        }
      });
    }

    return res.json({
      success: true,
      configured: true,
      settings: {
        host: config.host,
        port: config.port,
        secure: !!config.secure,
        user: config.user,
        pass: config.pass ? '••••••••••••' : '',
        senderEmail: config.senderEmail,
        senderName: config.senderName
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/email/settings - Save SMTP configuration
router.post('/settings', requireAuth, async (req, res) => {
  try {
    const { host, port, secure, user, pass, senderEmail, senderName } = req.body;

    if (!host || host.trim() === '') {
      await db.settings.remove({ key: 'smtp_config' });
      clearTransporterCache();
      return res.json({ success: true, message: 'SMTP settings reset to Test Sandbox mode.' });
    }

    if (!user) {
      return res.status(400).json({ success: false, error: 'SMTP username/email is required.' });
    }

    // Preserve existing password if user submits masked bullets
    let finalPass = pass;
    if (pass === '••••••••••••' || !pass) {
      const existing = await db.settings.findOne({ key: 'smtp_config' });
      finalPass = existing?.value?.pass || '';
    }

    const trimmedHost = host.trim();
    const isGmail = trimmedHost.toLowerCase().includes('gmail');
    const finalPort = Number(port) || (isGmail ? 465 : 587);
    const finalSecure = isGmail ? (finalPort === 465) : (!!secure || finalPort === 465);
    const cleanUser = user.trim();
    const cleanPass = finalPass ? String(finalPass).replace(/\s+/g, '') : '';

    const configValue = {
      host: trimmedHost,
      port: finalPort,
      secure: finalSecure,
      user: cleanUser,
      pass: cleanPass,
      senderEmail: (senderEmail || cleanUser).trim(),
      senderName: (senderName || 'PRAMAAN').trim()
    };

    const existingDoc = await db.settings.findOne({ key: 'smtp_config' });
    if (existingDoc) {
      await db.settings.update({ key: 'smtp_config' }, { key: 'smtp_config', value: configValue });
    } else {
      await db.settings.insert({ key: 'smtp_config', value: configValue });
    }

    clearTransporterCache();
    return res.json({ success: true, message: 'SMTP settings updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/email/settings - Reset SMTP configuration to Test Sandbox mode
router.delete('/settings', requireAuth, async (req, res) => {
  try {
    await db.settings.remove({ key: 'smtp_config' });
    clearTransporterCache();
    return res.json({ success: true, message: 'SMTP configuration removed. Ethereal sandbox test mode active.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/email/verify-smtp - Test SMTP connection
router.post('/verify-smtp', requireAuth, async (req, res) => {
  try {
    const config = req.body;
    let finalPass = config.pass;
    if (config.pass === '••••••••••••' || !config.pass) {
      const existing = await db.settings.findOne({ key: 'smtp_config' });
      finalPass = existing?.value?.pass || process.env.SMTP_PASSWORD;
    }

    const cleanHost = String(config.host || '').trim();
    const isGmail = cleanHost.toLowerCase().includes('gmail');
    const cleanPort = Number(config.port) || (isGmail ? 465 : 587);
    const cleanSecure = isGmail ? (cleanPort === 465) : (Boolean(config.secure) || cleanPort === 465);

    const cleanConfig = {
      ...config,
      host: cleanHost,
      port: cleanPort,
      secure: cleanSecure,
      user: String(config.user || '').trim(),
      pass: finalPass ? String(finalPass).replace(/\s+/g, '') : ''
    };

    const result = await verifySmtp(cleanConfig);

    if (result.success) {
      return res.json({ success: true, message: 'SMTP connection established successfully!' });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/email/instant-dispatch - Direct single-certificate issue & email dispatch for extension
router.post('/instant-dispatch', async (req, res) => {
  try {
    let { eventId, name, email, role, subject, message } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Recipient name and recipient email are required.' });
    }

    const recipientEmail = String(email).trim().toLowerCase();
    const recipientName = String(name).trim();

    // 1. Resolve target event
    let event = null;
    if (eventId) {
      event = await db.events.findOne({ _id: eventId });
    }
    if (!event) {
      const allEvents = await db.events.find({});
      if (allEvents.length > 0) {
        event = allEvents[allEvents.length - 1]; // latest event
      }
    }
    if (!event) {
      return res.status(400).json({ success: false, error: 'No active batch found. Please initialize an event batch first.' });
    }

    // 2. Resolve template
    let template = null;
    if (event.templateId) {
      template = await db.templates.findOne({ _id: event.templateId });
    }
    if (!template) {
      template = await db.templates.findOne({ isDefault: true });
    }
    if (!template) {
      const allTemplates = await db.templates.find({});
      if (allTemplates.length > 0) template = allTemplates[0];
    }
    if (!template) {
      return res.status(400).json({ success: false, error: 'No certificate template found for this event.' });
    }

    // 3. Resolve or create recipient
    let recipient = await db.recipients.findOne({ email: recipientEmail, eventId: event._id });
    if (!recipient) {
      const count = await db.recipients.count({ eventId: event._id });
      const paddedSeq = String(count + 1).padStart(4, '0');
      const recipientId = `REC-${event.certificatePrefix || 'CERT'}-${paddedSeq}`;
      recipient = await db.recipients.insert({
        recipientId,
        eventId: event._id,
        name: recipientName,
        email: recipientEmail,
        extraData: { role: role || 'Certificate Recipient' },
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } else {
      await db.recipients.update(
        { _id: recipient._id },
        { 
          $set: { 
            name: recipientName,
            'extraData.role': role || recipient.extraData?.role || 'Certificate Recipient'
          }
        }
      );
      recipient.name = recipientName;
    }

    // 4. Generate or retrieve personalized vector PDF certificate
    let certDoc = await db.certificates.findOne({ recipientId: recipient.recipientId, eventId: event._id });
    let certificateId = certDoc ? certDoc.certificateId : null;

    if (!certificateId) {
      const certCount = await db.certificates.count({ eventId: event._id });
      const year = new Date().getFullYear();
      const padded = String(certCount + 1).padStart(4, '0');
      certificateId = `${event.certificatePrefix || 'CERT'}-${year}-${padded}`;
    }

    const generated = await generateCertificatePdf({
      template,
      event,
      recipient,
      certificateId
    });

    const certRecord = {
      certificateId: generated.certificateId,
      eventId: event._id,
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
      certRecord._id = certDoc._id;
    } else {
      certRecord._id = await db.certificates.insert(certRecord);
    }

    // 5. Override email config if custom subject/message is passed
    const dispatchEvent = {
      ...event,
      emailConfig: {
        ...event.emailConfig,
        subject: subject || event.emailConfig?.subject || `Your Official Certificate – ${event.name}`,
        body: message || event.emailConfig?.body || `Hi {{recipientName}},\n\nYour official certificate for ${event.name} has been generated and is attached to this email.\n\nCertificate ID: {{certificateId}}\n\nWarm regards,\n${event.organizationName || 'Global Certification Authority'}`
      }
    };

    // 6. Deliver email immediately via Nodemailer
    const sendResult = await sendCertificateEmail({
      event: dispatchEvent,
      recipient,
      certificate: certRecord
    });

    // 7. Audit delivery record
    const deliveryRecord = {
      eventId: event._id,
      certificateId: certRecord.certificateId,
      recipientId: recipient.recipientId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      status: 'sent',
      messageId: sendResult.messageId,
      previewUrl: sendResult.previewUrl || null,
      isTest: !!sendResult.isTest,
      sentAt: new Date().toISOString(),
      errorMessage: null,
      retryCount: 0
    };

    const existingDelivery = await db.emailDeliveries.findOne({ recipientId: recipient.recipientId, eventId: event._id });
    if (existingDelivery) {
      await db.emailDeliveries.update({ _id: existingDelivery._id }, deliveryRecord);
    } else {
      await db.emailDeliveries.insert(deliveryRecord);
    }

    await db.certificates.update({ _id: certRecord._id }, { status: 'sent' });
    await db.recipients.update({ _id: recipient._id }, { status: 'sent' });

    return res.json({
      success: true,
      message: `Certificate successfully sent to ${recipient.email}!`,
      certificateId: certRecord.certificateId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      pdfUrl: certRecord.pdfUrl,
      previewUrl: sendResult.previewUrl || null,
      isTest: !!sendResult.isTest,
      messageId: sendResult.messageId,
      eventName: event.name,
      sentAt: deliveryRecord.sentAt
    });
  } catch (err) {
    console.error('Instant dispatch error:', err);
    return res.status(500).json({
      success: false,
      error: `Failed to deliver certificate email: ${err.message}`
    });
  }
});

// POST /api/email/instant-batch-dispatch/:eventId - Send certificates for all pending recipients in batch
router.post('/instant-batch-dispatch/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await db.events.findOne({ _id: eventId });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    let template = await db.templates.findOne({ _id: event.templateId });
    if (!template) template = await db.templates.findOne({ isDefault: true });

    const recipients = await db.recipients.find({ eventId });
    if (recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'No recipients found in this batch.' });
    }

    let sentCount = 0;
    let failedCount = 0;
    const results = [];

    for (let recipient of recipients) {
      try {
        // 1. Ensure certificate exists
        let certDoc = await db.certificates.findOne({ recipientId: recipient.recipientId, eventId });
        if (!certDoc) {
          const certCount = await db.certificates.count({ eventId });
          const year = new Date().getFullYear();
          const padded = String(certCount + 1).padStart(4, '0');
          const certificateId = `${event.certificatePrefix || 'CERT'}-${year}-${padded}`;

          const generated = await generateCertificatePdf({
            template,
            event,
            recipient,
            certificateId
          });

          certDoc = {
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
          certDoc._id = await db.certificates.insert(certDoc);
        }

        // 2. Send email
        const sendResult = await sendCertificateEmail({
          event,
          recipient,
          certificate: certDoc
        });

        // 3. Log delivery
        const deliveryRecord = {
          eventId,
          certificateId: certDoc.certificateId,
          recipientId: recipient.recipientId,
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          status: 'sent',
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl || null,
          isTest: !!sendResult.isTest,
          sentAt: new Date().toISOString(),
          errorMessage: null
        };

        const existing = await db.emailDeliveries.findOne({ recipientId: recipient.recipientId, eventId });
        if (existing) {
          await db.emailDeliveries.update({ _id: existing._id }, deliveryRecord);
        } else {
          await db.emailDeliveries.insert(deliveryRecord);
        }

        await db.certificates.update({ _id: certDoc._id }, { status: 'sent' });
        await db.recipients.update({ _id: recipient._id }, { status: 'sent' });

        sentCount++;
        results.push({ email: recipient.email, status: 'sent', previewUrl: sendResult.previewUrl });
      } catch (itemErr) {
        failedCount++;
        results.push({ email: recipient.email, status: 'failed', error: itemErr.message });
      }
    }

    return res.json({
      success: true,
      message: `Batch dispatch completed: ${sentCount} sent, ${failedCount} failed.`,
      sentCount,
      failedCount,
      results
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
