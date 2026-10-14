// Bits shared by several features.
import { t } from "../i18n.js";
import { esc } from "../ui/dom.js";

export const SHEET_ID = "1U_tpeKDUh983e6Ez13_j-JRCyXUtNjFPnDoIm7AhOWk";
export const SHEET_URL = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit";

/** Entries typed into dates that haven't happened yet (usually the wrong column). Returns notes() items. */
export function futureNote(st) {
  if (!st.future || !st.future.length) return [];
  const list = st.future.map(f => esc(f.cinema) + (f.format !== "Regular" ? " " + esc(f.format) : "") + " (" + esc(f.label) + ")").join(", ");
  return [[t("note.future", {n: st.future.length}), t("note.futureSub", {list})]];
}
