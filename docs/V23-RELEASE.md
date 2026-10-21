# JRHagents Pages V23 — Visual & Experience Refresh

## Fokus

Website GitHub Pages adalah dokumentasi untuk **satu Universal Agent Skill**, bukan aplikasi AI atau server MCP. Pengunjung bisa memilih jalur native Agent Skills atau instruksi manual untuk chat-only.

## Yang sekarang berfungsi

- Navigasi mobile yang bisa dibuka, ditutup, dan dioperasikan dengan keyboard.
- Pergantian tema dengan pilihan yang disimpan secara lokal.
- Pilihan instalasi antara AI coding dan chatbot web, lengkap dengan perintah yang benar dan tautan sumber.
- Tombol salin perintah instalasi dengan penanganan kesalahan clipboard.
- Tombol salin instruksi manual ringkas beserta tautan ke sumber lengkap.
- Penyusun prompt untuk sembilan jenis tugas, personalisasi lokal, salin instruksi dan unduh `.md`.
- Eksplorasi 26 metode kerja, pencarian dan filter kategori.
- FAQ yang bisa dibuka/tutup dan status fitur yang tidak dilebih-lebihkan.
- Visual berlapis dengan transform CSS 3D dan animasi ringan; gerakan dikurangi ketika `prefers-reduced-motion` aktif.

## Prinsip teknis

- Tidak ada library UI eksternal, font CDN, API pihak ketiga, atau pelacak.
- File: `docs/index.html`, `docs/assets/style.css`, `docs/assets/app.js`, dan favicon SVG.
- Tidak mengakses file lokal pengunjung, tidak mengirim prompt ke server, tidak melakukan instalasi otomatis dari browser.
- Perintah `npx skills add Jidy23/JRHagents --skill jrhagents` **hanya untuk AI yang didukung** dan membutuhkan Node.js, internet, serta AI coding kompatibel.

## Verifikasi

Perintah lokal:

```bash
python -m unittest discover -s tests -v
node --check docs/assets/app.js
python tests/browser_smoke.py
```

`browser_smoke.py` adalah pengujian opsional yang membutuhkan Playwright dan Chromium lokal. Tidak wajib untuk memakai Skill. Tes repository `test_site.py` tidak membutuhkan dependency tambahan.

## Yang belum diklaim

Kami tidak mengklaim JRHagents terpasang di setiap AI di dunia, berjalan sebagai remote MCP, memiliki model AI cloud sendiri, atau mengubah kode dari website. Pengujian instalasi AI dilakukan pada masing-masing host jika tersedia.
