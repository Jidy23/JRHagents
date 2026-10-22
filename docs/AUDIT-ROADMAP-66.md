# JRHagents — Audit & Roadmap 66 Rekomendasi

**Audit:** 22 Oktober 2026 · Repo: `Jidy23/JRHagents` · Rilis perbaikan navbar Support V35.

## Bukti dan keterbatasan

- `jidy23.github.io` (root) tidak dapat diambil oleh browser pencarian dari lingkungan pemeriksaan ini; repositori `Jidy23/Jidy23.github.io` tidak ditemukan. Situs yang dapat diaudit melalui source ada di `https://jidy23.github.io/JRHagents/`. Ini tidak membuktikan root selalu down.
- Source V34 menempatkan support card di tab Bantuan dan footer melalui JavaScript; permintaan pengguna sekarang menghendaki satu tombol navbar setelah bahasa.
- GitHub Actions run `39695592472` gagal: tes mengharapkan QRIS PNG <60.000 byte, aset saat itu 220.630 byte. Tes JS tercatat lulus dan workflow Pages terpisah sukses.
- QRIS penerima yang dicantumkan pada gambar adalah **KOPDES NUSANTARA**, bukan JRHagents. Kode pembayaran dioptimalkan tanpa mengubah payload saat diuji secara lokal.
- **IMPLEMENTED** = sudah dikerjakan di source V35 dan dites lokal pada lingkup yang relevan; tidak otomatis berarti URL live terverifikasi. **PLANNED** = rekomendasi untuk rilis mendatang.

## Strategi prioritas

- **P0 / Sekarang:** QRIS + CI, Support di navbar, tablet overflow, transparansi penerima, regression tests.
- **P1 / Berikutnya:** ringkas onboarding, kejelasan platform, katalog, prompt, UX, performa dan aksesibilitas.
- **P2 / Pertumbuhan:** kontribusi komunitas, internasionalisasi, dan metrik berbasis dampak.

## A. Keandalan & error produksi — P0

1. **Perbaiki batas ukuran QRIS** — Pastikan PNG asli dioptimalkan lossless dan lulus CI lintas OS.  `[IMPLEMENTED]`
2. **Tahan perubahan yang gagal CI** — Jadikan quality checks syarat merge ke main sebelum deploy.  `[PLANNED]`
3. **Dokumentasikan URL kanonis** — Tampilkan /JRHagents/ sebagai alamat publik, bukan mengasumsikan root GitHub Pages ada.  `[PLANNED]`
4. **Uji aset CDN/cache** — Tes HTML mengarah ke JS, CSS, dan PNG yang ada pada commit yang sama.  `[PLANNED]`
5. **Tambah smoke-test produksi** — Verifikasi status 200, konten halaman, dan response image setelah Pages deploy.  `[PLANNED]`
6. **Sediakan rollback jelas** — Catat SHA sehat terakhir dan prosedur revert tanpa force push.  `[PLANNED]`

## B. Navbar & tata letak — P0

7. **Pindahkan Support ke samping bahasa** — Satu tombol hati di navbar, tanpa kartu besar di Bantuan atau footer.  `[IMPLEMENTED]`
8. **Hilangkan overlap pada tablet 768 px** — Pakai bottom tabs ketika menu desktop tidak muat, tanpa horizontal overflow.  `[IMPLEMENTED]`
9. **Sederhanakan urutan kontrol header** — Brand, navigasi, bahasa, Support, tema, GitHub konsisten.  `[IMPLEMENTED]`
10. **Uji area sentuh minimal 44 px** — Audit target tap penting dan perbaiki yang terlalu kecil.  `[PLANNED]`
11. **Bekukan navigasi saat dialog aktif** — Dialog punya backdrop dan pengembalian fokus yang konsisten.  `[IMPLEMENTED]`
12. **Hapus dekorasi yang mengganggu judul** — Pastikan hologram tidak menabrak copy pada 320/360 px.  `[PLANNED]`

## C. Onboarding tanpa bingung — P1

