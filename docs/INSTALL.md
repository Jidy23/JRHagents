# Cara pakai JRHagents — paling mudah

## A. ChatGPT, Claude web, Gemini web, atau chatbot tanpa terminal

1. Buka [website JRHagents](https://jidy23.github.io/JRHagents/), pilih **Chatbot biasa** lalu pilih aplikasimu.
2. Tekan **Lihat instruksi saya** (di HP), kemudian **Salin instruksi lengkap**. Jika penyalinan otomatis ditolak, salin dari kotak teks cadangan yang muncul.
3. Tempel di chat atau fitur instruksi khusus yang disediakan aplikasimu, lalu tulis tugas seperti: `JRHagents, bantu saya rapikan CV untuk lowongan ini.`

Tidak perlu `npx`, Python, Base URL, endpoint, API key JRHagents, atau akun JRHagents. Ini **penggunaan instruksi manual**, bukan pemasangan Skill native. Situs tidak menjalankan AI sendiri. Instruksi lengkap tersedia juga di [UNIVERSAL_PROMPT.md](../UNIVERSAL_PROMPT.md).

## B. Codex, Claude Code, Gemini CLI, Cursor, GitHub Copilot dan agen lain yang mendukung Skills

Memerlukan komputer dengan Node.js, internet, serta runtime AI coding yang mendukung standar Agent Skills. Buka **terminal komputer** (bukan chat) dan jalankan:

```bash
npx skills add Jidy23/JRHagents --skill jrhagents
```

Ikuti pilihan installer dan nyalakan ulang AI coding bila diperlukan. Perintah ini **tidak bisa dieksekusi oleh chatbot tanpa shell**. Jika aplikasimu tidak mendukung native Skills, gunakan jalur A/manual.

## C. Pilih dari 66 kemampuan

Di website, buka tab **Kemampuan** → cari atau filter kategori → klik salah satu kartu → klik **Gunakan kemampuan ini**. Untuk chatbot, tombol salin memberi instruksi lengkap beserta tugas terpilih. Untuk AI coding, pasang Skill dahulu lalu gunakan tombol **Salin contoh tugas setelah memasang**.

## Verifikasi yang realistis

Tanyakan kepada AI: `JRHagents, apa tool yang bisa kamu akses saat ini? Bantu saya [tugas], dan jelaskan bukti bila ada.`

- Chat-only: dapat menjawab dan menyusun output dari informasi yang tersedia, tetapi belum tentu bisa membaca repo atau menjalankan kode.
- AI coding: dapat memanfaatkan tool yang memang dimiliki dan diizinkan oleh klien.
- Di website, blur pada prompt adalah **dekorasi visual, bukan enkripsi**; sumbernya publik dan teks lengkap tetap disalin.

**JRHagents menyediakan alur kerja, bukan model AI baru, server MCP, atau 66 aplikasi terintegrasi.** Periksa [kompatibilitas](COMPATIBILITY.md) bila instalasi native tidak muncul.
