// Small render helpers that return HTML strings. Keep markup consistent across views.
import { esc, ICON } from "./dom.js";
import { t } from "../i18n.js";

export const header = (title, sub = "", tools = "") =>
  `<div class="large-title"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${tools ? `<div class="title-tools">${tools}</div>` : ""}</div>`;

export const loading = (title, sub) => header(title, sub) +
  `<div class="skel-kpis">${'<div class="skeleton" style="height:104px"></div>'.repeat(3)}</div><div class="skeleton" style="height:260px"></div>`;

/** KPI tile. tone: "", "hero", "good", "warn", "bad". */
export const kpi = ({label, value, unit = "", sub = "", icon = "", tone = "", tint = ""}) =>
  `<div class="kpi ${tone}"${tint ? ` style="--tint:var(--${tint})"` : ""}><span class="k">${icon}${label}</span><span class="v">${value}${unit ? `<small> ${unit}</small>` : ""}</span>${sub ? `<span class="s">${sub}</span>` : ""}</div>`;
export const kpis = (...tiles) => { const t5 = tiles.filter(Boolean); return `<div class="kpis${t5.length === 5 ? " k5" : ""}">${t5.join("")}</div>`; };

export const card = (title, body, tools = "", level = "h2") =>
  `<div class="card">${title || tools ? `<div class="card-head">${title ? `<${level}>${title}</${level}>` : ""}${tools}</div>` : ""}${body}</div>`;

/** Segmented control. attr = data attribute name, items = [[value, label]]. */
export const segmented = (attr, current, items, aria = "") =>
  `<div class="segmented" role="group"${aria ? ` aria-label="${esc(aria)}"` : ""}>${items.map(([v, l]) =>
    `<button type="button" data-${attr}="${v}" aria-pressed="${String(current) === String(v)}">${l}</button>`).join("")}</div>`;

export const tag = (text, tone = "") => `<span class="tag ${tone}">${text}</span>`;

export const notice = (title, body, kind = "warn") =>
  `<div class="notice ${kind}"><b>${esc(title)}</b>${body ? `<span>${body}</span>` : ""}</div>`;

/** Data caveats collapsed into one disclosure so they don't crowd the page. */
export const notes = items => !items.length ? "" :
  `<details class="notes"><summary>${ICON.warn.replace("<svg", '<svg width="16" height="16"')}${t("notes.title", {n: items.length})}</summary><ul>${items.map(([b, s]) => `<li><b>${esc(b)}</b>${s ? ` — ${s}` : ""}</li>`).join("")}</ul></details>`;

export const legend = items => `<div class="legend">${items.map(([color, label]) => `<span><i style="background:${color}"></i>${label}</span>`).join("")}</div>`;

export const btn = (label, {act = "", id = "", filled = false, icon = "", go = ""} = {}) =>
  `<button type="button" class="btn${filled ? " filled" : ""}"${act ? ` data-act="${act}"` : ""}${id ? ` id="${id}"` : ""}${go ? ` data-go="${go}"` : ""}>${icon}${label}</button>`;

export const emptyState = (title, sub) =>
  `<div class="card"><div class="empty"><div class="big">${ICON.check}</div><b>${esc(title)}</b><span>${sub}</span></div></div>`;
