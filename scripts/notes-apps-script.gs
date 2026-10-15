/**
 * Monitoring MH DW — penyimpan catatan / reason dari CM.
 *
 * Pasang sekali:
 *   1. Buat Google Sheet baru, beri nama "MH DW Notes".
 *   2. Menu Extensions → Apps Script. Hapus isi Code.gs, tempel seluruh file ini, lalu Save.
 *   3. Deploy → New deployment → ikon gerigi → Web app.
 *        Execute as: Me      Who has access: Anyone
 *      Klik Deploy, izinkan akses (Allow), lalu salin "Web app URL" (…/exec).
 *   4. Tempel URL itu ke config.json di repo dashboard ("notesEndpoint").
 *
 * Semua catatan tersimpan di tab "Notes" spreadsheet ini (append-only; hapus = ditandai "deleted").
 */
const SHEET_NAME = 'Notes';
const KEY = 'mhdw-notes-2026';        // harus sama dengan "notesKey" di config.json dashboard
const HEAD = ['id', 'timestamp', 'site_code', 'cinema', 'tanggal', 'konteks', 'kategori', 'reason', 'sumber', 'dicatat_oleh', 'status'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold');
    sh.getRange('E:E').setNumberFormat('@');   // tanggal disimpan sebagai teks YYYY-MM-DD
  }
  return sh;
}

function doGet() {
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  const head = values.shift();
  const notes = values.map(r => {
    const o = {};
    head.forEach((k, i) => {
      const v = r[i];
      o[k] = v instanceof Date ? Utilities.formatDate(v, 'Asia/Jakarta', k === 'tanggal' ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ssXXX") : v;
    });
    return o;
  }).filter(o => o.id && o.status !== 'deleted');
  return json_({ ok: true, notes });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  if (body.key !== KEY) return json_({ ok: false, error: 'bad_key' });
  const sh = sheet_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (body.action === 'delete') {
      const n = Math.max(sh.getLastRow() - 1, 0);
      if (n) {
        const ids = sh.getRange(2, 1, n, 1).getValues().map(r => String(r[0]));
        const i = ids.indexOf(String(body.id));
        if (i >= 0) sh.getRange(i + 2, HEAD.indexOf('status') + 1).setValue('deleted');
      }
      return json_({ ok: true });
    }
    const list = Array.isArray(body.notes) ? body.notes : [body.note];
    const existing = new Set(Math.max(sh.getLastRow() - 1, 0) ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : []);
    let added = 0;
    list.forEach(n => {
      if (!n || !n.id || existing.has(String(n.id))) return;   // idempotent: aman dikirim ulang
      sh.appendRow([n.id, n.ts || new Date().toISOString(), n.site || '', n.cinema || '', n.date || '', n.context || '', n.category || '', n.reason || '', n.source || '', n.by || '', 'active']);
      added++;
    });
    return json_({ ok: true, added });
  } finally {
    lock.releaseLock();
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
