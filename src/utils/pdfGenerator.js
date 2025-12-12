import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Color constants matching web version
const colors = {
  primary: rgb(0.2, 0.4, 0.8),
  danger: rgb(0.9, 0.2, 0.2),
  warning: rgb(0.96, 0.65, 0.14),
  success: rgb(0.2, 0.7, 0.3),
  info: rgb(0.2, 0.6, 0.9),
  ink: rgb(0.1, 0.1, 0.1),
  muted: rgb(0.5, 0.5, 0.5),
  white: rgb(1, 1, 1),
  border: rgb(0.9, 0.9, 0.9),
  panel: rgb(0.98, 0.98, 0.98),
};

// Security header definitions
const SECURITY_HEADER_DEFS = [
  { name: 'content-security-policy', description: 'Controls which sources (domains) the browser can load resources (scripts, images, styles) from; mitigates XSS & injection.', severity: 'critical' },
  { name: 'strict-transport-security', description: 'Forces all future requests over HTTPS (HSTS) to prevent protocol downgrade and cookie hijacking.', severity: 'high' },
  { name: 'x-frame-options', description: 'Prevents clickjacking by restricting the ability to embed pages in iframes.', severity: 'high' },
  { name: 'x-content-type-options', description: 'Disables MIME sniffing so declared Content-Type is strictly honored (mitigates drive‑by content attacks).', severity: 'medium' },
  { name: 'referrer-policy', description: 'Controls what referrer information is sent when navigating between origins (reduces sensitive leak).', severity: 'medium' },
  { name: 'permissions-policy', description: 'Restricts powerful browser features/APIs (e.g. camera, geolocation, clipboard) to approved origins.', severity: 'medium' },
  { name: 'cross-origin-embedder-policy', description: 'Isolates context to ensure only secure/COEP-compliant resources are loaded (required for powerful features).', severity: 'low' },
  { name: 'cross-origin-opener-policy', description: 'Isolates top-level browsing context to defend against cross-origin attacks like tab-nabbing.', severity: 'low' },
  { name: 'cross-origin-resource-policy', description: 'Instructs browser to block non-authorized cross-origin resource requests (reduces data exfiltration vectors).', severity: 'low' },
];

// Helper functions

// Sanitize text to remove Unicode characters that can't be encoded in WinAnsi
function sanitizeText(text) {
  if (!text) return '';
  const str = String(text);
  
  // First pass: Replace control characters that WinAnsi cannot encode
  // Tab (0x0009) -> space
  // Newline (0x000a) and Carriage Return (0x000d) -> space (WinAnsi cannot encode these in drawText)
  let sanitized = str
    .replace(/\t/g, ' ') // Tab -> space
    .replace(/\n/g, ' ') // Newline -> space (CRITICAL: WinAnsi doesn't support newlines in drawText)
    .replace(/\r/g, ' '); // Carriage return -> space
  
  // Remove or replace other control characters
  sanitized = sanitized.split('').map(char => {
    const code = char.charCodeAt(0);
    // Keep printable ASCII (32-126)
    if (code >= 32 && code <= 126) {
      return char;
    }
    // Replace all control characters (0x0000-0x001F, 0x007F) with space
    if (code <= 31 || code === 127) {
      return ' ';
    }
    return char;
  }).join('');
  
  // Second pass: Replace problematic Unicode characters
  return sanitized
    // Replace non-breaking hyphen (0x2011) with regular hyphen
    .replace(/\u2011/g, '-')
    // Replace en dash (0x2013) with hyphen
    .replace(/\u2013/g, '-')
    // Replace em dash (0x2014) with hyphen
    .replace(/\u2014/g, '-')
    // Replace left/right single quotes with apostrophe
    .replace(/[\u2018\u2019]/g, "'")
    // Replace left/right double quotes with regular quotes
    .replace(/[\u201C\u201D]/g, '"')
    // Replace non-breaking space with regular space
    .replace(/\u00A0/g, ' ')
    // Replace other common problematic Unicode characters
    .replace(/\u2026/g, '...') // ellipsis
    .replace(/\u2022/g, '*') // bullet
    .replace(/\u00AE/g, '(R)') // registered trademark
    .replace(/\u00A9/g, '(C)') // copyright
    .replace(/\u2122/g, '(TM)') // trademark
    // Final pass: Remove any remaining non-ASCII characters that might cause issues
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      // Keep only ASCII printable (32-126) - no control characters
      if (code >= 32 && code <= 126) {
        return char;
      }
      // Replace all other characters with space
      return ' ';
    })
    .join('')
    // Clean up multiple consecutive spaces
    .replace(/  +/g, ' ')
    .trim();
}

function stripHtmlTags(text) {
  if (!text) return '';
  const str = String(text);
  const cleaned = str
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
  // Also sanitize to remove problematic Unicode characters
  return sanitizeText(cleaned);
}

function toDateString(d) {
  try {
    const dt = d ? new Date(d) : new Date();
    return dt.toLocaleString();
  } catch {
    return new Date().toLocaleString();
  }
}

function formatLongDate(d) {
  try {
    const dt = d ? new Date(d) : new Date();
    return dt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return toDateString(d);
  }
}

function pickAny(obj, paths, fallback) {
  for (const p of paths) {
    const keys = p.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object' && value[key] !== undefined) {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
}

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function computeSeverity(data) {
  let all = [];
  
  if (Array.isArray(data?.findings)) {
    all = data.findings;
  } else if (Array.isArray(data?.vulnerabilities)) {
    all = data.vulnerabilities;
  } else if (Array.isArray(data?.alerts)) {
    all = data.alerts;
  } else if (Array.isArray(data?.vulns)) {
    all = data.vulns;
  } else if (data?.report?.vulns && Array.isArray(data.report.vulns)) {
    all = data.report.vulns;
  }

  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  all.forEach((vuln) => {
    if (!vuln || typeof vuln !== 'object') return;
    const status = vuln.status;
    if (status !== 'resolved') {
      const severityRaw = vuln?.severity || vuln?.risk || vuln?.riskdesc || vuln?.level || 'low';
      const severity = String(severityRaw).toLowerCase().trim();
      
      if (severity.includes('crit') || severity === 'critical') {
        counts.critical++;
      } else if (severity.includes('high') || severity === 'high') {
        counts.high++;
      } else if (severity.includes('med') || severity.includes('moder') || severity === 'medium') {
        counts.medium++;
      } else if (severity.includes('info') || severity === 'info' || severity === 'informational') {
        counts.info++;
      } else {
        counts.low++;
      }
    }
  });

  const total = counts.critical + counts.high + counts.medium + counts.low + counts.info;
  return { counts, total, list: all };
}

function normalizeSeverity(severityRaw) {
  const severity = String(severityRaw || 'low').toLowerCase().trim().replace(/\s*\([^)]*\)/g, '').trim();
  if (severity.includes('crit') || severity === 'critical') return 'critical';
  if (severity.includes('high') || severity === 'high') return 'high';
  if (severity.includes('med') || severity.includes('moder') || severity === 'medium') return 'medium';
  if (severity.includes('info') || severity === 'info' || severity === 'informational') return 'info';
  return 'low';
}

function getSeverityColor(severity) {
  const sev = normalizeSeverity(severity);
  if (sev === 'critical' || sev === 'high') return colors.danger;
  if (sev === 'medium') return colors.warning;
  if (sev === 'low') return colors.success;
  return colors.info;
}

function scoreColor(score) {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  if (score >= 40) return rgb(0.97, 0.58, 0.08);
  return colors.danger;
}

