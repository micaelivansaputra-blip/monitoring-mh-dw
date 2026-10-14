// Tentang data / About — definitions of every number, plus the design system reference.
import { t } from "../i18n.js";
import { header, card } from "../ui/components.js";

const DEFS = ["pkdw", "pkwt", "total", "share", "site", "filled", "missed", "prod", "alert", "budget", "dwDays", "delta"];
const SWATCHES = [["blue", "--blue"], ["green", "--green"], ["orange", "--orange"], ["red", "--red"], ["indigo", "--indigo"], ["bg", "--bg"], ["surface", "--surface"], ["fill", "--fill"], ["label", "--label"], ["label2", "--label-2"], ["separator", "--separator"]];

export default {
  id: "about",
  render(c) {
    c.innerHTML = header(t("nav.about"), t("about.sub")) +
      card(t("about.defsTitle"), `<dl class="defs">${DEFS.map(k => `<dt>${t("def." + k)}</dt><dd>${t("def." + k + ".d")}</dd>`).join("")}</dl>`, `<span class="sub">${t("about.defsSub")}</span>`) +
      `<h2 class="section-head">${t("about.colors")}</h2>` +
      card("", `<div class="swatches">${SWATCHES.map(([k, tok]) => `<div class="swatch"><i style="background:var(${tok})"></i><b>${t("sw." + k)}</b><code>${tok}</code><span class="muted">${t("sw." + k + ".d")}</span></div>`).join("")}</div><p class="foot">${t("about.colorsFoot")}</p>`) +
      `<h2 class="section-head">${t("about.type")}</h2>` +
      card("", `<div class="typescale">
        <div><code>Large Title 34/700</code><span style="font-size:34px;font-weight:700;letter-spacing:-.025em">Monitoring MH DW</span></div>
        <div><code>Title 3 19/600</code><span style="font-size:19px;font-weight:600">${t("ov.daily")}</span></div>
        <div><code>Headline 17/600</code><span style="font-size:17px;font-weight:600">${t("h1.reminderTitle")}</span></div>
        <div><code>Body 15/400</code><span>${t("about.typeBody")}</span></div>
        <div><code>Footnote 12/400</code><span style="font-size:12px;color:var(--label-2)">${t("about.typeFoot")}</span></div>
        <div><code>Rounded 30/700</code><span style="font-family:var(--font-round);font-size:30px;font-weight:700" class="num">8.583</span></div>
      </div><p class="foot">${t("about.typeNote")}</p>`) +
      `<h2 class="section-head">${t("about.arch")}</h2>` +
      card("", `<dl class="defs">
        <dt><code>core.js</code></dt><dd>${t("arch.core")}</dd>
        <dt><code>src/app/store.js</code></dt><dd>${t("arch.store")}</dd>
        <dt><code>src/app/features/*</code></dt><dd>${t("arch.features")}</dd>
        <dt><code>src/app/ui/*</code></dt><dd>${t("arch.ui")}</dd>
        <dt><code>src/app/locales/*</code></dt><dd>${t("arch.locales")}</dd>
        <dt><code>src/styles/*</code></dt><dd>${t("arch.styles")}</dd>
      </dl>`);
  },
};
