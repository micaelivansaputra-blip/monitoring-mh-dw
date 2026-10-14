// Peta Pengisian / Fill map — row × day grid of filled / missing.
import { t } from "../i18n.js";
import { fmt, monthName, dateLong, TODAY } from "../format.js";
import { esc } from "../ui/dom.js";
import { header, notice, notes, legend, tag } from "../ui/components.js";
import { getMonth } from "../store.js";
import { state } from "../state.js";
import { futureNote } from "./shared.js";

export default {
  id: "map",
  render(c) {
    const key = state.month, g = getMonth(key), title = t("nav.map");
    if (!g) { c.innerHTML = header(title, monthName(key)) + notice(t("common.noTab", {month: monthName(key)})); return; }
    const {m, st} = g;
    const rows = st.rows.slice().sort((a, b) => b.missed - a.missed || a.cinema.localeCompare(b.cinema, "id", {numeric: true}));
    const perDay = m.dates.map((d, i) => d.iso < TODAY ? st.rows.filter(r => !r.days[i].filled).length : null);
    c.innerHTML = header(title, t("map.sub", {month: monthName(key), r: st.rows.length, s: st.tot.sites})) +
      notes(futureNote(st)) +
      legend([["var(--green)", t("map.filled")], ["var(--red)", t("map.missing")], ["transparent;box-shadow:inset 0 0 0 1px var(--separator)", t("map.pending")]]) + `
      <div class="map-wrap"><table class="map">
        <thead><tr><th class="n">${t("col.site")}</th>${m.dates.map(d => `<th>${d.day}</th>`).join("")}<th>${t("map.late")}</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td class="n" title="${esc(r.cinema)} · ${esc(r.format)}">${esc(r.cinema)}${r.format !== "Regular" ? " " + tag(esc(r.format), "blue") : ""}</td>${r.days.map((x, i) => {
          const d = m.dates[i], s = d.iso >= TODAY ? "p" : x.filled ? "f" : "m";
          return `<td><i class="cell ${s}" data-tip="${esc(r.cinema)}|${dateLong(d.iso)}|${s === "f" ? t("map.tipFilled", {v: fmt(x.pkdw)}) : s === "m" ? t("map.missing") : t("map.pending")}"></i></td>`;
        }).join("")}<td class="t" style="color:${r.missed ? "var(--red-text)" : "var(--green-text)"}">${r.missed}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td class="n"><b>${t("map.perDay")}</b></td>${perDay.map(n => `<td class="num" style="font-size:11px;color:${n ? "var(--red-text)" : "var(--label-3)"}">${n == null ? "" : n}</td>`).join("")}<td class="t">${st.tot.missed}</td></tr></tfoot>
      </table></div>`;
  },
};
