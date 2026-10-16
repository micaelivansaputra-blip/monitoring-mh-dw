// "FYI" email to payroll control (Kak Cinthia): MH DW MTD vs budget incl. admits, per region.
// Always Bahasa Indonesia with en-US number format (same as the Excel table she receives).
import { esc } from "../ui/dom.js";
import { _dicts } from "../i18n.js";
import { store } from "../store.js";

const CAL = _dicts.id._cal;
const n0 = v => Math.round(v || 0).toLocaleString("en-US");
const n1 = v => (+(v || 0)).toLocaleString("en-US", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const pc = v => (v > 0 ? "+" : "") + Math.round(v * 100) + "%";
const pcT = v => Math.round(v * 100) + "%";                       // table style: 98%, -2%
const dShort = iso => `${+iso.slice(8)} ${CAL.monthsShort[+iso.slice(5, 7) - 1]}`;
const monthId = key => CAL.months[+key.slice(5, 7) - 1];
const daysLeft = (cut, key) => { const [y, m] = key.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate() - +cut.slice(8); };

/** Totals per region (region from targets.json). */
export function byRegion(r) {
  const T = (store.targets && store.targets.sites) || {}, out = new Map();
  r.rows.forEach(x => {
    const reg = (T[x.code] && T[x.code].region) || "Tanpa region";
    if (!out.has(reg)) out.set(reg, {region: reg, budget: 0, actual: 0, admB: 0, admA: 0});
    const g = out.get(reg);
    g.budget += x.budgetToDate || 0; g.actual += x.actual || 0; g.admB += x.admitsBudgetToDate || 0; g.admA += x.admitsActual || 0;
  });
  return [...out.values()].sort((a, b) => a.region.localeCompare(b.region, undefined, {numeric: true}));
}

function facts(r) {
  const T = r.tot, left = daysLeft(r.cut, r.month);
  const dwVar = T.budgetToDate ? T.actual / T.budgetToDate - 1 : null;
  const admVar = r.hasAdmits ? T.admitsVar : null;
  return {T, left, dwVar, admVar, over: T.actual - T.budgetMonth, used: T.budgetMonth ? T.actual / T.budgetMonth : null};
}

export function subject(r) {
  return `FYI – MH DW MTD ${monthId(r.month)} (s.d. ${dShort(r.cut)}) vs Budget`;
}

/** The paragraph — wording adapts to the numbers (over/under budget, admits above/below forecast). */
export function paragraph(r) {
  const {T, left, dwVar, admVar, over, used} = facts(r);
  const M = monthId(r.month), D = dShort(r.cut);
  const s = [`FYI Kak, berikut pemakaian MH DW ${M} MTD s.d. ${D} vs budget${r.hasAdmits ? ", termasuk actual admits" : ""} (tabel per region di bawah).`];
  s.push(`Actual MH DW ${n0(T.actual)} MH vs budget ${n0(T.budgetToDate)} MH${dwVar != null ? ` (${pc(dwVar)})` : ""}${r.hasAdmits ? `, sedangkan admits ${n0(T.admitsActual)} vs budget ${n0(T.admitsBudgetToDate)} (${pc(admVar)})` : ""}.`);
  if (over > 0) s.push(`Budget MH DW ${M} kita sebesar ${n0(T.budgetMonth)} MH dan per ${D} sudah habis, saat ini over ${n0(over)} MH${left > 0 ? ` dengan sisa ${left} hari lagi` : ""}.`);
  else s.push(`Budget MH DW ${M} kita sebesar ${n0(T.budgetMonth)} MH, per ${D} sudah terpakai ${Math.round(used * 100)}% dengan sisa ${n0(-over)} MH${left > 0 ? ` untuk ${left} hari lagi` : ""}.`);
  if (r.hasAdmits && dwVar != null && dwVar > 0.05) {
    if (Math.abs(admVar) <= 0.05) s.push("Jadi kelebihan pemakaian MH DW ini tidak sejalan dengan admits yang masih sesuai forecast.");
    else if (admVar < 0) s.push("Jadi kelebihan pemakaian MH DW ini tidak sejalan dengan admits yang justru di bawah forecast.");
    else if (admVar < dwVar / 2) s.push("Admits memang di atas forecast, tetapi kenaikan pemakaian MH DW jauh lebih besar dari kenaikan admits.");
    else s.push("Kenaikan pemakaian MH DW ini sejalan dengan admits yang di atas forecast.");
  }
  return s.join(" ");
}

export function mailHTML(r) {
  const regs = byRegion(r), T = r.tot, A = r.hasAdmits;
  const b = "border:1px solid #000;padding:4px 8px;color:#111;font-size:13px";
  const ab = `${b};background:#FBDDD3;text-align:right`;
  const num = `${b};text-align:right`;
  const head = `<tr><th style="${b};background:#fff" rowspan="3"></th><th style="${b};background:#fff;text-align:center;font-weight:normal" colspan="${A ? 6 : 3}">${esc(CAL.monthsShort[+r.month.slice(5) - 1])} (MTD s.d. ${dShort(r.cut)})</th></tr>
<tr><th style="${b};background:#8ED3EE;text-align:center;font-weight:normal" colspan="3">MH DW</th>${A ? `<th style="${b};background:#A9C7EE;text-align:center;font-weight:normal" colspan="3">Admits</th>` : ""}</tr>
<tr>${["Budget", "Actual", "A VS B", ...(A ? ["Budget", "Actual", "A VS B"] : [])].map(h => `<th style="${b};background:#fff;text-align:left;font-weight:normal">${h}</th>`).join("")}</tr>`;
  const row = (label, g, bold) => {
    const w = bold ? "font-weight:bold;" : "";
    return `<tr><td style="${b};${w}${bold ? "" : "padding-left:40px"}">${esc(label)}</td>
<td style="${num};${w}">${g.budget ? n0(g.budget) : ""}</td><td style="${num};${w}">${n0(g.actual)}</td><td style="${ab};${w}">${g.budget ? pcT(g.actual / g.budget - 1) : "over budget"}</td>
${A ? `<td style="${num};${w}">${n1(g.admB)}</td><td style="${num};${w}">${n1(g.admA)}</td><td style="${ab};${w}">${g.admB ? pcT(g.admA / g.admB - 1) : "–"}</td>` : ""}</tr>`;
  };
  const tot = {budget: T.budgetToDate, actual: T.actual, admB: T.admitsBudgetToDate, admA: T.admitsActual};
  const label = s => s.replace(/^REGION/i, "Region");
  return `<div style="font-family:Calibri,Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">
<p style="margin:0 0 12px">Dear Kak Cinthia,</p>
<p style="margin:0 0 12px">${esc(paragraph(r))}</p>
<table style="border-collapse:collapse;font-size:13px;margin:0">${head}${row("TOTAL", tot, true)}${regs.map(g => row(label(g.region), g, false)).join("")}</table>
<p style="font-size:11px;color:#777;margin:4px 0 12px">Budget = payroll PROD 14 (pro-rata s.d. ${dShort(r.cut)}). Actual = sheet Man Hour Usage s.d. ${dShort(r.cut)}.</p>
<p style="margin:0 0 12px">Terima kasih.</p>
<p style="margin:0 0 12px">Best regards,<br>Ivan</p>
</div>`;
}

export function mailText(r) {
  const regs = byRegion(r), A = r.hasAdmits;
  const line = (l, g) => `${l}: MH DW ${n0(g.actual)} vs ${g.budget ? n0(g.budget) + " (" + pcT(g.actual / g.budget - 1) + ")" : "– (over budget)"}${A ? ` | Admits ${n0(g.admA)} vs ${n0(g.admB)} (${g.admB ? pcT(g.admA / g.admB - 1) : "–"})` : ""}`;
  const T = r.tot;
  return [`Dear Kak Cinthia,`, "", paragraph(r), "",
    line("TOTAL", {budget: T.budgetToDate, actual: T.actual, admB: T.admitsBudgetToDate, admA: T.admitsActual}),
    ...regs.map(g => line(g.region.replace(/^REGION/i, "Region"), g)), "", "Terima kasih.", "", "Best regards,", "Ivan"].join("\n");
}
