# Heartwood Fence — Backend Setup Guide

## What You're Setting Up

```
heartwood.html  (the quote calculator your sales reps use)
     ↕
Google Apps Script  (the backend — serves pricing, logs jobs)
     ↕
Google Sheet  (where you edit pricing and see submitted jobs)
```

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it: **Heartwood Fence Pricing**
3. Create two tabs at the bottom:
   - Rename **Sheet1** → `Pricing`
   - Click the **+** button → rename the new tab → `Jobs`

### Pricing Tab — Paste This Header Row

Click cell A1 and paste exactly:

```
Key	Default	VB	CIN	GRV	BSE	Description
```

(Tab-separated — paste as plain text, not Excel)

### Pricing Tab — Add All Pricing Rows

Paste the rows below starting at A2. The **Default** column is the base value used when a branch has no override. Leave branch columns blank to use the Default.

```
Key	Default	VB	CIN	GRV	BSE	Description
laborMin	500				Minimum labor charge ($)
opsFee	300				Operations fee ($)
demoPerFt	3				Demo/tear-out cost per linear foot
matMarkup	0.015				Material markup (1.5% = 0.015)
salesTax	0.06				Sales tax rate (6% = 0.06)
cogs200	0.62				COGS rate for jobs >200 ft
cogs100	0.60				COGS rate for 100–200 ft jobs
cogs50	0.58				COGS rate for 50–100 ft jobs
cogsLt50	0.56				COGS rate for <50 ft jobs
floorRate	0.67				Floor price multiplier (33% gross margin minimum)
permitStd	75				Standard permit cost ($)
permitLocal	170				Local/special permit cost ($)
permitConst	250				Construction permit cost ($)
concretePunch	25				Concrete punch cost per post ($)
coreDrill	50				Core drill cost per post ($)
surfaceMount	35				Surface mount cost per post ($)
woodMatGood	10.314				Wood Good — material cost per linear foot
woodMatBetter	13.702				Wood Better — material cost per linear foot
woodMatBest	13.460				Wood Best — material cost per linear foot
woodLaborGood	7				Wood Good — labor per linear foot
woodLaborBetter	7				Wood Better — labor per linear foot
woodLaborBest	7				Wood Best — labor per linear foot
woodFastener	0.25				Wood fastener cost per linear foot
woodH4	0.90				Wood height modifier — 4 ft
woodH6	1.00				Wood height modifier — 6 ft (baseline)
woodH8	1.25				Wood height modifier — 8 ft
woodSecLen	8				Wood section length (feet)
postUpg4x6	1.67				Post upgrade — 4x6 cost per linear foot
postUpg6x6	3.23				Post upgrade — 6x6 cost per linear foot
postUpgPM	1.77				Post upgrade — premium machine post per linear foot
woodGoodSupplier	Good				Wood Good tier — supplier display name
woodGoodDesc	5/8" Treated Pine				Wood Good tier — material description
woodBetterSupplier	Better				Wood Better tier — supplier display name
woodBetterDesc	3/4" Treated Pine				Wood Better tier — material description
woodBestSupplier	Best				Wood Best tier — supplier display name
woodBestDesc	Cedar				Wood Best tier — material description
vinylMatGood	14.254				Vinyl Good — material cost per linear foot
vinylMatBetter	18				Vinyl Better — material cost per linear foot
vinylMatBest	22				Vinyl Best — material cost per linear foot
vinylLaborGood	7				Vinyl Good — labor per linear foot
vinylLaborBetter	7				Vinyl Better — labor per linear foot
vinylLaborBest	8				Vinyl Best — labor per linear foot
vinylH4	0.92				Vinyl height modifier — 4 ft
vinylH6	1.00				Vinyl height modifier — 6 ft (baseline)
vinylH8	1.45				Vinyl height modifier — 8 ft
vinylSecLen	8				Vinyl section length (feet)
vinylGoodSupplier	Good				Vinyl Good tier — supplier display name
vinylGoodDesc	Standard Privacy White				Vinyl Good tier — description
vinylBetterSupplier	Better				Vinyl Better tier — supplier display name
vinylBetterDesc	Lattice / Spindle Top				Vinyl Better tier — description
vinylBestSupplier	Best				Vinyl Best tier — supplier display name
vinylBestDesc	Premium Color / Shadowbox				Vinyl Best tier — description
alumMatGood	15.57				Aluminum Good — material cost per linear foot
alumMatBetter	16.88				Aluminum Better — material cost per linear foot
alumMatBest	21.62				Aluminum Best — material cost per linear foot
alumLaborGood	6				Aluminum Good — labor per linear foot
alumLaborBetter	6				Aluminum Better — labor per linear foot
alumLaborBest	6				Aluminum Best — labor per linear foot
alumH4	0.95				Aluminum height modifier — 4 ft
alumH45	1.00				Aluminum height modifier — 4.5 ft (baseline)
alumH6	1.28				Aluminum height modifier — 6 ft
alumSecLen	6				Aluminum section length (feet)
alumGoodSupplier	Good				Aluminum Good tier — supplier display name
alumGoodDesc	2-Rail Flush Bottom				Aluminum Good tier — description
alumBetterSupplier	Better				Aluminum Better tier — supplier display name
alumBetterDesc	3-Rail Thru Bottom				Aluminum Better tier — description
alumBestSupplier	Best				Aluminum Best tier — supplier display name
alumBestDesc	Spear Top / Puppy Picket				Aluminum Best tier — description
clMatGood	3.31				Chain Link Good — material cost per linear foot
clMatBetter	4.88				Chain Link Better — material cost per linear foot
clMatBest	7.20				Chain Link Best — material cost per linear foot
clLaborGood	8				Chain Link Good — labor per linear foot
clLaborBetter	8				Chain Link Better — labor per linear foot
clLaborBest	9				Chain Link Best — labor per linear foot
clH3	0.80				Chain Link height modifier — 3 ft
clH4	1.00				Chain Link height modifier — 4 ft (baseline)
clH5	1.18				Chain Link height modifier — 5 ft
clH6	1.38				Chain Link height modifier — 6 ft
clH8	1.80				Chain Link height modifier — 8 ft
clSecLen	10				Chain Link section length (feet)
clGoodSupplier	Good				Chain Link Good tier — supplier display name
clGoodDesc	Galvanized 11.5ga				Chain Link Good tier — description
clBetterSupplier	Better				Chain Link Better tier — supplier display name
clBetterDesc	Black PVC 9ga				Chain Link Better tier — description
clBestSupplier	Best				Chain Link Best tier — supplier display name
clBestDesc	Black PVC Commercial				Chain Link Best tier — description
gateWalkWood	186				Walk gate — wood ($)
gateWalkVinyl	482				Walk gate — vinyl ($)
gateWalkAlCl	135				Walk gate — aluminum/chain link ($)
gateDblWood	372				Double drive gate — wood ($)
gateDblVinyl	932				Double drive gate — vinyl ($)
gateDblAlCl	280				Double drive gate — aluminum/chain link ($)
gateCustomWood	52				Custom gate — wood per linear foot
gateCustomVinyl	95				Custom gate — vinyl per linear foot
gateCustomAlCl	35				Custom gate — aluminum/chain link per linear foot
addonLattice	2.5,3.75,0,0				Lattice Top addon [wood, vinyl, alum, chainlink] per ft
addonTopCap	1.2,0,0,0				Top Cap & Fascia addon per ft
addonBob	1.85,0,0,0				Board on Board addon per ft
addonGaps	-0.8,0,0,0				Gaps in Pickets addon per ft (negative = discount)
addonInset	1.4,0,0,0				Inset Framing addon per ft
addonSpindle	2.2,4.5,0,0				Spindle Top addon per ft
addonHorizontal	3.2,0,0,0				Horizontal Board addon per ft
addonRanch	-2,0,0,0				Ranch Rail addon per ft (negative = discount)
addonStiffener	0,8.74,0,0				Post Stiffener — vinyl per ft
addonPostCap	0,1.88,0,0				Decorative Post Cap — vinyl per ft
addonSolar	0,3.75,0,0				Solar Post Cap — vinyl per ft
addonColor	0,5,2,0				Color Upgrade — vinyl/alum per ft
addonPuppy	0,0,6.5,0				Puppy Picket — aluminum per ft
addonSpear	0,0,2.55,0				Spear Top — aluminum per ft
addonBarb	0,0,0,1.2				Barb Wire — chain link per ft
addonSlats	0,0,0,3.8				Privacy Slats — chain link per ft
addonBlackMesh	0,0,0,1.5				Black Mesh Upgrade — chain link per ft
```

