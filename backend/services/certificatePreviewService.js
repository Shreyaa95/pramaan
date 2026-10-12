const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PREVIEWS_DIR = path.join(__dirname, '..', 'generated_certificates', 'previews');
if (!fs.existsSync(PREVIEWS_DIR)) {
  fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
}

/**
 * Generate a high quality PNG preview of the recipient's certificate.
 * Uses PowerShell with System.Drawing to render the template and text exactly like the PDF,
 * returning a PNG image path suitable for inline CID email embedding.
 *
 * @param {Object} options
 * @param {Object} options.template - Template schema object with fields and dimensions
 * @param {Object} options.event - Event object (name, organizationName, eventDate)
 * @param {Object} options.recipient - Recipient object (name, email, extraData)
 * @param {string} options.certificateId - Formatted certificate ID
 * @returns {string|null} - Path to the generated PNG image or null if failed
 */
function generateCertificatePreviewImage({ template, event, recipient, certificateId }) {
  try {
    const safeRecipientName = recipient.name || 'Recipient';
    const safeEventName = event.name || 'Event';
    const safeCertId = certificateId || 'CERT-0000';
    const outputFilename = `preview_${safeCertId}.png`;
    const outputPath = path.join(PREVIEWS_DIR, outputFilename);

    // If preview already exists and is fresh, reuse it
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      return outputPath;
    }

    const tplPayload = {
      width: template?.width || 842,
      height: template?.height || 595,
      backgroundPath: template?.backgroundPath && fs.existsSync(template.backgroundPath) ? template.backgroundPath : null,
      fields: template?.fields || []
    };

    const tempJsonPath = path.join(PREVIEWS_DIR, `temp_${safeCertId}.json`);
    fs.writeFileSync(tempJsonPath, JSON.stringify(tplPayload), 'utf8');

    const psScript = `
Add-Type -AssemblyName System.Drawing

$jsonPath = '${tempJsonPath.replace(/\\/g, '\\\\')}'
$outPng = '${outputPath.replace(/\\/g, '\\\\')}'
$recipientName = '${safeRecipientName.replace(/'/g, "''")}'
$eventName = '${safeEventName.replace(/'/g, "''")}'
$certId = '${safeCertId.replace(/'/g, "''")}'
$orgName = '${(event.organizationName || 'PRAMAAN').replace(/'/g, "''")}'
$issuedDate = '${(event.eventDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })).replace(/'/g, "''")}'
$extraPosition = '${((recipient.extraData && (recipient.extraData.position || recipient.extraData.role)) || 'Certificate of Participation').replace(/'/g, "''")}'

$tpl = Get-Content -Path $jsonPath -Raw | ConvertFrom-Json
$width = if ($tpl.width) { [int]$tpl.width } else { 842 }
$height = if ($tpl.height) { [int]$tpl.height } else { 595 }

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# 1. Background rendering
$bgDrawn = $false
if ($tpl.backgroundPath -and (Test-Path $tpl.backgroundPath)) {
    try {
        $bgImg = [System.Drawing.Image]::FromFile($tpl.backgroundPath)
        $g.DrawImage($bgImg, 0, 0, $width, $height)
        $bgImg.Dispose()
        $bgDrawn = $true
    } catch {}
}

if (-not $bgDrawn) {
    # Off-white warm canvas
    $canvasBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(251, 251, 253))
    $g.FillRectangle($canvasBrush, 0, 0, $width, $height)
    $canvasBrush.Dispose()

    # Outer Dark Border
    $outerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(20, 23, 31), 2)
    $g.DrawRectangle($outerPen, 20, 20, ($width - 40), ($height - 40))
    $outerPen.Dispose()

    # Inner Crimson Red Border (#ca0019)
    $innerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(202, 0, 25), 1.5)
    $g.DrawRectangle($innerPen, 28, 28, ($width - 56), ($height - 56))
    $innerPen.Dispose()

    # Corner Accent Blocks
    $cornerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(202, 0, 25))
    $g.FillRectangle($cornerBrush, 28, 28, 20, 20)
    $g.FillRectangle($cornerBrush, ($width - 48), 28, 20, 20)
    $g.FillRectangle($cornerBrush, 28, ($height - 48), 20, 20)
    $g.FillRectangle($cornerBrush, ($width - 48), ($height - 48), 20, 20)
    $cornerBrush.Dispose()
}

# 2. Text fields rendering
if ($tpl.fields) {
    foreach ($f in $tpl.fields) {
        $key = if ($f.key) { $f.key.ToLower() } else { '' }
        $text = ''
        if ($key -eq 'recipientname' -or $key -eq 'name') {
            $text = $recipientName
        } elseif ($key -eq 'eventname' -or $key -eq 'event') {
            $text = $eventName
        } elseif ($key -eq 'certificateid' -or $key -eq 'certid') {
            $text = $certId
        } elseif ($key -eq 'date' -or $key -eq 'issuedate') {
            $text = $issuedDate
        } elseif ($key -eq 'organizationname' -or $key -eq 'org') {
            $text = $orgName
        } elseif ($key -eq 'position' -or $key -eq 'role') {
            $text = $extraPosition
        } else {
            $text = if ($f.sampleValue) { $f.sampleValue } else { $f.label }
        }

        if (-not $text) { continue }

        $fontSize = if ($f.fontSize) { [float]$f.fontSize } else { 16.0 }
        $fontStyle = [System.Drawing.FontStyle]::Regular
        if ($f.fontWeight -eq 'bold' -or $f.fontWeight -eq '700' -or $f.fontWeight -eq '800') {
            $fontStyle = $fontStyle -bor [System.Drawing.FontStyle]::Bold
        }
        if ($f.fontStyle -eq 'italic') {
            $fontStyle = $fontStyle -bor [System.Drawing.FontStyle]::Italic
        }

        $fontFamily = 'Arial'
        if ($f.font -and $f.font -match 'Times|Serif') { $fontFamily = 'Times New Roman' }
        if ($f.font -and $f.font -match 'Courier|Mono') { $fontFamily = 'Courier New' }

        $font = New-Object System.Drawing.Font($fontFamily, $fontSize, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)

        $col = [System.Drawing.Color]::FromArgb(17, 24, 39)
        if ($f.color -and $f.color -match '^#([0-9a-fA-F]{6})$') {
            $r = [Convert]::ToInt32($matches[1].Substring(0,2), 16)
            $gCol = [Convert]::ToInt32($matches[1].Substring(2,2), 16)
            $b = [Convert]::ToInt32($matches[1].Substring(4,2), 16)
            $col = [System.Drawing.Color]::FromArgb($r, $gCol, $b)
        }
        $brush = New-Object System.Drawing.SolidBrush($col)

        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        if ($f.align -eq 'left') { $sf.Alignment = [System.Drawing.StringAlignment]::Near }
        if ($f.align -eq 'right') { $sf.Alignment = [System.Drawing.StringAlignment]::Far }
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

        $x = if ($f.xPercent) { ($f.xPercent / 100.0) * $width } else { ($width / 2.0) }
        $y = if ($f.yPercent) { ($f.yPercent / 100.0) * $height } else { ($height / 2.0) }

        $rect = New-Object System.Drawing.RectangleF(($x - ($width / 2.0)), ($y - 40), $width, 80)
        if ($sf.Alignment -eq [System.Drawing.StringAlignment]::Near) {
            $rect = New-Object System.Drawing.RectangleF($x, ($y - 40), ($width - $x), 80)
        }

        $g.DrawString($text, $font, $brush, $rect, $sf)

        $font.Dispose()
        $brush.Dispose()
        $sf.Dispose()
    }
}

$g.Dispose()
$bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
`;

    const res = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
      encoding: 'utf8',
      timeout: 15000
    });

    if (fs.existsSync(tempJsonPath)) {
      try { fs.unlinkSync(tempJsonPath); } catch {}
    }

    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      return outputPath;
    }

    if (res.error || res.status !== 0) {
      console.warn('[CertificatePreview] PowerShell render notice:', res.stderr || res.stdout);
    }
    return null;
  } catch (err) {
    console.warn('[CertificatePreview] Failed to generate preview:', err.message);
    return null;
  }
}

module.exports = {
  generateCertificatePreviewImage,
  PREVIEWS_DIR
};
