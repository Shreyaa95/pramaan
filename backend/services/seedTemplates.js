const db = require('../db');
const bcrypt = require('bcryptjs');

async function seedInitialData() {
  // 1. Seed Admin user if none exists
  const adminCount = await db.admins.count({});
  if (adminCount === 0) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    await db.admins.insert({
      username: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@smartcert.io',
      passwordHash,
      role: 'Super Admin',
      createdAt: new Date().toISOString()
    });
    console.log('[Seed] Created default admin: admin@smartcert.io / admin123');
  }

  // 2. Seed initial templates if none exists
  const templateCount = await db.templates.count({});
  if (templateCount === 0) {
    const sampleTemplates = [
      {
        name: 'The Uniques IdeaJam 2026 Certificate',
        description: 'Official sleek dark-mode certificate with Uniques crimson accent borders and geometric seal.',
        width: 842,
        height: 595,
        backgroundType: 'canvas',
        fields: [
          {
            id: 'f1',
            key: 'organizationName',
            label: 'Organization Name',
            xPercent: 50,
            yPercent: 18,
            font: 'Helvetica',
            fontSize: 22,
            fontWeight: 'bold',
            color: '#ca0019',
            align: 'center',
            sampleValue: 'THE UNIQUES COMMUNITY'
          },
          {
            id: 'f2',
            key: 'eventName',
            label: 'Event Name',
            xPercent: 50,
            yPercent: 30,
            font: 'Helvetica',
            fontSize: 28,
            fontWeight: 'bold',
            color: '#111827',
            align: 'center',
            sampleValue: 'IDEAJAM 2026 HACKATHON'
          },
          {
            id: 'f3',
            key: 'titleText',
            label: 'Honor Title',
            xPercent: 50,
            yPercent: 39,
            font: 'Times',
            fontSize: 16,
            fontWeight: 'normal',
            fontStyle: 'italic',
            color: '#4b5563',
            align: 'center',
            sampleValue: 'This certificate of achievement is proudly presented to'
          },
          {
            id: 'f4',
            key: 'recipientName',
            label: 'Recipient Name',
            xPercent: 50,
            yPercent: 50,
            font: 'Times',
            fontSize: 34,
            fontWeight: 'bold',
            color: '#ca0019',
            align: 'center',
            sampleValue: 'Alex Reynolds'
          },
          {
            id: 'f5',
            key: 'position',
            label: 'Achievement Role / Details',
            xPercent: 50,
            yPercent: 62,
            font: 'Helvetica',
            fontSize: 15,
            fontWeight: 'normal',
            color: '#374151',
            align: 'center',
            sampleValue: 'for exemplary demonstration of technical innovation and rapid engineering'
          },
          {
            id: 'f6',
            key: 'date',
            label: 'Issue Date',
            xPercent: 25,
            yPercent: 82,
            font: 'Helvetica',
            fontSize: 13,
            fontWeight: 'normal',
            color: '#6b7280',
            align: 'center',
            sampleValue: 'October 15, 2026'
          },
          {
            id: 'f7',
            key: 'certificateId',
            label: 'Certificate ID',
            xPercent: 75,
            yPercent: 82,
            font: 'Courier',
            fontSize: 13,
            fontWeight: 'bold',
            color: '#ca0019',
            align: 'center',
            sampleValue: 'CERT-2026-0001'
          }
        ],
        isDefault: true,
        createdAt: new Date().toISOString()
      },
      {
        name: 'Executive Leadership & Masterclass',
        description: 'Classic royal gold & obsidian design suited for workshops, seminars, and diplomas.',
        width: 842,
        height: 595,
        backgroundType: 'canvas',
        fields: [
          {
            id: 'f1',
            key: 'organizationName',
            label: 'Organization Name',
            xPercent: 50,
            yPercent: 20,
            font: 'Times',
            fontSize: 24,
            fontWeight: 'bold',
            color: '#92400e',
            align: 'center',
            sampleValue: 'GLOBAL INSTITUTE OF TECHNOLOGY'
          },
          {
            id: 'f2',
            key: 'recipientName',
            label: 'Recipient Name',
            xPercent: 50,
            yPercent: 48,
            font: 'Times',
            fontSize: 36,
            fontWeight: 'bold',
            color: '#1f2937',
            align: 'center',
            sampleValue: 'Sophia Chen'
          },
          {
            id: 'f3',
            key: 'eventName',
            label: 'Event / Course Name',
            xPercent: 50,
            yPercent: 60,
            font: 'Helvetica',
            fontSize: 18,
            fontWeight: 'bold',
            color: '#4b5563',
            align: 'center',
            sampleValue: 'Full-Stack Architecture & Cloud Systems'
          },
          {
            id: 'f4',
            key: 'date',
            label: 'Date',
            xPercent: 22,
            yPercent: 80,
            font: 'Helvetica',
            fontSize: 12,
            fontWeight: 'normal',
            color: '#6b7280',
            align: 'center',
            sampleValue: 'November 20, 2026'
          },
          {
            id: 'f5',
            key: 'certificateId',
            label: 'Certificate ID',
            xPercent: 78,
            yPercent: 80,
            font: 'Courier',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#92400e',
            align: 'center',
            sampleValue: 'CERT-2026-EX-99'
          }
        ],
        isDefault: false,
        createdAt: new Date().toISOString()
      }
    ];

    for (const t of sampleTemplates) {
      await db.templates.insert(t);
    }
    console.log('[Seed] Inserted 2 starter templates.');
  }

  // 3. Seed sample demo event if none exists
  const eventCount = await db.events.count({});
  if (eventCount === 0) {
    const defaultTemplate = await db.templates.findOne({ isDefault: true });
    const event = await db.events.insert({
      name: 'IdeaJam 2026 Hackathon',
      description: 'The Uniques annual flagship tech showcase and competitive hackathon.',
      eventDate: 'October 15, 2026',
      organizationName: 'The Uniques Community',
      templateId: defaultTemplate?._id,
      certificatePrefix: 'IJ26',
      emailConfig: {
        subject: 'Your Certificate – IdeaJam 2026 Hackathon',
        body: 'Hi {{recipientName}},\n\nYour certificate for IdeaJam 2026 Hackathon is attached to this email.\n\nRegards,\nThe Uniques Community',
        senderName: 'The Uniques Community',
        senderEmail: 'certifications@theuniques.in'
      },
      createdAt: new Date().toISOString()
    });

    // Seed sample recipients to demonstrate exact duplicate name handling and verification
    const sampleRecipients = [
      {
        recipientId: 'REC-IJ-101',
        eventId: event._id,
        name: 'Rahul Kumar',
        email: 'rahul.kumar1@example.com',
        extraData: { position: 'First Place Winner - AI Track', college: 'SVIET' },
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        recipientId: 'REC-IJ-102',
        eventId: event._id,
        name: 'Rahul Kumar', // Demonstrating critical requirement: duplicate name, distinct email & recipientId!
        email: 'rahul.kumar2@example.com',
        extraData: { position: 'Runner Up - Web Systems', college: 'IIT Ropar' },
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        recipientId: 'REC-IJ-103',
        eventId: event._id,
        name: 'Aanya Sharma',
        email: 'aanya.sharma@example.com',
        extraData: { position: 'Best UI/UX Design', college: 'Chitkara' },
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        recipientId: 'REC-IJ-104',
        eventId: event._id,
        name: 'Devansh Verma',
        email: 'devansh.v@example.com',
        extraData: { position: 'Special Jury Mention', college: 'Thapar' },
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    ];

    await db.recipients.insertMany(sampleRecipients);
    console.log(`[Seed] Seeded initial event '${event.name}' with 4 recipients.`);
  }
}

module.exports = { seedInitialData };
