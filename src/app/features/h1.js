// Cek Pengisian H-1 / Yesterday's check — who hasn't filled in their man hours.
import { t } from "../i18n.js";
import { fmt, pct, dateLong, monthName, stamp, TODAY, YESTERDAY } from "../format.js";
import { esc, ICON, on, copyText } from "../ui/dom.js";
import { header, kpi, kpis, notice, emptyState, tag } from "../ui/components.js";
import { missingOn, store } from "../store.js";
import { state } from "../state.js";
import { SHEET_URL } from "./shared.js";

export function reminderText(iso, bySite) {
  const lines = [...bySite.values()].map((rs, k) =>
    `${k + 1}. ${rs[0].cinema}${rs.some(r => r.format !== "Regular") ? " (" + rs.map(r => r.format).join(", ") + ")" : ""}`);
  return t("h1.reminder", {date: dateLong(iso), url: SHEET_URL, list: lines.join("\n")});
}

export default {
  id: "h1",
  render(c, app) {
    const iso = state.h1Date, title = t("nav.h1");
    const tools = `<input type="date" class="datefield" id="h1Date" value="${iso}" max="${TODAY}" aria-label="${esc(t("h1.dateAria"))}"><button class="btn" id="h1Yest" type="button">${t("common.yesterday")}</button>`;
    const res = missingOn(iso);
    if (!res) {
      c.innerHTML = header(title, dateLong(iso), tools) + notice(t("h1.noDate"), t("h1.noDateSub", {month: monthName(iso.slice(0, 7))}));
    } else {
      const {g, i, missing, bySite, total} = res, filled = total - missing.length, day = g.st.daily[i];
      c.innerHTML = header(title, `${dateLong(iso)} · ${t("common.dataAsOf", {t: stamp(store.generatedAt)})}`, tools) +
        kpis(
          kpi({label: t("h1.notFilled"), icon: ICON.warn, tint: "red", tone: missing.length ? "bad" : "good", value: bySite.size, unit: t("unit.sites"), sub: t("h1.notFilledSub", {n: missing.length})}),
          kpi({label: t("h1.filled"), icon: ICON.check, tint: "green", value: filled, unit: "/ " + total, sub: t("h1.filledSub", {p: pct(filled / total, 0)})}),
          kpi({label: t("h1.pkdwDay"), icon: ICON.person, value: fmt(day.pkdw), unit: "MH", sub: t("h1.pkdwDaySub", {n: day.dwSites})}),
        ) +
        (missing.length ? `
        <h2 class="section-head">${t("h1.listTitle", {n: bySite.size})}</h2>
        <ul class="list">${[...bySite.values()].map(rs => {
          const r = rs[0], mm = Math.max(...rs.map(x => x.monthMiss));
          return `<li class="clickable" data-site="${r.code}" data-month="${iso.slice(0, 7)}"><span class="ic">${esc(r.code)}</span><span class="main-t"><b>${esc(r.name)}</b><span>${rs.map(x => esc(x.format)).join(" · ")}</span></span><span class="trail">${tag(t("h1.thisMonth", {n: mm}), mm >= 3 ? "red" : mm >= 2 ? "orange" : "")}${ICON.chev}</span></li>`;
        }).join("")}</ul>
        <div class="card"><div class="card-head"><h3>${t("h1.reminderTitle")}</h3><button class="btn filled" id="copyBtn" type="button">${ICON.copy}${t("common.copy")}</button></div>
        <textarea id="remText" aria-label="${esc(t("h1.reminderTitle"))}">${esc(reminderText(iso, bySite))}</textarea>
        <p class="foot">${t("h1.reminderLang")}</p></div>`
        : emptyState(t("h1.allDone"), t("h1.allDoneSub", {n: total, date: dateLong(iso)})));
    }
    on(c, "#h1Date", "change", el => { if (el.value) { state.h1Date = el.value; app.rerender(); } });
    on(c, "#h1Yest", "click", () => { state.h1Date = YESTERDAY; app.rerender(); });
    on(c, "#copyBtn", "click", () => copyText(c.querySelector("#remText").value));
  },
};
