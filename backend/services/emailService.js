const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const db = require('../db');

let cachedTransporter = null;
let cachedConfigKey = null;

// Get active SMTP configuration
async function getActiveSmtpConfig(customConfig = null) {
  if (customConfig && customConfig.host) {
    return customConfig;
  }

  // Check database settings
  const settingsDoc = await db.settings.findOne({ key: 'smtp_config' });
  if (settingsDoc && settingsDoc.value && settingsDoc.value.host) {
    return settingsDoc.value;
  }

  // Check process.env
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
      senderEmail: process.env.SENDER_EMAIL || process.env.SMTP_USER,
      senderName: process.env.SENDER_NAME || 'PRAMAAN Automation'
    };
  }

  // If completely unconfigured, return null (will trigger test ethereal account)
  return null;
}

/**
 * Format SMTP errors into clear, actionable advice for administrators
 */
function formatSmtpErrorMessage(err, host = '') {
  const msg = err && err.message ? err.message : String(err);
  const isGmail = host && (host.toLowerCase().includes('gmail') || host.toLowerCase().includes('googlemail'));

  if (msg.includes('535') || msg.includes('Username and Password not accepted') || msg.includes('BadCredentials') || msg.includes('Invalid login')) {
    if (isGmail) {
      return 'Gmail Authentication Failed (535-5.7.8): Username or password not accepted. Google requires a 16-character Google App Password (not your regular Gmail account password). Ensure 2-Step Verification is turned ON in your Google Account and generate an App Password at https://myaccount.google.com/apppasswords.';
    }
    return 'SMTP Authentication Failed (535): Username or password was not accepted by the mail server. A dedicated App Password may be required for your mail provider.';
  }

  if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('ESOCKET') || msg.includes('greeting never received')) {
    return `SMTP Connection Failed: Unable to connect to ${host || 'mail server'}. Please verify host address, port (Port 465 for SSL, Port 587 for TLS), and network firewall access.`;
  }

  return msg;
}

/**
 * Create or reuse nodemailer transport
 */
