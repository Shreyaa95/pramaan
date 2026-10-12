const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/dashboard/stats - Global system statistics and activity feed
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const totalEvents = await db.events.count({});
    const totalRecipients = await db.recipients.count({});
    const totalCertificates = await db.certificates.count({});
    const emailsSent = await db.emailDeliveries.count({ status: 'sent' });
    const emailsFailed = await db.emailDeliveries.count({ status: 'failed' });
    const pendingEmails = Math.max(0, totalRecipients - emailsSent - emailsFailed);

    // Recent events
    const recentEvents = await db.events.find({}, { sort: { createdAt: -1 }, limit: 5 });

    // Recent delivery logs
    const recentDeliveries = await db.emailDeliveries.find({}, { sort: { sentAt: -1, lastAttemptAt: -1 }, limit: 8 });

    // Recent certificates
    const recentCertificates = await db.certificates.find({}, { sort: { generatedAt: -1 }, limit: 6 });

    // Failed deliveries needing attention
    const failedAlerts = await db.emailDeliveries.find({ status: 'failed' }, { limit: 5 });

    return res.json({
      success: true,
      stats: {
        totalEvents,
        totalRecipients,
        certificatesGenerated: totalCertificates,
        emailsSent,
        emailsFailed,
        pendingEmails,
        deliveryRate: totalRecipients > 0 ? Math.round((emailsSent / totalRecipients) * 100) : 0
      },
      recentEvents,
      recentDeliveries,
      recentCertificates,
      failedAlerts
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
