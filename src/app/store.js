// Data layer — loads the static JSON files and exposes domain queries.
// No DOM, no strings: views decide how to present what this returns.
import { TODAY, isoOf } from "./format.js";

const Core = globalThis.MHCore;
const bust = () => "?t=" + Date.now();

let DATA = null, TARGETS = null, BUDGET = null;
let cache = {};

export const store = {
  get generatedAt() { return DATA && DATA.generatedAt ? new Date(DATA.generatedAt).getTime() : null; },
  get targets() { return TARGETS; },
  get budget() { return BUDGET; },
  /** Month keys (YYYY-MM), newest first. */
  months() { return Object.keys((DATA && DATA.months) || {}).sort().reverse(); },
  has(key) { return !!(DATA && DATA.months && DATA.months[key]); },
};

async function getJson(path, required) {
  const res = await fetch(path + bust(), {cache: "no-store"});
  if (!res.ok) { if (required) throw {code: "no_data", message: path + " " + res.status}; return null; }
  return res.json();
}

export async function loadAll() {
  DATA = await getJson("data.json", true);
  [TARGETS, BUDGET] = await Promise.all([
    getJson("targets.json").catch(() => null),
    getJson("budget.json").catch(() => null),
  ]);
  cache = {};
}

/** Parsed month + stats, memoised. Returns null when the tab doesn't exist. */
export function getMonth(key) {
  if (!store.has(key)) return null;
  if (!cache[key]) {
    const m = Core.unpack(DATA.months[key]); m.key = key;
    cache[key] = {m, st: Core.stats(m, TODAY)};
  }
  return cache[key];
}

/** Rows that have not filled in Station PKWT on a given date. */
export function missingOn(iso) {
  const g = getMonth(iso.slice(0, 7)); if (!g) return null;
  const i = g.m.dates.findIndex(d => d.iso === iso); if (i < 0) return null;
  const missing = g.st.rows.filter(r => !r.days[i].filled)
    .map(r => ({...r, monthMiss: r.days.slice(0, i + 1).filter(x => !x.filled).length}));
  const bySite = new Map();
  missing.forEach(r => { if (!bySite.has(r.code)) bySite.set(r.code, []); bySite.get(r.code).push(r); });
  return {g, i, missing, bySite, total: g.m.rows.length};
}

/** Productivity alerts for a date (uses up to 8 days back across month boundaries). */
export function alertsOn(iso) {
  const ms = {};
  for (let n = 0; n >= -7; n--) { const k = Core.isoAdd(iso, n).slice(0, 7); const g = getMonth(k); if (g) ms[k] = g.m; }
  return Core.prodAlerts(k => ms[k] || null, iso, TARGETS || {});
}

/** Budget vs actual for a month up to a cut-off date. */
export function budgetVsActual(key, cut) {
  const g = getMonth(key);
  return g && BUDGET ? Core.budgetVsActual(g.m, BUDGET, cut) : null;
}

/** PKDW per site across months, for the trend view. */
export function trend(keys) {
  const ok = keys.filter(k => { const g = getMonth(k); return g && g.m.rows.length; });
  const idx = new Map();
  ok.forEach(k => getMonth(k).st.sites.forEach(s => {
    if (!idx.has(s.code)) idx.set(s.code, {code: s.code, cinema: s.cinema, v: {}});
    const e = idx.get(s.code); e.cinema = s.cinema; e.v[k] = s.pkdw;
  }));
  const sites = [...idx.values()].map(s => ({...s, sum: ok.reduce((a, k) => a + (s.v[k] || 0), 0)})).sort((a, b) => b.sum - a.sum);
  return {ok, failed: keys.filter(k => !ok.includes(k)), sites, tot: k => getMonth(k).st.tot};
}

export { isoOf };