async function getTransporter(customConfig = null) {
  const config = await getActiveSmtpConfig(customConfig);

  if (config && config.host) {
    const isGmail = config.host.toLowerCase().includes('gmail') || config.host.toLowerCase().includes('googlemail');
    const port = Number(config.port) || (isGmail ? 465 : 587);
    const secure = isGmail ? (port === 465) : (config.secure === true || port === 465);
    const cleanUser = String(config.user || '').trim();
    // Google App Passwords often have spaces when copied (e.g. "abcd efgh ijkl mnop") - strip them
    const cleanPass = String(config.pass || '').replace(/\s+/g, '');

    const configKey = `${config.host}:${port}:${cleanUser}:${secure}`;
    if (cachedTransporter && cachedConfigKey === configKey) {
      return { transporter: cachedTransporter, isTest: false, config };
    }

    const transportOpts = {
      host: config.host.trim(),
      port,
      secure,
      auth: {
        user: cleanUser,
        pass: cleanPass
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    const transporter = nodemailer.createTransport(transportOpts);

    cachedTransporter = transporter;
    cachedConfigKey = configKey;
    return {
      transporter,
      isTest: false,
      config: {
        ...config,
        host: config.host.trim(),
        port,
        secure,
        user: cleanUser,
        pass: cleanPass
      }
    };
  }

  // Zero-config testing: create Ethereal test account automatically
  console.log('[EmailService] No SMTP configured. Creating instant Ethereal test account...');
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  return {
    transporter,
    isTest: true,
    config: {
      host: 'smtp.ethereal.email',
      port: 587,
      user: testAccount.user,
      senderEmail: testAccount.user,
      senderName: 'PRAMAAN (Test Mode)'
    }
  };
}

/**
 * Verify SMTP credentials
 */
async function verifySmtp(config) {
  if (!config || !config.host) {
    return { success: false, error: 'SMTP host is required (e.g. smtp.gmail.com).' };
  }
  if (!config.user || !config.user.trim()) {
    return { success: false, error: 'SMTP username/email is required.' };
  }
  if (!config.pass) {
    return { success: false, error: 'Password or Google App Password is required.' };
  }

  const isGmail = config.host.toLowerCase().includes('gmail') || config.host.toLowerCase().includes('googlemail');
  const port = Number(config.port) || (isGmail ? 465 : 587);
  const secure = isGmail ? (port === 465) : (config.secure === true || port === 465);
  const cleanUser = String(config.user || '').trim();
  const cleanPass = String(config.pass || '').replace(/\s+/g, '');

  try {
    const transportOpts = {
      host: config.host.trim(),
      port,
      secure,
      auth: {
        user: cleanUser,
        pass: cleanPass
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    const transporter = nodemailer.createTransport(transportOpts);
    await transporter.verify();
    return { success: true, message: 'SMTP credentials verified successfully!' };
  } catch (err) {
    const friendlyError = formatSmtpErrorMessage(err, config.host);
    return { success: false, error: friendlyError };
  }
}

/**
 * Replace placeholders in template text
 */
function interpolateVariables(text, vars) {
  if (!text) return '';
  return text
    .replace(/\{\{\s*recipientName\s*\}\}/gi, vars.recipientName || '')
    .replace(/\{\{\s*eventName\s*\}\}/gi, vars.eventName || '')
    .replace(/\{\{\s*organizationName\s*\}\}/gi, vars.organizationName || '')
    .replace(/\{\{\s*certificateId\s*\}\}/gi, vars.certificateId || '')
    .replace(/\{\{\s*date\s*\}\}/gi, vars.date || '')
    .replace(/\{\{\s*position\s*\}\}/gi, vars.position || '');
}

/**
 * Safely escape HTML characters to prevent XSS / broken formatting in emails
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate premium dark/black and vibrant red HTML email template.
 * Features:
 * - Deep carbon/black background (#07080a / #0d0e12)
 * - PRAMAAN (प्रमाण) typography header with red accent and 'LEARN / PARTICIPATE / GET CERTIFIED' nav
 * - Thin red horizontal accent divider line (#ca0019)
 * - Headline: "Hello, {{recipientName}}" and "Your Certificate Is Ready!"
 * - Actual event name and congratulatory text
 * - Prominently displayed embedded ACTUAL certificate preview image (CID pramaan-cert-preview)
 * - High-contrast PDF attachment status card with red PDF icon, recipient filename, and green checkmark
 * - Sign-off: Keep learning. Keep growing. / Team PRAMAAN
 * - Footer: "Powered by PRAMAAN"
 * - Responsive table layout with mobile optimizations
 */
function buildMinimalHtmlEmail({
  recipientName,
  eventName,
  organizationName,
  bodyText,
  certificateId,
  certificateFilename,
  hasEmbeddedPreview = true
}) {
  const safeName = escapeHtml(recipientName || 'Recipient');
  const safeEvent = escapeHtml(eventName || 'Certification Program');
  const safeOrg = escapeHtml(organizationName || 'PRAMAAN');
  const safeCertId = escapeHtml(certificateId || '');
  const safeFilename = escapeHtml(certificateFilename || (certificateId ? `${certificateId}.pdf` : 'Certificate.pdf'));

  console.log(`[EmailTemplate] Generating PRAMAAN email for: "${safeName}", Event: "${safeEvent}", Cert: "${safeCertId}", File: "${safeFilename}"`);

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Your Certificate Is Ready &bull; ${safeEvent}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, span { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #050608 !important;
      -webkit-text-size-adjust: 100% !important;
      -ms-text-size-adjust: 100% !important;
    }
    table {
      border-collapse: collapse !important;
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    img {
      border: 0 !important;
      outline: none !important;
      text-decoration: none !important;
      -ms-interpolation-mode: bicubic !important;
    }
    @media only screen and (max-width: 680px) {
      .container-table {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      .content-padding {
        padding: 24px 18px !important;
      }
      .header-padding {
        padding: 20px 18px 16px 18px !important;
      }
      .nav-links {
        display: none !important;
      }
      .headline-text {
        font-size: 26px !important;
        line-height: 32px !important;
      }
      .cert-preview-img {
        max-width: 100% !important;
        height: auto !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #050608; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #050608; margin: 0; padding: 28px 12px 40px 12px; width: 100%;">
    <tr>
      <td align="center" valign="top">
        
        <!-- Main Card Canvas -->
        <table role="presentation" class="container-table" width="660" cellspacing="0" cellpadding="0" border="0" style="max-width: 660px; width: 100%; background-color: #0c0d11; border: 1px solid #1f2128; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75);">
          
          <!-- ==================== HEADER ROW ==================== -->
          <tr>
            <td class="header-padding" style="padding: 26px 36px 18px 36px; background-color: #0a0b0e;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <!-- Left: PRAMAAN Brand Wordmark & Hindi Tag -->
                  <td align="left" valign="middle">
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; color: #ffffff; line-height: 1.1;">
                      PRAM<span style="color: #ef4444;">&#9650;</span>AN
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans Devanagari', Arial, sans-serif; font-size: 11px; font-weight: 500; letter-spacing: 0.22em; color: #a1a1aa; margin-top: 3px;">
                      (प्रमाण)
                    </div>
                  </td>
                  
                  <!-- Right: Decorative Category Nav -->
                  <td align="right" valign="middle" class="nav-links">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #71717a;">
                      LEARN &nbsp;<span style="color: #3f3f46;">/</span>&nbsp; PARTICIPATE &nbsp;<span style="color: #3f3f46;">/</span>&nbsp; GET CERTIFIED
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Thin Red Horizontal Divider Line -->
          <tr>
            <td style="height: 2px; background-color: #ca0019; font-size: 0; line-height: 0; mso-line-height-rule: exactly;">
              &nbsp;
            </td>
          </tr>

          <!-- ==================== CONTENT SECTION ==================== -->
          <tr>
            <td class="content-padding" style="padding: 34px 36px 28px 36px; background: radial-gradient(circle at top right, #1f0b0f 0%, #0c0d11 65%);">
              
              <!-- Greeting -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; font-weight: 600; color: #d4d4d8; margin-bottom: 8px;">
                Hello, <span style="color: #ffffff; font-weight: 700;">${safeName}</span>
              </div>

              <!-- Main Headline: "Your Certificate Is Ready!" -->
              <div class="headline-text" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 32px; line-height: 38px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em; margin-bottom: 12px;">
                Your Certificate <span style="color: #ef4444;">Is Ready!</span>
              </div>

              <!-- Event Congratulations -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; line-height: 22px; color: #a1a1aa; margin-bottom: 24px;">
                Congratulations on completing <strong style="color: #ffffff; font-weight: 700;">${safeEvent}</strong>.<br />
                Your official certificate has been issued and is attached directly to this email.
              </div>

              <!-- ==================== EMBEDDED CERTIFICATE PREVIEW ==================== -->
              ${hasEmbeddedPreview ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 26px;">
                <tr>
                  <td align="center" style="background-color: #121319; border: 1.5px solid #232530; border-radius: 12px; padding: 14px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.65);">
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #ef4444; margin-bottom: 10px; text-align: left;">
                      Official Certificate Preview
                    </div>
                    <img class="cert-preview-img" src="cid:pramaan-cert-preview" alt="Certificate for ${safeName}" width="590" style="display: block; width: 100%; max-width: 590px; height: auto; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,0.5);" />
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- PDF Attachment Card (Red PDF Icon + Filename + Green Badge) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #121319; border: 1px solid #232530; border-radius: 12px; margin-bottom: 26px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);">
                <tr>
                  <td style="padding: 14px 18px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <!-- Red PDF File Badge Icon -->
                        <td width="42" valign="middle" align="left" style="padding-right: 14px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 40px; height: 46px; background-color: #ca0019; border-radius: 6px; box-shadow: 0 2px 8px rgba(202, 0, 25, 0.4);">
                            <tr>
                              <td align="center" valign="middle" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; font-weight: 900; color: #ffffff; letter-spacing: 0.05em; line-height: 1;">
                                PDF
                              </td>
                            </tr>
                          </table>
                        </td>
                        
                        <!-- Filename & Green Delivery Confirmation -->
                        <td valign="middle" align="left">
                          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff; line-height: 1.3; word-break: break-all;">
                            ${safeFilename}
                          </div>
                          <div style="margin-top: 5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; font-weight: 600; color: #22c55e;">
                            <span style="display: inline-block; width: 14px; height: 14px; background-color: #22c55e; color: #0c0d11; border-radius: 50%; text-align: center; line-height: 14px; font-size: 9px; font-weight: 900; margin-right: 4px; vertical-align: middle;">&#10003;</span>
                            <span style="vertical-align: middle;">PDF Certificate Attached (Downloadable below)</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Sign-off Section -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; line-height: 20px; color: #a1a1aa;">
                Keep learning. Keep growing.<br />
                <strong style="color: #ffffff; font-weight: 700;">Team PRAMAAN</strong>
              </div>

            </td>
          </tr>

          <!-- ==================== FOOTER SECTION ==================== -->
          <tr>
            <td style="padding: 18px 36px; background-color: #08090b; border-top: 1px solid #181920; text-align: center;">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; font-weight: 500; color: #71717a; letter-spacing: 0.05em;">
                Powered by <strong style="color: #ffffff; font-weight: 800; letter-spacing: 0.12em;">PRAM<span style="color: #ef4444;">&#9650;</span>AN</strong>
              </span>
            </td>
          </tr>

        </table>

        <!-- Small subtle copyright line outside container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 660px; margin-top: 14px;">
          <tr>
            <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: #52525b;">
              Official Certificate Dispatch &bull; Secured with PRAMAAN
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

  return html;
}

const buildHtmlEmail = buildMinimalHtmlEmail;

/**
 * Send personalized certificate email to exact corresponding recipient
 */
async function sendCertificateEmail({
  event,
  recipient,
  certificate,
  customConfig = null
}) {
  if (!recipient || !recipient.email) {
    throw new Error('Recipient email is missing.');
  }

  if (!certificate || !certificate.filePath || !fs.existsSync(certificate.filePath)) {
    throw new Error(`Certificate PDF file not found at path: ${certificate?.filePath}`);
  }

  const { transporter, isTest, config } = await getTransporter(customConfig);

  const templateVars = {
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    eventName: event.name,
    organizationName: event.organizationName || 'Organizing Committee',
    certificateId: certificate.certificateId,
    date: event.eventDate || '',
    position: recipient.extraData?.position || ''
  };

  const emailConfig = event.emailConfig || {};
  const rawSubject = emailConfig.subject || 'Your Certificate Is Ready – {{eventName}}';
  let rawBody = emailConfig.body;
  if (!rawBody || rawBody.includes('Thank you for participating') || rawBody.includes('Congratulations on participating') || rawBody.includes('Hi {{recipientName}}')) {
    rawBody = 'Hello, {{recipientName}}\n\nYour Certificate Is Ready!\n\nCongratulations on completing {{eventName}}.\nYour certificate is attached to this email.\n\nKeep learning. Keep growing.\nTeam PRAMAAN';
  }

  const senderName = emailConfig.senderName || config.senderName || 'PRAMAAN';
  const senderEmail = emailConfig.senderEmail || config.senderEmail || config.user;

  const subject = interpolateVariables(rawSubject, templateVars);
  const textBody = interpolateVariables(rawBody, templateVars);

  const attachmentFileName = `${certificate.certificateId ? certificate.certificateId : path.basename(certificate.filePath, '.pdf')}.pdf`;

  // Dynamically generate the certificate image preview for inline email embedding
  let previewImagePath = null;
  try {
    const { generateCertificatePreviewImage } = require('./certificatePreviewService');
    const templateDoc = event.templateId ? await db.templates.findOne({ _id: event.templateId }) : null;
    previewImagePath = generateCertificatePreviewImage({
      template: templateDoc,
      event,
      recipient,
      certificateId: certificate.certificateId
    });
  } catch (prevErr) {
    console.warn(`[EmailService] Could not generate preview image for ${recipient.email}:`, prevErr.message);
  }

  const hasEmbeddedPreview = !!(previewImagePath && fs.existsSync(previewImagePath));

  const htmlBody = buildMinimalHtmlEmail({
    recipientName: recipient.name,
    eventName: event.name,
    organizationName: event.organizationName,
    bodyText: textBody,
    certificateId: certificate.certificateId,
    certificateFilename: attachmentFileName,
    hasEmbeddedPreview
  });

  // Attachments: Only the downloadable PDF certificate as an attachment.
  // The preview image is included STRICTLY with a CID for inline body display (not as a separate scooter attachment).
  const attachments = [
    {
      filename: attachmentFileName,
      path: certificate.filePath,
      contentType: 'application/pdf'
    }
  ];

  if (hasEmbeddedPreview) {
    attachments.push({
      filename: `certificate_preview_${certificate.certificateId}.png`,
      path: previewImagePath,
      cid: 'pramaan-cert-preview'
    });
  }

  console.log(`[EmailService] Preparing email dispatch to: ${recipient.email}`);
  console.log(`[EmailService] - Subject: ${subject}`);
  console.log(`[EmailService] - Template: PRAMAAN Black-and-Red with ${hasEmbeddedPreview ? 'Embedded Real Certificate Preview' : 'PDF Card'}`);
  console.log(`[EmailService] - Downloadable Attachment: ${attachmentFileName} (${certificate.filePath})`);
  console.log(`[EmailService] - Inline CID Elements: ${hasEmbeddedPreview ? 'pramaan-cert-preview' : 'none'}`);

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: recipient.email,
    subject,
    text: textBody,
    html: htmlBody,
    attachments
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    let previewUrl = null;
    if (isTest) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[EmailService] Ethereal preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      isTest,
      sentAt: new Date()
    };
  } catch (err) {
    const formattedError = formatSmtpErrorMessage(err, config?.host);
    console.error(`[EmailService] Failed to send email to ${recipient.email}:`, formattedError);
    throw new Error(formattedError);
  }
}

function clearTransporterCache() {
  cachedTransporter = null;
  cachedConfigKey = null;
}

module.exports = {
  getActiveSmtpConfig,
  verifySmtp,
  sendCertificateEmail,
  interpolateVariables,
  clearTransporterCache,
  buildMinimalHtmlEmail,
  escapeHtml
};
