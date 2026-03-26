// Quick Airtable connection test script
// Run with: node scripts/test-airtable.mjs

import { readFileSync } from "fs";
import { resolve } from "path";

// Parse .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
});

const PAT = env.AIRTABLE_PAT;
const BASE_ID = env.AIRTABLE_BASE_ID;
const TABLE_NAME = env.AIRTABLE_TABLE_NAME;

const formula = encodeURIComponent(`{Request ID}='req_05rnhe6w'`);
const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=${formula}`;

try {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${PAT}` },
  });

  const data = await res.json();
  console.log(`✅ Found ${data.records?.length || 0} record(s) for req_05rnhe6w.\n`);

  if (data.records && data.records.length > 0) {
    const f = data.records[0].fields;
    console.log(`── Record Fields ──`);
    console.log(JSON.stringify(f, null, 2));
  }
} catch (err) {
  console.error("❌ Fetch failed:", err.message);
  process.exit(1);
}
