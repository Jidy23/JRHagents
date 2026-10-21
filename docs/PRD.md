# Product Requirements Document — JRHagents V16
**Versi:** 13.0 · **Tanggal:** 2026-10-21 · **Fase:** Functional local-first MVP

## Visi
Mengubah AI coding yang rumit menjadi workflow satu instruksi yang dapat diaudit untuk solo developer: ide → analisis → implementasi → pengujian → bukti.

## Siapa penggunanya
Pengembang pemula/mandiri yang ingin audit dan build tanpa konfigurasi rumit, dan pengembang berpengalaman yang perlu standar kualitas serta audit trail.

## 9 kenaikan level dan kriteria penerimaan
1. V5 **Easy Mode:** bantuan singkat dan permintaan bahasa biasa.
2. V6 **Cross-client Installer:** instalasi aman Codex/Claude/Gemini, tidak overwrite.
3. V7 **Project Doctor:** deteksi tool yang memang ada; tidak mengklaim koneksi online.
4. V8 **Intent Intelligence:** input alami diarahkan ke 6 domain utama.
5. V9 **Project Cartography:** mendeteksi framework, git changes, lockfile dan tes.
6. V10 **Secret Shield:** temukan pola rawan dengan hasil tersensor; tidak membaca nilai `.env`.
7. V11 **Adaptive Planning:** langkah kerja dengan status awal `pending`, disimpan hanya bila diminta.
8. V12 **Proof Gate:** membedakan passed/failed/not_run dan menjalankan tes/build hanya dengan opt-in.
9. V16 **Evidence Dashboard:** HTML responsive offline, CSP ketat, JSON untuk audit mesin.

## Functional MVP yang termasuk
`help`, `start`, `doctor`, `init`, `audit`, `route`, `plan`, `verify`, `report`, `status`, `install`.
Output langsung cocok untuk shell, scripts, dan AI agents. Tidak ada ketergantungan Python eksternal pada jalur penggunaan dasar.

## Nonfunctional requirements
- Non-destructive dan no-overwrite pada `init`/`install`.
- Maksimal 2.500 file dan 512 KB/file saat scan konten; lewati vendor/build dan symlink.
- Hasil scan kredensial tidak memuat nilai rahasia.
- Tidak ada jaringan atau provider API tersembunyi.
- HTML tidak bergantung pada JavaScript/CDN/tracking; desain light/dark otomatis.
- Tes standar Python `unittest`.

## Bukan cakupan V16
Hosting aplikasi SaaS, agen otonom, GitHub auto-merge, pemasangan kode asli 10 repository, MCP live, koneksi AI BYOK, pengujian UI/browser otomatis, deployment produksi. Semua butuh implementasi dan verifikasi lanjutan.

## Release gate
- Validasi sintaks dan CLI.
- Lulus unit tests.
- Uji installer folder target, no overwrite, init preserving user data.
- Uji secret redaction.
- Uji static HTML escaping dan responsivitas CSS.
- Pisahkan hasil faktual dari klaim capaian.

## Next stage (V14+)
Optional adapters berkontrak izin yang jelas, browser QA, antarmuka GUI, dan integrasi MCP/BYOK setelah uji sandbox; bukan prasyarat MVP lokal.

## Public onboarding improvements
V14 interactive documentation, V15 copy-ready client installation guide, V16 contributor workflow and CI. This website is not an AI agent or cloud service.
