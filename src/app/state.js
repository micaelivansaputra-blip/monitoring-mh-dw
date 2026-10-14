// UI state — what the user is looking at. Persisted bits: view and theme.
import { YESTERDAY } from "./format.js";

export const VIEWS = ["overview", "h1", "alert", "sites", "budget", "trend", "map", "more"];
/** Views whose content depends on the month picker. */
export const MONTH_VIEWS = ["overview", "sites", "map", "budget"];

export const state = {
  view: "overview",
  month: YESTERDAY.slice(0, 7),
  h1Date: YESTERDAY,
  alertDate: YESTERDAY,
  alertMode: "flagged",
  siteFilter: "all",
  q: "",
  perFormat: false,
  sort: {k: "pkdw", dir: -1},
  trendN: 6,
  budgetCut: null,
  budgetFilter: "active",
  theme: "auto",
};

try {
  const v = localStorage.getItem("mhdw.view"); if (VIEWS.includes(v)) state.view = v;
  const th = localStorage.getItem("mhdw.theme"); if (["auto", "light", "dark"].includes(th)) state.theme = th;
} catch (e) {}

export function persist() {
  try { localStorage.setItem("mhdw.view", state.view); localStorage.setItem("mhdw.theme", state.theme); } catch (e) {}
}
export function applyTheme() {
  const r = document.documentElement;
  if (state.theme === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", state.theme);
}
