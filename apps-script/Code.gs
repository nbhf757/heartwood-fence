// ─────────────────────────────────────────────────────────────────
// Heartwood Fence — Google Apps Script Backend
//
// Deploy as a Web App:
//   Extensions → Apps Script → Deploy → New Deployment
//   Type: Web App
//   Execute as: Me
//   Who has access: Anyone (or "Anyone with Google account" for domain lock)
//
// After deploying, copy the Web App URL and paste it into heartwood.html:
//   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_ID/exec";
//   const OPS_SCRIPT_URL  = "https://script.google.com/macros/s/YOUR_ID/exec";
//   (Both point to the same deployment URL)
//
// SHEET SETUP: See SETUP.md in this repo
// ─────────────────────────────────────────────────────────────────

// ── Config ────────────────────────────────────────────────────────
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // paste after creating Sheet
const PRICING_SHEET  = 'Pricing';
const JOBS_SHEET     = 'Jobs';

// Optional: restrict to your company domain (e.g. "@heartwoodfence.com")
// Set to null to allow any Google account
const ALLOWED_DOMAIN = null;

// ── Entry Points ──────────────────────────────────────────────────

function doGet(e) {
  // Domain check (optional)
  if (ALLOWED_DOMAIN) {
    const email = Session.getActiveUser().getEmail();
    if (!email.endsWith(ALLOWED_DOMAIN)) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }
  }

  const page   = e.parameter.page   || '';
  const branch = e.parameter.branch || '';

  // Admin UI
  if (page === 'admin') {
    return HtmlService.createHtmlOutputFromFile('Admin')
      .setTitle('Heartwood Pricing Admin')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Pricing API — returns per-branch overrides for the quote calculator
  if (branch) {
    return getPricing(branch);
  }

  return jsonResponse({ ok: false, error: 'Missing branch or page parameter' });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    return logBOM(payload);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── Pricing API ───────────────────────────────────────────────────

function getPricing(branch) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PRICING_SHEET);
    if (!sheet) return jsonResponse({ ok: false, error: 'Pricing sheet not found' });

    const data = sheet.getDataRange().getValues();
    const headers = data[0]; // Row 1: Key | Default | VB | CIN | GRV | BSE | Description

    // Find which column this branch lives in
    const branchCol = headers.indexOf(branch.toUpperCase());
    const defaultCol = headers.indexOf('Default');
    if (branchCol === -1) return jsonResponse({ ok: false, error: 'Branch not found: ' + branch });

    const pricing = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const key = row[0];
      if (!key) continue;

      // Use branch-specific value if present, fall back to Default
      const branchVal  = row[branchCol];
      const defaultVal = row[defaultCol];
      const raw = (branchVal !== '' && branchVal !== null && branchVal !== undefined)
        ? branchVal : defaultVal;

      // Parse arrays stored as "1.2,3.4,5.6,7.8"
      if (typeof raw === 'string' && raw.includes(',')) {
        pricing[key] = raw.split(',').map(Number);
      } else if (raw !== '' && raw !== null && raw !== undefined) {
        pricing[key] = isNaN(Number(raw)) ? raw : Number(raw);
      }
    }

    return jsonResponse({ ok: true, pricing });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── BOM Submission (Jobs Log) ──────────────────────────────────────

function logBOM(payload) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(JOBS_SHEET);
    if (!sheet) return jsonResponse({ ok: false, error: 'Jobs sheet not found' });

    const jobId    = 'HW-' + new Date().getTime();
    const timestamp = new Date().toISOString();

    sheet.appendRow([
      timestamp,
      jobId,
      payload.branch        || '',
      payload.salesperson   || '',
      payload.customer      || '',
      payload.address       || '',
      payload.material      || '',
      payload.height        || '',
      payload.linearFt      || 0,
      payload.soldPrice     || 0,
      payload.suggestedPrice || 0,
      payload.floorPrice    || 0,
      payload.notes         || '',
      JSON.stringify(payload.bom || []),
    ]);

    return jsonResponse({ ok: true, jobId });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── Admin: read all pricing rows for the web UI ───────────────────

function adminGetPricing() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PRICING_SHEET);
  const data  = sheet.getDataRange().getValues();
  return data; // returns 2D array to the client-side JS
}

// ── Admin: save a single cell edit ────────────────────────────────

function adminSaveCell(rowIndex, colIndex, value) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PRICING_SHEET);
  // rowIndex and colIndex are 0-based from the client; Sheets is 1-based
  sheet.getRange(rowIndex + 1, colIndex + 1).setValue(value);
  return { ok: true };
}

// ── Admin: save all pricing at once ───────────────────────────────

function adminSaveAll(rows) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PRICING_SHEET);
  const range = sheet.getRange(1, 1, rows.length, rows[0].length);
  range.setValues(rows);
  return { ok: true };
}

// ── Admin: get current user email (shown in header) ───────────────

function getCurrentUserEmail() {
  return Session.getActiveUser().getEmail();
}

// ── Helpers ───────────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