// Helper to safely draw text with sanitization
function drawTextSafe(page, text, options) {
  if (text == null) text = '';
  
  // Convert to string and aggressively remove all control characters
  let sanitized = String(text)
    // Remove all control characters first (including newlines, tabs, etc.)
    .replace(/[\x00-\x1F\x7F]/g, ' ') // All control chars (0x00-0x1F, 0x7F) -> space
    // Then sanitize Unicode characters
    .replace(/\u2011/g, '-') // non-breaking hyphen
    .replace(/[\u2013\u2014]/g, '-') // en/em dash
    .replace(/[\u2018\u2019]/g, "'") // smart quotes
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/\u2026/g, '...') // ellipsis
    .replace(/\u2022/g, '*') // bullet
    .replace(/\u00AE/g, '(R)') // registered
    .replace(/\u00A9/g, '(C)') // copyright
    .replace(/\u2122/g, '(TM)') // trademark
    // Final pass: keep only ASCII printable
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      return (code >= 32 && code <= 126) ? char : ' ';
    })
    .join('')
    // Clean up multiple spaces
    .replace(/  +/g, ' ')
    .trim();
  
  // Ensure we have a valid string (not empty after sanitization)
  if (!sanitized || sanitized.length === 0) {
    sanitized = ' '; // Use space if text becomes empty
  }
  
  return page.drawText(sanitized, options);
}

// Draw a circular gauge (simplified version using pdf-lib API)
async function drawCircleGauge(page, x, y, radius, score, label, font, fontBold) {
  const centerX = x;
  const centerY = y;
  const strokeWidth = 10;
  
  // Calculate score color
  const scoreColor = score >= 80 ? colors.success : score >= 60 ? colors.warning : score >= 40 ? rgb(0.97, 0.58, 0.08) : colors.danger;
  
  // Draw background circle (outer ring) - using arc approximation
  const percentage = Math.max(0, Math.min(100, score)) / 100;
  
  // Draw background circle segments (gray)
  for (let i = 0; i < 36; i++) {
    const angle = (i * 10 - 90) * (Math.PI / 180);
    const nextAngle = ((i + 1) * 10 - 90) * (Math.PI / 180);
    const x1 = centerX + radius * Math.cos(angle);
    const y1 = centerY + radius * Math.sin(angle);
    const x2 = centerX + radius * Math.cos(nextAngle);
    const y2 = centerY + radius * Math.sin(nextAngle);
    
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: strokeWidth,
      color: colors.border,
    });
  }
  
  // Draw filled arc segments (colored)
  const filledSegments = Math.ceil(percentage * 36);
  for (let i = 0; i < filledSegments; i++) {
    const angle = (i * 10 - 90) * (Math.PI / 180);
    const nextAngle = ((i + 1) * 10 - 90) * (Math.PI / 180);
    const x1 = centerX + radius * Math.cos(angle);
    const y1 = centerY + radius * Math.sin(angle);
    const x2 = centerX + radius * Math.cos(nextAngle);
    const y2 = centerY + radius * Math.sin(nextAngle);
    
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: strokeWidth,
      color: scoreColor,
    });
  }
  
  // Draw score text in center
  const scoreText = String(Math.round(score));
  const scoreWidth = fontBold.widthOfTextAtSize(scoreText, 28);
  drawTextSafe(page, scoreText, {
    x: centerX - scoreWidth / 2,
    y: centerY - 10,
    size: 28,
    font: fontBold,
    color: colors.ink,
  });
  
  // Draw label
  const labelText = label || 'Score';
  const labelWidth = font.widthOfTextAtSize(labelText, 9);
  drawTextSafe(page, labelText, {
    x: centerX - labelWidth / 2,
    y: centerY - 35,
    size: 9,
    font: font,
    color: colors.muted,
  });
}

// Text helper to handle long text wrapping
async function addWrappedText(page, text, x, y, maxWidth, fontSize, font, color = colors.ink, lineHeight = fontSize * 1.2) {
  // Sanitize text first to remove all control characters including newlines
  let sanitizedText = sanitizeText(text || '');
  // Ensure no newlines remain (double-check)
  sanitizedText = sanitizedText.replace(/[\n\r\t]/g, ' ');
  // Split by spaces and filter out empty strings
  const words = sanitizedText.split(' ').filter(w => w && w.trim().length > 0);
  let currentLine = '';
  let currentY = y;
  const maxLines = Math.floor((page.getHeight() - y - 50) / lineHeight);
  let lineCount = 0;

  for (const word of words) {
    // Sanitize word to ensure no control characters
    const cleanWord = sanitizeText(word).replace(/[\n\r\t]/g, ' ');
    if (!cleanWord || cleanWord.trim().length === 0) continue;
    
    const testLine = currentLine + (currentLine ? ' ' : '') + cleanWord;
    // Ensure testLine is also sanitized before width calculation
    const cleanTestLine = sanitizeText(testLine).replace(/[\n\r\t]/g, ' ');
    const textWidth = font.widthOfTextAtSize(cleanTestLine, fontSize);
    
    if (textWidth > maxWidth && currentLine) {
      if (lineCount >= maxLines) break;
      // Sanitize currentLine before drawing
      const cleanCurrentLine = sanitizeText(currentLine).replace(/[\n\r\t]/g, ' ');
      drawTextSafe(page, cleanCurrentLine, {
        x,
        y: currentY,
        size: fontSize,
        font,
        color,
      });
      currentY -= lineHeight;
      currentLine = cleanWord;
      lineCount++;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine && lineCount < maxLines) {
    // Sanitize currentLine before drawing
    const cleanCurrentLine = sanitizeText(currentLine).replace(/[\n\r\t]/g, ' ');
    drawTextSafe(page, cleanCurrentLine, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color,
    });
  }
  
  return currentY;
}

// Add cover page
async function addCoverPage(doc, data, opts) {
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  
  // Accent bar
  page.drawRectangle({
    x: 0,
    y: pageHeight - 100,
    width: pageWidth,
    height: 8,
    color: colors.primary,
  });
  
  // Title
  drawTextSafe(page,'Vulnerability', {
    x: 50,
    y: pageHeight - 150,
    size: 36,
    font: helveticaBold,
    color: colors.ink,
  });
  
  drawTextSafe(page,'Assessment Report', {
    x: 50,
    y: pageHeight - 200,
    size: 36,
    font: helveticaBold,
    color: colors.primary,
  });
  
  // Subtitle
  const subtitle = 'Comprehensive security assessment detailing discovered vulnerabilities, attack surface indicators, and remediation guidance for improved cyber hygiene and risk reduction.';
  await addWrappedText(page, subtitle, 50, pageHeight - 250, pageWidth - 100, 10, helvetica, colors.muted, 14);
  
  // Metadata
  const dateStr = formatLongDate(opts.generatedAt || data?.generatedAt);
  const organizationName = opts.organizationName || data?.orgName || data?.organization || data?.org || '';
  const targetName = opts.targetName || data?.target || data?.project || '';
  const targetUrl = opts.targetUrl || data?.url || data?.target_url || '';
  const preparedBy = opts.preparedBy || organizationName || 'Defendly Security';
  const site = opts.companySite || 'defendly.ai';
  
  // Metadata in styled boxes (3 columns)
  let metaY = pageHeight - 400;
  const metaBoxWidth = 160;
  const metaBoxHeight = 60;
  const metaBoxGap = 15;
  let metaX = 50;
  
  const metaBoxes = [];
  if (organizationName) metaBoxes.push({ label: 'ORGANIZATION', value: organizationName.toUpperCase() });
  if (targetName) metaBoxes.push({ label: 'TARGET', value: targetName });
  if (targetUrl) metaBoxes.push({ label: 'TARGET URL', value: targetUrl });
  metaBoxes.push({ label: 'SCAN DATE', value: dateStr });
  
  // Draw metadata boxes in a row (up to 3 per row)
  for (let i = 0; i < metaBoxes.length; i++) {
    if (i > 0 && i % 3 === 0) {
      metaX = 50;
      metaY -= (metaBoxHeight + metaBoxGap);
    }
    
    const box = metaBoxes[i];
    page.drawRectangle({
      x: metaX,
      y: metaY - metaBoxHeight + 5,
      width: metaBoxWidth,
      height: metaBoxHeight,
      color: colors.white,
      borderColor: colors.border,
      borderWidth: 1,
    });
    
    drawTextSafe(page, box.label, {
      x: metaX + 8,
      y: metaY - 8,
      size: 7,
      font: helveticaBold,
      color: colors.muted,
    });
    
    const valueLines = box.value.split('\n');
    let valueY = metaY - 25;
    for (const line of valueLines.slice(0, 2)) {
      drawTextSafe(page, line, {
        x: metaX + 8,
        y: valueY,
        size: 11,
        font: helveticaBold,
        color: colors.ink,
      });
      valueY -= 15;
    }
    
    metaX += metaBoxWidth + metaBoxGap;
  }
  
  metaY -= (metaBoxHeight + 20);
  
  // Footer
  drawTextSafe(page,`Prepared for ${preparedBy.toUpperCase()} • ${site} • Powered by Bug Hunters`, {
    x: 50,
    y: 50,
    size: 9,
    font: helvetica,
    color: colors.muted,
  });
}

