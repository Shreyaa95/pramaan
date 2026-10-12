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

module.exports = router;
