// Harian per Site — site × date matrix. Each site shows one line per metric the user switches on
// (MH DW, Station/Training PKDW, PKWT, Total MH, Admits, Productivity, % DW). Choice is remembered per browser.
import { t, cal } from "../i18n.js";
import { fmt, monthName, dateLong, TODAY } from "../format.js";
import { esc, ICON, on } from "../ui/dom.js";
import { header, notice, segmented, btn } from "../ui/components.js";
import { getMonth, store } from "../store.js";
import { state } from "../state.js";
import { workbook } from "./exports.js";

const LS = "mhdw.daily";
/** key, colour token, number of decimals, how the month total is formed. */
export const METRICS = [
  {k: "pkdw", color: "var(--blue)", d: 0, agg: "sum"},
  {k: "spkdw", color: "#64d2ff", d: 0, agg: "sum"},
  {k: "tpkdw", color: "var(--indigo)", d: 0, agg: "sum"},
  {k: "pkwt", color: "var(--label-3)", d: 0, agg: "sum"},
  {k: "total", color: "var(--label-2)", d: 0, agg: "sum"},
  {k: "admits", color: "var(--green)", d: 0, agg: "sum"},
  {k: "prod", color: "var(--orange)", d: 1, agg: "ratio"},
  {k: "share", color: "var(--red)", d: 1, agg: "share"},
];
const DEFAULT = ["pkdw", "admits", "prod"];

const prefs = (() => {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) {}
  const metrics = Array.isArray(p.metrics) && p.metrics.some(k => METRICS.find(m => m.k === k)) ? p.metrics : DEFAULT;
  return {metrics, filter: p.filter || "dw", region: p.region || "all", sort: p.sort || "code", heat: p.heat !== false};
})();
const save = () => { try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch (e) {} };
let query = "";

const targetOf = code => {
  const T = store.targets || {}, s = (T.sites || {})[code] || {};
  return {target: s.target || T.defaultTarget || 14, tol: T.tolerance != null ? T.tolerance : 1, region: s.region || ""};
};

/** Per-site daily values for one month, days limited to those already due (before today). */
export function dailyData(key) {
  const g = getMonth(key); if (!g) return null;
  const {m, st} = g;
  const idx = m.dates.map((d, i) => i).filter(i => m.dates[i].iso < TODAY);
  const sites = st.sites.map(s => {
    const tg = targetOf(s.code);
    const days = idx.map(i => {
      const o = {filled: false, pkdw: 0, spkdw: 0, tpkdw: 0, pkwt: 0, admits: null};
      s.rows.forEach(r => { const x = r.days[i];
        o.filled = o.filled || x.filled; o.pkdw += x.pkdw; o.spkdw += x.spkdw || 0; o.tpkdw += x.tpkdw || 0; o.pkwt += x.pkwt;
        if (x.admits != null) o.admits = (o.admits || 0) + x.admits; });
      o.total = o.pkdw + o.pkwt;
      o.prod = o.total > 0 ? (o.admits || 0) / o.total : null;          // empty Admits = 0, same as Productivity Alert
      o.share = o.total > 0 ? o.pkdw / o.total * 100 : null;
      o.low = o.pkdw > 0 && o.prod != null && o.prod < tg.target - tg.tol;
      return o;
    });
    const sum = k => days.reduce((a, x) => a + (x[k] || 0), 0);
    const tot = {pkdw: sum("pkdw"), spkdw: sum("spkdw"), tpkdw: sum("tpkdw"), pkwt: sum("pkwt"), total: sum("total"), admits: sum("admits")};
    tot.prod = tot.total ? tot.admits / tot.total : null; tot.share = tot.total ? tot.pkdw / tot.total * 100 : null;
    return {code: s.code, cinema: s.cinema, name: s.name, region: tg.region, target: tg.target, tol: tg.tol, days, tot,
      lowDays: days.filter(x => x.low).length, missed: days.filter(x => !x.filled).length};
  });
  // All-sites line
  const allDays = idx.map((_, j) => {
    const o = {filled: true, pkdw: 0, spkdw: 0, tpkdw: 0, pkwt: 0, admits: 0, total: 0};
    sites.forEach(s => { const x = s.days[j]; ["pkdw", "spkdw", "tpkdw", "pkwt", "total"].forEach(k => o[k] += x[k]); o.admits += x.admits || 0; });
    o.prod = o.total ? o.admits / o.total : null; o.share = o.total ? o.pkdw / o.total * 100 : null;
    return o;
  });
  return {m, dates: idx.map(i => m.dates[i]), sites, allDays};
}

