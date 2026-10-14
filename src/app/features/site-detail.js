// Site detail sheet — daily PKDW for one site in one month.
import { t } from "../i18n.js";
import { fmt, pct, monthName, dateLong, TODAY } from "../format.js";
import { esc } from "../ui/dom.js";
import { kpi, kpis, tag } from "../ui/components.js";
import { columnChart } from "../ui/charts.js";
import { openSheet } from "../ui/sheet.js";
import { getMonth } from "../store.js";

export function openSite(code, key) {
  const g = getMonth(key); if (!g) return;
  const s = g.st.sites.find(x => x.code === code); if (!s) return;
  const {m, st} = g;
  const chart = columnChart(s.daily.map((v, i) => ({
    value: v, cls: i > st.lastIdx ? "dim" : "",
    tick: (m.dates[i].day === 1 || m.dates[i].day % 5 === 0) ? String(m.dates[i].day) : "",
    tip: `${dateLong(m.dates[i].iso)}|PKDW ${fmt(v)} MH|${s.filledDaily[i] ? t("map.filled") : (m.dates[i].iso < TODAY ? t("map.missing") : t("map.pending"))}`,
  })), {H: 190, avg: s.dwDays ? s.avgDwDay : null, avgLabel: t("site.avgDw"), aria: t("ov.daily")});
  const missed = [...new Set(s.rows.flatMap(r => r.missedDates))];
  openSheet({title: s.cinema, sub: `${monthName(key)} · ${s.formats.map(esc).join(", ")}`, body:
    kpis(
      kpi({label: t("common.totalPkdw"), value: fmt(s.pkdw), unit: "MH", sub: t("common.stationTraining", {s: fmt(s.spkdw), tr: fmt(s.tpkdw)})}),
      kpi({label: t("col.dwDays"), value: s.dwDays, unit: t("unit.days"), sub: t("site.peak", {v: fmt(s.peak)})}),
      kpi({label: t("sites.share"), value: pct(s.share), sub: "Total MH " + fmt(s.total)}),
    ) +
    `<div class="card chart"><div class="card-head"><h3>${t("ov.daily")}</h3></div>${chart}</div>` +
    (s.rows.length > 1 ? `<div class="table-wrap"><table><thead><tr><th>Format</th><th class="r">Station PKDW</th><th class="r">Training PKDW</th><th class="r">PKDW</th><th class="r">PKWT</th><th class="r">${t("col.missed")}</th></tr></thead><tbody>${s.rows.map(r => `<tr><td>${esc(r.format)}</td><td class="r">${fmt(r.spkdw)}</td><td class="r">${fmt(r.tpkdw)}</td><td class="r"><b>${fmt(r.pkdw)}</b></td><td class="r">${fmt(r.pkwt)}</td><td class="r">${r.missed}</td></tr>`).join("")}</tbody></table></div>` : "") +
    `<div class="card"><div class="card-head"><h3>${t("site.missedTitle")}</h3><span class="sub">${t("site.missedN", {n: missed.length})}</span></div>${missed.length ? `<div class="row">${missed.map(d => tag(esc(d), "red")).join("")}</div>` : `<span class="muted">${t("site.allFilled")}</span>`}</div>`});
}
