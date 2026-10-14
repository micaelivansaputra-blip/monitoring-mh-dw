#!/usr/bin/env node
/* Ringkasan harian untuk notifikasi tugas terjadwal: H-1 belum isi + Productivity Alert H-1.
 * Usage: node scripts/report.js [YYYY-MM-DD]   (default: kemarin, zona Asia/Jakarta) */
const path = require("path");
const C = require(path.join(__dirname, "..", "core.js"));
const data = require(path.join(__dirname, "..", "data.json"));
let cfg = {}; try{ cfg = require(path.join(__dirname, "..", "targets.json")); }catch(e){}
const nowJkt = new Date(Date.now() + 7*3600e3).toISOString().slice(0,10);
const date = process.argv[2] || C.isoAdd(nowJkt, -1);
const cache = {}; const getMonth = k => data.months[k] ? (cache[k] = cache[k] || C.unpack(data.months[k])) : null;
const m = getMonth(date.slice(0,7));
const out = [];
out.push(`Data per ${data.generatedAt}`);
if(m){
  const st = C.stats(m, C.isoAdd(nowJkt, 0));
  out.push(`PKDW ${date.slice(0,7)}: ${st.tot.pkdw} MH`);
  const i = m.dates.findIndex(d => d.iso === date);
  if(i >= 0){
    const miss = [...new Set(m.rows.filter(r => !r.days[i].filled).map(r => r.cinema))];
    out.push(`Belum isi MH ${date}: ${miss.length ? miss.join(", ") : "semua sudah isi"}`);
  }
}
const a = C.prodAlerts(getMonth, date, cfg);
if(a){
  out.push(`Productivity Alert ${date}: ${a.flagged.length} site`);
  a.flagged.forEach(r => out.push(`- ${r.region} ${r.cinema}: ${r.warn}x minggu ini, prod ${(Math.round(r.prod*10)/10).toFixed(1)} vs target ${r.target}, DW ${r.pkdw} jam`));
}
console.log(out.join("\n"));
