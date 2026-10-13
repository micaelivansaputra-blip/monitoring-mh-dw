/* Monitoring MH DW — core parsing & aggregation.
 * Shared by the dashboard (browser) and scripts/build-data.js (Node), so both use exactly the same rules.
 *   PKDW  = Station PKDW + Training PKDW
 *   PKWT  = Station PKWT + Training PKWT + Back Up MOD
 *   filled = at least one MH cell (Station/Training PKWT/PKDW, Back Up MOD) is non-empty, "0" included
 */
(function(root){
  const MONTHS = {jan:0,feb:1,mar:2,apr:3,may:4,mei:4,jun:5,jul:6,aug:7,agu:7,sep:8,oct:9,okt:9,nov:10,dec:11,des:11};
  const pad = n => String(n).padStart(2,"0");
  const FIELDS = ["admits","spkwt","spkdw","tpkwt","tpkdw","bmod"];       // packed order
  const MH = ["spkwt","spkdw","tpkwt","tpkdw","bmod"];
  const LABEL = {"admits":"admits","station pkwt":"spkwt","station pkdw":"spkdw","training pkwt":"tpkwt","training pkdw":"tpkdw","back up mod":"bmod","backup mod":"bmod"};
  const FORMAT_RE = /^(regular|vip|junior|premium|kids|4dx|imax|macro|deluxe|platinum)/i;

  function num(s){
    s = (s==null?"":String(s)).trim();
    if(!s || s[0]==="#") return null;
    if(s.includes(",")) s = s.replace(/\./g,"").replace(",",".");
    else if(/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g,"");
    const v = parseFloat(s); return isNaN(v) ? null : v;
  }
  function tabKey(title){
    const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(String(title).trim()); if(!m) return null;
    const mi = MONTHS[m[1].slice(0,3).toLowerCase()]; if(mi==null) return null;
    return m[2]+"-"+pad(mi+1);
  }

  /* Raw sheet values (from column A) -> {dates, rows}. Header-driven, so tabs with different column layouts all work. */
  function parseMonth(values){
    values = values || [];
    const isDate = x => /^\d{2}\/\d{2}\/\d{4}$/.test(String(x||"").trim());
    const norm = x => String(x||"").trim().toLowerCase().replace(/\s+/g," ");
    let dr = -1;
    for(let i=0;i<Math.min(values.length,10);i++){ if((values[i]||[]).filter(isDate).length >= 5){ dr = i; break; } }
    if(dr < 0) return {dates:[], rows:[]};
    const hdr = values[dr], sub = values[dr+1] || [];
    const cinemaIdx = Math.max(0, sub.findIndex(x => norm(x)==="cinema"));
    const fmtIdx = sub.findIndex(x => norm(x)==="format");
    const dcols = []; hdr.forEach((h,i) => { if(isDate(h)) dcols.push(i); });
    const dates = dcols.map((c,j) => {
      const end = j+1 < dcols.length ? dcols[j+1] : c+9;
      const cols = {};
      for(let k=c;k<end;k++){ const f = LABEL[norm(sub[k])]; if(f && cols[f]==null) cols[f]=k; }
      const [dd,mm,yy] = String(hdr[c]).trim().split("/");
      return {label:String(hdr[c]).trim(), iso:`${yy}-${mm}-${dd}`, day:+dd, cols};
    });
    const rows = [];
    for(let r=dr+2;r<values.length;r++){
      const row = values[r] || [];
      const name = String(row[cinemaIdx]||"").trim();
      if(/^total$/i.test(name) && rows.length) break;           // stop at the table's Total row
      const m = /^(\d+)\s*-\s*(.+)$/.exec(name);
      if(!m) continue;
      let format = "Regular";
      if(fmtIdx >= 0){ format = String(row[fmtIdx]||"").trim() || "Regular"; }
      else { const c = String(row[cinemaIdx+1]||"").trim(); if(FORMAT_RE.test(c)) format = c; }
      const days = dates.map(d => {
        const o = {}; let filled = false;
        for(const f of FIELDS){
          const k = d.cols[f]; const raw = k==null ? "" : String(row[k]==null?"":row[k]).trim();
          o[f] = num(raw);
          if(f!=="admits" && raw!==""){ filled = true; if(o[f]==null) o[f] = 0; }   // non-numeric text still counts as filled
        }
        return finishDay(o, filled);
      });
      rows.push({cinema:name, code:m[1], name:m[2].trim(), format, days});
    }
    return {dates: dates.map(({label,iso,day}) => ({label,iso,day})), rows};
  }
  function finishDay(o, filled){
    o.filled = filled; o.pkdw = (o.spkdw||0)+(o.tpkdw||0); o.pkwt = (o.spkwt||0)+(o.tpkwt||0)+(o.bmod||0);
    return o;
  }

  /* Compact JSON form for data.json: day = 0 when empty, else [admits,spkwt,spkdw,tpkwt,tpkdw,bmod] with nulls. */
  function pack(m, title){
    return {title, dates: m.dates.map(d => d.label),
      rows: m.rows.map(r => [r.cinema, r.format, r.days.map(x => {
        if(!x.filled && x.admits==null) return 0;
        const a = FIELDS.map(f => x[f]); while(a.length && a[a.length-1]==null) a.pop(); return a;
      })])};
  }
  function unpack(p){
    const dates = p.dates.map(l => { const [dd,mm,yy] = l.split("/"); return {label:l, iso:`${yy}-${mm}-${dd}`, day:+dd}; });
    const rows = p.rows.map(([cinema, format, ds]) => {
      const m = /^(\d+)\s*-\s*(.+)$/.exec(cinema) || [null, "", cinema];
      return {cinema, code:m[1], name:m[2].trim(), format, days: ds.map(a => {
        const o = {}; FIELDS.forEach((f,i) => o[f] = Array.isArray(a) && a[i]!=null ? a[i] : null);
        return finishDay(o, MH.some(f => o[f]!=null));
      })};
    });
    return {dates, rows, title:p.title};
  }

  /* Aggregation. Days strictly before todayIso are "due"; dates after today are excluded from totals and reported in `future`. */
  function stats(m, todayIso){
    const due = m.dates.map(d => d.iso < todayIso);
    const inScope = m.dates.map(d => d.iso <= todayIso);
    const dueN = due.filter(Boolean).length;
    let lastIdx = -1; m.dates.forEach((d,i) => { if(due[i] && m.rows.some(r => r.days[i].filled)) lastIdx = i; });
    const future = [];
    const rowStats = m.rows.map(r => {
      const s = {spkdw:0,tpkdw:0,pkdw:0,pkwt:0,admits:0,missed:0,missedDates:[]};
      r.days.forEach((x,i) => {
        if(!inScope[i]){ if(x.filled) future.push({cinema:r.cinema, format:r.format, label:m.dates[i].label}); return; }
        s.spkdw+=x.spkdw||0; s.tpkdw+=x.tpkdw||0; s.pkdw+=x.pkdw; s.pkwt+=x.pkwt; s.admits+=x.admits||0;
        if(due[i] && !x.filled){ s.missed++; s.missedDates.push(m.dates[i].label); }
      });
      s.total = s.pkdw + s.pkwt; s.share = s.total ? s.pkdw/s.total : 0;
      return Object.assign({cinema:r.cinema, code:r.code, name:r.name, format:r.format, days:r.days}, s);
    });
    const siteMap = new Map();
    rowStats.forEach(r => {
      let s = siteMap.get(r.code);
      if(!s){ s = {code:r.code, name:r.name, cinema:r.cinema, formats:[], rows:[], spkdw:0,tpkdw:0,pkdw:0,pkwt:0,admits:0,missed:0, daily:m.dates.map(()=>0), filledDaily:m.dates.map(()=>true)}; siteMap.set(r.code, s); }
      s.formats.push(r.format); s.rows.push(r);
      ["spkdw","tpkdw","pkdw","pkwt","admits","missed"].forEach(k => s[k]+=r[k]);
      r.days.forEach((x,i) => { if(inScope[i]) s.daily[i]+=x.pkdw; if(!x.filled) s.filledDaily[i]=false; });
    });
    const sites = [...siteMap.values()].map(s => {
      s.total = s.pkdw + s.pkwt; s.share = s.total ? s.pkdw/s.total : 0;
      s.dwDays = s.daily.filter(v => v>0).length;
      s.avgDwDay = s.dwDays ? s.pkdw/s.dwDays : 0;
      s.peak = Math.max(0,...s.daily);
      return s;
    });
    const daily = m.dates.map((d,i) => ({label:d.label, iso:d.iso, day:d.day, due:due[i],
      pkdw: inScope[i] ? m.rows.reduce((a,r) => a + r.days[i].pkdw, 0) : 0,
      spkdw: inScope[i] ? m.rows.reduce((a,r) => a + (r.days[i].spkdw||0), 0) : 0,
      tpkdw: inScope[i] ? m.rows.reduce((a,r) => a + (r.days[i].tpkdw||0), 0) : 0,
      filled: m.rows.filter(r => r.days[i].filled).length,
      dwSites: sites.filter(s => s.daily[i] > 0).length }));
    const tot = rowStats.reduce((a,r) => { ["spkdw","tpkdw","pkdw","pkwt","total","admits","missed"].forEach(k => a[k]+=r[k]); return a; }, {spkdw:0,tpkdw:0,pkdw:0,pkwt:0,total:0,admits:0,missed:0});
    tot.share = tot.total ? tot.pkdw/tot.total : 0;
    tot.rows = m.rows.length; tot.sites = sites.length;
    tot.dwSites = sites.filter(s => s.pkdw>0).length;
    tot.slots = m.rows.length * dueN;
    tot.compliance = tot.slots ? 1 - tot.missed/tot.slots : 1;
    const dataDays = lastIdx + 1;
    tot.avgPerDay = dataDays ? daily.slice(0,dataDays).reduce((a,d)=>a+d.pkdw,0)/dataDays : 0;
    return {rows:rowStats, sites, daily, tot, lastIdx, dueN, future};
  }

  const api = {num, tabKey, parseMonth, pack, unpack, stats, pad};
  if(typeof module !== "undefined" && module.exports) module.exports = api; else root.MHCore = api;
})(typeof window !== "undefined" ? window : globalThis);
