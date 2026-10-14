// SVG charts. Pure functions: data in, markup out.
import { esc } from "./dom.js";
import { fmt } from "../format.js";

const niceStep = x => { const p = Math.pow(10, Math.floor(Math.log10(x || 1))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
const barPath = (x, y, w, h, r) => {
  if (h <= 0) return "";
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};
function axis(W, H, L, R, T, B, max) {
  const step = niceStep(max / 4), top = Math.ceil(max / step) * step;
  const y = v => T + (H - T - B) * (1 - v / top);
  let s = "";
  for (let v = 0; v <= top + 1e-9; v += step)
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 3.5}" text-anchor="end">${fmt(v)}</text>`;
  return {y, grid: s};
}

/** Single-series column chart. data: [{value, tip, cls, tick}] */
export function columnChart(data, {H = 220, avg = null, avgLabel = "", aria = ""} = {}) {
  const W = 760, L = 46, R = 10, T = 14, B = 26, n = Math.max(1, data.length);
  const {y, grid} = axis(W, H, L, R, T, B, Math.max(1, ...data.map(d => d.value || 0)));
  const slot = (W - L - R) / n, bw = Math.max(2, Math.min(26, slot - 3));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">` + grid;
  data.forEach((d, i) => {
    const x = L + i * slot + (slot - bw) / 2, top = y(d.value || 0);
    s += `<rect x="${L + i * slot}" y="${T}" width="${slot}" height="${H - T - B}" fill="transparent" data-tip="${esc(d.tip)}"/>`;
    s += `<path class="mk ${d.cls || ""}" d="${barPath(x, top, bw, (H - B) - top, 4)}" data-tip="${esc(d.tip)}"/>`;
    if (d.tick) s += `<text class="ax" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(d.tick)}</text>`;
  });
  if (avg != null && avg > 0)
    s += `<line class="avg" x1="${L}" x2="${W - R}" y1="${y(avg)}" y2="${y(avg)}"/><text class="ax" x="${W - R}" y="${y(avg) - 5}" text-anchor="end">${esc(avgLabel)} ${fmt(avg)}</text>`;
  return s + "</svg>";
}

/** Budget (grey) vs actual (blue) per period, with optional "fair DW" marker. periods: [{label, sub, budget, actual, hl, flex, tip}] */
export function groupedChart(periods, {aria = ""} = {}) {
  const W = 760, H = 230, L = 46, R = 10, T = 14, B = 30, n = Math.max(1, periods.length);
  const {y, grid} = axis(W, H, L, R, T, B, Math.max(1, ...periods.map(p => Math.max(p.budget, p.actual))));
  const slot = (W - L - R) / n, bw = Math.min(34, slot * 0.32);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">` + grid;
  periods.forEach((p, i) => {
    const cx = L + i * slot + slot / 2, tip = esc(p.tip);
    s += `<rect x="${L + i * slot}" y="${T}" width="${slot}" height="${H - T - B}" fill="transparent" data-tip="${tip}"/>`;
    s += `<path class="mk-b" d="${barPath(cx - bw - 1, y(p.budget), bw, (H - B) - y(p.budget), 4)}" data-tip="${tip}"/>`;
    s += `<path class="mk ${p.hl ? "hl" : ""}" d="${barPath(cx + 1, y(p.actual), bw, (H - B) - y(p.actual), 4)}" data-tip="${tip}"/>`;
    if (p.flex != null) s += `<line class="flex" x1="${cx - bw - 5}" x2="${cx + bw + 5}" y1="${y(p.flex)}" y2="${y(p.flex)}" data-tip="${tip}"/>`;
    s += `<text class="ax" x="${cx}" y="${H - 12}" text-anchor="middle">${esc(p.label)}</text><text class="ax" x="${cx}" y="${H - 1}" text-anchor="middle" style="opacity:.7">${esc(p.sub)}</text>`;
  });
  return s + "</svg>";
}
