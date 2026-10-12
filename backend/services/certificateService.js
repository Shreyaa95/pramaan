const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const CERT_STORAGE_DIR = path.join(__dirname, '..', 'generated_certificates');
if (!fs.existsSync(CERT_STORAGE_DIR)) {
  fs.mkdirSync(CERT_STORAGE_DIR, { recursive: true });
}

// Convert hex color to pdf-lib rgb values (0.0 - 1.0)
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return rgb(0.1, 0.1, 0.1);
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return rgb(0.1, 0.1, 0.1);
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    return rgb(r, g, b);
  }
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return rgb(r, g, b);
}

// Map user-selected font style to StandardFonts
function resolveFont(doc, fontName = 'helvetica', fontWeight = 'normal', fontStyle = 'normal') {
  const isBold = fontWeight === 'bold' || fontWeight === '700' || fontWeight === '800';
  const isItalic = fontStyle === 'italic' || fontStyle === 'oblique';

  const family = (fontName || '').toLowerCase();

  if (family.includes('times') || family.includes('serif') || family.includes('cinzel') || family.includes('playfair')) {
    if (isBold && isItalic) return doc.embedStandardFont(StandardFonts.TimesRomanBoldItalic);
    if (isBold) return doc.embedStandardFont(StandardFonts.TimesRomanBold);
    if (isItalic) return doc.embedStandardFont(StandardFonts.TimesRomanItalic);
    return doc.embedStandardFont(StandardFonts.TimesRoman);
  }

  if (family.includes('courier') || family.includes('mono')) {
    if (isBold && isItalic) return doc.embedStandardFont(StandardFonts.CourierBoldOblique);
    if (isBold) return doc.embedStandardFont(StandardFonts.CourierBold);
    if (isItalic) return doc.embedStandardFont(StandardFonts.CourierOblique);
    return doc.embedStandardFont(StandardFonts.Courier);
  }

  // Default to clean modern sans-serif (Helvetica)
  if (isBold && isItalic) return doc.embedStandardFont(StandardFonts.HelveticaBoldOblique);
  if (isBold) return doc.embedStandardFont(StandardFonts.HelveticaBold);
  if (isItalic) return doc.embedStandardFont(StandardFonts.HelveticaOblique);
  return doc.embedStandardFont(StandardFonts.Helvetica);
}

