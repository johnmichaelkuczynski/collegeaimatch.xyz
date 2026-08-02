#!/usr/bin/env node
/**
 * Seed all US colleges from IPEDS HD2023 into the local PostgreSQL database.
 * Run: node lib/db/seed-colleges.cjs
 */
"use strict";

const { execSync } = require("node:child_process");
const { createReadStream, existsSync, mkdirSync, rmSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const { createInterface } = require("node:readline");
const { Pool } = require("/home/runner/workspace/node_modules/.pnpm/pg@8.22.0/node_modules/pg");

const TMP = "/tmp/ipeds-seed";
const ZIP_URL = "https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip";
const ZIP_PATH = join(TMP, "HD2023.zip");

// ── Helpers ────────────────────────────────────────────────────────────────

function carnegieToType(control, carnegieBasic, icLevel) {
  if (control === 3) return "for_profit";
  if (icLevel === 2) return "community_college";
  if (icLevel === 3) return "technical";
  if ([23].includes(carnegieBasic)) return "specialty";
  if ([24].includes(carnegieBasic)) return "technical";
  if ([25, 26, 27, 28, 29].includes(carnegieBasic)) return "specialty";
  if (carnegieBasic >= 14 && carnegieBasic <= 18) return "university";
  if (carnegieBasic >= 9 && carnegieBasic <= 13) return "university";
  if (carnegieBasic >= 3 && carnegieBasic <= 5) return "lower_tier";
  if (carnegieBasic >= 6 && carnegieBasic <= 8) return "four_year";
  return "four_year";
}

function sizeToEnrollment(sizeCode) {
  switch (sizeCode) {
    case 1: return 500;
    case 2: return 2500;
    case 3: return 7000;
    case 4: return 14000;
    case 5: return 28000;
    default: return 0;
  }
}

function opportunityScore(type, control, sizeCode) {
  let score = 40;
  if (type === "community_college") score += 25;
  if (type === "for_profit") score += 20;
  if (type === "lower_tier") score += 10;
  if (control === 1 && sizeCode >= 3) score += 10;
  if (sizeCode >= 3) score += 8;
  if (sizeCode >= 4) score += 7;
  return Math.min(score, 98);
}

function estimateTuition(control, icLevel) {
  if (control === 1 && icLevel === 2) return { inState: 3800, outOfState: 8500 };
  if (control === 1) return { inState: 10500, outOfState: 25000 };
  if (control === 3) return { inState: 15000, outOfState: 15000 };
  return { inState: 35000, outOfState: 35000 };
}

function estimateCompletionRate(type) {
  if (type === "for_profit") return 0.45;
  if (type === "community_college") return 0.38;
  if (type === "lower_tier") return 0.50;
  if (type === "university") return 0.77;
  return 0.62;
}

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
      fields.push(current); current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("📦  Seeding colleges from IPEDS HD2023…");

    // Check if already seeded
    const { rows: existing } = await client.query("SELECT COUNT(*) FROM colleges");
    const count = parseInt(existing[0].count, 10);
    if (count > 100) {
      console.log(`✅  Already seeded: ${count} colleges in DB. Use --force to reseed.`);
      if (!process.argv.includes("--force")) { process.exit(0); }
      console.log("   --force detected, reseeding…");
      await client.query("TRUNCATE colleges RESTART IDENTITY CASCADE");
    }

    // Download
    if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

    if (!existsSync(ZIP_PATH)) {
      console.log("   Downloading HD2023.zip from nces.ed.gov…");
      execSync(`curl -sSL --max-time 90 -o "${ZIP_PATH}" "${ZIP_URL}"`, { stdio: "inherit" });
    }

    console.log("   Extracting…");
    execSync(`unzip -o -j "${ZIP_PATH}" "*.csv" -d "${TMP}"`, { stdio: "pipe" });

    // Find the CSV
    const files = readdirSync(TMP).filter(f => f.toLowerCase().endsWith(".csv"));
    console.log("   Extracted files:", files.join(", "));
    const csvFile = files.find(f => f.toLowerCase().includes("hd2023")) ?? files[0];
    if (!csvFile) throw new Error("No CSV found in zip");
    const CSV_PATH = join(TMP, csvFile);

    // Parse CSV
    console.log(`   Parsing ${csvFile}…`);
    const rl = createInterface({ input: createReadStream(CSV_PATH) });
    let headers = [];
    const rows = [];
    let lineNo = 0;

    for await (const line of rl) {
      lineNo++;
      const fields = parseCSVLine(line);
      if (lineNo === 1) { headers = fields.map(h => h.trim().toUpperCase()); continue; }
      const row = {};
      for (let i = 0; i < headers.length; i++) row[headers[i]] = (fields[i] ?? "").trim();
      rows.push(row);
    }

    console.log(`   Parsed ${rows.length} total institutions`);
    console.log(`   Sample headers: ${headers.slice(0,12).join(", ")}`);

    // Filter to active, degree-granting
    const active = rows.filter(r =>
      r["DEGGRANT"] === "1" &&
      r["CLOSEIND"] !== "1" &&
      r["UNITID"] &&
      r["INSTNM"]
    );
    console.log(`   Active degree-granting: ${active.length}`);

    // Upsert in batches
    const BATCH = 100;
    let inserted = 0;

    for (let i = 0; i < active.length; i += BATCH) {
      const batch = active.slice(i, i + BATCH);

      if (batch.length === 0) continue;

      const valueStrings = [];
      const valuePlaceholders = [];

      for (let j = 0; j < batch.length; j++) {
        const r = batch[j];
        const control = parseInt(r["CONTROL"] ?? "1", 10) || 1;
        const icLevel = parseInt(r["ICLEVEL"] ?? "1", 10) || 1;
        const carnegieBasic = parseInt(r["C15BASIC"] ?? r["CARNEGIE"] ?? "0", 10) || 0;
        const sizeCode = parseInt(r["INSTSIZE"] ?? "0", 10) || 0;
        const unitid = parseInt(r["UNITID"] ?? "0", 10) || null;
        const type = carnegieToType(control, carnegieBasic, icLevel);
        const enrollment = sizeToEnrollment(sizeCode);
        const tuition = estimateTuition(control, icLevel);
        const completionRate = estimateCompletionRate(type);
        const score = opportunityScore(type, control, sizeCode);
        const url = r["WEBADDR"] || null;
        const name = r["INSTNM"] ?? "";
        const city = r["CITY"] ?? "";
        const state = r["STABBR"] ?? "";
        const medianDebt = control === 1 ? 18000 : control === 3 ? 22000 : 25000;
        const retentionRate = Math.min(completionRate + 0.1, 0.95);

        const base = j * 17;
        valueStrings.push(
          `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16},$${base+17})`
        );
        valuePlaceholders.push(
          unitid, name, city, state, type, control,
          carnegieBasic || null, icLevel, enrollment, url,
          tuition.inState, tuition.outOfState, completionRate, retentionRate,
          medianDebt, score, true
        );
      }

      const sql = `
        INSERT INTO colleges
          (unitid, name, city, state, type, control, carnegie_basic, ic_level,
           enrollment_size, url, tuition_in_state, tuition_out_of_state,
           completion_rate, retention_rate, median_debt, ai_opportunity_score, is_active)
        VALUES ${valueStrings.join(",")}
        ON CONFLICT (unitid) DO UPDATE SET
          name = EXCLUDED.name,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          type = EXCLUDED.type,
          control = EXCLUDED.control,
          carnegie_basic = EXCLUDED.carnegie_basic,
          ic_level = EXCLUDED.ic_level,
          enrollment_size = EXCLUDED.enrollment_size,
          url = EXCLUDED.url,
          tuition_in_state = EXCLUDED.tuition_in_state,
          tuition_out_of_state = EXCLUDED.tuition_out_of_state,
          completion_rate = EXCLUDED.completion_rate,
          retention_rate = EXCLUDED.retention_rate,
          median_debt = EXCLUDED.median_debt,
          ai_opportunity_score = EXCLUDED.ai_opportunity_score,
          is_active = EXCLUDED.is_active
      `;

      await client.query(sql, valuePlaceholders);
      inserted += batch.length;
      if (i % 500 === 0) process.stdout.write(`   ${inserted}/${active.length}\r`);
    }

    console.log(`\n✅  Inserted/updated ${inserted} colleges`);

    // Verify
    const { rows: verify } = await client.query(
      "SELECT type, COUNT(*) as n FROM colleges GROUP BY type ORDER BY n DESC"
    );
    console.log("\n   Breakdown by type:");
    for (const r of verify) console.log(`     ${r.type}: ${r.n}`);

    // Spot check
    const { rows: spot } = await client.query(
      "SELECT id, name, state FROM colleges WHERE name ILIKE '%western new england%'"
    );
    console.log("\n   Spot check 'Western New England':", spot.length ? spot[0].name : "NOT FOUND ⚠️");

  } finally {
    client.release();
    await pool.end();
    try { rmSync(TMP, { recursive: true }); } catch {}
  }
}

seed().catch(err => { console.error("Seed failed:", err); process.exit(1); });