### Jobs Tab — Paste This Header Row

Click cell A1 in the **Jobs** tab and paste:

```
Timestamp	Job ID	Branch	Salesperson	Customer	Address	Material	Height	Linear Ft	Sold Price	Suggested Price	Floor Price	Notes	BOM (JSON)
```

### Copy the Spreadsheet ID

From the Sheet URL, copy the long ID between `/d/` and `/edit`:
```
https://docs.google.com/spreadsheets/d/  THIS_PART_HERE  /edit
```

---

## Step 2 — Create the Google Apps Script

1. From inside the Google Sheet, go to **Extensions → Apps Script**
2. Delete the default code in `Code.gs`
3. Copy the entire contents of `apps-script/Code.gs` and paste it in
4. **Paste your Spreadsheet ID** on line 7:
   ```js
   const SPREADSHEET_ID = 'paste-your-id-here';
   ```
5. Click the **+** next to "Files" → **HTML** → name it `Admin`
6. Copy the entire contents of `apps-script/Admin.html` and paste it in the Admin.html file
7. Save all files (Ctrl/Cmd+S)

---

## Step 3 — Deploy the Apps Script

1. Click **Deploy → New Deployment**
2. Click the gear ⚙ next to "Type" → select **Web App**
3. Settings:
   - **Description:** Heartwood Fence Backend v1
   - **Execute as:** Me
   - **Who has access:** Anyone  ← MUST be "Anyone" (NOT "Anyone with Google account" — that setting causes fetch requests to get a login redirect instead of JSON)
