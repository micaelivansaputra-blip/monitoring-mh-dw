// Ringkasan / Overview — month at a glance.
import { t } from "../i18n.js";
import { fmt, pct, monthName, prevKey, dateLong, YESTERDAY } from "../format.js";
import { esc, ICON } from "../ui/dom.js";
import { header, kpi, kpis, btn, notice, notes, legend } from "../ui/components.js";
import { columnChart } from "../ui/charts.js";
import { getMonth, missingOn } from "../store.js";
import { state } from "../state.js";
import { futureNote } from "./shared.js";

export default {
  id: "overview",
  render(c, app) {
    const key = state.month, cur = getMonth(key), prev = getMonth(prevKey(key));
    const title = t("nav.overview");
    if (!cur) { c.innerHTML = header(title, monthName(key)) + notice(t("common.noTab", {month: monthName(key)})); return; }
    const {m, st} = cur, T = st.tot;
    const lastLbl = st.lastIdx >= 0 ? m.dates[st.lastIdx].label : "–";

    // Fair delta: month-to-date vs the same number of days of the previous month.
    let delta = "";
    if (prev && st.lastIdx >= 0) {
      const n = st.lastIdx + 1, same = prev.st.daily.slice(0, n).reduce((a, d) => a + d.pkdw, 0);
      if (same > 0) { const d = T.pkdw / same - 1; delta = `<span class="delta ${d > 0 ? "up" : "down"}">${d >= 0 ? "▲" : "▼"} ${pct(Math.abs(d), 1)}</span> ${t("ov.vsFirstDays", {n, month: monthName(prevKey(key))})}`; }
    }
    const h1 = missingOn(YESTERDAY);
    const avg = T.avgPerDay;
    const chart = columnChart(st.daily.map((d, i) => ({
      value: d.pkdw,
      cls: i > st.lastIdx ? "dim" : (d.pkdw > avg * 1.4 ? "hl" : ""),
      tick: (d.day === 1 || d.day % 5 === 0) ? String(d.day) : "",
      tip: `${dateLong(d.iso)}|${t("ov.tipPkdw", {v: fmt(d.pkdw), s: fmt(d.spkdw), tr: fmt(d.tpkdw)})}|${t("ov.tipSites", {n: d.dwSites, f: d.filled, r: T.rows})}`,
    })), {avg, avgLabel: t("chart.avg"), aria: t("ov.daily")});
    const top = st.sites.slice().sort((a, b) => b.pkdw - a.pkdw).slice(0, 10), topMax = Math.max(1, ...top.map(s => s.pkdw));
    const comp = Math.round(T.compliance * 100);
    const ringColor = comp >= 95 ? "var(--green)" : comp >= 85 ? "var(--orange)" : "var(--red)";
    const h1Sites = h1 ? h1.bySite.size : 0;

    c.innerHTML = header(title, t("ov.sub", {month: monthName(key), last: esc(lastLbl)}),
        btn(t("ov.download"), {act: "xlsx", filled: true, icon: ICON.down})) +
      notes(futureNote(st)) +
      kpis(
        kpi({label: t("ov.kpiTotal"), value: fmt(T.pkdw), unit: "MH", tone: "hero", sub: delta || t("common.stationTraining", {s: fmt(T.spkdw), tr: fmt(T.tpkdw)})}),
        kpi({label: t("ov.kpiSites"), icon: ICON.building, value: T.dwSites, unit: "/ " + T.sites, sub: t("ov.kpiSitesSub", {n: T.sites - T.dwSites})}),
        kpi({label: t("ov.kpiAvg"), icon: ICON.calendar, tint: "indigo", value: fmt(avg), unit: "MH", sub: t("ov.kpiAvgSub", {n: st.lastIdx + 1})}),
        kpi({label: t("ov.kpiShare"), icon: ICON.pie, tint: "orange", value: pct(T.share), sub: t("ov.kpiShareSub", {total: fmt(T.total), pkwt: fmt(T.pkwt)})}),
      ) + `
      <div class="grid-2">
        <div class="card chart">
          <div class="card-head"><h2>${t("ov.daily")}</h2>${legend([["var(--blue)", "PKDW"], ["var(--orange)", t("ov.legendHigh")]])}</div>
          ${chart}
        </div>
        <div class="card">
          <div class="card-head"><h2>${t("ov.filling")}</h2><button class="btn plain" type="button" data-go="map">${t("ov.mapLink")} ›</button></div>
          <div class="statusrow"><div class="ring" style="--p:${comp};--c:${ringColor}" data-v="${comp}%"></div>
            <div class="txt"><b>${t("ov.compliance")}</b><span>${t("ov.complianceSub", {m: fmt(T.missed), s: fmt(T.slots)})}</span></div></div>
          ${h1 ? `<div class="statusrow click" data-go="h1"><div class="ring" style="--p:${Math.round((1 - h1.missing.length / h1.total) * 100)};--c:${h1Sites ? "var(--red)" : "var(--green)"}" data-v="${h1Sites}"></div>
            <div class="txt"><b>${h1Sites ? t("ov.h1Missing", {n: h1Sites}) : t("ov.h1AllDone")}</b><span>${dateLong(YESTERDAY)} · ${t("ov.h1Tap")} ›</span></div></div>` : ""}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h2>${t("ov.top10")}</h2><button class="btn plain" type="button" data-go="sites">${t("ov.allSites")} ›</button></div>
        <div class="hbars">${top.map(s => `<div class="hbar" data-site="${s.code}" data-tip="${esc(s.cinema)}|${t("ov.tipTop", {v: fmt(s.pkdw), d: s.dwDays})}|${t("ov.tipShare", {p: pct(s.share)})}"><span class="t">${esc(s.cinema)}</span><span class="v">${fmt(s.pkdw)}</span><span class="track"><i style="width:${(s.pkdw / topMax * 100).toFixed(1)}%"></i></span></div>`).join("")}</div>
      </div>`;
  },
};