// Helper to sanitize recipient names for safe filenames
function sanitizeFilename(name) {
  if (!name) return 'Recipient';
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Generate a single personalized PDF certificate
 */
async function generateCertificatePdf({
  template,
  event,
  recipient,
  certificateId
}) {
  const doc = await PDFDocument.create();

  // Standard certificate orientation: Landscape (842 x 595 - A4 standard landscape or custom)
  let width = template.width || 842;
  let height = template.height || 595;

  const page = doc.addPage([width, height]);

  // 1. Draw Template Background if available
  let backgroundEmbedded = false;
  if (template.backgroundPath && fs.existsSync(template.backgroundPath)) {
    try {
      const ext = path.extname(template.backgroundPath).toLowerCase();
      const bgBytes = fs.readFileSync(template.backgroundPath);
      let bgImage;
      if (ext === '.png') {
        bgImage = await doc.embedPng(bgBytes);
      } else if (ext === '.jpg' || ext === '.jpeg') {
        bgImage = await doc.embedJpg(bgBytes);
      }

      if (bgImage) {
        page.drawImage(bgImage, {
          x: 0,
          y: 0,
          width,
          height
        });
        backgroundEmbedded = true;
      }
    } catch (err) {
      console.warn(`[CertEngine] Could not embed background file: ${err.message}. Using default canvas.`);
    }
  }

  // Fallback default elegant certificate frame if no background image is supplied
  if (!backgroundEmbedded) {
    // Elegant off-white paper tone
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.985, 0.985, 0.99)
    });

    // Dark sleek outer border
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: rgb(0.08, 0.09, 0.12),
      borderWidth: 2
    });

    // Elegant Crimson Accent inner border (inspired by The Uniques identity)
    page.drawRectangle({
      x: 28,
      y: 28,
      width: width - 56,
      height: height - 56,
      borderColor: rgb(0.79, 0, 0.1), // #ca0019
      borderWidth: 1
    });

    // Corner decorative accents
    const corners = [
      { x: 28, y: height - 48 },
      { x: width - 48, y: height - 48 },
      { x: 28, y: 28 },
      { x: width - 48, y: 28 }
    ];
    corners.forEach(c => {
      page.drawRectangle({
        x: c.x,
        y: c.y,
        width: 20,
        height: 20,
        color: rgb(0.79, 0, 0.1)
      });
    });
  }

  // 2. Render Dynamic Fields
  const fields = template.fields || [];

  for (const field of fields) {
    // Resolve dynamic text value for this field
    let text = '';
    const key = (field.key || field.id || '').toLowerCase();

    if (key === 'recipientname' || key === 'name') {
      text = recipient.name || '';
    } else if (key === 'eventname' || key === 'event') {
      text = event.name || '';
    } else if (key === 'certificateid' || key === 'certid') {
      text = certificateId || '';
    } else if (key === 'date' || key === 'issuedate') {
      text = event.eventDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } else if (key === 'organizationname' || key === 'organization' || key === 'org') {
      text = event.organizationName || 'PRAMAAN Global';
    } else if (key === 'position' || key === 'role') {
      text = (recipient.extraData && recipient.extraData.position) || (recipient.extraData && recipient.extraData.role) || 'Certificate of Participation';
    } else {
      // Custom field
      text = (recipient.extraData && recipient.extraData[field.key]) || field.sampleValue || field.label || '';
    }

    if (!text) continue;

    // Resolve font
    const embeddedFont = await resolveFont(doc, field.font, field.fontWeight, field.fontStyle);
    const fontSize = Number(field.fontSize) || 16;
    const fontColor = hexToRgb(field.color || '#111827');

    // Convert coordinates:
    // UI gives coordinates either in percentages (0-100) or pixels based on standard canvas
    let targetX = 0;
    let targetY = 0;

    if (typeof field.xPercent === 'number') {
      targetX = (field.xPercent / 100) * width;
    } else if (typeof field.x === 'number') {
      targetX = field.x > 100 ? field.x : (field.x / 100) * width;
    } else {
      targetX = width / 2;
    }

    // PDF coordinate system is bottom-left origin
    if (typeof field.yPercent === 'number') {
      targetY = height - ((field.yPercent / 100) * height);
    } else if (typeof field.y === 'number') {
      targetY = field.y > 100 ? (height - field.y) : height - ((field.y / 100) * height);
    } else {
      targetY = height / 2;
    }

    // Calculate alignment
    const textWidth = embeddedFont.widthOfTextAtSize(text, fontSize);
    const textHeight = embeddedFont.heightAtSize(fontSize);

    let drawX = targetX;
    const align = (field.align || 'center').toLowerCase();

    if (align === 'center') {
      drawX = targetX - (textWidth / 2);
    } else if (align === 'right') {
      drawX = targetX - textWidth;
    } else {
      drawX = targetX;
    }

    // Baseline adjustment so y represents visual center or top
    const drawY = targetY - (textHeight / 3);

    // Draw text onto page
    page.drawText(text, {
      x: Math.max(10, drawX),
      y: Math.max(10, drawY),
      size: fontSize,
      font: embeddedFont,
      color: fontColor
    });
  }

  // 3. Save PDF
  const pdfBytes = await doc.save();
  const safeName = sanitizeFilename(recipient.name);
  const fileName = `${certificateId}_${safeName}.pdf`;
  const filePath = path.join(CERT_STORAGE_DIR, fileName);

  fs.writeFileSync(filePath, pdfBytes);

  return {
    certificateId,
    fileName,
    filePath,
    pdfUrl: `/api/certificates/download/${fileName}`,
    fileSize: pdfBytes.length,
    recipientId: recipient.recipientId,
    recipientName: recipient.name,
    recipientEmail: recipient.email
  };
}

module.exports = {
  generateCertificatePdf,
  sanitizeFilename,
  CERT_STORAGE_DIR
};
