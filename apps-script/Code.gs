// ─────────────────────────────────────────────────────────────────
// Heartwood Fence — Google Apps Script Backend
//
// Deploy as a Web App:
//   Extensions → Apps Script → Deploy → New Deployment
//   Type: Web App
//   Execute as: Me
//   Who has access: Anyone   ← MUST be "Anyone" (NOT "Anyone with Google account")
//                               "Anyone with Google account" causes a login-page redirect
//                               when the app fetches from the browser, breaking POST submissions.
//                               Security is handled by the userEmail domain check in doPost.
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
const ALLOWED_DOMAINS = ['heartwoodfenceva.com', 'heartwood-fence.com'];
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
    const domain = userEmail.split('@')[1] || '';
    if (!ALLOWED_DOMAINS.includes(domain)) {
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
  if (!ALLOWED_DOMAINS.includes(email.split('@')[1] || '')) {
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
  if (!ALLOWED_DOMAINS.includes(email.split('@')[1] || '')) {
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

// ── One-time setup: create Products + Addons tabs with GRV data ───
// Run this once from the Apps Script editor (Run > setupGRVProductsAndAddons)
// Safe to re-run — it skips creation if the tab already exists and has data.

function setupGRVProductsAndAddons() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ── Products ──────────────────────────────────────────────────────
  const PRODUCT_HEADERS = [
    'branch','material','product_id','product_name','style_template',
    'section_length_ft','heights_ft','infill_desc','infill_dim',
    'infill_units_per_section','infill_cost_ea','infill_supplier',
    'rail_desc','rail_dim','rails_per_section','rail_cost_ea','rail_supplier',
    'post_size','post_cost_6ft_post','post_cost_8ft_post','post_supplier',
    'gate_post_size','gate_post_cost_8ft','gate_post_cost_10ft','gate_post_supplier',
    'labor_per_lf','notes'
  ];

  const PRODUCTS = [
    ['GRV','wood','grv_wood_privacy_58','Dog Ear Privacy 5/8"','privacy_picket',8,'6','Dog Ear Picket Treated Pine','5/8"x6"x6\'','',2.81,'SDA','2x4x8 Rail Treated Pine','2x4x8',3,5.71,'SDA','4x4x8','',10.99,'SDA','6x6x8',35.21,45.86,'SDA','','SDA1237 picket; SDA1143 rail; SDA1030 post; SDA1045/SDA1046 gate posts'],
    ['GRV','wood','grv_wood_privacy_34','Dog Ear Privacy 3/4"','privacy_picket',8,'6','Dog Ear Picket Treated Pine','3/4"x6"x6\'','','','','2x4x8 Rail Treated Pine','2x4x8',3,5.71,'SDA','4x4x8','',10.99,'SDA','6x6x8',35.21,45.86,'SDA','','3/4" picket not priced — confirm SKU with SDA'],
    ['GRV','wood','grv_wood_privacy_cedar','Dog Ear Privacy Cedar','privacy_picket',8,'6','Dog Ear Picket Cedar','5/8"x6"x6\'','',5.95,'SDA','2x4x8 Rail Cedar','2x4x8',2,13.98,'SDA','4x4x8','',10.99,'SDA','6x6x8',35.21,45.86,'SDA','','SDA1590 cedar picket; SDA1137 cedar rail; PT Pine posts'],
    ['GRV','wood','grv_wood_horiz','Horizontal Privacy 6ft','horizontal_board',8,'6','1x6 Horizontal Board','1x6x8',13,8.32,'SDA','Cap Board built into style','2x6x8','','','','4x4x8','',10.99,'SDA','6x6x8',35.21,45.86,'SDA','','SDA1233 board; 2x6x8 cap board cost TBD'],
    ['GRV','wood','grv_wood_ranch_3rail','Ranch Rail 3 Rail','split_rail',11,'4','Split Rail','4"x4"x11\'',3,'','','','4"x4"x11\'','','','','4x4x6','','','','4x6x6','','','','','Split rail not in SDA — need separate supplier'],
    ['GRV','wood','grv_wood_privacy_8ft','Dog Ear Privacy 8ft','privacy_picket',8,'8','Dog Ear Picket Treated Pine','5/8"x6"x8\'','',6.63,'SDA','2x4x8 Rail Treated Pine','2x4x8',4,5.71,'SDA','4x6x10','','','','6x6x10',45.86,45.22,'SDA','','SDA1238 picket; 4x6x10 line post cost TBD'],
    ['GRV','vinyl','grv_vinyl_privacy','Vinyl Privacy 6ft','panel',8,'6','Privacy Panel','6ft x 8ft panel',1,179.10,'CAT','','','','','','5x5x8','',34.44,'CAT','5x5x8',34.44,'','','','WHITE NEWBURY ELEMENT RESV QQ panel (CAT)'],
    ['GRV','aluminum','grv_alum_4ft','Aluminum Flat Top 4ft','panel',6,'4','Aluminum Panel','4ft x 6ft panel',1,'','','','','','','','2x2x6','','','','2x2x6','','','','','Need aluminum supplier pricing'],
    ['GRV','chainlink','grv_chainlink_4ft','Chain Link 4ft','mesh',10,'4','Galvanized Mesh','11.5ga','per_lf','','','Top Rail','1-3/8" x 21ft','1 per 21ft','','','steel','','','','','','','','','Need chain link supplier pricing'],
  ];

  let prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!prodSheet) {
    prodSheet = ss.insertSheet(SHEET_PRODUCTS);
  }
  if (prodSheet.getLastRow() === 0) {
    prodSheet.appendRow(PRODUCT_HEADERS);
  }
  const existingIds = prodSheet.getLastRow() > 1
    ? prodSheet.getRange(2, 3, prodSheet.getLastRow() - 1, 1).getValues().flat()
    : [];
  PRODUCTS.forEach(row => {
    if (!existingIds.includes(row[2])) prodSheet.appendRow(row);
  });

  // ── Addons ────────────────────────────────────────────────────────
  const ADDON_HEADERS = ['product_id','addon_key','addon_label','cost_type','cost_value','supplier','notes'];

  const ADDONS = [
    ['grv_wood_privacy_58','board_on_board','Board on Board','ea',2.81,'SDA','Same picket EA cost as base product — app adds 70% more pickets'],
    ['grv_wood_privacy_58','lattice_top','Lattice Top','ea','','','Cost per 4x8 lattice panel — switches to 4ft pickets ($2.81 EA)'],
    ['grv_wood_privacy_58','top_cap_fascia','Top Cap & Fascia','ea','','','1x4x16 running two sections — need board cost from SDA'],
    ['grv_wood_privacy_58','gaps_in_pickets','Gaps in Pickets','ea',0,'n/a','Style/layout note only — no material cost change'],
    ['grv_wood_privacy_34','board_on_board','Board on Board','ea','','','Same picket EA cost as base product — confirm 3/4" picket SKU'],
    ['grv_wood_privacy_34','lattice_top','Lattice Top','ea','','','Cost per 4x8 lattice panel — switches to 4ft pickets'],
    ['grv_wood_privacy_34','top_cap_fascia','Top Cap & Fascia','ea','','','1x4x16 running two sections'],
    ['grv_wood_privacy_34','gaps_in_pickets','Gaps in Pickets','ea',0,'n/a','Style/layout note only — no material cost change'],
    ['grv_wood_privacy_cedar','board_on_board','Board on Board','ea',5.95,'SDA','Same cedar picket EA cost as base product (SDA1590)'],
    ['grv_wood_privacy_cedar','lattice_top','Lattice Top','ea','','','Cost per 4x8 lattice panel — switches to 4ft cedar pickets ($5.95 EA)'],
    ['grv_wood_privacy_cedar','top_cap_fascia','Top Cap & Fascia','ea','','','Cedar or PT? Need cost per 2x6x8 cap board and fascia board'],
    ['grv_wood_horiz','board_on_board','Board on Board','ea',8.32,'SDA','Same board EA cost as base product (SDA1233)'],
    ['grv_wood_ranch_3rail','wire_mesh','Wire Mesh','lf','','','Galvanized wire mesh behind rails — need $/lf and supplier'],
    ['grv_wood_privacy_8ft','board_on_board','Board on Board','ea',6.63,'SDA','Same picket EA cost as 8ft base product (SDA1238)'],
    ['grv_wood_privacy_8ft','top_cap_fascia','Top Cap & Fascia','ea','','','1x4x16 running two sections — need board cost from SDA'],
    ['grv_vinyl_privacy','color_upgrade','Color Upgrade','lf',3.52,'CAT','Upcharge per LF for color over white base'],
    ['grv_vinyl_privacy','lattice_top','Lattice Top Panel','ea',30.22,'CAT','Lattice top kit per panel (CAT)'],
    ['grv_vinyl_privacy','gate_walk','Walk Gate','kit',314.88,'CAT','Prefab kit — fixed cost per gate'],
    ['grv_vinyl_privacy','gate_double','Double Drive Gate','kit',346.36,'CAT','Prefab kit — fixed cost per gate'],
    ['grv_alum_4ft','gate_walk','Walk Gate','kit','','','Prefab kit — fixed cost per gate'],
    ['grv_alum_4ft','gate_double','Double Drive Gate','kit','','','Prefab kit — fixed cost per gate'],
    ['grv_chainlink_4ft','black_vinyl_upgrade','Black Vinyl Coated Mesh','lf','','','Upcharge per LF over galvanized base cost'],
    ['grv_chainlink_4ft','barb_wire','Barb Wire','lf','','','Cost per LF'],
    ['grv_chainlink_4ft','privacy_slats','Privacy Slats','lf','','','Cost per LF'],
    ['grv_chainlink_4ft','gate_walk','Walk Gate','kit','','','Prefab kit — fixed cost per gate'],
    ['grv_chainlink_4ft','gate_double','Double Drive Gate','kit','','','Prefab kit — fixed cost per gate'],
  ];

  let addonSheet = ss.getSheetByName(SHEET_ADDONS);
  if (!addonSheet) {
    addonSheet = ss.insertSheet(SHEET_ADDONS);
  }
  if (addonSheet.getLastRow() === 0) {
    addonSheet.appendRow(ADDON_HEADERS);
  }
  const existingAddonKeys = addonSheet.getLastRow() > 1
    ? addonSheet.getRange(2, 1, addonSheet.getLastRow() - 1, 2).getValues().map(r => r[0] + '|' + r[1])
    : [];
  ADDONS.forEach(row => {
    if (!existingAddonKeys.includes(row[0] + '|' + row[1])) addonSheet.appendRow(row);
  });

  Logger.log('Done — Products rows: ' + prodSheet.getLastRow() + ', Addons rows: ' + addonSheet.getLastRow());
}

// ── Helpers ───────────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
