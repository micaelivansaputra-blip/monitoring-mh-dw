// Modal sheet (iOS-style): centred on desktop, bottom sheet on phones.
import { esc, ICON } from "./dom.js";
import { t } from "../i18n.js";

export function openSheet({title, sub = "", body}) {
  const prev = document.activeElement;
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  scrim.innerHTML = `<div class="sheet" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${sub}</p>` : ""}</div>
    <button class="close" type="button" aria-label="${esc(t("common.close"))}">${ICON.x.replace("<svg", '<svg width="12" height="12"')}</button></div>
    ${body}</div>`;
  const close = () => { scrim.remove(); document.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
  const onKey = e => { if (e.key === "Escape") close(); };
  scrim.addEventListener("click", e => { if (e.target === scrim || e.target.closest(".close")) close(); });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(scrim);
  scrim.querySelector(".sheet").focus();
  return close;
}
