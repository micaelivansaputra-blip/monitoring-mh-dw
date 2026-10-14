// Tren Bulanan / Monthly trend — PKDW per month and site × month matrix.
import { t } from "../i18n.js";
import { fmt, pct, monthName, monthShort, TODAY } from "../format.js";
import { esc, ICON, on } from "../ui/dom.js";
import { header, segmented, btn, notes, legend } from "../ui/components.js";
import { columnChart } from "../ui/charts.js";
import { store, trend } from "../store.js";
import { state } from "../state.js";

/** Same selection the view shows; reused by the Excel export. */
export function trendData() {
  const all = store.months().slice().reverse();
  const n = state.trendN === 0 ? all.length : state.trendN;
  return trend(all.slice(-n));
}

export default {
  id: "trend",
  render(c, app) {
    const {ok, failed, sites, tot} = trendData(), curKey = TODAY.slice(0, 7), title = t("nav.trend");
    const tools = segmented("n", state.trendN, [[3, t("trend.n3")], [6, t("trend.n6")], [12, t("trend.n12")], [0, t("trend.nAll")]], t("trend.rangeAria")) +
      btn(t("trend.download"), {act: "trend-xlsx", filled: true, icon: ICON.down});
    const every = ok.length > 12 ? 2 : 1;
    const chart = columnChart(ok.map((k, i) => { const x = tot(k); return {
      value: x.pkdw, cls: k === curKey ? "dim" : "", tick: (ok.length - 1 - i) % every === 0 ? monthShort(k) : "",
      tip: `${monthName(k)}${k === curKey ? " (" + t("trend.running") + ")" : ""}|PKDW ${fmt(x.pkdw)} MH|${t("trend.tipSites", {n: x.dwSites, p: pct(x.share)})}`,
    }; }), {H: 240, aria: t("trend.chartTitle")});
    const maxCell = Math.max(1, ...sites.flatMap(s => ok.map(k => s.v[k] || 0)));

    c.innerHTML = header(title, ok.length ? t("trend.sub", {from: monthName(ok[0]), to: monthName(ok[ok.length - 1])}) : "", tools) +
      notes(failed.length ? [[t("trend.failed", {n: failed.length}), failed.map(monthName).join(", ")]] : []) + `
      <div class="card chart"><div class="card-head"><h2>${t("trend.chartTitle")}</h2>${legend([["var(--blue)", t("trend.fullMonth")], ["var(--fill)", t("trend.runMonth")]])}</div>${chart}</div>
      <h2 class="section-head">${t("trend.matrix")}</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>${t("col.site")}</th>${ok.map(k => `<th class="r">${monthShort(k)}</th>`).join("")}<th class="r">Total</th><th class="r">${t("trend.avgMonth")}</th></tr></thead>
        <tbody>${sites.map(s => `<tr><td class="site"><b>${esc(s.cinema)}</b></td>${ok.map(k => { const v = s.v[k], a = v ? (0.06 + 0.42 * v / maxCell) : 0;
          return `<td class="r" style="${v ? `background:color-mix(in srgb,var(--blue) ${(a * 100).toFixed(0)}%,transparent)` : ""}">${v == null ? "<span class='muted'>·</span>" : fmt(v)}</td>`; }).join("")}<td class="r"><b>${fmt(s.sum)}</b></td><td class="r">${fmt(s.sum / ok.length)}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td>${t("trend.totalRow", {n: sites.length})}</td>${ok.map(k => `<td class="r">${fmt(tot(k).pkdw)}</td>`).join("")}<td class="r">${fmt(sites.reduce((a, s) => a + s.sum, 0))}</td><td></td></tr></tfoot>
      </table></div>
      <p class="foot">${t("trend.foot")}</p>`;
    on(c, "[data-n]", "click", b => { state.trendN = +b.dataset.n; app.rerender(); });
  },
};
