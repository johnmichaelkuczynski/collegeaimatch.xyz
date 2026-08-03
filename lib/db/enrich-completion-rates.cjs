/**
 * Enriches the colleges table with real per-school 150%-time completion rates
 * from the IPEDS GR2023 graduation rate survey.
 *
 * CHRTSTAT=12 → revised cohort (denominator)
 * CHRTSTAT=13 → completers within 150% of normal time (numerator)
 *
 * Usage: node lib/db/enrich-completion-rates.cjs
 */

"use strict";
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");
const { Pool } = require("pg");

const TMP = "/tmp/ipeds-gr";
const GR_ZIP_URL = "https://nces.ed.gov/ipeds/datacenter/data/GR2023.zip";
const GR_ZIP = path.join(TMP, "gr2023.zip");
const GR_CSV = path.join(TMP, "gr2023.csv");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Download helpers ──────────────────────────────────────────────────────────

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { console.log(`  Using cached ${dest}`); return resolve(); }
    console.log(`  Downloading ${url}...`);
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location, dest).then(resolve, reject);
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

// Simple CSV line parser (handles quoted fields)
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim()); current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(TMP, { recursive: true });

  await download(GR_ZIP_URL, GR_ZIP);

  if (!fs.existsSync(GR_CSV)) {
    console.log("  Unzipping...");
    execSync(`unzip -o "${GR_ZIP}" -d "${TMP}"`);
  }

  // Parse GR2023.csv
  // Columns: UNITID, GRTYPE, CHRTSTAT, SECTION, COHORT, LINE, XGRTOTLT, GRTOTLT, ...
  console.log("  Parsing GR2023.csv...");
  const lines = fs.readFileSync(GR_CSV, "utf8").split("\n");
  const header = parseCSVLine(lines[0]);

  const idxUNITID   = header.indexOf("UNITID");
  const idxCHRTSTAT = header.indexOf("CHRTSTAT");
  const idxSECTION  = header.indexOf("SECTION");
  const idxCOHORT   = header.indexOf("COHORT");
  const idxGRTOTLT  = header.indexOf("GRTOTLT");
  const idxXGRTOTLT = header.indexOf("XGRTOTLT"); // suppression flag

  // For each UNITID, collect pairs: (section+cohort) → { cohort: n, completers: n }
  // CHRTSTAT=12 → revised cohort; CHRTSTAT=13 → completers within 150%
  const byUnitid = new Map(); // unitid → Map<"section:cohort", { cohort, completers }>

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const f = parseCSVLine(line);
    const unitid    = parseInt(f[idxUNITID], 10);
    const chrtstat  = parseInt(f[idxCHRTSTAT], 10);
    const section   = parseInt(f[idxSECTION], 10);
    const cohort    = parseInt(f[idxCOHORT], 10);
    const suppFlag  = f[idxXGRTOTLT];
    const grtotlt   = parseInt(f[idxGRTOTLT], 10);

    if (!unitid || isNaN(grtotlt) || grtotlt <= 0) continue;
    if (suppFlag === "Z" || suppFlag === "A") continue; // suppressed / not applicable

    if (chrtstat !== 12 && chrtstat !== 13) continue;

    if (!byUnitid.has(unitid)) byUnitid.set(unitid, new Map());
    const key = `${section}:${cohort}`;
    if (!byUnitid.get(unitid).has(key)) {
      byUnitid.get(unitid).set(key, { cohort: 0, completers: 0 });
    }
    const entry = byUnitid.get(unitid).get(key);
    if (chrtstat === 12) entry.cohort      = Math.max(entry.cohort, grtotlt);
    if (chrtstat === 13) entry.completers  = Math.max(entry.completers, grtotlt);
  }

  // For each UNITID, pick the section:cohort pair with the largest cohort
  const completionRates = new Map(); // unitid → rate (0–1)
  for (const [unitid, pairs] of byUnitid) {
    let bestCohort = 0, bestCompleters = 0;
    for (const { cohort, completers } of pairs.values()) {
      if (cohort > bestCohort) { bestCohort = cohort; bestCompleters = completers; }
    }
    if (bestCohort > 0) {
      completionRates.set(unitid, Math.round((bestCompleters / bestCohort) * 1000) / 1000);
    }
  }

  console.log(`  Computed rates for ${completionRates.size} institutions`);

  // Sample output
  const samples = [...completionRates.entries()].slice(0, 5);
  console.log("  Sample rates:", samples.map(([u, r]) => `${u}=${(r * 100).toFixed(1)}%`).join(", "));

  // Fetch all unitids from DB
  const { rows } = await pool.query("SELECT id, unitid, name FROM colleges WHERE unitid IS NOT NULL");
  console.log(`  Updating ${rows.length} colleges in DB...`);

  let updated = 0, skipped = 0;
  for (const row of rows) {
    const rate = completionRates.get(row.unitid);
    if (rate == null) { skipped++; continue; }
    await pool.query(
      "UPDATE colleges SET completion_rate = $1 WHERE id = $2",
      [rate, row.id]
    );
    updated++;
  }

  console.log(`  Done. Updated: ${updated}, skipped (no GR data): ${skipped}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
