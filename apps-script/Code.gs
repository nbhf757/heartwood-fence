// ─────────────────────────────────────────────────────────────────
// Heartwood Fence — Google Apps Script Backend
//
// Deploy as a Web App:
//   Extensions → Apps Script → Deploy → New Deployment
//   Type: Web App
//   Execute as: Me
//   Who has access: Anyone with Google account
//
// After deploying, copy the Web App URL and paste it into heartwood.html:
//   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_ID/exec";
//
// SHEET SETUP: Create a Google Sheet with 4 tabs:
//   Tab 1: Pricing  — Key | Default | VB | CIN | GRV | BSE | Description
//   Tab 2: Products — branch | product_id | product_name | material | ... (see SETUP.md)
//   Tab 3: Addons   — product_id | addon_key | addon_label | cost_type | cost_value | supplier | notes
//   Tab 4: Jobs     — auto-populated by BOM submissions
// ─────────────────────────────────────────────────────────────────

// ── Config ────────────────────────────────────────────────────────
const SPREADSHEET_ID = '1jcRvb30Cityh30xbHaa7RJsZ_uN9Iok3KrDFfEIHOnc';
const ALLOWED_DOMAIN = 'heartwoodfenceva.com';
const ADMIN_EMAILS   = ['fadi@heartwoodfenceva.com', 'nathan@heartwoodfenceva.com'];
const SHEET_PRICING  = 'Pricing';
const SHEET_PRODUCTS = 'Products';
const SHEET_ADDONS   = 'Addons';
const SHEET_JOBS     = 'Jobs';

// ── Entry Points ──────────────────────────────────────────────────

function doGet(e) {
  const action = (e.parameter.action || '').toLowerCase();
  const branch = (e.parameter.branch || '').toUpperCase();

  // JSON API routes — dispatched by ?action=
  if (action === 'getpricing')  return getPricing(branch);
  if (action === 'getproducts') return getProducts(branch);
  if (action === 'getaddons')   return getAddons();

  // Default: serve Admin pricing panel
  return HtmlService.createHtmlOutputFromFile('Admin')
    .setTitle('Heartwood Pricing Admin')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const payload   = JSON.parse(e.postData.contents);
    const userEmail = (payload.userEmail || '').toLowerCase();

    // Domain check — prevent submissions from outside the org
    if (!userEmail.endsWith('@' + ALLOWED_DOMAIN)) {
      return jsonResponse({ ok: false, error: 'Unauthorized domain' });
    }

    return logBOM(payload);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── Pricing API ───────────────────────────────────────────────────

function getPricing(branch) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_PRICING);
    if (!sheet) return jsonResponse({ ok: false, error: 'Pricing sheet not found' });

    const data    = sheet.getDataRange().getValues();
    const headers = data[0]; // Row 1: Key | Default | VB | CIN | GRV | BSE | Description

    const branchCol  = headers.indexOf(branch);
    const defaultCol = headers.indexOf('Default');
    if (branchCol === -1) return jsonResponse({ ok: false, error: 'Branch not found: ' + branch });

    const pricing = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const key = row[0];
      if (!key) continue;

      const branchVal  = row[branchCol];
      const defaultVal = row[defaultCol];
      const raw = (branchVal !== '' && branchVal !== null && branchVal !== undefined)
        ? branchVal : defaultVal;

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

// ── Products API ──────────────────────────────────────────────────

function getProducts(branch) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_PRODUCTS);
    if (!sheet) return jsonResponse({ ok: false, error: 'Products sheet not found' });

    const data    = sheet.getDataRange().getValues();
    const headers = data[0]; // row 1 = column names
    const rows    = data.slice(1);

    const branchIdx = headers.indexOf('branch');
    const products  = rows
      .filter(row => row[0] && (!branch || String(row[branchIdx]).toUpperCase() === branch))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });

    return jsonResponse({ ok: true, products });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── Addons API ────────────────────────────────────────────────────

function getAddons() {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_ADDONS);
    if (!sheet) return jsonResponse({ ok: false, error: 'Addons sheet not found' });

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows    = data.slice(1);

    const addons = rows
      .filter(row => row[0])
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });

    return jsonResponse({ ok: true, addons });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── BOM Submission (Jobs Log) ──────────────────────────────────────

function logBOM(payload) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_JOBS);
    if (!sheet) return jsonResponse({ ok: false, error: 'Jobs sheet not found' });

    const jobId     = 'HW-' + new Date().getTime();
    const timestamp = new Date().toISOString();

    sheet.appendRow([
      timestamp,
      jobId,
      payload.branch         || '',
      payload.userEmail      || '',
      payload.salesperson    || '',
      payload.customer       || '',
      payload.address        || '',
      payload.material       || '',
      payload.height         || '',
      payload.linearFt       || 0,
      payload.soldPrice      || 0,
      payload.suggestedPrice || 0,
      payload.floorPrice     || 0,
      payload.notes          || '',
      JSON.stringify(payload.bom || []),
    ]);

    return jsonResponse({ ok: true, jobId });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── Admin: read all pricing rows for the web UI ───────────────────

function adminGetPricing() {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_PRICING);
    if (!sheet) throw new Error('Pricing sheet not found');
    return sheet.getDataRange().getValues();
  } catch (err) {
    throw new Error('Failed to load pricing: ' + err.message);
  }
}

// ── Admin: save a single cell edit ────────────────────────────────

function adminSaveCell(rowIndex, colIndex, value) {
  const email = Session.getActiveUser().getEmail();
  if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
    throw new Error('Unauthorized');
  }
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PRICING);
  // rowIndex and colIndex are 0-based from the client; Sheets is 1-based
  sheet.getRange(rowIndex + 1, colIndex + 1).setValue(value);
  return { ok: true };
}

// ── Admin: save all pricing at once ───────────────────────────────

function adminSaveAll(rows) {
  const email = Session.getActiveUser().getEmail();
  if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
    throw new Error('Unauthorized');
  }
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PRICING);
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