// Add table of contents
async function addTableOfContents(doc, sections) {
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  let y = page.getHeight() - 80;
  
  drawTextSafe(page,'Table of Contents', {
    x: 50,
    y,
    size: 20,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 40;
  
  await addWrappedText(page, 'Navigate through report sections by clicking on any section title below. Each section provides comprehensive analysis and detailed findings.', 50, y, page.getWidth() - 100, 9, helvetica, colors.muted, 12);
  
  y -= 60;
  
  // Header row background
  page.drawRectangle({
    x: 50,
    y: y - 20,
    width: page.getWidth() - 100,
    height: 25,
    color: colors.primary,
  });
  drawTextSafe(page, 'SECTION', {
    x: 50,
    y: y - 2,
    size: 8,
    font: helveticaBold,
    color: colors.white,
  });
  drawTextSafe(page, 'PAGE', {
    x: page.getWidth() - 100,
    y: y - 2,
    size: 8,
    font: helveticaBold,
    color: colors.white,
  });
  y -= 35;
  
  // Section entries with alternating row colors
  let currentPage = page;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (y < 100) {
      currentPage = doc.addPage([595, 842]);
      y = currentPage.getHeight() - 50;
    }
    
    // Draw row background (alternating)
    const rowHeight = 25;
    const bgColor = i % 2 === 0 ? colors.white : rgb(0.98, 0.98, 0.99);
    currentPage.drawRectangle({
      x: 50,
      y: y - rowHeight + 5,
      width: currentPage.getWidth() - 100,
      height: rowHeight,
      color: bgColor,
    });
    
    // Calculate dot leader using regular dots (not middle dot)
    const titleWidth = helvetica.widthOfTextAtSize(section.title, 10);
    const pageNumWidth = helvetica.widthOfTextAtSize(String(section.page), 10);
    const availableWidth = currentPage.getWidth() - 100 - titleWidth - pageNumWidth - 20;
    const dotCount = Math.max(3, Math.floor(availableWidth / 4));
    const dots = '.'.repeat(dotCount); // Use regular dots
    
    drawTextSafe(currentPage, section.title, {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: colors.primary,
    });
    drawTextSafe(currentPage, dots, {
      x: 50 + titleWidth + 5,
      y,
      size: 10,
      font: helvetica,
      color: colors.muted,
    });
    drawTextSafe(currentPage, String(section.page), {
      x: currentPage.getWidth() - 100,
      y,
      size: 10,
      font: helvetica,
      color: colors.ink,
    });
    
    y -= rowHeight;
  }
  
  // Add summary at bottom
  y -= 20;
  if (y < 100) {
    currentPage = doc.addPage([595, 842]);
    y = currentPage.getHeight() - 50;
  }
  const maxPage = Math.max(...sections.map(s => s.page));
  currentPage.drawRectangle({
    x: 50,
    y: y - 30,
    width: currentPage.getWidth() - 100,
    height: 30,
    color: colors.panel,
  });
  drawTextSafe(currentPage, `Report contains ${sections.length} sections across ${maxPage} pages`, {
    x: 50,
    y: y - 15,
    size: 9,
    font: helvetica,
    color: colors.muted,
  });
  drawTextSafe(currentPage, 'DEFENDLY SECURITY REPORT', {
    x: currentPage.getWidth() - 200,
    y: y - 15,
    size: 8,
    font: helveticaBold,
    color: colors.primary,
  });
}

// Add header/overview page
async function addOverviewPage(doc, data, opts, sev) {
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = page.getWidth();
  let y = page.getHeight() - 50;
  
  // Title
  drawTextSafe(page,'SECURITY ASSESSMENT REPORT', {
    x: 50,
    y,
    size: 18,
    font: helveticaBold,
    color: colors.ink,
  });
  y -= 30;
  
  // Subtitle
  await addWrappedText(page, 'Comprehensive analysis of security posture, vulnerabilities, and risk assessment', 50, y, pageWidth - 100, 10, helvetica, colors.muted, 14);
  y -= 60;
  
  // Metadata
  const organizationName = opts.organizationName || data?.orgName || data?.organization || data?.org || 'N/A';
  const targetName = opts.targetName || data?.target || data?.project || 'N/A';
  const scannedUrl = opts.targetUrl || data?.url || data?.target_url || data?.scanned_url || 'N/A';
  const generatedDate = toDateString(opts.generatedAt || data?.generatedAt);
  const currentTime = new Date().toLocaleString();
  
  const metaItems = [
    { label: 'TARGET URL', value: scannedUrl },
    { label: 'ORGANIZATION', value: organizationName },
    { label: 'TARGET NAME', value: targetName },
    { label: 'GENERATED DATE', value: generatedDate },
    { label: 'DOWNLOADED TIME', value: currentTime },
  ];
  
  // Draw metadata in styled pill boxes
  let metaY = y;
  const pillWidth = 240;
  const pillHeight = 50;
  const pillGap = 15;
  
  for (let i = 0; i < metaItems.length; i += 2) {
    const item1 = metaItems[i];
    const item2 = metaItems[i + 1];
    
    if (item1) {
      // Draw pill box
      page.drawRectangle({
        x: 50,
        y: metaY - pillHeight + 5,
        width: pillWidth,
        height: pillHeight,
        color: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
      });
      drawTextSafe(page, item1.label, {
        x: 58,
        y: metaY - 5,
        size: 7,
        font: helveticaBold,
        color: colors.muted,
      });
      await addWrappedText(page, item1.value, 58, metaY - 18, pillWidth - 16, 9, helvetica, colors.ink, 12);
    }
    
    if (item2) {
      // Draw pill box
      page.drawRectangle({
        x: 50 + pillWidth + pillGap,
        y: metaY - pillHeight + 5,
        width: pillWidth,
        height: pillHeight,
        color: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
      });
      drawTextSafe(page, item2.label, {
        x: 58 + pillWidth + pillGap,
        y: metaY - 5,
        size: 7,
        font: helveticaBold,
        color: colors.muted,
      });
      await addWrappedText(page, item2.value, 58 + pillWidth + pillGap, metaY - 18, pillWidth - 16, 9, helvetica, colors.ink, 12);
    }
    
    metaY -= (pillHeight + pillGap);
  }
  
  metaY -= 20;
  
  // Security metrics
  const hygieneObj = pickAny(data, ['cyber_hygiene_score', 'cyberHygieneScore', 'cyberHygiene', 'cyber_hygiene']) || {};
  const cyberHygieneScore = hygieneObj.score ?? pickAny(data, ['cyberHygiene.score', 'cyber_hygiene.score', 'cyberHygieneScore', 'cyber_hygiene_score']) ?? 0;
  
  const tiRoot = pickAny(data, ['threat_intelligence', 'threatIntelligence', 'threat_intel', 'threatIntel']) || {};
  const rep = tiRoot.reputation_data || tiRoot.reputationData || tiRoot.reputation || {};
  const threatIntelScore = rep.reputation_score || rep.reputationScore || rep.score || 0;
  
  const endpointsRaw = pickAny(data, ['endpoints.endpoints', 'endpoints.items', 'endpoints.list', 'endpoints', 'vulnerableEndpoints', 'vulnerable_endpoints']);
  const endpointsArray = Array.isArray(endpointsRaw) ? endpointsRaw : Array.isArray(endpointsRaw?.endpoints) ? endpointsRaw.endpoints : [];
  const totalEndpoints = endpointsArray.length;
  
  const misconfigMissing = pickAny(data, ['security_misconfigurations.missing_security_headers.headers', 'securityMisconfigurations.missing_security_headers.headers']) || [];
  const missingCount = Array.isArray(misconfigMissing) ? misconfigMissing.length : 0;
  const totalSecurityHeaders = 9;
  const totalPresentHeaders = totalSecurityHeaders - missingCount;
  
  const metrics = [
    { label: 'CYBER HYGIENE SCORE', value: `${Number(cyberHygieneScore || 0)}/100`, color: scoreColor(Number(cyberHygieneScore || 0)) },
    { label: 'THREAT INTELLIGENCE', value: `${Number(threatIntelScore || 0)}/100`, color: scoreColor(Number(threatIntelScore || 0)) },
    { label: 'TOTAL ENDPOINTS', value: String(totalEndpoints) },
    { label: 'SECURITY HEADERS', value: `${totalPresentHeaders}/${totalSecurityHeaders}`, color: totalPresentHeaders < 5 ? colors.danger : colors.success },
  ];
  
  // Draw metrics in styled pill boxes
  for (let i = 0; i < metrics.length; i += 2) {
    const m1 = metrics[i];
    const m2 = metrics[i + 1];
    
    if (m1) {
      // Draw pill box
      page.drawRectangle({
        x: 50,
        y: metaY - pillHeight + 5,
        width: pillWidth,
        height: pillHeight,
        color: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
      });
      drawTextSafe(page, m1.label, {
        x: 58,
        y: metaY - 5,
        size: 7,
        font: helveticaBold,
        color: colors.muted,
      });
      drawTextSafe(page, m1.value, {
        x: 58,
        y: metaY - 20,
        size: 14,
        font: helveticaBold,
        color: m1.color || colors.primary,
      });
    }
    
    if (m2) {
      // Draw pill box
      page.drawRectangle({
        x: 50 + pillWidth + pillGap,
        y: metaY - pillHeight + 5,
        width: pillWidth,
        height: pillHeight,
        color: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
      });
      drawTextSafe(page, m2.label, {
        x: 58 + pillWidth + pillGap,
        y: metaY - 5,
        size: 7,
        font: helveticaBold,
        color: colors.muted,
      });
      drawTextSafe(page, m2.value, {
        x: 58 + pillWidth + pillGap,
        y: metaY - 20,
        size: 14,
        font: helveticaBold,
        color: m2.color || colors.primary,
      });
    }
    
    metaY -= (pillHeight + pillGap);
  }
  
  metaY -= 20;
  
  // Vulnerability counts in styled boxes
  // Total vulnerabilities box (dark background)
  const totalBoxWidth = 120;
  const totalBoxHeight = 60;
  page.drawRectangle({
    x: 50,
    y: metaY - totalBoxHeight + 5,
    width: totalBoxWidth,
    height: totalBoxHeight,
    color: colors.ink,
    borderColor: colors.ink,
    borderWidth: 1,
  });
  drawTextSafe(page, 'TOTAL VULNERABILITIES', {
    x: 58,
    y: metaY - 10,
    size: 7,
    font: helveticaBold,
    color: colors.white,
  });
  drawTextSafe(page, String(sev.total), {
    x: 58,
    y: metaY - 35,
    size: 24,
    font: helveticaBold,
    color: colors.white,
  });
  
  // Individual severity boxes
  const vulnCounts = [
    { label: 'CRITICAL', value: sev.counts.critical, color: colors.danger },
    { label: 'HIGH', value: sev.counts.high, color: colors.danger },
    { label: 'MEDIUM', value: sev.counts.medium, color: colors.warning },
    { label: 'LOW', value: sev.counts.low, color: colors.success },
    { label: 'INFO', value: sev.counts.info || 0, color: colors.info },
  ];
  
  const severityBoxWidth = 90;
  const severityBoxHeight = 50;
  let vulnX = 50 + totalBoxWidth + 15;
  
  for (const vuln of vulnCounts) {
    page.drawRectangle({
      x: vulnX,
      y: metaY - severityBoxHeight + 5,
      width: severityBoxWidth,
      height: severityBoxHeight,
      color: colors.white,
      borderColor: vuln.color,
      borderWidth: 2,
    });
    drawTextSafe(page, vuln.label, {
      x: vulnX + 5,
      y: metaY - 8,
      size: 7,
      font: helveticaBold,
      color: colors.muted,
    });
    drawTextSafe(page, String(vuln.value), {
      x: vulnX + 5,
      y: metaY - 28,
      size: 16,
      font: helveticaBold,
      color: vuln.color,
    });
    vulnX += severityBoxWidth + 10;
  }
}

// Add Cyber Hygiene Score section
async function addCyberHygieneSection(doc, data) {
  const hygieneObj = pickAny(data, ['cyber_hygiene_score', 'cyberHygieneScore', 'cyberHygiene', 'cyber_hygiene']) || {};
  const score = hygieneObj.score ?? pickAny(data, ['cyberHygiene.score', 'cyber_hygiene.score', 'cyberHygieneScore', 'cyber_hygiene_score']) ?? 0;
  const grade = hygieneObj.grade;
  
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  let y = page.getHeight() - 50;
  
  // Section title
  drawTextSafe(page,'1', {
    x: 50,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.primary,
  });
  drawTextSafe(page,'Cyber Hygiene Score', {
    x: 80,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 40;
  
  if (score == null) {
    drawTextSafe(page,'No cyber hygiene score data available.', {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: colors.muted,
    });
    return;
  }
  
  const riskLabel = score >= 80 ? 'Low Risk - Well Protected' : score >= 60 ? 'Moderate Risk - Maintain Vigilance' : score >= 40 ? 'High Risk - Increase Security' : 'Critical Risk - Immediate Action';
  const riskColor = scoreColor(score);
  
  // Draw card background
  page.drawRectangle({
    x: 50,
    y: y - 200,
    width: page.getWidth() - 100,
    height: 200,
    color: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  });
  
  let cardY = y - 20;
  
  if (grade) {
    // Grade pill
    const gradeText = `Grade ${grade}`;
    const gradeWidth = helveticaBold.widthOfTextAtSize(gradeText, 10) + 16;
    page.drawRectangle({
      x: 50,
      y: cardY - 20,
      width: gradeWidth,
      height: 20,
      color: rgb(0.93, 0.95, 1.0),
      borderColor: colors.primary,
      borderWidth: 1,
    });
    drawTextSafe(page, gradeText, {
      x: 58,
      y: cardY - 12,
      size: 10,
      font: helveticaBold,
      color: colors.primary,
    });
    cardY -= 30;
  }
  
  drawTextSafe(page, 'Overall Risk:', {
    x: 50,
    y: cardY,
    size: 11,
    font: helveticaBold,
    color: colors.ink,
  });
  drawTextSafe(page, riskLabel, {
    x: 50 + helveticaBold.widthOfTextAtSize('Overall Risk: ', 11),
    y: cardY,
    size: 11,
    font: helveticaBold,
    color: riskColor,
  });
  
  cardY -= 25;
  
  // Risk bar
  const barWidth = 350;
  const barHeight = 12;
  const fillWidth = (score / 100) * barWidth;
  page.drawRectangle({
    x: 50,
    y: cardY - barHeight,
    width: barWidth,
    height: barHeight,
    color: colors.border,
  });
  page.drawRectangle({
    x: 50,
    y: cardY - barHeight,
    width: fillWidth,
    height: barHeight,
    color: riskColor,
  });
  
  cardY -= 25;
  
  drawTextSafe(page, 'Indicates cumulative hygiene posture across vulnerabilities, exposed services, and missing controls.', {
    x: 50,
    y: cardY,
    size: 9,
    font: helvetica,
    color: colors.muted,
  });
  
  cardY -= 30;
  
  const recommended = score >= 80
    ? 'Maintain current security controls and continue continuous monitoring.'
    : score >= 60
    ? 'Prioritize remediation of high & medium issues to elevate posture into Low Risk.'
    : score >= 40
    ? 'Escalate remediation: address critical and high, implement missing controls, harden exposure.'
    : 'Immediate action required: patch critical flaws, restrict exposed services, enforce baseline configurations.';
  
  await addWrappedText(page, recommended, 50, cardY, 350, 9, helvetica, colors.ink, 12);
  
  // Draw circular gauge on the right
  const gaugeX = page.getWidth() - 200;
  const gaugeY = y - 100;
  await drawCircleGauge(page, gaugeX, gaugeY, 60, score, 'Score', helvetica, helveticaBold);
}

// Add Attack Surface Index section
async function addAttackSurfaceIndexSection(doc, data) {
  const asiDetails = pickAny(data, ['attackSurface', 'attack_surface', 'attackSurfaceIndex', 'attack_surface_index']) || {};
  const asiScore = pickAny(data, ['attackSurface.score', 'attack_surface.score', 'attackSurfaceIndex.score', 'attack_surface_index.score', 'attackSurfaceIndex', 'attack_surface_index']);
  
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  let y = page.getHeight() - 50;
  
  // Section title
  drawTextSafe(page,'2', {
    x: 50,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.primary,
  });
  drawTextSafe(page,'Attack Surface Index', {
    x: 80,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 40;
  
  if (!asiDetails && asiScore == null) {
    drawTextSafe(page,'No attack surface data available.', {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: colors.muted,
    });
    return;
  }
  
  const metrics = asiDetails.metrics || asiDetails;
  const exposedServices = Array.isArray(metrics.exposed_services || metrics.exposedServices) ? (metrics.exposed_services || metrics.exposedServices) : [];
  const publicIps = Array.isArray(metrics.public_ips || metrics.publicIps) ? (metrics.public_ips || metrics.publicIps) : [];
  const openPorts = Array.isArray(metrics.open_ports || metrics.openPorts) ? (metrics.open_ports || metrics.openPorts) : [];
  const subdomains = Array.isArray(metrics.detected_subdomains || metrics.subdomains) ? (metrics.detected_subdomains || metrics.subdomains) : [];
  
  const tiles = [
    { label: 'Exposed Services', value: exposedServices.length, color: colors.primary },
    { label: 'Public IPs', value: publicIps.length, color: colors.danger },
    { label: 'Open Ports', value: openPorts.length, color: colors.warning },
    { label: 'Subdomains', value: subdomains.length, color: colors.success },
  ];
  
  // Draw tiles in styled boxes (2x2 grid)
  const tileWidth = 220;
  const tileHeight = 70;
  const tileGap = 15;
  let tileX = 50;
  let tileY = y;
  
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    if (i > 0 && i % 2 === 0) {
      tileX = 50;
      tileY -= (tileHeight + tileGap);
    }
    
    // Draw tile box
    page.drawRectangle({
      x: tileX,
      y: tileY - tileHeight + 5,
      width: tileWidth,
      height: tileHeight,
      color: colors.white,
      borderColor: colors.border,
      borderWidth: 1,
    });
    
    drawTextSafe(page, String(tile.value), {
      x: tileX + 12,
      y: tileY - 15,
      size: 18,
      font: helveticaBold,
      color: tile.color,
    });
    drawTextSafe(page, tile.label, {
      x: tileX + 12,
      y: tileY - 35,
      size: 8,
      font: helvetica,
      color: colors.muted,
    });
    
    tileX += tileWidth + tileGap;
  }
  
  // Draw circular gauge for score on the right
  if (asiScore != null) {
    const gaugeX = page.getWidth() - 180;
    const gaugeY = y - 80;
    await drawCircleGauge(page, gaugeX, gaugeY, 60, Number(asiScore), 'Score', helvetica, helveticaBold);
  }
  
  // Add detailed tables below
  tileY -= (tileHeight + tileGap + 20);
  
  // Exposed Services & Open Ports table
  if (exposedServices.length > 0 || openPorts.length > 0) {
    drawTextSafe(page, 'Exposed Services & Open Ports', {
      x: 50,
      y: tileY,
      size: 10,
      font: helveticaBold,
      color: colors.ink,
    });
    tileY -= 20;
    
    // Draw table
    const maxLen = Math.max(exposedServices.length, openPorts.length);
    for (let i = 0; i < Math.min(maxLen, 10); i++) {
      const service = exposedServices[i] || '';
      const port = openPorts[i] || '';
      
      page.drawRectangle({
        x: 50,
        y: tileY - 18,
        width: page.getWidth() - 100,
        height: 18,
        color: i % 2 === 0 ? colors.white : colors.panel,
      });
      
      drawTextSafe(page, service || '-', {
        x: 60,
        y: tileY - 5,
        size: 8,
        font: helvetica,
        color: colors.ink,
      });
      drawTextSafe(page, port || '-', {
        x: page.getWidth() - 200,
        y: tileY - 5,
        size: 8,
        font: helvetica,
        color: colors.ink,
      });
      
      tileY -= 18;
    }
  }
  
  // Public IPs
  if (publicIps.length > 0) {
    tileY -= 10;
    drawTextSafe(page, 'Public IPs', {
      x: 50,
      y: tileY,
      size: 10,
      font: helveticaBold,
      color: colors.ink,
    });
    tileY -= 20;
    
    for (const ip of publicIps.slice(0, 5)) {
      page.drawRectangle({
        x: 50,
        y: tileY - 18,
        width: page.getWidth() - 100,
        height: 18,
        color: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
      });
      drawTextSafe(page, String(ip), {
        x: 60,
        y: tileY - 5,
        size: 8,
        font: helvetica,
        color: colors.ink,
      });
      tileY -= 20;
    }
  }
  
  // Subdomains
  if (subdomains.length > 0) {
    tileY -= 10;
    drawTextSafe(page, 'Subdomains', {
      x: 50,
      y: tileY,
      size: 10,
      font: helveticaBold,
      color: colors.ink,
    });
    tileY -= 20;
    
    for (const sub of subdomains.slice(0, 5)) {
      page.drawRectangle({
        x: 50,
        y: tileY - 18,
        width: page.getWidth() - 100,
        height: 18,
        color: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
      });
      drawTextSafe(page, String(sub), {
        x: 60,
        y: tileY - 5,
        size: 8,
        font: helvetica,
        color: colors.ink,
      });
      tileY -= 20;
    }
  }
}

// Add Compliance Coverage section
async function addComplianceCoverageSection(doc, data) {
  const readiness = pickAny(data, ['compliance_readiness', 'complianceReadiness']) || {};
  const owaspScore = readiness.owasp_compliance ?? readiness.owaspCompliance;
  const owaspFindingsObj = readiness.owasp_findings || readiness.owaspFindings || {};
  const owaspFindingsEntries = Object.entries(owaspFindingsObj || {}).filter(([k]) => typeof owaspFindingsObj[k] !== 'object');
  
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  let y = page.getHeight() - 50;
  
  // Section title
  drawTextSafe(page,'3', {
    x: 50,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.primary,
  });
  drawTextSafe(page,'Compliance Coverage', {
    x: 80,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 40;
  
  if (owaspScore == null) {
    drawTextSafe(page,'No compliance coverage data available.', {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: colors.muted,
    });
    return;
  }
  
  drawTextSafe(page,'OWASP Coverage', {
    x: 50,
    y,
    size: 10,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 20;
  
  drawTextSafe(page,`${Number(owaspScore || 0)}`, {
    x: 50,
    y,
    size: 20,
    font: helveticaBold,
    color: colors.primary,
  });
  
  y -= 30;
  
  if (owaspFindingsEntries.length > 0) {
    drawTextSafe(page,'Findings', {
      x: 50,
      y,
      size: 8,
      font: helveticaBold,
      color: colors.ink,
    });
    y -= 15;
    
    for (const [k, v] of owaspFindingsEntries.slice(0, 20)) {
      drawTextSafe(page,`• ${k}: ${String(v)}`, {
        x: 50,
        y,
        size: 8,
        font: helvetica,
        color: colors.ink,
      });
      y -= 12;
      if (y < 100) break;
    }
  }
}

// Add Open Ports and Services section
async function addOpenPortsServicesSection(doc, data) {
  let ports = pickAny(data, ['openPorts', 'open_ports', 'ports', 'services']);
  const isEmptyPorts = ports == null || (Array.isArray(ports) && ports.length === 0) || (isPlainObject(ports) && Object.keys(ports).length === 0);
  
  if (isEmptyPorts) {
    const asiDetails = pickAny(data, ['attackSurface', 'attack_surface', 'attackSurfaceIndex', 'attack_surface_index']);
    if (asiDetails) {
      const m = asiDetails.metrics || asiDetails;
      ports = m?.open_ports ?? m?.openPorts ?? m?.services ?? m?.exposed_services ?? m?.exposedServices;
    }
  }
  
  const exposedServices = pickAny(data, ['exposed_services', 'exposedServices', 'attackSurface.metrics.exposed_services', 'attackSurface.metrics.exposedServices']) || [];
  
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  let y = page.getHeight() - 50;
  
  // Section title
  drawTextSafe(page,'4', {
    x: 50,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.primary,
  });
  drawTextSafe(page,'Open Ports and Services', {
    x: 80,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 40;
  
  if ((!ports || (Array.isArray(ports) && ports.length === 0)) && (!exposedServices || (Array.isArray(exposedServices) && exposedServices.length === 0))) {
    drawTextSafe(page,'No open ports or exposed services detected.', {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: colors.muted,
    });
    return;
  }
  
  let portsArray = [];
  if (Array.isArray(ports)) {
    portsArray = ports;
  } else if (isPlainObject(ports)) {
    portsArray = Object.entries(ports).map(([key, value]) => ({ port: key, service: value }));
  }
  
  if (portsArray.length > 0) {
    drawTextSafe(page,'Port', {
      x: 50,
      y,
      size: 9,
      font: helveticaBold,
      color: colors.ink,
    });
    drawTextSafe(page,'Services', {
      x: 200,
      y,
      size: 9,
      font: helveticaBold,
      color: colors.ink,
    });
    y -= 20;
    
    for (const item of portsArray.slice(0, 20)) {
      const port = item.port || item.number || item.id || String(item);
      const service = item.service || item.services || item.name || item.type || 'Unknown';
      
      drawTextSafe(page,String(port), {
        x: 50,
        y,
        size: 8,
        font: helvetica,
        color: colors.ink,
      });
      drawTextSafe(page,String(service), {
        x: 200,
        y,
        size: 8,
        font: helvetica,
        color: colors.ink,
      });
      y -= 15;
      if (y < 100) break;
    }
  }
}

// Add Security Headers section
async function addSecurityHeadersSection(doc, data) {
  const misconfig = pickAny(data, ['security_misconfigurations', 'securityMisconfigurations', 'security']) || {};
  const missingListRaw = misconfig?.missing_security_headers?.headers || misconfig?.missingHeaders || misconfig?.missing_headers || [];
  const missingNorm = Array.isArray(missingListRaw) ? missingListRaw : typeof missingListRaw === 'string' ? missingListRaw.split(/[,\s]+/) : [];
  const missingSet = new Set(missingNorm.map((h) => h.toLowerCase().trim()).filter(Boolean));
  
  const rows = SECURITY_HEADER_DEFS.map((h) => {
    const isMissing = missingSet.has(h.name);
    return {
      name: h.name,
      status: isMissing ? 'Missing' : 'Present',
      severity: h.severity,
      description: h.description,
      missing: isMissing,
    };
  }).sort((a, b) => {
    const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
    const aSev = severityOrder[a.severity] || 99;
    const bSev = severityOrder[b.severity] || 99;
    if (aSev !== bSev) return aSev - bSev;
    return a.name.localeCompare(b.name);
  });
  
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  let y = page.getHeight() - 50;
  
  // Section title
  drawTextSafe(page,'5', {
    x: 50,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.primary,
  });
  drawTextSafe(page,'Security Headers', {
    x: 80,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 40;
  
  const totalPresent = rows.filter((r) => !r.missing).length;
  const totalMissing = rows.filter((r) => r.missing).length;
  
  drawTextSafe(page,`Security Headers Overview (Present ${totalPresent} / Missing ${totalMissing})`, {
    x: 50,
    y,
    size: 10,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 25;
  
  // Header row
  drawTextSafe(page,'Header', {
    x: 50,
    y,
    size: 8,
    font: helveticaBold,
    color: colors.muted,
  });
  drawTextSafe(page,'Status', {
    x: 200,
    y,
    size: 8,
    font: helveticaBold,
    color: colors.muted,
  });
  drawTextSafe(page,'Severity', {
    x: 280,
    y,
    size: 8,
    font: helveticaBold,
    color: colors.muted,
  });
  
  y -= 20;
  
  for (const r of rows) {
    if (y < 100) {
      const newPage = doc.addPage([595, 842]);
      y = newPage.getHeight() - 50;
      page = newPage;
    }
    
    const severityColor = r.severity === 'critical' ? colors.danger : r.severity === 'high' ? colors.danger : r.severity === 'medium' ? colors.warning : colors.success;
    const statusColor = r.missing ? colors.danger : colors.success;
    
    drawTextSafe(page,r.name, {
      x: 50,
      y,
      size: 8,
      font: helveticaBold,
      color: colors.ink,
    });
    drawTextSafe(page,r.status.toUpperCase(), {
      x: 200,
      y,
      size: 7,
      font: helveticaBold,
      color: statusColor,
    });
    drawTextSafe(page,r.severity.toUpperCase(), {
      x: 280,
      y,
      size: 7,
      font: helveticaBold,
      color: severityColor,
    });
    
    y -= 15;
    
    await addWrappedText(page, r.description, 50, y, page.getWidth() - 100, 7, helvetica, colors.muted, 10);
    y -= 20;
  }
}

// Add Threat Intelligence section
async function addThreatIntelligenceSection(doc, data) {
  const tiRoot = pickAny(data, ['threat_intelligence', 'threatIntelligence', 'threat_intel', 'threatIntel']) || {};
  const rep = tiRoot.reputation_data || tiRoot.reputationData || tiRoot.reputation || {};
  const threatIntelScore = rep.reputation_score || rep.reputationScore || rep.score || 0;
  
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  let y = page.getHeight() - 50;
  
  // Section title
  drawTextSafe(page,'6', {
    x: 50,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.primary,
  });
  drawTextSafe(page,'Threat Intelligence Score', {
    x: 80,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 40;
  
  if (!tiRoot || Object.keys(tiRoot).length === 0) {
    drawTextSafe(page,'No threat intelligence data available.', {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: colors.muted,
    });
    return;
  }
  
  const riskLevel = threatIntelScore >= 80 ? 'Low' : threatIntelScore >= 60 ? 'Moderate' : threatIntelScore >= 40 ? 'High' : 'Critical';
  const riskColor = scoreColor(threatIntelScore);
  
  drawTextSafe(page,'Threat Intelligence Analysis', {
    x: 50,
    y,
    size: 10,
    font: helveticaBold,
    color: colors.ink,
  });
  
  drawTextSafe(page,`${riskLevel.toUpperCase()} RISK`, {
    x: page.getWidth() - 150,
    y,
    size: 9,
    font: helveticaBold,
    color: riskColor,
  });
  
  y -= 30;
  
  drawTextSafe(page,'Overall Score', {
    x: 50,
    y,
    size: 9,
    font: helvetica,
    color: colors.muted,
  });
  drawTextSafe(page,`${Number(threatIntelScore)}/100`, {
    x: 50,
    y: y - 15,
    size: 16,
    font: helveticaBold,
    color: riskColor,
  });
  
  const malwareDetected = rep.malware_detected || rep.malwareDetected || false;
  const phishingDetected = rep.phishing_detected || rep.phishingDetected || false;
  const suspiciousActivity = rep.suspicious_activity || rep.suspiciousActivity || false;
  
  y -= 50;
  
  drawTextSafe(page,'Indicator', {
    x: 50,
    y,
    size: 8,
    font: helveticaBold,
    color: colors.muted,
  });
  drawTextSafe(page,'Status', {
    x: 200,
    y,
    size: 8,
    font: helveticaBold,
    color: colors.muted,
  });
  
  y -= 20;
  
  const indicators = [
    { name: 'Malware', detected: malwareDetected },
    { name: 'Phishing', detected: phishingDetected },
    { name: 'Suspicious Activity', detected: suspiciousActivity },
  ];
  
  for (const ind of indicators) {
    drawTextSafe(page,ind.name, {
      x: 50,
      y,
      size: 8,
      font: helvetica,
      color: colors.ink,
    });
    drawTextSafe(page,ind.detected ? 'DETECTED' : 'CLEAN', {
      x: 200,
      y,
      size: 8,
      font: helveticaBold,
      color: ind.detected ? colors.danger : colors.success,
    });
    y -= 18;
  }
}

// Add Vulnerable Endpoints section
async function addVulnerableEndpointsSection(doc, data) {
  const endpointsRaw = pickAny(data, ['endpoints.endpoints', 'endpoints.items', 'endpoints.list', 'endpoints', 'vulnerableEndpoints', 'vulnerable_endpoints', 'report.endpoints', 'report.vulnerable_endpoints']) || [];
  
  let endpointsArray = [];
  if (Array.isArray(endpointsRaw)) {
    endpointsArray = endpointsRaw;
  } else if (isPlainObject(endpointsRaw)) {
    endpointsArray = Object.values(endpointsRaw);
  } else if (typeof endpointsRaw === 'string' && endpointsRaw.trim()) {
    endpointsArray = endpointsRaw.split(/[\n,;]/).map((s) => ({ endpoint: s.trim() }));
  }
  
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  let y = page.getHeight() - 50;
  
  // Section title
  drawTextSafe(page,'7', {
    x: 50,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.primary,
  });
  drawTextSafe(page,'All Vulnerable Endpoints', {
    x: 80,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 40;
  
  if (!endpointsArray.length) {
    drawTextSafe(page,'No vulnerable endpoints data available.', {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: colors.muted,
    });
    return;
  }
  
  drawTextSafe(page,'Endpoint', {
    x: 50,
    y,
    size: 9,
    font: helveticaBold,
    color: colors.ink,
  });
  y -= 20;
  
  for (const ep of endpointsArray.slice(0, 200)) {
    if (y < 100) {
      const newPage = doc.addPage([595, 842]);
      y = newPage.getHeight() - 50;
      page = newPage;
    }
    
    const label = ep?.path || ep?.url || ep?.endpoint || ep?.name || ep?.host || (typeof ep === 'string' ? ep : '');
    drawTextSafe(page,String(label), {
      x: 50,
      y,
      size: 8,
      font: helvetica,
      color: colors.ink,
    });
    y -= 15;
  }
}

// Add vulnerability findings pages
async function addVulnerabilityPages(doc, data, sev) {
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  if (!Array.isArray(sev.list) || sev.list.length === 0) {
    const page = doc.addPage([595, 842]);
    let y = page.getHeight() - 50;
    
    drawTextSafe(page,'8', {
      x: 50,
      y,
      size: 16,
      font: helveticaBold,
      color: colors.primary,
    });
    drawTextSafe(page,'Vulnerabilities Findings', {
      x: 80,
      y,
      size: 16,
      font: helveticaBold,
      color: colors.ink,
    });
    
    y -= 40;
    
    drawTextSafe(page,'No vulnerabilities found.', {
      x: 50,
      y,
      size: 12,
      font: helvetica,
      color: colors.muted,
    });
    return;
  }
  
  let firstPage = true;
  
  for (let i = 0; i < sev.list.length; i++) {
    const vuln = sev.list[i];
    const page = doc.addPage([595, 842]);
    let y = page.getHeight() - 50;
    
    if (firstPage) {
      drawTextSafe(page,'8', {
        x: 50,
        y,
        size: 16,
        font: helveticaBold,
        color: colors.primary,
      });
      drawTextSafe(page,'Vulnerabilities Findings', {
        x: 80,
        y,
        size: 16,
        font: helveticaBold,
        color: colors.ink,
      });
      y -= 40;
      firstPage = false;
    }
    
    // Vulnerability title
    const title = vuln?.title || vuln?.name || vuln?.alert || vuln?.id || `Finding #${i + 1}`;
    const severity = normalizeSeverity(vuln?.severity || vuln?.risk || vuln?.riskdesc || vuln?.level);
    const severityColor = getSeverityColor(severity);
    
    drawTextSafe(page,String(title), {
      x: 50,
      y,
      size: 12,
      font: helveticaBold,
      color: colors.ink,
    });
    
    // Severity badge
    const severityText = severity.toUpperCase();
    const severityWidth = helveticaBold.widthOfTextAtSize(severityText, 9);
    page.drawRectangle({
      x: page.getWidth() - 50 - severityWidth - 10,
      y: y - 5,
      width: severityWidth + 10,
      height: 18,
      color: severityColor,
    });
    drawTextSafe(page,severityText, {
      x: page.getWidth() - 50 - severityWidth - 5,
      y: y - 2,
      size: 9,
      font: helveticaBold,
      color: colors.white,
    });
    
    y -= 30;
    
    // Additional details table
    drawTextSafe(page,'Additional Details', {
      x: 50,
      y,
      size: 10,
      font: helveticaBold,
      color: colors.ink,
    });
    y -= 20;
    
    const details = [];
    if (vuln?.alertRef) details.push({ key: 'alertRef', value: String(vuln.alertRef) });
    if (vuln?.confidence) details.push({ key: 'confidence', value: String(vuln.confidence) });
    if (vuln?.count) details.push({ key: 'count', value: String(vuln.count) });
    if (vuln?.cweid) details.push({ key: 'cweid', value: String(vuln.cweid) });
    
    const description = stripHtmlTags(vuln?.description || vuln?.summary || vuln?.desc || '');
    if (description) details.push({ key: 'desc', value: description });
    
    // Evidence from instances
    let evidenceText = '';
    if (Array.isArray(vuln?.instances)) {
      const evidenceItems = vuln.instances
        .map(instance => instance?.evidence?.trim())
        .filter(text => typeof text === 'string' && text.length > 0)
        .map(text => stripHtmlTags(text))
        .filter(text => text && text.trim().length > 0);
      if (evidenceItems.length > 0) {
        const uniqueItems = [...new Set(evidenceItems)];
        evidenceText = '• ' + uniqueItems.join('\n• ');
      }
    }
    if (!evidenceText && vuln?.evidence && vuln.evidence.trim()) {
      const cleanEvidence = stripHtmlTags(vuln.evidence.trim());
      evidenceText = cleanEvidence ? '• ' + cleanEvidence : '—';
    }
    if (!evidenceText) evidenceText = '—';
    if (evidenceText) details.push({ key: 'evidence', value: evidenceText });
    
    if (vuln?.otherinfo) details.push({ key: 'otherinfo', value: stripHtmlTags(vuln.otherinfo) });
    if (vuln?.pluginid) details.push({ key: 'pluginid', value: String(vuln.pluginid) });
    if (vuln?.reference) details.push({ key: 'reference', value: stripHtmlTags(vuln.reference) });
    if (vuln?.riskcode) details.push({ key: 'riskcode', value: String(vuln.riskcode) });
    if (vuln?.riskdesc) details.push({ key: 'riskdesc', value: String(vuln.riskdesc) });
    
    const recommendation = stripHtmlTags(vuln?.recommendation || vuln?.remediation || vuln?.fix || vuln?.solution || '');
    if (recommendation) details.push({ key: 'solution', value: recommendation });
    
    if (vuln?.sourceid) details.push({ key: 'sourceid', value: String(vuln.sourceid) });
    if (vuln?.wascid) details.push({ key: 'wascid', value: String(vuln.wascid) });
    
    let currentPage = page;
    for (const detail of details) {
      if (y < 100) {
        currentPage = doc.addPage([595, 842]);
        y = currentPage.getHeight() - 50;
      }
      
      drawTextSafe(currentPage,detail.key, {
        x: 50,
        y,
        size: 8,
        font: helveticaBold,
        color: colors.ink,
      });
      
      y -= 15;
      y = await addWrappedText(currentPage, detail.value, 50, y, currentPage.getWidth() - 100, 8, helvetica, colors.ink, 12);
      y -= 10;
    }
  }
}

// Add Dependencies section (optional)
async function addDependenciesSection(doc, data) {
  const dependencies = data?.dependencies || data?.packages;
  if (!Array.isArray(dependencies) || dependencies.length === 0) return;
  
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  let y = page.getHeight() - 50;
  
  drawTextSafe(page,'Dependencies', {
    x: 50,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 30;
  
  const columns = ['id', 'name', 'title', 'severity', 'status', 'package', 'endpoint'].filter(col => 
    dependencies.some(d => d?.[col] !== undefined)
  ).slice(0, 5);
  
  if (columns.length > 0) {
    // Header
    let x = 50;
    for (const col of columns) {
      drawTextSafe(page,col, {
        x,
        y,
        size: 8,
        font: helveticaBold,
        color: colors.muted,
      });
      x += 100;
    }
    y -= 20;
    
    // Rows
    for (const dep of dependencies.slice(0, 200)) {
      if (y < 100) {
        const newPage = doc.addPage([595, 842]);
        y = newPage.getHeight() - 50;
        page = newPage;
      }
      
      x = 50;
      for (const col of columns) {
        drawTextSafe(page,String(dep?.[col] ?? '-'), {
          x,
          y,
          size: 8,
          font: helvetica,
          color: colors.ink,
        });
        x += 100;
      }
      y -= 15;
    }
  }
}

// Add Environment & Metadata section (optional)
async function addEnvironmentMetadataSection(doc, data) {
  const metadata = data?.metadata;
  const environment = data?.environment;
  
  if (!isPlainObject(metadata) && !isPlainObject(environment)) return;
  
  const page = doc.addPage([595, 842]);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  
  let y = page.getHeight() - 50;
  
  drawTextSafe(page,'Environment & Metadata', {
    x: 50,
    y,
    size: 16,
    font: helveticaBold,
    color: colors.ink,
  });
  
  y -= 30;
  
  if (isPlainObject(metadata)) {
    drawTextSafe(page,'Metadata', {
      x: 50,
      y,
      size: 10,
      font: helveticaBold,
      color: colors.ink,
    });
    y -= 20;
    
    for (const [k, v] of Object.entries(metadata)) {
      if (y < 100) {
        const newPage = doc.addPage([595, 842]);
        y = newPage.getHeight() - 50;
        page = newPage;
      }
      
      drawTextSafe(page,`${k}:`, {
        x: 50,
        y,
        size: 8,
        font: helveticaBold,
        color: colors.ink,
      });
      y -= 12;
      y = await addWrappedText(page, String(v), 50, y, page.getWidth() - 100, 8, helvetica, colors.ink, 12);
      y -= 10;
    }
  }
  
  if (isPlainObject(environment)) {
    y -= 20;
    drawTextSafe(page,'Environment', {
      x: 50,
      y,
      size: 10,
      font: helveticaBold,
      color: colors.ink,
    });
    y -= 20;
    
    for (const [k, v] of Object.entries(environment)) {
      if (y < 100) {
        const newPage = doc.addPage([595, 842]);
        y = newPage.getHeight() - 50;
        page = newPage;
      }
      
      drawTextSafe(page,`${k}:`, {
        x: 50,
        y,
        size: 8,
        font: helveticaBold,
        color: colors.ink,
      });
      y -= 12;
      y = await addWrappedText(page, String(v), 50, y, page.getWidth() - 100, 8, helvetica, colors.ink, 12);
      y -= 10;
    }
  }
}

// Add footer to page
async function addFooter(page, doc, pageNum, totalPages) {
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  
  drawTextSafe(page,'This report was generated by Defendly Security Platform • defendly.ai', {
    x: 50,
    y: 30,
    size: 8,
    font: helvetica,
    color: colors.muted,
  });
  
  drawTextSafe(page,`${pageNum} / ${totalPages}`, {
    x: page.getWidth() - 100,
    y: 30,
    size: 8,
    font: helvetica,
    color: colors.muted,
  });
}

// Main PDF generation function
export async function generateDetailedReportPDF(data, options = {}) {
  const doc = await PDFDocument.create();
  const opts = options || {};
  const sev = computeSeverity(data || {});
  
  // Track sections for TOC (page numbers will be adjusted after TOC insertion)
  const sections = [];
  
  // Add cover page
  await addCoverPage(doc, data, opts);
  
  // Add overview page
  await addOverviewPage(doc, data, opts, sev);
  sections.push({ title: 'Overview', page: 2 });
  
  // Add Cyber Hygiene Score
  await addCyberHygieneSection(doc, data);
  sections.push({ title: 'Cyber Hygiene Score', page: 3 });
  
  // Add Attack Surface Index
  await addAttackSurfaceIndexSection(doc, data);
  sections.push({ title: 'Attack Surface Index', page: 4 });
  
  // Add Compliance Coverage
  await addComplianceCoverageSection(doc, data);
  sections.push({ title: 'Compliance Coverage', page: 5 });
  
  // Add Open Ports and Services
  await addOpenPortsServicesSection(doc, data);
  sections.push({ title: 'Open Ports and Services', page: 6 });
  
  // Add Security Headers
  await addSecurityHeadersSection(doc, data);
  sections.push({ title: 'Security Headers', page: 7 });
  
  // Add Threat Intelligence
  await addThreatIntelligenceSection(doc, data);
  sections.push({ title: 'Threat Intelligence Score', page: 8 });
  
  // Add Vulnerable Endpoints
  await addVulnerableEndpointsSection(doc, data);
  sections.push({ title: 'All Vulnerable Endpoints', page: 9 });
  
  // Add Vulnerabilities Findings
  const vulnStartPage = doc.getPageCount() + 1;
  await addVulnerabilityPages(doc, data, sev);
  sections.push({ title: 'Vulnerabilities Findings', page: vulnStartPage });
  
  // Add Dependencies (optional)
  if (Array.isArray(data?.dependencies) || Array.isArray(data?.packages)) {
    await addDependenciesSection(doc, data);
    sections.push({ title: 'Dependencies', page: doc.getPageCount() + 1 });
  }
  
  // Add Environment & Metadata (optional)
  if (isPlainObject(data?.metadata) || isPlainObject(data?.environment)) {
    await addEnvironmentMetadataSection(doc, data);
    sections.push({ title: 'Environment & Metadata', page: doc.getPageCount() + 1 });
  }
  
  // Create TOC and insert after cover page
  const tocDoc = await PDFDocument.create();
  await addTableOfContents(tocDoc, sections);
  const tocBytes = await tocDoc.save();
  const tocPdf = await PDFDocument.load(tocBytes);
  const [tocPage] = await doc.copyPages(tocPdf, [0]);
  doc.insertPage(1, tocPage);
  
  // Adjust section page numbers (+1 for TOC)
  sections.forEach(s => s.page++);
  
  // Update all page numbers in footer
  const totalPages = doc.getPageCount();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  
  pages.forEach((page, index) => {
    const pageNum = index + 1;
    // Skip cover page footer
    if (pageNum > 1) {
      addFooter(page, doc, pageNum, totalPages);
    }
  });
  
  const pdfBytes = await doc.save();
  return pdfBytes;
}
