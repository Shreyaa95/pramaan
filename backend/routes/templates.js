const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Setup upload directory
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `template-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and PDF certificate templates are allowed.'));
    }
  }
});

// GET /api/templates - List all templates
router.get('/', requireAuth, async (req, res) => {
  try {
    const templates = await db.templates.find({}, { sort: { createdAt: -1 } });
    return res.json({ success: true, templates });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/templates/:id - Get specific template
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const template = await db.templates.findOne({ _id: req.params.id });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found.' });
    }
    return res.json({ success: true, template });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/templates/upload-background - Upload certificate template image/pdf
router.post('/upload-background', requireAuth, upload.single('templateFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No template file provided.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      filename: req.file.filename,
      filePath: req.file.path,
      fileUrl,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/templates - Create new template
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      width,
      height,
      backgroundPath,
      backgroundUrl,
      backgroundType,
      fields
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Template name is required.' });
    }

    const defaultFields = [
      {
        id: 'f1',
        key: 'recipientName',
        label: 'Recipient Name',
        xPercent: 50,
        yPercent: 50,
        font: 'Times',
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ca0019',
        align: 'center',
        sampleValue: 'John Doe'
      },
      {
        id: 'f2',
        key: 'eventName',
        label: 'Event Name',
        xPercent: 50,
        yPercent: 32,
        font: 'Helvetica',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        align: 'center',
        sampleValue: 'Tech Innovators Summit'
      },
      {
        id: 'f3',
        key: 'certificateId',
        label: 'Certificate ID',
        xPercent: 80,
        yPercent: 85,
        font: 'Courier',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6b7280',
        align: 'center',
        sampleValue: 'CERT-2026-0001'
      },
      {
        id: 'f4',
        key: 'date',
        label: 'Issue Date',
        xPercent: 20,
        yPercent: 85,
        font: 'Helvetica',
        fontSize: 12,
        fontWeight: 'normal',
        color: '#6b7280',
        align: 'center',
        sampleValue: 'October 15, 2026'
      }
    ];

    const newTemplate = {
      name: name.trim(),
      description: description || '',
      width: Number(width) || 842,
      height: Number(height) || 595,
      backgroundPath: backgroundPath || '',
      backgroundUrl: backgroundUrl || '',
      backgroundType: backgroundType || (backgroundUrl ? 'image' : 'canvas'),
      fields: fields && Array.isArray(fields) && fields.length > 0 ? fields : defaultFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await db.templates.insert(newTemplate);
    return res.status(201).json({ success: true, template: saved });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/templates/:id - Update template settings & fields
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const template = await db.templates.findOne({ _id: req.params.id });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found.' });
    }

    const {
      name,
      description,
      width,
      height,
      backgroundPath,
      backgroundUrl,
      backgroundType,
      fields
    } = req.body;

    const updated = {
      ...template,
      name: name !== undefined ? name.trim() : template.name,
      description: description !== undefined ? description : template.description,
      width: width !== undefined ? Number(width) : template.width,
      height: height !== undefined ? Number(height) : template.height,
      backgroundPath: backgroundPath !== undefined ? backgroundPath : template.backgroundPath,
      backgroundUrl: backgroundUrl !== undefined ? backgroundUrl : template.backgroundUrl,
      backgroundType: backgroundType !== undefined ? backgroundType : template.backgroundType,
      fields: fields !== undefined ? fields : template.fields,
      updatedAt: new Date().toISOString()
    };

    await db.templates.update({ _id: req.params.id }, updated);
    return res.json({ success: true, template: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/templates/:id - Delete template
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.templates.remove({ _id: req.params.id });
    return res.json({ success: true, message: 'Template deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
