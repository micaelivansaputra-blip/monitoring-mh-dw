// Productivity Alert — sites that used DW while productivity < target − tolerance.
import { t } from "../i18n.js";
import { fmt, dateLong, dateShort, dateEN, f1, TODAY, YESTERDAY } from "../format.js";
import { esc, ICON, on, hud, copyRich, copyText } from "../ui/dom.js";
import { header, kpi, kpis, notice, notes, segmented, btn, tag } from "../ui/components.js";
import { alertsOn, store } from "../store.js";
import { state } from "../state.js";
import { mailHTML, mailText, dwTxt } from "./alert-mail.js";

export default {
  id: "alert",
  render(c, app) {
    const iso = state.alertDate, title = t("nav.alert");
    const tools = `<input type="date" class="datefield" id="alDate" value="${iso}" max="${TODAY}" aria-label="${esc(t("alert.dateAria"))}"><button class="btn" id="alYest" type="button">${t("common.yesterday")}</button>`;
    const a = alertsOn(iso);
    const wireDate = () => {
      on(c, "#alDate", "change", el => { if (el.value) { state.alertDate = el.value; app.rerender(); } });
      on(c, "#alYest", "click", () => { state.alertDate = YESTERDAY; app.rerender(); });
    };
    if (!a) { c.innerHTML = header(title, dateLong(iso), tools) + notice(t("alert.noDate"), t("alert.noDateSub")); wireDate(); return; }

    const F = a.flagged, dwSum = F.reduce((s, r) => s + r.pkdw, 0), heavy = F.filter(r => r.warn >= 5).length;
    const dwUsers = a.rows.filter(r => r.pkdw > 0).length;
    const list = state.alertMode === "flagged" ? F : a.rows;
    const T = store.targets;
    const caveats = [];
    if (!T) caveats.push([t("alert.noTargets"), t("alert.noTargetsSub")]);
    if (a.noTarget.length) caveats.push([t("alert.noTarget", {n: a.noTarget.length}), t("alert.noTargetSub", {list: a.noTarget.map(r => esc(r.cinema)).join(", "), d: (T && T.defaultTarget) || 14})]);
    if (a.missingWindow.length) caveats.push([t("alert.window"), t("alert.windowSub", {list: a.missingWindow.join(", ")})]);
    const missAdm = F.filter(r => r.admitsMissing);
    if (missAdm.length) caveats.push([t("alert.admits", {n: missAdm.length}), t("alert.admitsSub", {list: missAdm.map(r => esc(r.cinema)).join(", ")})]);

    c.innerHTML = header(title, `${dateLong(iso)} · ${t("alert.sub", {tol: a.tolerance})}`,
        tools + btn("Excel", {act: "alert-xlsx", icon: ICON.down}) + btn(t("alert.copyMail"), {id: "copyMail", filled: true, icon: ICON.copy})) +
      notes(caveats) +
      kpis(
        kpi({label: t("alert.flagged"), icon: ICON.warn, tint: "orange", tone: F.length ? "warn" : "good", value: F.length, unit: t("alert.flaggedUnit", {n: dwUsers}), sub: t("alert.flaggedSub", {n: a.rows.length})}),
        kpi({label: t("alert.dwHours"), icon: ICON.person, value: fmt(dwSum), unit: "MH", sub: t("common.stationTraining", {s: fmt(F.reduce((s, r) => s + r.spkdw, 0)), tr: fmt(F.reduce((s, r) => s + r.tpkdw, 0))})}),
        kpi({label: t("alert.heavy"), icon: ICON.calendar, tint: "red", value: heavy, unit: t("unit.sites"), sub: t("alert.window7", {from: dateShort(a.window[0]), to: dateShort(a.date)})}),
      ) + `
      <div class="row">${segmented("amode", state.alertMode, [["flagged", t("alert.mFlagged", {n: F.length})], ["all", t("alert.mAll", {n: a.rows.length})]])}<span class="spacer"></span><button class="btn plain" id="copyText" type="button">${t("alert.copyWa")}</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Region</th><th>Cinema</th><th class="r">${t("alert.colWarn")}</th><th class="r">Productivity</th><th class="r">Target</th><th class="r">${t("alert.colDw")}</th><th class="r">Admits</th><th class="r">Total MH</th><th>Status</th></tr></thead>
        <tbody>${list.map(r => `<tr class="click" data-site="${r.code}" data-month="${iso.slice(0, 7)}" data-tip="${esc(r.cinema)}|${r.warn ? t("alert.tipWarn", {list: r.warnDates.map(d => d.slice(8) + "/" + d.slice(5, 7)).join(", ")}) : t("alert.tipNone")}">
          <td>${esc(r.region)}</td><td class="site"><b>${esc(r.cinema)}</b>${r.admitsMissing ? tag(t("alert.admitsEmpty"), "orange") : ""}</td>
          <td class="r">${r.warn ? tag(t("alert.warnN", {n: r.warn}), r.warn >= 5 ? "red" : "orange") : `<span class="muted">0</span>`}</td>
          <td class="r" style="${r.prod != null && r.prod < r.target - a.tolerance ? "color:var(--orange-text);font-weight:600" : ""}">${f1(r.prod)}</td>
          <td class="r">${r.target}${r.hasTarget ? "" : "*"}</td><td class="r">${r.pkdw ? dwTxt(r) : `<span class="muted">0</span>`}</td>
          <td class="r">${r.admits == null ? "–" : fmt(r.admits)}</td><td class="r">${fmt(r.mh)}</td>
          <td>${r.flag ? tag("Flagged", "red") : r.pkdw > 0 ? tag(t("alert.onTarget"), "green") : `<span class="muted">${t("alert.noDw")}</span>`}</td></tr>`).join("") || `<tr><td colspan="9" class="muted">${t("alert.noneFlagged")}</td></tr>`}</tbody>
      </table></div>
      <h2 class="section-head">${t("alert.preview")}</h2>
      <p class="foot" style="margin-top:-8px">${t("alert.previewNote")}</p>
      <div class="mail-paper">${F.length ? mailHTML(a) : `<p style="font-family:Arial;color:#555">No cinemas need a reminder for ${dateEN(a.date)}.</p>`}</div>
      <p class="foot">${t("alert.foot", {tol: a.tolerance})}</p>`;

    wireDate();
    on(c, "[data-amode]", "click", b => { state.alertMode = b.dataset.amode; app.rerender(); });
    on(c, "#copyMail", "click", () => { if (!F.length) { hud(t("alert.nothing")); return; } copyRich(mailHTML(a), mailText(a), t("alert.mailCopied")); });
    on(c, "#copyText", "click", () => copyText(mailText(a), t("toast.textCopied")));
  },
};
