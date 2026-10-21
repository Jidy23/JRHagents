# 26 Kemampuan JRHagents V13

## 10 sumber inspirasi, bukan integrasi otomatis
01 **REA** — analisis arsitektur dan reverse engineering yang berizin (butuh alat jika menjalankan di runtime).
02 **Ponytail** — simplifikasi dan review kode senior-engineer.
03 **Hallmark** — deteksi desain generik dan arah desain khas.
04 **Humanizer** — perbaikan tulisan yang tetap menjaga fakta.
05 **Onyx** — pencarian pengetahuan berbasis dokumen (akses live membutuhkan connector).
06 **Impeccable** — UI polish, komposisi dan visual QA.
07 **UI/UX Pro Max** — sistem desain, aksesibilitas dan konsistensi.
08 **Last 30 Days** — analisis tren dan sumber terbaru (memerlukan akses web yang tersedia).
09 **Scrapling** — extraction yang sah dengan rate limiting (memerlukan runtime opsional dan izin).
10 **Diagram Design** — diagram arsitektur, proses dan alur aplikasi yang bisa diedit.

## 16 kemampuan internal
11 Intent Router — natural language routing.
12 Project Cartographer — audit struktur proyek.
13 BYOK Model Router — kebijakan pemilihan provider (belum adapter API).
14 Capability Doctor — pemeriksaan lokal tool dan stack.
15 Adaptive Work Graph — langkah kerja dan status yang bisa disimpan.
16 Design DNA Passport — standar gaya dan konsistensi.
17 Visual QA — checklist lintas layar (butuh browser untuk bukti nyata).
18 No-Mock Feature Gate — fitur belum dianggap selesai tanpa hasil.
19 Test–Fix–Verify — pedoman dan opt-in test/build.
20 Permission & Secret Shield — scan heuristik tanpa mengekspos nilai.
21 Diff Guard & Rollback — pemeriksaan status Git; pemulihan tetap perlu tinjauan.
22 Token & Cost Governor — gunakan kemampuan minimum yang cukup.
23 Evidence Ledger — JSON dan laporan HTML pemeriksaan nyata.
24 Research Freshness Filter — cek tanggal/sumber jika akses riset tersedia.
25 Portable Decision Memory — context file proyek dan rencana tersimpan.
26 Release Readiness Gate — pemeriksaan kualitas; tidak melakukan deploy otomatis.

## Prioritas routing
AUDIT = 01, 02, 12, 14, 19, 20, 23
BUILD = 02, 11, 12, 14, 15, 18, 19, 20, 21, 23
POLISH = 03, 06, 07, 16, 17, 19, 23
RESEARCH = 04, 08, 23, 24
DIAGRAM = 10, 12, 23
RELEASE = 18, 19, 20, 21, 23, 26

Perhatikan: beberapa kemampuan berupa *instruksi dan playbook* (bukan kode fungsi mandiri), sedangkan CLI lokal hanya menyediakan fungsi yang secara eksplisit terdaftar di `README.md`.
