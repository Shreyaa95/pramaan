const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/events - List all events with calculated statistics
router.get('/', requireAuth, async (req, res) => {
  try {
    const events = await db.events.find({}, { sort: { createdAt: -1 } });
    
    // Enrich each event with recipient, certificate, and delivery statistics
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const totalRecipients = await db.recipients.count({ eventId: event._id });
        const generatedCount = await db.certificates.count({ eventId: event._id });
        const sentCount = await db.emailDeliveries.count({ eventId: event._id, status: 'sent' });
        const failedCount = await db.emailDeliveries.count({ eventId: event._id, status: 'failed' });
        const pendingCount = Math.max(0, totalRecipients - sentCount - failedCount);

        // Fetch template details if attached
        let template = null;
        if (event.templateId) {
          template = await db.templates.findOne({ _id: event.templateId });
        }

        return {
          ...event,
          templateName: template ? template.name : 'Not Selected',
          stats: {
            totalRecipients,
            generatedCount,
            sentCount,
            failedCount,
            pendingCount
          }
        };
      })
    );

    return res.json({ success: true, events: enrichedEvents });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/:id - Get specific event details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const event = await db.events.findOne({ _id: req.params.id });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    const template = event.templateId ? await db.templates.findOne({ _id: event.templateId }) : null;
    const totalRecipients = await db.recipients.count({ eventId: event._id });
    const generatedCount = await db.certificates.count({ eventId: event._id });
    const sentCount = await db.emailDeliveries.count({ eventId: event._id, status: 'sent' });
    const failedCount = await db.emailDeliveries.count({ eventId: event._id, status: 'failed' });
    const pendingCount = Math.max(0, totalRecipients - sentCount - failedCount);

    return res.json({
      success: true,
      event: {
        ...event,
        template,
        stats: {
          totalRecipients,
          generatedCount,
          sentCount,
          failedCount,
          pendingCount
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events - Create new event
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      eventDate,
      organizationName,
      templateId,
      certificatePrefix,
      emailConfig,
      dataSourceType,
      columnMapping,
      sourceMetadata
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Event name is required.' });
    }

    const newEvent = {
      name: name.trim(),
      description: description || '',
      eventDate: eventDate || new Date().toISOString().split('T')[0],
      organizationName: organizationName || 'PRAMAAN Global',
      templateId: templateId || null,
      certificatePrefix: (certificatePrefix || 'CERT').toUpperCase().trim(),
      dataSourceType: dataSourceType || 'csv',
      columnMapping: columnMapping || null,
      sourceMetadata: sourceMetadata || null,
      emailConfig: {
        subject: emailConfig?.subject || 'Congratulations on Your Achievement – {{eventName}} 🎓',
        body: emailConfig?.body || 'Dear {{recipientName}},\n\nWarmest congratulations on your outstanding achievement at {{eventName}}!\n\nYour dedication, hard work, and commendable performance have been truly inspiring. We are deeply honored to celebrate this special milestone with you.\n\nYour official certificate of achievement has been digitally generated and attached to this email. We wish you immense success and brilliant victories in all your future endeavors!\n\nWith heartfelt regards,\n{{organizationName}}',
        senderName: emailConfig?.senderName || 'PRAMAAN Automation',
        senderEmail: emailConfig?.senderEmail || ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const savedEvent = await db.events.insert(newEvent);
    return res.status(201).json({ success: true, event: savedEvent });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/events/:id - Update event details
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const event = await db.events.findOne({ _id: req.params.id });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    const {
      name,
      description,
      eventDate,
      organizationName,
      templateId,
      certificatePrefix,
      emailConfig,
      dataSourceType,
      columnMapping,
      sourceMetadata
    } = req.body;

    const updatedData = {
      ...event,
      name: name !== undefined ? name.trim() : event.name,
      description: description !== undefined ? description : event.description,
      eventDate: eventDate !== undefined ? eventDate : event.eventDate,
      organizationName: organizationName !== undefined ? organizationName : event.organizationName,
      templateId: templateId !== undefined ? templateId : event.templateId,
      certificatePrefix: certificatePrefix !== undefined ? certificatePrefix.toUpperCase().trim() : event.certificatePrefix,
      emailConfig: emailConfig !== undefined ? { ...event.emailConfig, ...emailConfig } : event.emailConfig,
      dataSourceType: dataSourceType !== undefined ? dataSourceType : (event.dataSourceType || 'csv'),
      columnMapping: columnMapping !== undefined ? columnMapping : (event.columnMapping || null),
      sourceMetadata: sourceMetadata !== undefined ? sourceMetadata : (event.sourceMetadata || null),
      updatedAt: new Date().toISOString()
    };

    await db.events.update({ _id: req.params.id }, updatedData);
    return res.json({ success: true, event: updatedData });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/events/:id - Delete event and its recipient/certificate data
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
    await db.events.remove({ _id: eventId });
    await db.recipients.remove({ eventId }, { multi: true });
    await db.certificates.remove({ eventId }, { multi: true });
    await db.emailDeliveries.remove({ eventId }, { multi: true });

    return res.json({ success: true, message: 'Event and associated records deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
