# 33 perbaikan JRHagents V19

Ini **33 perubahan desain, UX, dan kualitas distribusi**, bukan klaim 33 AI baru atau 33 level kemampuan teknis. Setiap poin merujuk fungsi atau dokumen nyata di repositori.

## A. Website yang benar-benar digunakan
1. Audit kode langsung di browser tanpa server.
2. Memilih beberapa berkas sekaligus.
3. Memilih folder lokal di browser kompatibel.
4. Drag/drop berkas pada area audit.
5. Contoh audit yang sungguh diproses oleh mesin yang sama.
6. Menampilkan jumlah berkas yang dibaca.
7. Menampilkan jumlah temuan indikatif.
8. Mendeteksi indikasi React, Next.js, Vite, Python, TypeScript, dan HTML.
9. Menampilkan berkas dan nomor baris tanpa menyertakan nilai token.
10. Mengunduh hasil audit sebagai JSON.
11. Membersihkan hasil audit di browser.

## B. Instalasi yang tidak menipu
12. Pemilihan OS Windows/macOS/Linux.
13. Pemilihan tujuh klien Skill.
14. Pemilihan mode Skill/MCP/Plugin.
15. Perintah Python sesuai OS.
16. Instalasi dari arsip GitHub, tidak mengklaim paket PyPI tersedia.
17. Pembuatan lingkungan virtual `.jrh-venv` agar terisolasi.
18. Setup Skill langsung melalui CLI setelah paket dipasang.
19. Setup MCP langsung ke pengaturan proyek yang kompatibel.
20. Merge MCP menjaga server lain di file JSON.
21. Backup konfigurasi sebelum perubahan.
22. Menolak konfigurasi MCP rusak atau entri bentrok.

## C. Kualitas, aksesibilitas, dan transparansi
23. Tombol salin hanya memberi notifikasi sukses setelah berhasil.
24. Status tidak didukung ditunjukkan secara eksplisit.
25. Label 26 kemampuan dibedakan fungsi/panduan/inspirasi.
26. Contoh CLI yang tersedia benar-benar digunakan di website.
27. Kontrol keyboard, label form, dan struktur semantik.
28. Dukungan tema terang/gelap.
29. Tampilan responsif hingga 320 piksel.
30. Mengikuti preferensi reduced motion.
31. Batas baca maksimal 240 file, 6 MB teks, 300 KB per file.
32. `.env` ditandai tanpa membaca nilainya.
33. Tes otomatis Python dan JavaScript serta smoke browser interaktif.

Catatan: bagian frontend adalah audit heuristik. Tidak menyatakan kebocoran pasti, tidak mengeksekusi kode, dan tidak otomatis memperbaiki proyek. Keberhasilan install di setiap komputer tetap tergantung Python dan dukungan aplikasi AI yang dipilih.

## Kemudahan tambahan

- Paket Skill ZIP dapat diunduh langsung tanpa Python.
- Paket sumber Claude Code Plugin dapat diunduh terpisah.
- Python wheel dapat diunduh untuk pemasangan tanpa perlu GitHub pada saat instalasi (tetap perlu Python).
