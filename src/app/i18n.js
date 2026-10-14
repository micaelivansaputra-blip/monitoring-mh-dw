// i18n — one dictionary per language, t(key, vars) with {name} interpolation.
import id from "./locales/id.js";
import en from "./locales/en.js";

const DICTS = {id, en};
export const LANGS = ["id", "en"];
const KEY = "mhdw.lang";

let lang = (() => {
  try { const v = localStorage.getItem(KEY); if (DICTS[v]) return v; } catch (e) {}
  return "id";
})();
const listeners = new Set();

export const getLang = () => lang;
export const locale = () => (lang === "en" ? "en-US" : "id-ID");
export function setLang(next) {
  if (!DICTS[next] || next === lang) return;
  lang = next;
  try { localStorage.setItem(KEY, next); } catch (e) {}
  document.documentElement.lang = next;
  listeners.forEach(fn => fn(next));
}
export const onLangChange = fn => listeners.add(fn);

/** Translate. Falls back to Indonesian, then to the key itself so a missing string is visible, never blank. */
export function t(key, vars) {
  let s = DICTS[lang][key];
  if (s == null) s = DICTS.id[key];
  if (s == null) return key;
  if (typeof s === "function") return s(vars || {});
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? "" : vars[k])) : s;
}
/** Calendar names for the active language. */
export const cal = () => DICTS[lang]._cal;

/** Swap static text in the shell: data-i18n (textContent), data-i18n-title, data-i18n-aria. */
export function translateDom(root = document) {
  root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  document.documentElement.lang = lang;
}
export const _dicts = DICTS; // used by the key-coverage check
