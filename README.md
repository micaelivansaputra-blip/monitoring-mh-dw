# Monitoring MH DW

Dashboard pemakaian **Man Hour Daily Worker (PKDW)** untuk 59 site, bersumber dari spreadsheet **Man Hour Usage**.

**Link:** https://micaelivansaputra-blip.github.io/monitoring-mh-dw/

## Cara kerja

```
Google Sheets "Man Hour Usage"
        │  (tiap hari, otomatis: tugas terjadwal Claude + konektor Google Sheets)
        ▼
scripts/build-data.js  →  data.json  →  commit ke repo ini
        │
        ▼
GitHub Pages: index.html membaca data.json  →  cukup buka link / refresh
```

- `index.html` adalah dashboard dengan halaman Ringkasan, Cek Pengisian H-1, PKDW 59 Site, Tren Bulanan, Peta Pengisian, dan Design System.
- `core.js` berisi rumus parsing dan perhitungan. Dashboard dan script pembuat data memakai file yang sama, jadi angkanya pasti identik.
- `data.json` adalah data ringkas semua tab bulan. Diperbarui otomatis setiap hari.
- `scripts/build-data.js` mengubah hasil baca Google Sheets menjadi `data.json`.
- `scripts/UPDATE.md` berisi instruksi langkah demi langkah yang dijalankan tugas terjadwal.

Di kanan atas dashboard tertulis **"Data per …"**, yaitu waktu terakhir data diambil. Titiknya berubah merah kalau data sudah lebih dari 26 jam tidak diperbarui.

## Pemakaian
- **Setiap pagi:** buka link, lalu masuk ke **Cek Pengisian H-1**. Salin teks reminder dan kirim ke grup.
- **Productivity Alert:** buka menu Productivity Alert, klik **Salin email**, lalu tempel di Outlook/Gmail untuk RM & cinema. Formatnya sudah tabel lengkap.
- **Budget vs Actual:** menu Budget vs Actual menampilkan pemakaian DW s.d. kemarin dibanding budget per site (pro-rata minggu berjalan), lengkap dengan site over budget dan site tanpa budget. Klik **Salin ringkasan** untuk WA atau **Unduh Excel**.
- **Setiap tanggal 1:** buka **PKDW 59 Site**, pilih bulan sebelumnya, lalu klik **Unduh Excel**.
- Kalau sheet baru saja diisi dan ingin langsung terlihat, jalankan tugas terjadwal **"Update data Monitoring MH DW"** secara manual di halaman Scheduled tasks Claude (klik *Run now*), tunggu beberapa menit, lalu refresh.

## Rumus
| Istilah | Rumus |
|---|---|
| PKDW (MH DW) | Station PKDW + Training PKDW |
| MH PKWT | Station PKWT + Training PKWT + Back Up MOD |
| Total MH | PKDW + PKWT |
| Sudah isi | kolom **Station PKWT** pada tanggal itu terisi (angka 0 juga dihitung) |
| Site | satu kode cinema; baris VIP/Junior digabung ke site-nya |
| Productivity | Admits ÷ Total MH per site per hari (Admits kosong = 0) |
| Productivity Alert | site ter-flag kalau PKDW > 0 **dan** productivity < target − 1; warnings minggu ini = jumlah hari seperti itu dalam 7 hari terakhir |

Budget DW per site per minggu (Sep–Des 2026) ada di `budget.json`, dibaca dari screenshot tabel budget (angka dibulatkan). Ganti dengan angka dari file asli bila tersedia; urutan `periods` dan array per site harus sejajar.

Target productivity (12 atau 14) dan region setiap site ada di `targets.json`, disalin dari laporan DailyWorker_Productivity. Untuk menambah site baru (mis. 72-Paragon Square Mall), tambahkan entri dengan kode site-nya.

Isian di tanggal yang belum lewat (biasanya salah kolom) tidak ikut dijumlah, tetapi ditampilkan sebagai peringatan. Total per bulan sudah dicocokkan dengan kolom MTD "PKDW" di setiap tab, dari Januari 2025 sampai Oktober 2026.

## Catatan privasi
Situs GitHub Pages bersifat publik. Siapa pun yang tahu link-nya bisa melihat angka man hour per site. `data.json` hanya berisi nama site, format, Admits, dan kolom man hour, tanpa email maupun nama karyawan.
