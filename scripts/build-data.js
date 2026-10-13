#!/usr/bin/env node
/* Build / update data.json from raw Google Sheets "values" responses.
 *
 * Usage:  node scripts/build-data.js raw/*.json
 *
 * Each input file is the JSON returned by Sheets values.get for one month tab,
 * fetched with range  '<Tab Title>'!A1:LZ140 :  {"range": "'October 2026'!A1:LZ140", "values": [[...], ...]}
 * Months found in the inputs replace the same months in data.json; every other month is kept.
 */
const fs = require("fs");
const path = require("path");
const C = require(path.join(__dirname, "..", "core.js"));

const out = path.join(__dirname, "..", "data.json");
const files = process.argv.slice(2);
if(!files.length){ console.error("Usage: node scripts/build-data.js raw/*.json"); process.exit(1); }

let data = {generatedAt:null, months:{}};
if(fs.existsSync(out)){ try{ data = JSON.parse(fs.readFileSync(out, "utf8")); }catch(e){ console.warn("data.json unreadable, rebuilding"); } }
data.months = data.months || {};

let updated = 0;
for(const f of files){
  let raw; try{ raw = JSON.parse(fs.readFileSync(f, "utf8")); }catch(e){ console.warn("skip (not JSON):", f); continue; }
  const title = String(raw.range||"").split("!")[0].replace(/^'|'$/g,"");
  const key = C.tabKey(title);
  if(!key){ console.warn("skip (tab title is not 'Month YYYY'):", title || f); continue; }
  const m = C.parseMonth(raw.values);
  if(m.rows.length < 10 || m.dates.length < 28){ console.warn(`skip ${title}: only ${m.rows.length} rows / ${m.dates.length} dates parsed`); continue; }
  data.months[key] = C.pack(m, title);
  updated++;
  const st = C.stats(m, "9999-12-31");
  console.log(`${key}  ${title.padEnd(16)} rows ${String(m.rows.length).padStart(3)}  sites ${String(st.sites.length).padStart(3)}  PKDW ${st.tot.pkdw}`);
}
if(!updated){ console.error("No month updated — data.json left unchanged."); process.exit(2); }

data.generatedAt = new Date().toISOString();
data.source = "Google Sheets · Man Hour Usage";
const sorted = {}; Object.keys(data.months).sort().forEach(k => sorted[k] = data.months[k]); data.months = sorted;
fs.writeFileSync(out, JSON.stringify(data));
console.log(`data.json: ${Object.keys(data.months).length} months, ${(fs.statSync(out).size/1024).toFixed(0)} KB, generatedAt ${data.generatedAt}`);