function visible(D) {
  const q = query.trim().toLowerCase();
  let list = D.sites.filter(s =>
    (prefs.filter === "all" || (prefs.filter === "dw" ? s.tot.pkdw > 0 : prefs.filter === "low" ? s.lowDays > 0 : s.missed > 0)) &&
    (prefs.region === "all" || s.region === prefs.region) &&
    (!q || `${s.code} ${s.cinema} ${s.region}`.toLowerCase().includes(q)));
  const by = {code: (a, b) => +a.code - +b.code, pkdw: (a, b) => b.tot.pkdw - a.tot.pkdw,
    prod: (a, b) => (a.tot.prod ?? 1e9) - (b.tot.prod ?? 1e9), low: (a, b) => b.lowDays - a.lowDays || b.tot.pkdw - a.tot.pkdw};
  return list.sort(by[prefs.sort] || by.code);
}

const val = (v, d) => v == null ? "" : fmt(v, d);
function cell(x, mt, max) {
  if (!x.filled && mt.k !== "admits") return `<td class="dm nf" data-tip="${esc(t("daily.notFilled"))}"></td>`;
  const v = x[mt.k];
  if (v == null || (v === 0 && mt.k !== "prod")) return `<td class="dm z">${v === 0 ? "·" : ""}</td>`;
  let cls = "dm", style = "";
  if (mt.k === "prod" && x.low) cls += " low";
  if (prefs.heat && mt.agg === "sum" && max > 0) style = ` style="--h:${Math.round(Math.min(1, v / max) * 34)}%;--hc:${mt.color}"`;
  return `<td class="${cls}"${style}>${val(v, mt.d)}</td>`;
}