13. **Jadikan bahasa awam default** — Tampilkan “Pilih AI → salin → pakai” sebelum istilah API/CLI.  `[PLANNED]`
14. **Deteksi jenis AI secara eksplisit** — Tawarkan Chatbot web vs AI coding sebelum perintah terminal.  `[PLANNED]`
15. **Jelaskan `npx` hanya untuk Terminal** — Jangan tampilkan `npx` sebagai perintah yang dijalankan di ChatGPT web.  `[PLANNED]`
16. **Contoh satu tugas kerja nyata** — Tunjukkan input ringkas dan output yang realistis tanpa klaim eksekusi.  `[PLANNED]`
17. **Verifikasi setelah pemasangan** — Arahkan user untuk meminta AI mengakui tool yang tersedia.  `[PLANNED]`
18. **Jalur gagal/dukungan** — Tampilkan pesan saat salin gagal, Skill tidak dikenali, atau terminal tidak tersedia.  `[PLANNED]`

## D. Portabilitas universal Skill — P1

19. **Pertahankan satu SKILL.md resmi** — Tidak memecah menjadi banyak plugin semu.  `[PLANNED]`
20. **Uji Agent Skills resolver** — Validasi installer npx pada versi klien yang benar-benar ada.  `[PLANNED]`
21. **Fallback prompt tanpa terminal** — Paket manual ringkas untuk chatbot tanpa importer Skill native.  `[PLANNED]`
22. **Referensi dimuat sesuai tugas** — Tidak memasukkan seluruh 66 workflow ke konteks awal.  `[PLANNED]`
23. **Matriks dukungan per platform** — Pisahkan native teruji, kemungkinan mendukung, dan manual.  `[PLANNED]`
24. **Batas akses host eksplisit** — Setiap alur harus memeriksa izin filesystem/web/tool sebelum bertindak.  `[PLANNED]`

## E. Katalog 66 kemampuan — P1

25. **Tampilkan 12 kartu awal** — Sisanya hanya setelah user mencari atau klik lebih banyak.  `[PLANNED]`
26. **Pencarian real-time** — Kata sederhana seperti CV, riset, skripsi, UI menghasilkan hasil relevan.  `[PLANNED]`
27. **Kelompokkan sebelas kategori** — Satu filter per bidang dan urutan yang konsisten.  `[PLANNED]`
28. **Berikan contoh output tiap kemampuan** — Tuliskan hasil yang bisa diverifikasi, bukan kalimat promosi.  `[PLANNED]`
29. **Indikasikan syarat tool** — Bedakan chat-only, butuh file, butuh browser, dan butuh Terminal.  `[PLANNED]`
30. **Pastikan katalog sinkron dengan JSON** — Jalankan generator dan tes konsistensi data sebelum rilis.  `[PLANNED]`

## F. Prompt & contoh praktis — P1

31. **Samarkan prompt hanya untuk visual** — Blur bukan enkripsi; tombol salin mengambil isi penuh.  `[PLANNED]`
32. **Ganti contoh sesuai platform AI** — Contoh coding jangan diberikan untuk chatbot tanpa akses proyek.  `[PLANNED]`
33. **Perjelas langkah setelah salin** — Tampilkan “buka AI, tempel, kirim tujuanmu”.  `[PLANNED]`
34. **Sediakan 5 template tugas prioritas** — Riset, menulis, olah data, coding, dan keputusan.  `[PLANNED]`
35. **Unduh instruksi Markdown offline** — Nama file dan isi sesuai pilihan user tanpa placeholder kosong.  `[PLANNED]`
36. **Validasi tombol copy nyata** — Bila clipboard ditolak, tampilkan fallback teks pilih semua.  `[PLANNED]`

## G. Desain, animasi & performa — P1

37. **Pertahankan CSS-only visual 3D** — Hologram bukan WebGL berat; jangan mengorbankan pembacaan.  `[PLANNED]`
38. **Optimalkan QRIS di bawah 60 KB** — Jaga payload tetap sama dan scan dapat dilakukan.  `[IMPLEMENTED]`
39. **Kurangi layout shift** — Tetapkan dimensi gambar, tombol, dan panel sebelum render.  `[PLANNED]`
40. **Gunakan token desain tunggal** — Samakan radius, shadow, warna, ukuran teks, dan spasi.  `[PLANNED]`
41. **Aktifkan reduced motion** — Animasi minimal saat user memilih gerakan dikurangi.  `[PLANNED]`
42. **Ukur LCP/CLS/INP** — Tetapkan anggaran dan ukur di perangkat kelas menengah.  `[PLANNED]`

## H. Aksesibilitas & ergonomi — P1