4. Click **Deploy**
5. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Step 4 — Wire Up the Quote Calculator

Open `heartwood.html` in a text editor and find these two lines (around line 832 and 1630):

```js
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_URL_HERE";
```
```js
const OPS_SCRIPT_URL  = "YOUR_OPS_SCRIPT_URL_HERE";
```

Replace both placeholder strings with your deployed Web App URL. **Both use the same URL.**

Save the file and upload it to your web server.

---

## Step 5 — Access the Admin Panel

Your admin panel is at:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?page=admin
```

Bookmark this URL. You can:
- Edit any pricing value for any branch
- Changes take effect immediately (next time a sales rep selects a branch in the calculator)
- The quote calculator falls back to the built-in defaults if the Sheet is unreachable

---

## Step 6 — (Future) Restrict to Your Domain

When you're ready to lock the app to your company email domain:

1. Open `Code.gs`
2. Find line 12: `const ALLOWED_DOMAIN = null;`
3. Change it to your domain:
   ```js
   const ALLOWED_DOMAIN = '@heartwoodfence.com';
   ```
4. Re-deploy: **Deploy → Manage Deployments → Edit → New Version → Deploy**

Sales reps will need to be signed into Google with their company email to access the calculator.

---

## How Pricing Overrides Work

- Leave a branch cell **blank** → that branch uses the Default value
- Enter a value in a branch cell → that branch uses the override
- For add-on costs (array format like `2.5,3.75,0,0`), enter as comma-separated numbers: `wood, vinyl, aluminum, chainlink`

**Example:** To give Cincinnati a higher wood labor rate:
- Find row `woodLaborGood`
- Enter `8` in the **CIN** column
- Save → Cincinnati reps see the updated quote immediately

---

## File Structure

```
heartwood-fence/
├── heartwood.html          ← The quote calculator (deploy to your web server)
├── SETUP.md                ← This file
└── apps-script/
    ├── Code.gs             ← Paste into Google Apps Script
    └── Admin.html          ← Paste into Google Apps Script as Admin.html
```