export default {
  id: "daily",
  render(c, app) {
    const key = state.month, title = t("nav.daily");
    const D = dailyData(key);
    if (!D) { c.innerHTML = header(title, monthName(key)) + notice(t("common.noTab", {month: monthName(key)})); return; }
    const mets = METRICS.filter(m => prefs.metrics.includes(m.k));
    const list = visible(D);
    const regions = [...new Set(D.sites.map(s => s.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
    const last = D.dates[D.dates.length - 1];
    const dn = cal().days;

    const chips = METRICS.map(m => `<button type="button" class="mchip" data-metric="${m.k}" aria-pressed="${prefs.metrics.includes(m.k)}"><i style="background:${m.color}"></i>${t("daily.m." + m.k)}</button>`).join("");
    const head = `<tr><th class="dn">${t("col.site")}</th><th class="r dt">${t("daily.mtd")}</th>${D.dates.map(d => {
      const wd = new Date(d.iso + "T00:00:00").getDay();
      return `<th class="dd${wd === 0 || wd === 6 ? " we" : ""}"><span>${dn[wd].slice(0, 3)}</span>${d.day}</th>`; }).join("")}</tr>`;

    const group = (s, days, tot, isAll) => {
      const max = {}; mets.forEach(mt => { max[mt.k] = Math.max(0, ...days.map(x => x[mt.k] || 0)); });
      return mets.map((mt, j) => `<tr class="${j === 0 ? "g0" : ""}${isAll ? " all" : ""}">
        <td class="dn">${j === 0 ? (isAll ? `<b>${t("daily.allSites", {n: list.length})}</b>` : `<button type="button" class="dsite" data-site="${s.code}"><b>${esc(s.cinema)}</b>${s.region ? `<span>${esc(s.region)}${mt && prefs.metrics.includes("prod") ? " · target " + s.target : ""}</span>` : ""}</button>`) : ""}<em><i style="background:${mt.color}"></i>${t("daily.m." + mt.k)}</em></td>
        <td class="r dt${mt.k === "prod" && !isAll && tot.prod != null && tot.prod < s.target - s.tol ? " low" : ""}">${val(tot[mt.k], mt.d) || "–"}</td>
        ${days.map(x => cell(x, mt, max[mt.k])).join("")}</tr>`).join("");
    };
    const allTot = (() => { const o = {}; ["pkdw", "spkdw", "tpkdw", "pkwt", "total", "admits"].forEach(k => o[k] = list.reduce((a, s) => a + (s.tot[k] || 0), 0));
      o.prod = o.total ? o.admits / o.total : null; o.share = o.total ? o.pkdw / o.total * 100 : null; return o; })();
    const allDays = D.dates.map((_, j) => { const o = {filled: true}; ["pkdw", "spkdw", "tpkdw", "pkwt", "total"].forEach(k => o[k] = list.reduce((a, s) => a + s.days[j][k], 0));
      o.admits = list.reduce((a, s) => a + (s.days[j].admits || 0), 0); o.prod = o.total ? o.admits / o.total : null; o.share = o.total ? o.pkdw / o.total * 100 : null; return o; });

    c.innerHTML = header(title, last ? t("daily.sub", {month: monthName(key), date: dateLong(last.iso)}) : monthName(key),
        btn(t("common.downloadExcel"), {id: "dXlsx", filled: true, icon: ICON.down})) + `
      <div class="card mpick"><div class="card-head"><h2>${t("daily.show")}</h2><span class="sub">${t("daily.showSub")}</span>
        <button type="button" class="link" id="dAll">${t("daily.allOn")}</button><button type="button" class="link" id="dReset">${t("daily.reset")}</button></div>
        <div class="mchips" role="group" aria-label="${esc(t("daily.show"))}">${chips}</div></div>
      <div class="row">
        ${segmented("dfl", prefs.filter, [["dw", t("daily.fDw")], ["low", t("daily.fLow")], ["late", t("daily.fLate")], ["all", t("daily.fAll")]], "Filter")}
        <select class="popup" id="dRegion" aria-label="Region"><option value="all">${t("daily.allRegions")}</option>${regions.map(r => `<option${r === prefs.region ? " selected" : ""}>${esc(r)}</option>`).join("")}</select>
        <select class="popup" id="dSort" aria-label="${esc(t("daily.sort"))}">${["code", "pkdw", "prod", "low"].map(k => `<option value="${k}"${k === prefs.sort ? " selected" : ""}>${t("daily.sort." + k)}</option>`).join("")}</select>
        <label class="switch"><input type="checkbox" id="dHeat" ${prefs.heat ? "checked" : ""}>${t("daily.heat")}</label>
        <span class="spacer"></span>
        <input type="search" class="search" id="dQ" placeholder="${esc(t("daily.search"))}" value="${esc(query)}" aria-label="${esc(t("daily.search"))}">
      </div>
      ${!mets.length ? notice(t("daily.noMetric"), t("daily.noMetricSub")) : !D.dates.length ? notice(t("daily.noDays")) : `
      <div class="table-wrap daily"><table class="dmx">
        <thead>${head}</thead>
        <tbody>${list.length ? group(null, allDays, allTot, true) + list.map(s => group(s, s.days, s.tot, false)).join("") : `<tr><td class="muted" colspan="${D.dates.length + 2}">${t("daily.empty")}</td></tr>`}</tbody>
      </table></div>
      <p class="foot">${t("daily.foot")}</p>`}`;

    const rerender = () => { save(); app.rerender(); };
    on(c, "[data-metric]", "click", b => {
      const k = b.dataset.metric, cur = prefs.metrics;
      prefs.metrics = cur.includes(k) ? cur.filter(x => x !== k) : METRICS.map(m => m.k).filter(x => x === k || cur.includes(x));
      rerender();
    });
    on(c, "#dAll", "click", () => { prefs.metrics = METRICS.map(m => m.k); rerender(); });
    on(c, "#dReset", "click", () => { prefs.metrics = DEFAULT.slice(); rerender(); });
    on(c, "[data-dfl]", "click", b => { prefs.filter = b.dataset.dfl; rerender(); });
    on(c, "#dRegion", "change", el => { prefs.region = el.value; rerender(); });
    on(c, "#dSort", "change", el => { prefs.sort = el.value; rerender(); });
    on(c, "#dHeat", "change", el => { prefs.heat = el.checked; rerender(); });
    on(c, "#dQ", "input", el => { query = el.value; const pos = el.selectionStart; app.rerender(); const n = c.querySelector("#dQ"); n.focus(); n.setSelectionRange(pos, pos); });
    on(c, "#dXlsx", "click", () => exportDaily());
  },
};

/** Excel: same rows as on screen (metrics switched on, filters applied). */
export function exportDaily() {
  const key = state.month, D = dailyData(key); if (!D) return;
  const W = workbook(); if (!W) return;
  const mets = METRICS.filter(m => prefs.metrics.includes(m.k));
  const r = (v, d) => v == null ? "" : +(+v).toFixed(d);
  const aoa = [[t("daily.xTitle", {month: monthName(key)})], [], [t("x.code"), t("col.site"), "Region", t("daily.metric"), t("daily.mtd"), ...D.dates.map(d => d.label)]];
  visible(D).forEach(s => mets.forEach(mt => aoa.push([+s.code, s.cinema, s.region, t("daily.m." + mt.k), r(s.tot[mt.k], mt.d),
    ...s.days.map(x => (!x.filled && mt.k !== "admits") ? "" : r(x[mt.k], mt.d))])));
  W.add(t("nav.daily"), aoa, [6, 30, 11, 16, 10, ...D.dates.map(() => 7)]);
  W.write(`MH_DW_Harian_${monthName(key).replace(" ", "_")}.xlsx`);
}