43. **Keyboard penuh pada modal** — Buka, Escape tutup, dan fokus kembali ke tombol semula.  `[IMPLEMENTED]`
44. **Dua bahasa pada Support** — Label, penjelasan, dan aksesibilitas berganti ID/EN.  `[IMPLEMENTED]`
45. **Kontras minimum WCAG** — Audit teks kecil, state aktif, disabled dan fokus.  `[PLANNED]`
46. **Target fokus terlihat jelas** — Semua tombol punya outline saat navigasi keyboard.  `[IMPLEMENTED]`
47. **Screen reader status** — Toast copy dan perubahan panel diumumkan secara tepat.  `[PLANNED]`
48. **Pengujian zoom 200%** — Tidak ada kontrol terpotong saat pembesaran atau keyboard mobile muncul.  `[PLANNED]`

## I. Trust, QRIS & kontribusi — P0

49. **Ungkap nama merchant sesungguhnya** — KOPDES NUSANTARA ditampilkan sebelum transaksi; jangan disebut JRHagents.  `[IMPLEMENTED]`
50. **Tidak munculkan pembayaran otomatis** — Hanya terbuka saat user menekan Support.  `[IMPLEMENTED]`
51. **Pertahankan kontributor non-finansial** — Tautkan CONTRIBUTING.md tanpa meminta uang.  `[IMPLEMENTED]`
52. **Tidak klaim transfer berhasil** — Tidak ada webhook, status pembayaran, atau total dana yang diada-adakan.  `[IMPLEMENTED]`
53. **Periksa aturan QRIS penyedia** — Konfirmasi penggunaan QR merchant untuk dukungan sukarela sah menurut ketentuan penyedia.  `[PLANNED]`
54. **Jelaskan penggunaan dukungan** — Nyatakan dukungan untuk pengembangan/dokumentasi tanpa janji benefit.  `[PLANNED]`

## J. QA, rilis & keamanan — P0

55. **Jalankan pengujian pada enam viewport** — 320, 360, 390, 768, 1024, 1440 px tanpa overflow.  `[IMPLEMENTED]`
56. **Tes unduh QRIS** — Pastikan file PNG lokal tersedia dan bisa disimpan dari dialog.  `[IMPLEMENTED]`
57. **Tes cache-busting aset** — Versi CSS/JS berubah bersamaan dengan HTML, tidak mencampur rilis.  `[PLANNED]`
58. **Tambah uji browser di CI** — Minimal mode/QRIS/dialog/clipboard dalam Chromium headless.  `[PLANNED]`
59. **Uji regressi lintas bahasa** — Pergantian ID/EN tidak menutup dialog atau menghapus pilihan.  `[IMPLEMENTED]`
60. **Jangan ekspos kredensial** — Pemeriksaan diff menolak token/API key tertulis dan link eksternal mencurigakan.  `[PLANNED]`

## K. Komunitas & kesiapan global — P2

61. **README dua bahasa** — Pertahankan perbedaan instruksi global versus native dan manfaat nyata.  `[PLANNED]`
62. **Tautan issue yang mudah** — Satu tempat bug/ide/permintaan kontribusi tanpa formulir menakutkan.  `[PLANNED]`
63. **Standar kontribusi kecil** — Label good first issue dan PR template dengan tes yang diharapkan.  `[PLANNED]`
64. **Demo tiga kasus internasional** — Contoh riset, software, dan karier yang bisa dikerjakan pada AI berbeda.  `[PLANNED]`
65. **Rilis terukur & changelog** — Gunakan tag semver, catatan perubahan dan kompatibilitas.  `[PLANNED]`
66. **Analitik privasi-friendly hanya jika perlu** — Tidak memaksa tracker; gunakan bukti isu/kontribusi untuk mengukur manfaat.  `[PLANNED]`

## Definition of Done untuk rilis

- `python -m unittest discover -s tests -p "test_*.py" -v` lulus Windows dan Linux.
- `node --test tests/catalog.test.cjs` lulus.
- Header bekerja di 320, 360, 390, 768, 1024, dan 1440 px tanpa horizontal overflow.
- Support tidak muncul otomatis; hanya terbuka saat dipilih; Escape dan close mengembalikan fokus.
- PNG dapat disimpan, dapat dipindai, dan payload QRIS sama dengan QRIS pengguna.
- GitHub Actions CI + Pages benar-benar sukses pada commit produksi yang sama.

## Catatan berikutnya

Buat isu GitHub terpisah untuk setiap kelompok prioritas. Jangan mengklaim fitur pihak ketiga sudah terpasang hanya karena Skill menjelaskan sebuah alur kerja.
