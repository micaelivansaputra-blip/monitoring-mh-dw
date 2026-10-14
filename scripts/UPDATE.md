# Update harian data.json

Instruksi ini dijalankan oleh tugas terjadwal (atau manual) di sesi Claude yang punya konektor **Google Sheets** dan akses push ke repo ini.

Spreadsheet ID: `1U_tpeKDUh983e6Ez13_j-JRCyXUtNjFPnDoIm7AhOWk`

1. Panggil Google Sheets `get_spreadsheet` dengan `fields: ["sheets.properties.title"]`. Tab bulanan adalah tab dengan judul berformat `Bulan Tahun` (contoh: `October 2026`, `Sep 2026`, `Aprl 2025`).
2. Tentukan tab yang perlu dibaca:
   - tab bulan berjalan dan bulan sebelumnya (zona waktu Asia/Jakarta);
   - tab bulanan lain yang **belum ada** di `data.json` (key `YYYY-MM` di `months`).
3. Untuk setiap tab, panggil `get_values` dengan range `'<Judul Tab>'!A1:LZ140`. Simpan respons JSON apa adanya (`{"range": ..., "values": ...}`) ke `raw/<judul>.json`. Kalau respons terlalu besar dan disimpan otomatis ke file, salin file itu ke `raw/`.
4. Jalankan: `node scripts/build-data.js raw/*.json`
   - Script berhenti dengan kode ≠ 0 kalau tidak ada bulan yang berhasil diproses. Kalau itu terjadi, **jangan commit**, dan laporkan errornya.
5. Commit **hanya** `data.json` ke branch `main` dengan pesan `data: update <tanggal WIB>`, lalu push. `raw/` sudah di-.gitignore.
6. Laporkan singkat: bulan yang diperbarui, total PKDW bulan berjalan, site yang belum mengisi H-1, dan **Productivity Alert H-1**:
   `node scripts/report.js` mencetak semuanya.
