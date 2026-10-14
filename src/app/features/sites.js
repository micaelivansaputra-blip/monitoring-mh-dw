// PKDW 59 Site — sortable, filterable table per site (or per site × format).
import { t, locale } from "../i18n.js";
import { fmt, pct, monthName, prevKey, signed } from "../format.js";
import { esc, ICON, on } from "../ui/dom.js";
import { header, kpi, kpis, notice, segmented, btn, tag } from "../ui/components.js";
import { getMonth } from "../store.js";
import { state } from "../state.js";

export default {
  id: "sites",
  render(c, app) {
    const key = state.month, cur = getMonth(key), prev = getMonth(prevKey(key)), title = t("nav.sites");
    if (!cur) { c.innerHTML = header(title, monthName(key)) + notice(t("common.noTab", {month: monthName(key)})); return; }
    const {st} = cur, T = st.tot;
    const prevSite = {}; if (prev) prev.st.sites.forEach(s => prevSite[s.code] = s.pkdw);
    const showDelta = prev && !state.perFormat;

    let items = state.perFormat
      ? st.rows.map(r => ({...r, dwDays: r.days.filter(x => x.pkdw > 0).length, formats: [r.format], prev: null}))
      : st.sites.map(s => ({...s, prev: prevSite[s.code]}));
    items.forEach(it => { it.avgDwDay = it.dwDays ? it.pkdw / it.dwDays : 0; it.delta = it.prev == null ? null : it.pkdw - it.prev; });
    const f = state.siteFilter;
    if (f === "dw") items = items.filter(s => s.pkdw > 0);
    if (f === "nodw") items = items.filter(s => s.pkdw === 0);
    if (f === "late") items = items.filter(s => s.missed > 0);
    const q = state.q.trim().toLowerCase();
    if (q) items = items.filter(s => s.cinema.toLowerCase().includes(q));
    const {k, dir} = state.sort;
    items.sort((a, b) => { const av = a[k], bv = b[k]; if (typeof av === "string") return av.localeCompare(bv, locale(), {numeric: true}) * dir; return ((av ?? -Infinity) - (bv ?? -Infinity)) * dir; });

    const maxP = Math.max(1, ...items.map(s => s.pkdw));
    const sum = fld => items.reduce((a, s) => a + (s[fld] || 0), 0);
    const th = (key, label, r = true) => `<th class="${r ? "r" : ""}"><button type="button" data-sort="${key}">${label}${state.sort.k === key ? (state.sort.dir < 0 ? " ↓" : " ↑") : ""}</button></th>`;

    c.innerHTML = header(title, t("sites.sub", {month: monthName(key)}) + (prev ? " · " + t("sites.deltaVs", {month: monthName(prevKey(key))}) : ""),
        btn("CSV", {act: "csv", icon: ICON.down}) + btn(t("common.downloadExcel"), {act: "xlsx", filled: true, icon: ICON.down})) +
      kpis(
        kpi({label: t("common.totalPkdw"), value: fmt(T.pkdw), unit: "MH", tone: "hero", sub: t("common.stationTraining", {s: fmt(T.spkdw), tr: fmt(T.tpkdw)})}),
        kpi({label: t("ov.kpiSites"), icon: ICON.building, value: T.dwSites, unit: "/ " + T.sites, sub: t("sites.avgPerUser", {v: fmt(T.dwSites ? T.pkdw / T.dwSites : 0)})}),
        kpi({label: t("sites.share"), icon: ICON.pie, tint: "orange", value: pct(T.share), sub: t("sites.shareSub", {v: fmt(T.total)})}),
      ) + `
      <div class="row">
        ${segmented("filter", state.siteFilter, [["all", t("sites.fAll")], ["dw", t("sites.fDw")], ["nodw", t("sites.fNoDw")], ["late", t("sites.fLate")]], t("sites.filterAria"))}
        <label class="switch"><input type="checkbox" id="perFormat" ${state.perFormat ? "checked" : ""}>${t("sites.perFormat")}</label>
        <span class="spacer"></span>
        <input type="search" class="search" id="siteQ" placeholder="${esc(t("sites.search"))}" value="${esc(state.q)}" aria-label="${esc(t("sites.search"))}">
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th class="rank">#</th>${th("cinema", t("col.site"), false)}${th("spkdw", "Station PKDW")}${th("tpkdw", "Training PKDW")}${th("pkdw", "Total PKDW")}${th("dwDays", t("col.dwDays"))}${th("avgDwDay", t("col.avgDwDay"))}${th("total", "Total MH")}${th("share", "% DW")}${showDelta ? th("delta", t("col.deltaPrev")) : ""}${th("missed", t("col.missed"))}</tr></thead>
        <tbody>${items.map((s, i) => `<tr class="click" data-site="${s.code}">
          <td class="rank">${i + 1}</td>
          <td class="site"><b>${esc(s.cinema)}</b>${s.formats.filter(x => x !== "Regular").map(x => tag(esc(x), "blue")).join("")}${state.perFormat && s.format === "Regular" ? `<span class="muted"> Regular</span>` : ""}</td>
          <td class="r">${fmt(s.spkdw)}</td><td class="r">${fmt(s.tpkdw)}</td>
          <td class="r"><div class="inbar"><i style="width:${Math.round(s.pkdw / maxP * 70)}px"></i><b>${fmt(s.pkdw)}</b></div></td>
          <td class="r">${s.dwDays}</td><td class="r">${s.dwDays ? fmt(s.avgDwDay, 1) : "–"}</td>
          <td class="r">${fmt(s.total)}</td><td class="r">${pct(s.share)}</td>
          ${showDelta ? `<td class="r">${s.delta == null ? "–" : `<span class="delta ${s.delta > 0 ? "up" : s.delta < 0 ? "down" : ""}">${signed(s.delta)}</span>`}</td>` : ""}
          <td class="r">${s.missed ? tag(s.missed, s.missed >= 3 ? "red" : "orange") : tag("0", "green")}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td></td><td>${t("sites.totalRow", {n: items.length, unit: state.perFormat ? t("unit.rows") : t("unit.sites")})}</td><td class="r">${fmt(sum("spkdw"))}</td><td class="r">${fmt(sum("tpkdw"))}</td><td class="r">${fmt(sum("pkdw"))}</td><td></td><td></td><td class="r">${fmt(sum("total"))}</td><td class="r">${pct(sum("total") ? sum("pkdw") / sum("total") : 0)}</td>${showDelta ? `<td class="r">${signed(sum("delta"))}</td>` : ""}<td class="r">${fmt(sum("missed"))}</td></tr></tfoot>
      </table></div>
      <p class="foot">${t("sites.foot")}</p>`;

    on(c, "[data-sort]", "click", b => { const k = b.dataset.sort; state.sort = state.sort.k === k ? {k, dir: -state.sort.dir} : {k, dir: k === "cinema" ? 1 : -1}; app.rerender(); });
    on(c, "[data-filter]", "click", b => { state.siteFilter = b.dataset.filter; app.rerender(); });
    on(c, "#perFormat", "change", el => { state.perFormat = el.checked; app.rerender(); });
    on(c, "#siteQ", "input", el => {
      state.q = el.value; clearTimeout(el._t);
      el._t = setTimeout(() => { app.rerender(); const n = document.getElementById("siteQ"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 220);
    });
  },
};
