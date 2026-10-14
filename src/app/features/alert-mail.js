// Productivity Alert email — always English (it goes to Regional Managers and cinemas).
import { esc } from "../ui/dom.js";
import { dateEN, dateShortEN, f1, fInt } from "../format.js";

const dwTxt = r => `${fInt(r.pkdw)} (${fInt(r.spkdw)} + ${fInt(r.tpkdw)})`;
export { dwTxt };

export function mailHTML(a) {
  const th = 'style="background:#4a5785;color:#ffffff;padding:8px 10px;border:1px solid #9aa3c0;font-weight:bold;text-align:center"';
  const td = (v, al = "left", extra = "") => `<td style="padding:6px 10px;border:1px solid #c9cdd8;text-align:${al};${extra}">${v}</td>`;
  const warnC = "color:#d9622b;font-weight:bold";
  const rows = a.flagged.map(r => `<tr>${td(esc(r.region))}${td(esc(r.cinema))}${td(r.warn + "x this week", "center", warnC)}${td(f1(r.prod), "center", warnC)}${td(r.target, "center")}${td(dwTxt(r), "center")}${td(fInt(r.admits), "right")}${td(fInt(r.mh), "right")}</tr>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">
<p>Dear Regional Managers and Cinema teams,</p>
<p>The cinemas below used <b>daily-worker man-hours</b> on <b>${dateEN(a.date)}</b> while their <b>productivity fell short of target</b> (beyond the ±${a.tolerance} tolerance). Please review the daily-worker usage against the productivity outcome for these sites.</p>
<table style="border-collapse:collapse;font-size:13px">
<tr><th ${th}>Region</th><th ${th}>Cinema</th><th ${th}>Warnings<br>this week</th><th ${th}>Productivity</th><th ${th}>Target</th><th ${th}>Daily-worker hrs<br>(Station + Training)</th><th ${th}>Admits</th><th ${th}>Total MH</th></tr>
${rows}
</table>
<p>Productivity = Admits ÷ Total MH. Warnings this week = days in the last 7 days (${dateShortEN(a.window[0])} – ${dateShortEN(a.date)}) with daily-worker usage and productivity below target − ${a.tolerance}.</p>
<p>Thank you.</p>
</div>`;
}

export function mailText(a) {
  const lines = a.flagged.map((r, i) => `${i + 1}. ${r.region} | ${r.cinema} | ${r.warn}x this week | Prod ${f1(r.prod)} vs target ${r.target} | DW ${dwTxt(r)} hrs | Admits ${fInt(r.admits)} | Total MH ${fInt(r.mh)}`);
  return `Dear Regional Managers and Cinema teams,\n\nThe cinemas below used daily-worker man-hours on ${dateEN(a.date)} while their productivity fell short of target (beyond the ±${a.tolerance} tolerance). Please review the daily-worker usage against the productivity outcome for these sites.\n\n${lines.join("\n")}\n\nProductivity = Admits ÷ Total MH.\n\nThank you.`;
}
